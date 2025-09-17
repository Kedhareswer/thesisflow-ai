import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user plan (soft default if not present)
    const { data: plan, error: planError } = await supabaseAdmin
      .from('user_plans')
      .select('plan_type, status, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (planError && planError.code !== 'PGRST116') {
      console.error('Plan error:', planError)
      return NextResponse.json({ error: 'Failed to get plan' }, { status: 500 })
    }

    // Validate and normalize plan data
    const validStatuses = ['active', 'pending', 'canceled', 'expired']
    const validPlanTypes = ['free', 'pro']
    const normalizedPlan = plan 
      ? {
          plan_type: validPlanTypes.includes(plan.plan_type) ? plan.plan_type : 'free',
          status: validStatuses.includes(plan.status) ? plan.status : 'active',
          updated_at: plan.updated_at
        }
      : { plan_type: 'free', status: 'active' }

    // Get usage summary using the function
    let transformedUsage: any[] = []
    try {
      const { data: usage, error: usageError } = await supabaseAdmin
        .rpc('get_user_usage_summary', { p_user_uuid: user.id })
      if (usageError) {
        console.warn('[user/plan] get_user_usage_summary failed; returning plan without usage', usageError)
      } else {
        transformedUsage = (usage || []).map((item: any) => ({
          feature: item.feature_name,
          usage_count: item.usage_count,
          limit_count: item.limit_count,
          remaining: item.remaining,
          is_unlimited: item.is_unlimited
        }))
      }
    } catch (rpcErr) {
      console.warn('[user/plan] usage RPC threw; returning plan without usage', rpcErr)
    }

    const res = NextResponse.json({
      plan: normalizedPlan,
      usage: transformedUsage
    })
    // Optional debug header to verify which project handled the request
    res.headers.set('x-plan-source', new URL(supabaseUrl).host)
    return res

  } catch (error) {
    console.error('Error getting user plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { feature } = await request.json()
    
    if (!feature) {
      return NextResponse.json({ error: 'Feature is required' }, { status: 400 })
    }

    // Get user from auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user can use the feature
    const { data: canUse, error: checkError } = await supabaseAdmin
      .rpc('can_use_feature', { p_user_uuid: user.id, p_feature_name: feature })

    if (checkError) {
      console.error('Check error:', checkError)
      return NextResponse.json({ error: 'Failed to check usage' }, { status: 500 })
    }

    if (!canUse) {
      return NextResponse.json({ 
        error: 'Usage limit exceeded',
        limit_exceeded: true
      }, { status: 429 })
    }

    // Get or create user_usage record
    let { data: usageRow, error: fetchUsageErr } = await supabaseAdmin
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('feature_name', feature)
      .maybeSingle()

    if (fetchUsageErr) {
      console.error('Fetch usage error:', fetchUsageErr)
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }

    let newUsageCount = 1
    if (!usageRow) {
      // Create new usage record
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('user_usage')
        .insert({
          user_id: user.id,
          feature_name: feature,
          usage_count: 1,
        })
        .select('*')
        .maybeSingle()
      
      if (insertErr) {
        console.error('Insert usage error:', insertErr)
        return NextResponse.json({ error: 'Failed to create usage record' }, { status: 500 })
      }
      usageRow = inserted
    } else {
      // Update existing usage record
      newUsageCount = (usageRow.usage_count || 0) + 1
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('user_usage')
        .update({ usage_count: newUsageCount })
        .eq('user_id', user.id)
        .eq('feature_name', feature)
        .select('*')
        .maybeSingle()
      
      if (updateErr) {
        console.error('Update usage error:', updateErr)
        return NextResponse.json({ error: 'Failed to update usage' }, { status: 500 })
      }
      usageRow = updated
    }

    return NextResponse.json({ 
      success: true,
      incremented: newUsageCount
    })
  } catch (error) {
    console.error('Error incrementing usage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 