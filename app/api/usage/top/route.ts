import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/server/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(supabaseUrl, serviceRoleKey)
}

type TopMetric = 'tokens' | 'requests' | 'cost'
type TopBy = 'provider' | 'model' | 'feature' | 'service'

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

// Keep service mapping in sync with analytics v2
function mapService(featureName?: string): string {
  const f = (featureName || '').toLowerCase()
  if (f.includes('literature')) return 'explorer'
  if (f.includes('summary') || f.includes('summar')) return 'summarizer'
  if (f.includes('assistant') || f.includes('chat')) return 'ai_assistant'
  if (f.includes('generation') || f.includes('write')) return 'ai_writing'
  return 'other'
}

function toPerResultBucket(val: any): string {
  const n = typeof val === 'string' ? parseInt(val, 10) : typeof val === 'number' ? val : NaN
  if (!Number.isFinite(n)) return 'unknown'
  if (n >= 1 && n <= 5) return '1-5'
  if (n >= 6 && n <= 10) return '6-10'
  if (n >= 11 && n <= 20) return '11-20'
  if (n >= 21 && n <= 50) return '21-50'
  if (n > 50) return '51+'
  return 'unknown'
}

async function aggregateTopFromTransactions(
  supabaseAdmin: any,
  userId: string,
  from: Date,
  to: Date,
  by: 'provider' | 'model' | 'feature' | 'service'
) {
  const { data: rows, error } = await supabaseAdmin
    .from('token_transactions')
    .select('created_at, feature_name, operation_context, tokens_amount, provider_cost_usd, operation_type')
    .eq('user_id', userId)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[usage/top] fallback query error', error)
    return null
  }

  const aggregated: Record<string, {
    key: string
    tokens: number
    requests: number
    cost: number
    error_rate: number
    avg_latency: number
  }> = {}

  for (const row of rows || []) {
    if ((row.operation_type || '').toLowerCase() !== 'deduct') continue
    let ctx: any = {}
    try {
      ctx = typeof row.operation_context === 'string' ? JSON.parse(row.operation_context) : (row.operation_context || {})
    } catch {
      ctx = row.operation_context || {}
    }
    const key = (() => {
      switch (by) {
        case 'service': return mapService(row.feature_name)
        case 'feature': return String(row.feature_name || 'unknown')
        case 'provider': return String((ctx.provider ?? 'other')).toLowerCase()
        case 'model': return String((ctx.model ?? 'other')).toLowerCase()
      }
    })()
    if (!aggregated[key]) {
      aggregated[key] = { key, tokens: 0, requests: 0, cost: 0, error_rate: 0, avg_latency: 0 }
    }
    aggregated[key].tokens += Number(row.tokens_amount || 0)
    aggregated[key].requests += 1
    aggregated[key].cost += Number(row.provider_cost_usd || 0)
    // error_rate & avg_latency not available here – keep at 0
  }

  return Object.values(aggregated)
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const auth = await requireAuth(request)
    if ('error' in auth) return auth.error
    const userId = auth.user.id

    const body = await request.json().catch(() => ({}))
    const metric: TopMetric = body.metric || 'tokens'
    const by: TopBy = body.by || 'provider'
    const limit: number = Math.min(body.limit || 10, 50)
    
    const to = body?.to ? new Date(body.to) : new Date()
    const from = body?.from ? new Date(body.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const fromUTC = startOfDayUTC(from)
    const toUTC = startOfDayUTC(to)

    // Map 'by' to column name
    const byCol = by === 'feature' ? 'feature_name' : by
    const metricCol = metric === 'cost' ? 'cost_usd' : metric

    // Try to refresh MV to make sure data is available (best-effort)
    try { await supabaseAdmin.rpc('refresh_usage_daily_mv') } catch {}

    let { data, error } = await supabaseAdmin
      .from('usage_daily_mv')
      .select(`${byCol}, tokens, requests, cost_usd, error_rate, avg_latency`)
      .eq('user_id', userId)
      .gte('day', fromUTC.toISOString())
      .lte('day', toUTC.toISOString())

    if (error) {
      console.error('[usage/top] query error', error)
      return NextResponse.json({ error: 'Failed to query top usage' }, { status: 500 })
    }

    let rowsAgg: Array<{ key: string, tokens: number, requests: number, cost: number, error_rate: number, avg_latency: number }>
    if (!error && data && data.length > 0) {
      // Aggregate MV data by the 'by' dimension
      const aggregated: Record<string, {
        key: string
        tokens: number
        requests: number
        cost: number
        error_rate: number
        avg_latency: number
      }> = {}
      ;(data || []).forEach((row: any) => {
        const key = String(row[byCol] || 'unknown')
        if (!aggregated[key]) {
          aggregated[key] = { key, tokens: 0, requests: 0, cost: 0, error_rate: 0, avg_latency: 0 }
        }
        aggregated[key].tokens += Number(row.tokens || 0)
        aggregated[key].requests += Number(row.requests || 0)
        aggregated[key].cost += Number(row.cost_usd || 0)
        const requests = Number(row.requests || 0)
        if (requests > 0) {
          const totalRequests = aggregated[key].requests
          const prevWeight = totalRequests - requests
          const newWeight = requests
          aggregated[key].error_rate = (
            (aggregated[key].error_rate * prevWeight + Number(row.error_rate || 0) * newWeight) / 
            totalRequests
          )
          aggregated[key].avg_latency = (
            (aggregated[key].avg_latency * prevWeight + Number(row.avg_latency || 0) * newWeight) / 
            totalRequests
          )
        }
      })
      rowsAgg = Object.values(aggregated)
    } else {
      const fallback = await aggregateTopFromTransactions(supabaseAdmin, userId, fromUTC, toUTC, by)
      if (!fallback) {
        return NextResponse.json({ from: fromUTC.toISOString(), to: toUTC.toISOString(), metric, by, limit, rows: [] })
      }
      rowsAgg = fallback
    }

    // Sort by the requested metric and take top N
    const sortKey = metric === 'cost' ? 'cost' : metric
    const rows = rowsAgg
      .sort((a, b) => {
        const aVal = Number(a[sortKey as keyof typeof a]) || 0
        const bVal = Number(b[sortKey as keyof typeof b]) || 0
        return bVal - aVal
      })
      .slice(0, limit)
      .map(row => ({
        ...row,
        tokens: Math.round(row.tokens),
        requests: Math.round(row.requests),
        cost: Number(row.cost.toFixed(4)),
        error_rate: Number((row.error_rate * 100).toFixed(2)), // Convert to percentage
        avg_latency: Math.round(row.avg_latency),
      }))

    return NextResponse.json({
      from: fromUTC.toISOString(),
      to: toUTC.toISOString(),
      metric,
      by,
      limit,
      rows,
    })
  } catch (err) {
    console.error('[usage/top] unexpected error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
