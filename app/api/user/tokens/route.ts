import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
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

    // Get plan type for limits
    const { data: plan, error: planError } = await supabaseAdmin
      .from('user_plans')
      .select('plan_type')
      .eq('user_id', user.id)
      .maybeSingle()

    if (planError && planError.code !== 'PGRST116') {
      console.error('[user/tokens] plan fetch error', planError)
    }

    const planType = (plan?.plan_type || 'free').toLowerCase() === 'pro' ? 'pro' : 'free'
    const defaults = planType === 'pro'
      ? { daily_limit: 100, monthly_limit: 500 }
      : { daily_limit: 10, monthly_limit: 50 }

    // Upsert user_tokens row if missing
    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from('user_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    let row = tokenRow

    if (!row) {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('user_tokens')
        .insert({
          user_id: user.id,
          daily_tokens_used: 0,
          monthly_tokens_used: 0,
          daily_limit: defaults.daily_limit,
          monthly_limit: defaults.monthly_limit,
        })
        .select('*')
        .maybeSingle()
      if (insErr) {
        console.error('[user/tokens] insert error', insErr)
        return NextResponse.json({ error: 'Failed to initialize tokens' }, { status: 500 })
      }
      row = inserted
    } else {
      // Ensure limits match plan (soft-sync)
      const desiredDaily = defaults.daily_limit
      const desiredMonthly = defaults.monthly_limit
      if (row.daily_limit !== desiredDaily || row.monthly_limit !== desiredMonthly) {
        const { data: updated, error: updErr } = await supabaseAdmin
          .from('user_tokens')
          .update({ daily_limit: desiredDaily, monthly_limit: desiredMonthly })
          .eq('user_id', user.id)
          .select('*')
          .maybeSingle()
        if (!updErr && updated) row = updated
      }
    }

    return NextResponse.json({
      dailyUsed: Number(row.daily_tokens_used || 0),
      monthlyUsed: Number(row.monthly_tokens_used || 0),
      dailyLimit: Number(row.daily_limit || defaults.daily_limit),
      monthlyLimit: Number(row.monthly_limit || defaults.monthly_limit),
      dailyRemaining: Math.max(0, Number((row.daily_limit || defaults.daily_limit)) - Number(row.daily_tokens_used || 0)),
      monthlyRemaining: Math.max(0, Number((row.monthly_limit || defaults.monthly_limit)) - Number(row.monthly_tokens_used || 0)),
      lastDailyReset: row.last_daily_reset ?? null,
      lastMonthlyReset: row.last_monthly_reset ?? null,
      planType,
    })
  } catch (error) {
    console.error('[user/tokens] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
