import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

/**
 * SECURE USAGE INCREMENT ENDPOINT
 * This endpoint safely increments user usage with proper authentication
 * and limit checking. It NEVER allows usage resets from client-side.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { feature, metadata } = await request.json()

    if (!feature) {
      return NextResponse.json({ error: 'Feature name required' }, { status: 400 })
    }


    // Get current usage and limits
    const { data: currentUsage, error: usageError } = await supabaseAdmin
      .rpc('get_user_usage_summary', { p_user_uuid: user.id })

    if (usageError) {
      console.error('Failed to get usage:', usageError)
      return NextResponse.json({ error: 'Failed to check usage' }, { status: 500 })
    }

    // Find the specific feature usage
    const featureUsage = currentUsage?.find((item: any) => item.feature_name === feature)
    
    if (!featureUsage) {
      return NextResponse.json({ error: 'Invalid feature' }, { status: 400 })
    }

    // Check if user has reached limit (unless unlimited)
    if (!featureUsage.is_unlimited && featureUsage.remaining <= 0) {
      return NextResponse.json({ 
        error: 'Usage limit exceeded',
        feature,
        currentUsage: featureUsage.usage_count,
        limit: featureUsage.limit_count
      }, { status: 403 })
    }

    // Get or create user_usage record directly
    let { data: usageRow, error: fetchUsageErr } = await supabaseAdmin
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('feature_name', feature)
      .maybeSingle()

    if (fetchUsageErr) {
      console.error('Failed to fetch usage:', fetchUsageErr)
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }

    let actualNewCount = 1
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
        console.error('Failed to insert usage:', insertErr)
        return NextResponse.json({ error: 'Failed to create usage record' }, { status: 500 })
      }
      actualNewCount = 1
    } else {
      // Update existing usage record
      actualNewCount = (usageRow.usage_count || 0) + 1
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('user_usage')
        .update({ usage_count: actualNewCount })
        .eq('user_id', user.id)
        .eq('feature_name', feature)
        .select('*')
        .maybeSingle()
      
      if (updateErr) {
        console.error('Failed to update usage:', updateErr)
        return NextResponse.json({ error: 'Failed to update usage' }, { status: 500 })
      }
    }

    const actualRemaining = featureUsage.is_unlimited
      ? -1
      : (featureUsage.limit_count - actualNewCount)

    return NextResponse.json({
      success: true,
      newUsageCount: actualNewCount,
      remaining: actualRemaining,
      isUnlimited: featureUsage.is_unlimited
    })

  } catch (error) {
    console.error('Usage increment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Disable all other HTTP methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
