import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { status, activity } = await request.json()
    
    if (!status || !['online', 'away', 'offline'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be online, away, or offline' }, { status: 400 })
    }

    // Update user presence
    const { data, error } = await supabase
      .from('user_presence')
      .upsert({
        user_id: user.id,
        status,
        activity: activity || null,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating presence:', error)
      return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      presence: data 
    })

  } catch (error) {
    console.error('Error in presence route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    // Get team members presence
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select(`
        user_id,
        user_profiles!inner(id, full_name, email, avatar_url),
        user_presence(status, activity, last_seen, updated_at)
      `)
      .eq('team_id', teamId)

    if (teamError) {
      console.error('Error getting team members:', teamError)
      return NextResponse.json({ error: 'Failed to get team presence' }, { status: 500 })
    }

    // Format the data
    const presenceData = teamMembers?.map((member: any) => ({
      id: member.user_id,
      name: member.user_profiles?.full_name || member.user_profiles?.email || 'Unknown',
      email: member.user_profiles?.email,
      avatar: member.user_profiles?.avatar_url,
      status: member.user_presence?.status || 'offline',
      activity: member.user_presence?.activity,
      lastSeen: member.user_presence?.last_seen,
      updatedAt: member.user_presence?.updated_at
    })) || []

    return NextResponse.json({ 
      presence: presenceData
    })

  } catch (error) {
    console.error('Error getting presence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
