import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/server/auth'
import { tokenService } from '@/lib/services/token.service'
import { logApiEvent } from '@/lib/server/logger'

export async function POST(request: NextRequest) {
  try {
    const started = Date.now()
    const auth = await requireAuth(request)
    if ('error' in auth) return auth.error
    const { user } = auth

    const schema = z.object({
      feature: z.string().min(1).max(64),
      amount: z.number().int().min(1).max(1000).default(1),
      context: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
      idempotencyKey: z.string().max(128).optional(),
    })

    let payload: z.infer<typeof schema>
    try {
      payload = schema.parse(await request.json())
    } catch (e) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Prefer Idempotency-Key header if provided; fallback to body.idempotencyKey
    const headerIdem = request.headers.get('idempotency-key') || undefined
    const idem = headerIdem ?? payload.idempotencyKey
    const context = idem
      ? { ...payload.context, idempotencyKey: idem }
      : payload.context

    // Rate limit check via RPC
    const rl = await tokenService.checkRateLimit(user.id, payload.feature, context)
    if (!rl.allowed) {
      const res = NextResponse.json({
        error: rl.errorMessage || 'Rate limited',
        resetTime: rl.resetTime || null,
        dailyRemaining: rl.dailyRemaining,
        monthlyRemaining: rl.monthlyRemaining,
      }, { status: 429 })
      if (rl.resetTime) {
        const seconds = Math.max(0, Math.ceil((rl.resetTime - Date.now()) / 1000))
        res.headers.set('Retry-After', String(seconds))
      }
      res.headers.set('Cache-Control', 'no-store, max-age=0')
      logApiEvent({
        route: '/api/user/tokens/deduct',
        user_id: user.id,
        feature: payload.feature,
        amount: payload.amount,
        idempotency_key: idem || null,
        success: false,
        status: 429,
        elapsed_ms: Date.now() - started,
        extra: { reason: 'rate_limited' },
        ts: new Date().toISOString(),
      })
      return res
    }

    const ua = request.headers.get('user-agent') || undefined
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || undefined

    const result = await tokenService.deductTokens(
      user.id,
      payload.feature,
      payload.amount,
      context,
      ip,
      ua,
    )

    if (!result.success) {
      const resp = NextResponse.json({ error: result.error || 'Failed to deduct tokens' }, { status: 500 })
      logApiEvent({
        route: '/api/user/tokens/deduct',
        user_id: user.id,
        feature: payload.feature,
        amount: payload.amount,
        idempotency_key: idem || null,
        success: false,
        status: 500,
        elapsed_ms: Date.now() - started,
        extra: { error: result.error },
        ts: new Date().toISOString(),
      })
      return resp
    }

    const status = await tokenService.getUserTokenStatus(user.id)
    const response = NextResponse.json({
      success: true,
      ...(status ?? {}),
    })
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    logApiEvent({
      route: '/api/user/tokens/deduct',
      user_id: user.id,
      feature: payload.feature,
      amount: payload.amount,
      idempotency_key: idem || null,
      success: true,
      status: 200,
      elapsed_ms: Date.now() - started,
      extra: status ?? undefined,
      ts: new Date().toISOString(),
    })
    return response
  } catch (error) {
    console.error('[tokens/deduct] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
