import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

function startOfDayUTC(d: Date) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  return dt
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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const to = body.to ? new Date(body.to) : new Date()
    const from = body.from ? new Date(body.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const fromISO = startOfDayUTC(from).toISOString()
    const toISO = new Date(startOfDayUTC(to).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()

    const { data, error } = await supabaseAdmin
      .from('token_transactions')
      .select('created_at, feature_name, tokens_amount, operation_context, success, operation_type')
      .eq('user_id', user.id)
      .eq('success', true)
      .eq('operation_type', 'deduct')
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[usage/analytics] query error', error)
      return NextResponse.json({ error: 'Failed to query usage' }, { status: 500 })
    }

    const dayKeys = daysBetween(from, to)

    const serviceKeys = ['explorer', 'summarizer', 'ai_assistant', 'ai_writing', 'other'] as const
    const providerTotals: Record<string, number[]> = {}
    const modelTotals: Record<string, number[]> = {}
    const serviceTotals: Record<(typeof serviceKeys)[number], number[]> = {
      explorer: Array(dayKeys.length).fill(0),
      summarizer: Array(dayKeys.length).fill(0),
      ai_assistant: Array(dayKeys.length).fill(0),
      ai_writing: Array(dayKeys.length).fill(0),
      other: Array(dayKeys.length).fill(0),
    }

    const indexByDay = new Map(dayKeys.map((d, i) => [d, i]))

    for (const row of data || []) {
      const date = new Date(row.created_at)
      const day = startOfDayUTC(date).toISOString().slice(0, 10)
      const idx = indexByDay.get(day)
      if (idx === undefined) continue
      const tokens: number = Number((row as any).tokens_amount || 0)
      const feature: string = String((row as any).feature_name || '')
      const ctx = (row as any).operation_context || {}
      const provider = String(ctx?.provider || 'other').toLowerCase()
      const model = String(ctx?.model || 'other').toLowerCase()

      // Map feature to service bucket
      let service: (typeof serviceKeys)[number] = 'other'
      if (feature.includes('literature')) service = 'explorer'
      else if (feature.includes('summary') || feature.includes('summar')) service = 'summarizer'
      else if (feature.includes('assistant') || feature.includes('chat')) service = 'ai_assistant'
      else if (feature.includes('generation') || feature.includes('write')) service = 'ai_writing'

      serviceTotals[service][idx] += tokens

      if (!providerTotals[provider]) providerTotals[provider] = Array(dayKeys.length).fill(0)
      providerTotals[provider][idx] += tokens

      if (!modelTotals[model]) modelTotals[model] = Array(dayKeys.length).fill(0)
      modelTotals[model][idx] += tokens
    }

    // Compute totals per dimension
    const sumArr = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
    const totals = {
      perServiceTokens: Object.fromEntries(Object.entries(serviceTotals).map(([k, v]) => [k, sumArr(v as number[])])),
      perProviderTokens: Object.fromEntries(Object.entries(providerTotals).map(([k, v]) => [k, sumArr(v as number[])])),
      perModelTokens: Object.fromEntries(Object.entries(modelTotals).map(([k, v]) => [k, sumArr(v as number[])])),
    }
    const totalTokens = Object.values(totals.perServiceTokens).reduce((a: number, b: any) => a + (b as number), 0)

    return NextResponse.json({
      from: startOfDayUTC(from).toISOString(),
      to: startOfDayUTC(to).toISOString(),
      days: dayKeys,
      series: {
        service: serviceTotals,
        provider: providerTotals,
        model: modelTotals,
      },
      totals,
      totalTokens,
    })
  } catch (error) {
    console.error('[usage/analytics] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
