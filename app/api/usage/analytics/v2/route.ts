import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/server/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Create Supabase admin client with proper environment validation
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }
  
  if (!serviceRoleKey) {
    throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY')
  }
  
  return createClient(supabaseUrl, serviceRoleKey)
}

type Metric = 'tokens' | 'requests' | 'cost' | 'avg_tokens' | 'p95_tokens' | 'avg_latency' | 'p95_latency'
type Dimension = 'service' | 'provider' | 'model' | 'feature' | 'origin' | 'quality' | 'per_result_bucket'

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function daysBetween(from: Date, to: Date): string[] {
  const days: string[] = []
  let cur = startOfDayUTC(from)
  const end = startOfDayUTC(to)
  while (cur.getTime() <= end.getTime()) {
    days.push(cur.toISOString().slice(0, 10))
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000)
  }
  return days
}

function parseRange(body: any) {
  const to = body?.to ? new Date(body.to) : new Date()
  const from = body?.from ? new Date(body.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const fromUTC = startOfDayUTC(from)
  const toUTC = startOfDayUTC(to)
  return { from: fromUTC, to: toUTC }
}

function isAdditiveMetric(metric: Metric) {
  return metric === 'tokens' || metric === 'requests' || metric === 'cost'
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment and create Supabase admin client
    let supabaseAdmin
    try {
      supabaseAdmin = createSupabaseAdmin()
    } catch (envError: any) {
      console.error('[analytics/v2] Environment validation failed:', envError.message)
      return NextResponse.json(
        { error: 'Server configuration error: Missing required environment variables' }, 
        { status: 500 }
      )
    }

    const auth = await requireAuth(request)
    if ('error' in auth) return auth.error
    const userId = auth.user.id

    const body = await request.json().catch(() => ({}))
    const metric: Metric = (body.metric || 'tokens')
    const dimension: Dimension = (body.dimension || 'service')
    const compare: boolean = Boolean(body.compare)
    const cumulative: boolean = Boolean(body.cumulative)

    const { from, to } = parseRange(body)

    const dayKeys = daysBetween(from, to)

    // Build select string
    const selectCols = [
      'day',
      'service', 'provider', 'model', 'feature_name', 'origin', 'quality', 'per_result_bucket',
      'tokens', 'requests', 'cost_usd', 'avg_tokens', 'p95_tokens', 'avg_latency', 'p95_latency', 'error_rate'
    ]

    const { data, error } = await supabaseAdmin
      .from('usage_daily_mv')
      .select(selectCols.join(','))
      .eq('user_id', userId)
      .gte('day', from.toISOString())
      .lte('day', to.toISOString())
      .order('day', { ascending: true })

    if (error) {
      console.error('[analytics/v2] query error', error)
      return NextResponse.json({ error: 'Failed to query usage' }, { status: 500 })
    }

    const dimCol = dimension === 'feature' ? 'feature_name' : dimension
    const metricCol = metric === 'cost' ? 'cost_usd' : metric

    const indexByDay = new Map(dayKeys.map((d, i) => [d, i]))

    // series: Record<dimKey, number[]> and totals
    const series: Record<string, number[]> = {}
    const totals: Record<string, number> = {}

    // For weighted totals of averages
    const dayWeightSum: number[] = Array(dayKeys.length).fill(0)
    const dayWeightedValueSum: number[] = Array(dayKeys.length).fill(0)

    ;(data || []).forEach((row: any) => {
      const day = new Date(row.day).toISOString().slice(0, 10)
      const idx = indexByDay.get(day)
      if (idx === undefined) return

      const key = String(row[dimCol] || 'unknown')
      const val: number = Number(row[metricCol] ?? 0)

      if (!series[key]) series[key] = Array(dayKeys.length).fill(0)
      series[key][idx] += val

      totals[key] = (totals[key] || 0) + val

      // Weighted totals only for average-like metrics
      if (!isAdditiveMetric(metric)) {
        const weight = Number(row.requests ?? 0) // weight by requests
        if (weight > 0 && !Number.isNaN(val)) {
          dayWeightSum[idx] += weight
          dayWeightedValueSum[idx] += val * weight
        }
      }
    })

    // Build total overlay
    const totalPerDay: number[] = Array(dayKeys.length).fill(0)
    if (isAdditiveMetric(metric)) {
      Object.values(series).forEach((arr) => {
        arr.forEach((v, i) => { totalPerDay[i] += v })
      })
    } else {
      // Compute weighted average where possible
      for (let i = 0; i < totalPerDay.length; i++) {
        totalPerDay[i] = dayWeightSum[i] > 0 ? dayWeightedValueSum[i] / dayWeightSum[i] : 0
      }
    }

    // Optionally cumulative
    if (cumulative) {
      const cum = (arr: number[]) => arr.map((v => (cum.s = (cum.s || 0) + v))) as any
      cum.s = 0; const t1 = cum([...totalPerDay])
      Object.keys(series).forEach((k) => { cum.s = 0; series[k] = cum([...series[k]]) })
      for (let i = 0; i < totalPerDay.length; i++) totalPerDay[i] = t1[i]
    }

    // Optional compare-to-previous
    let previous: any = undefined
    if (compare) {
      const ms = startOfDayUTC(to).getTime() - startOfDayUTC(from).getTime() + 24*60*60*1000
      const prevTo = new Date(startOfDayUTC(from).getTime() - 24*60*60*1000)
      const prevFrom = new Date(prevTo.getTime() - ms + 24*60*60*1000)
      const prevDays = daysBetween(prevFrom, prevTo)
      const { data: pData, error: pErr } = await supabaseAdmin
        .from('usage_daily_mv')
        .select(selectCols.join(','))
        .eq('user_id', userId)
        .gte('day', prevFrom.toISOString())
        .lte('day', prevTo.toISOString())
        .order('day', { ascending: true })
      if (!pErr) {
        const idxPrev = new Map(prevDays.map((d, i) => [d, i]))
        const pSeries: Record<string, number[]> = {}
        const pTotals: Record<string, number> = {}
        const pDayWeight: number[] = Array(prevDays.length).fill(0)
        const pDayWeighted: number[] = Array(prevDays.length).fill(0)
        ;(pData || []).forEach((row: any) => {
          const day = new Date(row.day).toISOString().slice(0, 10)
          const idx = idxPrev.get(day)
          if (idx === undefined) return
          const key = String(row[dimCol] || 'unknown')
          const val: number = Number(row[metricCol] ?? 0)
          if (!pSeries[key]) pSeries[key] = Array(prevDays.length).fill(0)
          pSeries[key][idx] += val
          pTotals[key] = (pTotals[key] || 0) + val
          if (!isAdditiveMetric(metric)) {
            const weight = Number(row.requests ?? 0)
            if (weight > 0 && !Number.isNaN(val)) {
              pDayWeight[idx] += weight
              pDayWeighted[idx] += val * weight
            }
          }
        })
        const pTotalPerDay: number[] = Array(prevDays.length).fill(0)
        if (isAdditiveMetric(metric)) {
          Object.values(pSeries).forEach((arr) => arr.forEach((v, i) => pTotalPerDay[i] += v))
        } else {
          for (let i = 0; i < pTotalPerDay.length; i++) {
            pTotalPerDay[i] = pDayWeight[i] > 0 ? pDayWeighted[i] / pDayWeight[i] : 0
          }
        }
        // Calculate previous period totalMetric correctly
        let prevTotalMetric: number
        if (isAdditiveMetric(metric)) {
          // For additive metrics, sum the daily totals
          prevTotalMetric = pTotalPerDay.reduce((a, b) => a + b, 0)
        } else {
          // For non-additive metrics, compute weighted average across entire range
          const prevTotalNumerator = pDayWeighted.reduce((a, b) => a + b, 0)
          const prevTotalDenominator = pDayWeight.reduce((a, b) => a + b, 0)
          prevTotalMetric = prevTotalDenominator > 0 ? prevTotalNumerator / prevTotalDenominator : 0
        }
        
        previous = {
          from: prevFrom.toISOString(),
          to: prevTo.toISOString(),
          days: prevDays,
          series: pSeries,
          totals: pTotals,
          totalMetric: prevTotalMetric,
          totalPerDay: pTotalPerDay,
        }
      }
    }

    const totalsByKey: Record<string, number> = totals
    
    // Calculate totalMetric correctly for both additive and non-additive metrics
    let totalMetric: number
    if (isAdditiveMetric(metric)) {
      // For additive metrics, sum the daily totals
      totalMetric = totalPerDay.reduce((a, b) => a + b, 0)
    } else {
      // For non-additive metrics, compute weighted average across entire range
      const totalNumerator = dayWeightedValueSum.reduce((a, b) => a + b, 0)
      const totalDenominator = dayWeightSum.reduce((a, b) => a + b, 0)
      totalMetric = totalDenominator > 0 ? totalNumerator / totalDenominator : 0
    }

    return NextResponse.json({
      from: startOfDayUTC(from).toISOString(),
      to: startOfDayUTC(to).toISOString(),
      days: dayKeys,
      series,
      totals: totalsByKey,
      totalMetric,
      totalPerDay,
      metric,
      dimension,
      previous,
    })
  } catch (err) {
    console.error('[analytics/v2] unexpected error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
