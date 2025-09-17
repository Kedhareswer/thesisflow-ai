import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

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

    const { feature, amount = 1, context = {} } = await request.json().catch(() => ({}))
    if (!feature) {
      return NextResponse.json({ error: 'Feature is required' }, { status: 400 })
    }

    // First, check user tokens
    const { data: check, error: checkErr } = await supabaseAdmin
      .rpc('check_user_tokens', { p_user_id: user.id, p_tokens_needed: amount })
    if (checkErr) {
      console.error('[tokens/deduct] check_user_tokens error', checkErr)
      return NextResponse.json({ error: 'Failed to check tokens' }, { status: 500 })
    }
    if (!check?.has_tokens) {
      return NextResponse.json({
        error: 'Insufficient tokens',
        dailyRemaining: check?.daily_remaining ?? 0,
        monthlyRemaining: check?.monthly_remaining ?? 0,
      }, { status: 429 })
    }

    // Deduct tokens
    const { data: deducted, error: deductErr } = await supabaseAdmin
      .rpc('deduct_user_tokens', {
        p_user_id: user.id,
        p_feature_name: feature,
        p_tokens_amount: amount,
        p_context: context,
      })

    if (deductErr) {
      console.error('[tokens/deduct] deduct_user_tokens error', deductErr)
      return NextResponse.json({ error: 'Failed to deduct tokens' }, { status: 500 })
    }
    if (!deducted?.success) {
      return NextResponse.json({ error: deducted?.error || 'Token deduction failed' }, { status: 400 })
    }

    // Return updated token status
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('user_tokens').select('*').eq('user_id', user.id).maybeSingle()
    if (fetchErr) {
      console.warn('[tokens/deduct] deduction ok but failed to fetch tokens row', fetchErr)
    }

    return NextResponse.json({
      success: true,
      dailyUsed: Number(row?.daily_tokens_used ?? 0),
      monthlyUsed: Number(row?.monthly_tokens_used ?? 0),
      dailyLimit: Number(row?.daily_limit ?? 0),
      monthlyLimit: Number(row?.monthly_limit ?? 0),
      dailyRemaining: Math.max(0, Number(row?.daily_limit ?? 0) - Number(row?.daily_tokens_used ?? 0)),
      monthlyRemaining: Math.max(0, Number(row?.monthly_limit ?? 0) - Number(row?.monthly_tokens_used ?? 0)),
    })
  } catch (error) {
    console.error('[tokens/deduct] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
