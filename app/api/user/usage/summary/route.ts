import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Returns a per-user usage summary across features.
 * Requires Authorization: Bearer <access_token>
 * Response: { success, planName?, items: [{ feature_name, usage_count, limit_count, remaining, is_unlimited }] }
 */
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

    // Fetch usage summary via existing RPC used by increment endpoint
    const { data: summary, error: usageError } = await supabaseAdmin
      .rpc('get_user_usage_summary', { p_user_uuid: user.id })

    if (usageError) {
      console.error('Failed to get usage summary:', usageError)
      return NextResponse.json({ error: 'Failed to fetch usage summary' }, { status: 500 })
    }

    // Optionally try to fetch plan name if available via profile/plan RPC (ignore errors)
    let planName: string | undefined = undefined
    try {
      const { data: planRes } = await supabaseAdmin
        .rpc('get_user_plan', { p_user_uuid: user.id })
      if (planRes && typeof planRes === 'object' && 'plan_name' in planRes) {
        planName = (planRes as any).plan_name as string
      }
    } catch (_) {}

    return NextResponse.json({ success: true, planName, items: summary ?? [] })
  } catch (error) {
    console.error('Usage summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
