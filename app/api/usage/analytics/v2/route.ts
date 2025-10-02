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
type Dimension = 'service' | 'provider' | 'model' | 'feature' | 'origin' | 'quality' | 'per_result_bucket' | 'api_key_owner' | 'api_key_provider'

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

// Map feature_name -> service grouping (kept in sync with scripts/usage-analytics-schema.sql)
// Canonical feature taxonomy mapping
function mapFeatureCanonical(raw?: string): string {
  const f = (raw || '').toLowerCase()
  // Explorer family
  if (f.includes('explorer_assistant') || (f.includes('ai_chat') && f.includes('explorer'))) return 'explorer_assistant'
  if (f.includes('explorer_explore') || f.includes('literature_search') || f.includes('explore')) return 'explorer_explore'
  if (f.includes('explorer_ideas') || f.includes('ideas')) return 'explorer_ideas'
  // Planner & Deep research
  if (f.includes('plan_and_execute')) return 'plan_and_execute'
  if (f.includes('deep_research')) return 'deep_research'
  if (f.includes('planner_apply')) return 'planner_apply'
  // Writer / Paraphraser / Extract
  if (f.includes('writer')) return 'writer'
  if (f.includes('paraphraser') || f.includes('paraphrase')) return 'paraphraser'
  if (f.includes('extract')) return 'extract_data'
  // Topics / Citations / Chat PDF / Detector
  if (f.includes('topics_report') || (f.includes('topics') && f.includes('report'))) return 'topics_report'
  if (f.includes('topics_extract') || (f.includes('topics') && f.includes('extract'))) return 'topics_extract'
  if (f.includes('citations') || f.includes('citation')) return 'citations'
  if (f.includes('chat_pdf') || (f.includes('chat') && f.includes('pdf'))) return 'chat_pdf'
  if (f.includes('ai_detector') || f.includes('detector')) return 'ai_detector'
  // Default: treat as unknown instead of 'other' to make unmapped events visible
  return 'unknown'
}

function mapService(featureName?: string): string {
  const feature = mapFeatureCanonical(featureName)
  if (feature.startsWith('explorer_')) return 'explorer'
  if (feature === 'plan_and_execute' || feature === 'deep_research' || feature === 'planner_apply') return 'planner'
  if (feature === 'writer') return 'ai_writing'
  if (feature === 'paraphraser') return 'paraphraser'
  if (feature === 'extract_data') return 'extract'
  if (feature === 'topics_extract' || feature === 'topics_report') return 'topics'
  if (feature === 'citations') return 'citations'
  if (feature === 'chat_pdf') return 'chat_pdf'
  if (feature === 'ai_detector') return 'ai_detector'
  return 'unknown'
}

// Derive per_result_bucket from context value
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

// Aggregate from usage_events for additive metrics (tokens, requests, cost)
async function aggregateFromUsageEventsOnly(
  supabaseAdmin: any,
  userId: string,
  from: Date,
  to: Date,
  metric: Metric,
  dimension: Dimension,
  dayKeys: string[]
) {
  if (!isAdditiveMetric(metric)) return { series: {} as Record<string, number[]>, totals: {} as Record<string, number>, totalPerDay: Array(dayKeys.length).fill(0) as number[] }

  const indexByDay = new Map(dayKeys.map((d, i) => [d, i]))
  const series: Record<string, number[]> = {}
  const totals: Record<string, number> = {}
  const totalPerDay: number[] = Array(dayKeys.length).fill(0)

  const { data: rows, error } = await supabaseAdmin
    .from('usage_events')
    .select('created_at, feature_name, provider, model, api_key_owner, api_key_provider, tokens_charged, provider_cost_usd')
    .eq('user_id', userId)
    .gte('created_at', from.toISOString())
    .lt('created_at', new Date(to.getTime() + 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    return { series, totals, totalPerDay }
  }

  for (const row of (rows || []) as any[]) {
    const day = new Date(row.created_at).toISOString().slice(0, 10)
    const idx = indexByDay.get(day)
    if (idx === undefined) continue

    const dimKey = (() => {
      switch (dimension) {
        case 'service':
          return mapService(row.feature_name)
        case 'provider':
          return String((row.provider ?? 'unknown')).toLowerCase()
        case 'model':
          return String((row.model ?? 'unknown')).toLowerCase()
        case 'feature':
          return mapFeatureCanonical(row.feature_name)
        case 'api_key_owner':
          return String((row.api_key_owner ?? 'unknown')).toLowerCase()
        case 'api_key_provider':
          return String((row.api_key_provider ?? row.provider ?? 'unknown')).toLowerCase()
        default:
          return 'unknown'
      }
    })()

    const value = (() => {
      if (metric === 'tokens') return Number(row.tokens_charged || 0)
      if (metric === 'requests') return 1
      if (metric === 'cost') return Number(row.provider_cost_usd || 0)
      return 0
    })()

    if (!series[dimKey]) series[dimKey] = Array(dayKeys.length).fill(0)
    series[dimKey][idx] += value
    totals[dimKey] = (totals[dimKey] || 0) + value
    totalPerDay[idx] += value
  }

  return { series, totals, totalPerDay }
}

// Fallback aggregator: when usage_daily_mv has not been refreshed yet (or returns 0 rows),
// compute additive metrics (tokens, requests, cost) in Node from token_transactions.
async function aggregateFromTransactions(
  supabaseAdmin: any,
  userId: string,
  from: Date,
  to: Date,
  metric: Metric,
  dimension: Dimension
) {
  // Only support additive metrics in fallback; non-additive are not necessary for the simplified UI
  if (!isAdditiveMetric(metric)) return null

  const { data: rows, error } = await supabaseAdmin
    .from('token_transactions')
    .select('created_at, feature_name, operation_context, tokens_amount, provider_cost_usd, operation_type, success')
    .eq('user_id', userId)
    .gte('created_at', from.toISOString())
    .lt('created_at', new Date(to.getTime() + 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[analytics/v2] fallback query error', error)
    return null
  }

  const dayKeys = daysBetween(from, to)
  const indexByDay = new Map(dayKeys.map((d, i) => [d, i]))

  const series: Record<string, number[]> = {}
  const totals: Record<string, number> = {}
  const totalPerDay: number[] = Array(dayKeys.length).fill(0)

  for (const row of rows || []) {
    if ((row.operation_type || '').toLowerCase() !== 'deduct') continue
    const day = new Date(row.created_at).toISOString().slice(0, 10)
    const idx = indexByDay.get(day)
    if (idx === undefined) continue

    let ctx: any = {}
    try {
      ctx = typeof row.operation_context === 'string' ? JSON.parse(row.operation_context) : (row.operation_context || {})
    } catch {
      ctx = row.operation_context || {}
    }

    const dimKey = (() => {
      switch (dimension) {
        case 'service':
          return mapService(row.feature_name)
        case 'provider':
          return String((ctx.provider ?? 'other')).toLowerCase()
        case 'model':
          return String((ctx.model ?? 'other')).toLowerCase()
        case 'feature':
          return mapFeatureCanonical(row.feature_name)
        case 'origin':
          return String((ctx.origin ?? '')).toLowerCase() || 'unknown'
        case 'quality':
          return String((ctx.quality ?? '')).toLowerCase() || 'unknown'
        case 'per_result_bucket':
          return toPerResultBucket(ctx.per_result)
        case 'api_key_owner':
          return String((ctx.api_key_owner ?? ctx.apiKeyOwner ?? 'unknown')).toLowerCase()
        case 'api_key_provider':
          return String((ctx.api_key_provider ?? ctx.apiKeyProvider ?? ctx.provider ?? 'unknown')).toLowerCase()
        default:
          return 'unknown'
      }
    })()

    const value = (() => {
      if (metric === 'tokens') return Number(row.tokens_amount || 0)
      if (metric === 'requests') return 1
      if (metric === 'cost') return Number(row.provider_cost_usd || 0)
      return 0
    })()

    if (!series[dimKey]) series[dimKey] = Array(dayKeys.length).fill(0)
    series[dimKey][idx] += value
    totals[dimKey] = (totals[dimKey] || 0) + value
    totalPerDay[idx] += value
  }

  const totalMetric = totalPerDay.reduce((a, b) => a + b, 0)

  return { dayKeys, series, totals, totalPerDay, totalMetric }
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

    // Try to ensure the MV has data. Note: our SQL function uses CONCURRENTLY and may fail inside a transaction;
    // so we ignore any error here and continue with a safe fallback if needed.
    try {
      await supabaseAdmin.rpc('refresh_usage_daily_mv')
    } catch (e) {
      // best-effort only
    }

    // Build select string
    const selectCols = [
      'day',
      'service', 'provider', 'model', 'feature_name', 'origin', 'quality', 'per_result_bucket',
      'tokens', 'requests', 'cost_usd', 'avg_tokens', 'p95_tokens', 'error_rate'
    ]

    let { data, error } = await supabaseAdmin
      .from('usage_daily_mv')
      .select(selectCols.join(','))
      .eq('user_id', userId)
      .gte('day', from.toISOString())
      .lte('day', to.toISOString())
      .order('day', { ascending: true })

    // When MV query fails or returns no rows, fall back to computing from token_transactions for additive metrics
    if (error) {
      console.error('[analytics/v2] query error', error)
      data = null as any
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

      const key = (() => {
        switch (dimension) {
          case 'service':
            return mapService(row.feature_name)
          case 'feature':
            return mapFeatureCanonical(row.feature_name)
          case 'provider':
            return String((row.provider ?? 'unknown')).toLowerCase()
          case 'model':
            return String((row.model ?? 'unknown')).toLowerCase()
          default:
            return String(row[dimCol] || 'unknown')
        }
      })()
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

    // If MV yielded no rows, attempt fallback aggregation from token_transactions
    if (!data || (Array.isArray(data) && data.length === 0)) {
      const fallback = await aggregateFromTransactions(supabaseAdmin, userId, from, to, metric, dimension)
      if (fallback) {
        let { dayKeys: fkDays, series: fkSeries, totals: fkTotals, totalPerDay: fkTotalPerDay, totalMetric: fkTotalMetric } = fallback

        // Merge usage_events into fallback (additive metrics only)
        if (isAdditiveMetric(metric)) {
          const usageAgg = await aggregateFromUsageEventsOnly(supabaseAdmin, userId, from, to, metric, dimension, fkDays)
          Object.entries(usageAgg.series).forEach(([k, arr]) => {
            const nums = arr as number[]
            if (!fkSeries[k]) fkSeries[k] = Array(fkDays.length).fill(0)
            nums.forEach((v: number, i: number) => { fkSeries[k][i] += v })
          })
          Object.entries(usageAgg.totals).forEach(([k, v]) => {
            fkTotals[k] = (fkTotals[k] || 0) + (v as number)
          })
          usageAgg.totalPerDay.forEach((v: number, i: number) => { fkTotalPerDay[i] += v })
          fkTotalMetric += usageAgg.totalPerDay.reduce((a: number, b: number) => a + b, 0)
        }

        // Optional cumulative (after merging)
        if (cumulative) {
          const cum = (arr: number[]) => arr.map((v => (cum.s = (cum.s || 0) + v))) as any
          cum.s = 0; const t1 = cum([...fkTotalPerDay])
          Object.keys(fkSeries).forEach((k) => { cum.s = 0; fkSeries[k] = cum([...(fkSeries[k] || [])]) })
          for (let i = 0; i < fkTotalPerDay.length; i++) fkTotalPerDay[i] = t1[i]
        }

        // Optional compare (fallback, additive metrics only). Merge usage_events for previous period too.
        let previous: any = undefined
        if (compare) {
          const ms = startOfDayUTC(to).getTime() - startOfDayUTC(from).getTime() + 24*60*60*1000
          const prevTo = new Date(startOfDayUTC(from).getTime() - 24*60*60*1000)
          const prevFrom = new Date(prevTo.getTime() - ms + 24*60*60*1000)
          const prevAgg = await aggregateFromTransactions(supabaseAdmin, userId, prevFrom, prevTo, metric, dimension)
          if (prevAgg) {
            let { dayKeys: pDays, series: pSeries, totals: pTotals, totalPerDay: pTotalPerDay, totalMetric: pTotalMetric } = prevAgg
            if (isAdditiveMetric(metric)) {
              const prevUsage = await aggregateFromUsageEventsOnly(supabaseAdmin, userId, prevFrom, prevTo, metric, dimension, pDays)
              Object.entries(prevUsage.series).forEach(([k, arr]) => {
                const nums = arr as number[]
                if (!pSeries[k]) pSeries[k] = Array(pDays.length).fill(0)
                nums.forEach((v: number, i: number) => { pSeries[k][i] += v })
              })
              Object.entries(prevUsage.totals).forEach(([k, v]) => {
                pTotals[k] = (pTotals[k] || 0) + (v as number)
              })
              prevUsage.totalPerDay.forEach((v: number, i: number) => { pTotalPerDay[i] += v })
              pTotalMetric += prevUsage.totalPerDay.reduce((a: number, b: number) => a + b, 0)
            }
            if (cumulative) {
              const cum = (arr: number[]) => arr.map((v => (cum.s = (cum.s || 0) + v))) as any
              cum.s = 0; const t1 = cum([...pTotalPerDay])
              Object.keys(pSeries).forEach((k) => { cum.s = 0; pSeries[k] = cum([...(pSeries[k] || [])]) })
              for (let i = 0; i < pTotalPerDay.length; i++) pTotalPerDay[i] = t1[i]
            }
            previous = {
              from: startOfDayUTC(prevFrom).toISOString(),
              to: startOfDayUTC(prevTo).toISOString(),
              days: pDays,
              series: pSeries,
              totals: pTotals,
              totalMetric: pTotalMetric,
              totalPerDay: pTotalPerDay,
            }
          }
        }

        return NextResponse.json({
          from: startOfDayUTC(from).toISOString(),
          to: startOfDayUTC(to).toISOString(),
          days: fkDays,
          series: fkSeries,
          totals: fkTotals,
          totalMetric: fkTotalMetric,
          totalPerDay: fkTotalPerDay,
          metric,
          dimension,
          previous,
        })
      }
    }

    // Optionally merge usage_events (additive metrics only)
    let totalPerDay: number[] = Array(dayKeys.length).fill(0)
    if (isAdditiveMetric(metric)) {
      // Merge MV series into totals
      Object.values(series).forEach((arr: number[]) => {
        arr.forEach((v: number, i: number) => { totalPerDay[i] += v })
      })

      const usageAgg = await aggregateFromUsageEventsOnly(supabaseAdmin, userId, from, to, metric, dimension, dayKeys)
      // Merge usage_events series and totals
      Object.entries(usageAgg.series).forEach(([k, arr]) => {
        const nums = arr as number[]
        if (!series[k]) series[k] = Array(dayKeys.length).fill(0)
        nums.forEach((v: number, i: number) => { series[k][i] += v })
      })
      Object.entries(usageAgg.totals).forEach(([k, v]) => {
        totals[k] = (totals[k] || 0) + (v as number)
      })
      usageAgg.totalPerDay.forEach((v: number, i: number) => { totalPerDay[i] += v })
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
