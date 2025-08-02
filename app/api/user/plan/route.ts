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

    // Get user plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from('user_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (planError && planError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to get plan' }, { status: 500 })
    }

    // Get usage summary
    const { data: usage, error: usageError } = await supabaseAdmin
      .rpc('get_user_usage_summary', { user_uuid: user.id })

    if (usageError) {
      return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 })
    }

    return NextResponse.json({
      plan: plan || { plan_type: 'free', status: 'active' },
      usage: usage || []
    })
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
      .rpc('can_use_feature', { user_uuid: user.id, feature_name: feature })

    if (checkError) {
      return NextResponse.json({ error: 'Failed to check usage' }, { status: 500 })
    }

    if (!canUse) {
      return NextResponse.json({ 
        error: 'Usage limit exceeded',
        limit_exceeded: true
      }, { status: 429 })
    }

    // Increment usage
    const { data: incremented, error: incrementError } = await supabaseAdmin
      .rpc('increment_usage', { user_uuid: user.id, feature_name: feature })

    if (incrementError) {
      return NextResponse.json({ error: 'Failed to increment usage' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      incremented: incremented
    })
  } catch (error) {
    console.error('Error incrementing usage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 