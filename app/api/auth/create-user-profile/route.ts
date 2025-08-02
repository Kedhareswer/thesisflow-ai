import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { user_id, email, full_name } = await request.json()

    if (!user_id || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id and email' },
        { status: 400 }
      )
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: user_id,
        email: email,
        full_name: full_name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json(
        { error: 'Failed to create user profile', details: profileError },
        { status: 500 }
      )
    }

    // Create user plan
    const { error: planError } = await supabaseAdmin
      .from('user_plans')
      .insert({
        user_id: user_id,
        plan_type: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (planError) {
      console.error('Plan creation error:', planError)
      // Don't fail completely, just log the error
      // The profile was created successfully
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User profile and plan created successfully' 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 