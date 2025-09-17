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

    // Get current user_tokens row (create if missing)
    let { data: tokenRow, error: fetchTokenErr } = await supabaseAdmin
      .from('user_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchTokenErr) {
      console.error('[tokens/deduct] fetch tokens error', fetchTokenErr)
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
    }

    // Initialize if missing
    if (!tokenRow) {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('user_tokens')
        .insert({
          user_id: user.id,
          daily_tokens_used: 0,
          monthly_tokens_used: 0,
          daily_limit: 10,
          monthly_limit: 50,
        })
        .select('*')
        .maybeSingle()
      if (insertErr) {
        console.error('[tokens/deduct] insert tokens error', insertErr)
        return NextResponse.json({ error: 'Failed to initialize tokens' }, { status: 500 })
      }
      tokenRow = inserted
    }

    const dailyUsed = Number(tokenRow.daily_tokens_used || 0)
    const monthlyUsed = Number(tokenRow.monthly_tokens_used || 0)
    const dailyLimit = Number(tokenRow.daily_limit || 10)
    const monthlyLimit = Number(tokenRow.monthly_limit || 50)

    // Check if user has enough tokens
    if (dailyUsed + amount > dailyLimit || monthlyUsed + amount > monthlyLimit) {
      return NextResponse.json({
        error: 'Insufficient tokens',
        dailyRemaining: Math.max(0, dailyLimit - dailyUsed),
        monthlyRemaining: Math.max(0, monthlyLimit - monthlyUsed),
      }, { status: 429 })
    }

    // Update user_tokens directly
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('user_tokens')
      .update({
        daily_tokens_used: dailyUsed + amount,
        monthly_tokens_used: monthlyUsed + amount,
      })
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle()

    if (updateErr) {
      console.error('[tokens/deduct] update tokens error', updateErr)
      return NextResponse.json({ error: 'Failed to deduct tokens' }, { status: 500 })
    }

    // Log transaction
    try {
      await supabaseAdmin
        .from('token_transactions')
        .insert({
          user_id: user.id,
          feature_name: feature,
          tokens_amount: amount,
          operation_type: 'deduct',
          operation_context: context,
          success: true,
        })
    } catch (err: any) {
      console.warn('[tokens/deduct] transaction log failed', err)
    }

    tokenRow = updated || tokenRow

    // Return updated token status
    const { data: row, error: finalFetchErr } = await supabaseAdmin
      .from('user_tokens').select('*').eq('user_id', user.id).maybeSingle()
    if (finalFetchErr) {
      console.warn('[tokens/deduct] deduction ok but failed to fetch tokens row', finalFetchErr)
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
