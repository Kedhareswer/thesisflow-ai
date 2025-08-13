import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

/**
 * CRITICAL SECURITY ENDPOINT
 * This endpoint should ONLY be called by:
 * 1. Stripe webhooks (subscription renewals)
 * 2. Admin users with proper authorization
 * 3. System cron jobs for monthly resets
 * 
 * NEVER allow client-side calls to reset usage
 */
export async function POST(request: NextRequest) {
  try {
    // 🚨 CRITICAL: Block all non-system requests
    const systemKey = request.headers.get('x-system-key')
    const isStripeWebhook = request.headers.get('stripe-signature')
    
    // Only allow system or Stripe webhook calls
    if (!systemKey && !isStripeWebhook) {
      return NextResponse.json({ 
        error: 'Forbidden: Usage reset not allowed from client' 
      }, { status: 403 })
    }

    // Validate system key for non-webhook requests
    if (systemKey && systemKey !== process.env.SYSTEM_RESET_KEY) {
      return NextResponse.json({ error: 'Invalid system key' }, { status: 401 })
    }

    const { userId, reason } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Log the reset for audit purposes
    console.log('🔄 Usage reset requested', {
      userId,
      reason,
      timestamp: new Date().toISOString(),
      source: isStripeWebhook ? 'stripe' : 'system'
    })

    // Reset user usage
    const { error } = await supabaseAdmin
      .rpc('reset_user_usage', { p_user_uuid: userId })

    if (error) {
      console.error('Failed to reset usage:', error)
      return NextResponse.json({ error: 'Failed to reset usage' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Usage reset successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Usage reset error:', error)
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
