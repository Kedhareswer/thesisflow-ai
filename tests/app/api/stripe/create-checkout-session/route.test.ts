import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// The route handlers under test are expected to be exported as POST and GET from app/api/stripe/create-checkout-session/route.ts
// We import dynamically inside tests after setting up mocks to ensure modules pick up the mocked implementations.
type NextHeadersLike = {
  get: (key: string) => string | null
}

class MockNextRequest {
  url: string
  headers: NextHeadersLike
  private _json: any
  constructor(init: { url: string; headers?: Record<string, string>; json?: any }) {
    this.url = init.url
    const headers = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]))
    this.headers = {
      get: (key: string) => headers[key.toLowerCase()] ?? null
    }
    this._json = init.json
  }
  async json() {
    return this._json
  }
}

const mockJson = vi.fn((body: any, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }))
vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: mockJson
    }
  }
})

const supabaseAuthGetUser = vi.fn()
const supabaseFrom = vi.fn()
const supabaseSelect = vi.fn()
const supabaseEq = vi.fn()
const supabaseSingle = vi.fn()
const supabaseUpsert = vi.fn()

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: supabaseAuthGetUser
      },
      from: supabaseFrom
    }))
  }
})

const stripeCustomersCreate = vi.fn()
const stripeCheckoutSessionsCreate = vi.fn()
const stripeCheckoutSessionsRetrieve = vi.fn()

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {
        create: stripeCustomersCreate
      },
      checkout: {
        sessions: {
          create: stripeCheckoutSessionsCreate,
          retrieve: stripeCheckoutSessionsRetrieve
        }
      }
    }))
  }
})

function setEnv(partial: Record<string, string | undefined>) {
  const keys = [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_PRICE_ID_PRO_MONTHLY',
    'STRIPE_PRICE_ID_PRO_YEARLY',
    'STRIPE_PRICE_ID_ENTERPRISE_MONTHLY',
    'STRIPE_PRICE_ID_ENTERPRISE_YEARLY',
    'NEXT_PUBLIC_APP_URL'
  ]
  const backup = Object.fromEntries(keys.map(k => [k, process.env[k]]))
  Object.entries(partial).forEach(([k, v]) => {
    if (v === undefined) {
      delete process.env[k]
    } else {
      process.env[k] = v
    }
  })
  return () => {
    Object.entries(backup).forEach(([k, v]) => {
      if (typeof v === 'string') process.env[k] = v
      else delete process.env[k]
    })
  }
}

async function importRoute() {
  // Import fresh module to pick up new mocks and env
  const mod = await import('../../../app/api/stripe/create-checkout-session/route.ts')
  return mod as unknown as {
    POST: (req: any) => Promise<any>
    GET: (req: any) => Promise<any>
  }
}

// Helpers to wire supabase query chain
function mockUserPlansQuery(stripe_customer_id: string | null) {
  supabaseFrom.mockReturnValueOnce({ // .from('user_plans')
    select: supabaseSelect
  })
  supabaseSelect.mockReturnValueOnce({ // .select('stripe_customer_id')
    eq: supabaseEq
  })
  supabaseEq.mockReturnValueOnce({ // .eq('user_id', user.id)
    single: supabaseSingle
  })
  supabaseSingle.mockResolvedValueOnce({
    data: stripe_customer_id ? { stripe_customer_id } : null
  })
}

describe('API: /api/stripe/create-checkout-session', () => {
  let restoreEnv: () => void

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    restoreEnv = setEnv({
      STRIPE_SECRET_KEY: 'sk_test_123',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service_role_123',
      STRIPE_PRICE_ID_PRO_MONTHLY: 'price_pro_monthly',
      STRIPE_PRICE_ID_PRO_YEARLY: 'price_pro_yearly',
      STRIPE_PRICE_ID_ENTERPRISE_MONTHLY: 'price_enterprise_monthly',
      STRIPE_PRICE_ID_ENTERPRISE_YEARLY: 'price_enterprise_yearly',
      NEXT_PUBLIC_APP_URL: 'https://app.example.com'
    })
  })

  afterEach(() => {
    restoreEnv()
  })

  describe('POST', () => {
    it('returns 401 when authorization header is missing', async () => {
      const { POST } = await importRoute()
      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session',
        json: { priceId: 'price_pro_monthly', planType: 'pro', billingPeriod: 'monthly' }
      })

      const res = await POST(req as any)
      expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 })
      expect(res.status).toBe(401)
    })

    it('returns 401 when token is invalid or user not found', async () => {
      const { POST } = await importRoute()
      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session',
        headers: { authorization: 'Bearer invalid_token' },
        json: { priceId: 'price_pro_monthly', planType: 'pro', billingPeriod: 'monthly' }
      })
      supabaseAuthGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid' } })

      const res = await POST(req as any)
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid token' }, { status: 401 })
      expect(res.status).toBe(401)
    })

    it('returns 400 when priceId is missing', async () => {
      const { POST } = await importRoute()
      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session',
        headers: { authorization: 'Bearer good' },
        json: { planType: 'pro', billingPeriod: 'monthly' }
      })
      supabaseAuthGetUser.mockResolvedValueOnce({ data: { user: { id: 'uid_1', email: 'u@example.com' } }, error: null })

      const res = await POST(req as any)
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid price ID' }, { status: 400 })
      expect(res.status).toBe(400)
    })

    it('returns 400 when priceId is not one of allowed PRICE_IDS', async () => {
      const { POST } = await importRoute()
      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session',
        headers: { authorization: 'Bearer good' },
        json: { priceId: 'price_unknown', planType: 'pro', billingPeriod: 'monthly' }
      })
      supabaseAuthGetUser.mockResolvedValueOnce({ data: { user: { id: 'uid_1', email: 'u@example.com' } }, error: null })

      const res = await POST(req as any)
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid price ID' }, { status: 400 })
      expect(res.status).toBe(400)
    })

    it('uses existing stripe_customer_id and creates checkout session (happy path)', async () => {
      const { POST } = await importRoute()
      const user = { id: 'uidX', email: 'x@example.com' }
      supabaseAuthGetUser.mockResolvedValueOnce({ data: { user }, error: null })
      mockUserPlansQuery('cus_123') // existing customer

      stripeCheckoutSessionsCreate.mockResolvedValueOnce({ id: 'cs_123', url: 'https://stripe.example/checkout/cs_123' })

      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session',
        headers: { authorization: 'Bearer good' },
        json: { priceId: 'price_pro_monthly', planType: 'pro', billingPeriod: 'monthly' }
      })

      const res = await POST(req as any)

      expect(stripeCustomersCreate).not.toHaveBeenCalled()
      expect(stripeCheckoutSessionsCreate).toHaveBeenCalledTimes(1)

      const args = stripeCheckoutSessionsCreate.mock.calls[0][0]
      expect(args.customer).toBe('cus_123')
      expect(args.payment_method_types).toEqual(['card'])
      expect(args.line_items).toEqual([{ price: 'price_pro_monthly', quantity: 1 }])
      expect(args.mode).toBe('subscription')
      expect(args.success_url).toBe('https://app.example.com/plan?success=true&session_id={CHECKOUT_SESSION_ID}')
      expect(args.cancel_url).toBe('https://app.example.com/plan?canceled=true')
      expect(args.subscription_data.metadata).toMatchObject({
        supabase_user_id: user.id,
        plan_type: 'pro',
        billing_period: 'monthly'
      })
      expect(args.subscription_data.trial_period_days).toBe(7)
      expect(args.metadata).toMatchObject({
        supabase_user_id: user.id,
        plan_type: 'pro',
        billing_period: 'monthly'
      })
      expect(args.allow_promotion_codes).toBe(true)
      expect(args.billing_address_collection).toBe('auto')
      expect(args.customer_update).toEqual({ address: 'auto' })

      expect(mockJson).toHaveBeenCalledWith({ sessionId: 'cs_123', url: 'https://stripe.example/checkout/cs_123' })
      expect(res.status).toBe(200)
    })

    it('creates Stripe customer when not present and upserts user_plans, then creates session', async () => {
      const { POST } = await importRoute()
      const user = { id: 'uidY', email: 'y@example.com' }
      supabaseAuthGetUser.mockResolvedValueOnce({ data: { user }, error: null })
      mockUserPlansQuery(null) // no existing customer

      // For the upsert chain post-customer creation
      supabaseFrom.mockReturnValueOnce({ // .from('user_plans')
        upsert: supabaseUpsert
      })
      supabaseUpsert.mockResolvedValueOnce({ data: null, error: null })

      stripeCustomersCreate.mockResolvedValueOnce({ id: 'cus_new' })
      stripeCheckoutSessionsCreate.mockResolvedValueOnce({ id: 'cs_new', url: 'https://stripe.example/checkout/cs_new' })

      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session',
        headers: { authorization: 'Bearer good' },
        json: { priceId: 'price_enterprise_yearly', planType: 'enterprise', billingPeriod: 'yearly' }
      })

      const res = await POST(req as any)

      expect(stripeCustomersCreate).toHaveBeenCalledWith({
        email: 'y@example.com',
        metadata: {
          supabase_user_id: 'uidY',
          supabase_email: 'y@example.com'
        }
      })
      expect(supabaseUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'uidY',
          stripe_customer_id: 'cus_new',
          plan_type: 'free',
          updated_at: expect.any(String)
        })
      )
      const args = stripeCheckoutSessionsCreate.mock.calls[0][0]
      expect(args.customer).toBe('cus_new')
      expect(args.subscription_data.trial_period_days).toBeUndefined() // not 'pro'
      expect(mockJson).toHaveBeenCalledWith({ sessionId: 'cs_new', url: 'https://stripe.example/checkout/cs_new' })
      expect(res.status).toBe(200)
    })

    it('falls back to http://localhost:3000 in URLs when NEXT_PUBLIC_APP_URL not set', async () => {
      const undo = setEnv({ NEXT_PUBLIC_APP_URL: undefined })
      const { POST } = await importRoute()
      const user = { id: 'uidZ', email: 'z@example.com' }
      supabaseAuthGetUser.mockResolvedValueOnce({ data: { user }, error: null })
      mockUserPlansQuery('cus_456')

      stripeCheckoutSessionsCreate.mockResolvedValueOnce({ id: 'cs_local', url: 'https://stripe.example/checkout/cs_local' })

      const req = new MockNextRequest({
        url: 'http://localhost:3000/api/stripe/create-checkout-session',
        headers: { authorization: 'Bearer good' },
        json: { priceId: 'price_pro_yearly', planType: 'pro', billingPeriod: 'yearly' }
      })

      await POST(req as any)
      const args = stripeCheckoutSessionsCreate.mock.calls[0][0]
      expect(args.success_url).toBe('http://localhost:3000/plan?success=true&session_id={CHECKOUT_SESSION_ID}')
      expect(args.cancel_url).toBe('http://localhost:3000/plan?canceled=true')
      undo()
    })

    it('returns 500 when Stripe API throws', async () => {
      const { POST } = await importRoute()
      const user = { id: 'uidE', email: 'e@example.com' }
      supabaseAuthGetUser.mockResolvedValueOnce({ data: { user }, error: null })
      mockUserPlansQuery('cus_err')
      stripeCheckoutSessionsCreate.mockRejectedValueOnce(new Error('stripe down'))

      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session',
        headers: { authorization: 'Bearer good' },
        json: { priceId: 'price_pro_monthly', planType: 'pro', billingPeriod: 'monthly' }
      })

      const res = await POST(req as any)
      expect(mockJson).toHaveBeenCalledWith(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
      expect(res.status).toBe(500)
    })
  })

  describe('GET', () => {
    it('returns 400 when session_id is missing', async () => {
      const { GET } = await importRoute()
      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session',
        headers: { authorization: 'Bearer token' }
      })

      const res = await GET(req as any)
      expect(mockJson).toHaveBeenCalledWith({ error: 'Session ID required' }, { status: 400 })
      expect(res.status).toBe(400)
    })

    it('returns 401 when authorization header missing', async () => {
      const { GET } = await importRoute()
      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session?session_id=cs_1'
      })

      const res = await GET(req as any)
      expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 })
      expect(res.status).toBe(401)
    })

    it('returns 401 when token invalid or user not found', async () => {
      const { GET } = await importRoute()
      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session?session_id=cs_2',
        headers: { authorization: 'Bearer bad' }
      })
      supabaseAuthGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid' } })

      const res = await GET(req as any)
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid token' }, { status: 401 })
      expect(res.status).toBe(401)
    })

    it('returns 401 when session metadata supabase_user_id mismatches', async () => {
      const { GET } = await importRoute()
      const user = { id: 'uid_real', email: 'r@example.com' }
      supabaseAuthGetUser.mockResolvedValueOnce({ data: { user }, error: null })

      stripeCheckoutSessionsRetrieve.mockResolvedValueOnce({
        id: 'cs_meta',
        metadata: { supabase_user_id: 'someone_else' }
      })

      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session?session_id=cs_meta',
        headers: { authorization: 'Bearer good' }
      })

      const res = await GET(req as any)
      expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 })
      expect(res.status).toBe(401)
    })

    it('returns session details when authorized and session belongs to user (happy path)', async () => {
      const { GET } = await importRoute()
      const user = { id: 'uid_ok', email: 'ok@example.com' }
      supabaseAuthGetUser.mockResolvedValueOnce({ data: { user }, error: null })

      const fakeSession = {
        id: 'cs_ok',
        status: 'open',
        payment_status: 'unpaid',
        subscription: { id: 'sub_123' },
        customer: { id: 'cus_789' },
        metadata: { supabase_user_id: 'uid_ok' }
      }
      stripeCheckoutSessionsRetrieve.mockResolvedValueOnce(fakeSession)

      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session?session_id=cs_ok',
        headers: { authorization: 'Bearer good' }
      })

      const res = await GET(req as any)
      expect(stripeCheckoutSessionsRetrieve).toHaveBeenCalledWith('cs_ok', { expand: ['subscription', 'customer'] })
      expect(mockJson).toHaveBeenCalledWith({
        status: 'open',
        payment_status: 'unpaid',
        subscription: { id: 'sub_123' },
        customer: { id: 'cus_789' }
      })
      expect(res.status).toBe(200)
    })

    it('returns 500 when Stripe retrieve throws', async () => {
      const { GET } = await importRoute()
      const user = { id: 'uid_err', email: 'err@example.com' }
      supabaseAuthGetUser.mockResolvedValueOnce({ data: { user }, error: null })

      stripeCheckoutSessionsRetrieve.mockRejectedValueOnce(new Error('stripe retrieve down'))

      const req = new MockNextRequest({
        url: 'https://app.example.com/api/stripe/create-checkout-session?session_id=cs_fail',
        headers: { authorization: 'Bearer good' }
      })

      const res = await GET(req as any)
      expect(mockJson).toHaveBeenCalledWith(
        { error: 'Failed to retrieve checkout session' },
        { status: 500 }
      )
      expect(res.status).toBe(500)
    })
  })
})