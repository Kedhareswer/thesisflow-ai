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

    // Get current user_tokens row
    const { data: tokenRow, error: fetchErr } = await supabaseAdmin
      .from('user_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchErr) {
      console.error('[tokens/refund] fetch tokens error', fetchErr)
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
    }

    if (!tokenRow) {
      console.warn('[tokens/refund] no token row found for user', user.id)
      return NextResponse.json({ error: 'No token record found' }, { status: 404 })
    }

    const dailyUsed = Number(tokenRow.daily_tokens_used || 0)
    const monthlyUsed = Number(tokenRow.monthly_tokens_used || 0)

    // Update user_tokens directly (ensure we don't go below 0)
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('user_tokens')
      .update({
        daily_tokens_used: Math.max(0, dailyUsed - amount),
        monthly_tokens_used: Math.max(0, monthlyUsed - amount),
      })
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle()

    if (updateErr) {
      console.error('[tokens/refund] update tokens error', updateErr)
      return NextResponse.json({ error: 'Failed to refund tokens' }, { status: 500 })
    }

    // Log transaction
    try {
      await supabaseAdmin
        .from('token_transactions')
        .insert({
          user_id: user.id,
          feature_name: feature,
          tokens_amount: amount,
          operation_type: 'refund',
          operation_context: context,
          success: true,
        })
    } catch (err: any) {
      console.warn('[tokens/refund] transaction log failed', err)
    }

    const { data: row } = await supabaseAdmin
      .from('user_tokens').select('*').eq('user_id', user.id).maybeSingle()

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
    console.error('[tokens/refund] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
