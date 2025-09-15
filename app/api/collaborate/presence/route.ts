import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-presence");
    
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    const { status, activity } = await request.json()
    
    if (!status || !['online', 'away', 'offline'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be online, away, or offline' }, { status: 400 })
    }

    // Update user presence in the dedicated user_presence table
    const { data, error } = await supabaseAdmin
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
    const user = await requireAuth(request, "collaborate-presence");
    
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    // Get team members first
    const { data: teamMembers, error: teamError } = await supabaseAdmin
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)

    if (teamError) {
      console.error('Error getting team members:', teamError)
      return NextResponse.json({ error: 'Failed to get team members' }, { status: 500 })
    }

    if (!teamMembers || teamMembers.length === 0) {
      return NextResponse.json({ 
        success: true,
        presence: [] 
      })
    }

    // Get user profiles for team members
    const userIds = teamMembers.map(m => m.user_id)
    const { data: userProfiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds)

    if (profileError) {
      console.error('Error getting user profiles:', profileError)
      return NextResponse.json({ error: 'Failed to get user profiles' }, { status: 500 })
    }

    // Get presence data for team members
    const { data: presenceData, error: presenceError } = await supabaseAdmin
      .from('user_presence')
      .select('user_id, status, activity, last_seen, updated_at')
      .in('user_id', userIds)

    if (presenceError) {
      console.error('Error getting presence data:', presenceError)
      // Continue without presence data
    }

    // Create a map of presence data by user_id
    const presenceMap = new Map()
    if (presenceData) {
      presenceData.forEach(p => {
        presenceMap.set(p.user_id, p)
      })
    }

    // Format the data
    const formattedPresence = userProfiles?.map((profile: any) => {
      const presence = presenceMap.get(profile.id)
      return {
        id: profile.id,
        name: profile.full_name || profile.email || 'Unknown',
        email: profile.email,
        avatar: profile.avatar_url,
        status: presence?.status || 'offline',
        activity: presence?.activity || null,
        lastSeen: presence?.last_seen || profile.updated_at,
        updatedAt: presence?.updated_at || profile.updated_at
      }
    }) || []

    return NextResponse.json({ 
      success: true,
      presence: formattedPresence
    })

  } catch (error) {
    console.error('Error getting presence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
