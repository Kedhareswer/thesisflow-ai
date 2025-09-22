import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/server/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/usage/metrics
// Allows client or server to append final usage metrics to the most relevant token transaction
// Body: { transactionId?: string, correlationId?: string, metrics: { input_tokens?, output_tokens?, cost_usd?, latency_ms?, success?, error_category? }, context?: object }
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if ('error' in auth) return auth.error
    const userId = auth.user.id

    const body = await request.json().catch(() => ({}))
    const transactionId: string | undefined = body.transactionId || body.transaction_id
    const correlationId: string | undefined = body.correlationId || body.correlation_id || body.cid
    const metrics: any = body.metrics || {}
    const mergeContext: any = body.context || {}

    if (!transactionId && !correlationId) {
      return NextResponse.json({ error: 'transactionId or correlationId required' }, { status: 400 })
    }

    let targetId: string | undefined = transactionId

    if (!targetId && correlationId) {
      // Find the most recent deduct transaction for this user with matching correlation id in the last 2 hours
      const { data: rows, error } = await supabaseAdmin
        .from('token_transactions')
        .select('id, created_at')
        .eq('user_id', userId)
        .eq('operation_type', 'deduct')
        .eq('success', true)
        .gt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .contains('operation_context', { correlation_id: correlationId })
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('[usage/metrics] query by correlation error', error)
        return NextResponse.json({ error: 'Failed to locate transaction' }, { status: 500 })
      }

      targetId = rows?.[0]?.id
    }

    if (!targetId) {
      return NextResponse.json({ error: 'Transaction not found for correlation' }, { status: 404 })
    }

    // Merge additional context if provided
    if (mergeContext && Object.keys(mergeContext).length) {
      await supabaseAdmin.rpc('update_token_transaction_context', {
        p_transaction_id: targetId,
        p_merge_context: mergeContext,
      })
    }

    // Append metrics via RPC
    const { data, error: rpcError } = await supabaseAdmin.rpc('append_usage_metrics', {
      p_transaction_id: targetId,
      p_metrics: metrics,
    })

    if (rpcError) {
      console.error('[usage/metrics] append rpc error', rpcError)
      return NextResponse.json({ error: 'Failed to append usage metrics' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, updated: Boolean(data), transactionId: targetId })
  } catch (err) {
    console.error('[usage/metrics] unexpected error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
