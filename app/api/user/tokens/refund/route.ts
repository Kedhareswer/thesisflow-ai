import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/server/auth'
import { tokenService } from '@/lib/services/token.service'

export async function POST(request: NextRequest) {
  try {
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

    const context = payload.idempotencyKey
      ? { ...payload.context, idempotencyKey: payload.idempotencyKey }
      : payload.context

    const result = await tokenService.refundTokens(
      user.id,
      payload.feature,
      payload.amount,
      context,
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to refund tokens' }, { status: 500 })
    }

    const status = await tokenService.getUserTokenStatus(user.id)
    const response = NextResponse.json({
      success: true,
      ...(status ?? {}),
    })
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  } catch (error) {
    console.error('[tokens/refund] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
