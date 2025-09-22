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

type TopMetric = 'tokens' | 'requests' | 'cost'
type TopBy = 'provider' | 'model' | 'feature' | 'service'

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export async function POST(request: NextRequest) {
  try {
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

    const { data, error } = await supabaseAdmin
      .from('usage_daily_mv')
      .select(`${byCol}, tokens, requests, cost_usd, error_rate, avg_latency`)
      .eq('user_id', userId)
      .gte('day', fromUTC.toISOString())
      .lte('day', toUTC.toISOString())

    if (error) {
      console.error('[usage/top] query error', error)
      return NextResponse.json({ error: 'Failed to query top usage' }, { status: 500 })
    }

    // Aggregate by the 'by' dimension
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
        aggregated[key] = {
          key,
          tokens: 0,
          requests: 0,
          cost: 0,
          error_rate: 0,
          avg_latency: 0,
        }
      }
      
      aggregated[key].tokens += Number(row.tokens || 0)
      aggregated[key].requests += Number(row.requests || 0)
      aggregated[key].cost += Number(row.cost_usd || 0)
      
      // Weighted average for error_rate and avg_latency
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

    // Sort by the requested metric and take top N
    const sortKey = metric === 'cost' ? 'cost' : metric
    const rows = Object.values(aggregated)
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
