import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { socketService } from '@/lib/services/socket.service';

// Type definition for the find_user_by_email function return
type UserByEmail = {
  id: string
  full_name: string
  avatar_url: string | null
  email: string
}

// POST /api/collaborate/teams/members - Add member to team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, email, role = 'viewer' } = body;

    if (!teamId || !email) {
      return NextResponse.json({ error: 'Team ID and email are required' }, { status: 400 });
    }

    // Check if team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Find user by email using the database function
    const { data: user, error: userError } = await supabase
      .rpc('find_user_by_email', { user_email: email })
      .single();

    // If user doesn't exist, return error
    let userId: string;
    let userName: string;
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'User not found. The user must have an account to be added to the team.' 
      }, { status: 404 });
    } else {
      // Type assertion since we know the function returns the correct structure
      const userData = user as UserByEmail;
      userId = userData.id;
      userName = userData.full_name;
    }

    // Check if user is already a member
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 });
    }

    // Add user to team
    const { error: addError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role,
        created_at: new Date().toISOString(),
      });

    if (addError) {
      return NextResponse.json({ error: addError.message }, { status: 500 });
    }

    // Add system message to chat
    const { error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        team_id: teamId,
        user_id: 'system',
        content: `${userName} joined the team`,
        type: 'system',
        created_at: new Date().toISOString(),
      });

    if (messageError) {
      console.error('Error adding system message:', messageError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Member added successfully',
      userId,
      userName
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/collaborate/teams/members - Get team members
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Get team members
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('user_id, role, created_at')
      .eq('team_id', teamId);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ members: [] });
    }

    // Get user profiles for all members
    const userIds = members.map(member => member.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', userIds);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Combine data
    const enrichedMembers = members.map(member => {
      const profile = profiles.find(p => p.id === member.user_id) || {
        full_name: 'Unknown User',
        email: '',
        status: 'offline',
        last_active: null,
        avatar_url: null
      };

      return {
        id: member.user_id,
        name: profile.full_name,
        email: profile.email,
        status: profile.status,
        role: member.role,
        joinedAt: member.created_at,
        lastActive: profile.last_active || member.created_at,
        avatar: profile.avatar_url
      };
    });

    return NextResponse.json({ members: enrichedMembers });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
