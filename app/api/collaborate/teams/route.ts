import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// GET /api/collaborate/teams
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get teams where user is a member
    const { data: teamMemberships, error: membershipError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId);

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!teamMemberships || teamMemberships.length === 0) {
      return NextResponse.json({ teams: [] });
    }

    const teamIds = teamMemberships.map(membership => membership.team_id);

    // Get team details
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .in('id', teamIds);

    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 500 });
    }

    // Get all members for these teams
    const { data: allMembers, error: membersError } = await supabase
      .from('team_members')
      .select('team_id, user_id, role')
      .in('team_id', teamIds);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Get user profiles for all members
    const userIds = [...new Set(allMembers.map(member => member.user_id))];
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', userIds);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Combine data to return complete team information with members
    const enrichedTeams = teams.map(team => {
      const teamMembers = allMembers
        .filter(member => member.team_id === team.id)
        .map(member => {
          const profile = userProfiles.find(profile => profile.id === member.user_id);
          return {
            id: member.user_id,
            name: profile?.full_name || 'Unknown User',
            email: profile?.email || '',
            avatar: profile?.avatar_url || null,
            status: profile?.status || 'offline',
            role: member.role,
            joinedAt: member.created_at,
            lastActive: profile?.last_active || new Date().toISOString(),
          };
        });

      return {
        ...team,
        members: teamMembers,
      };
    });

    return NextResponse.json({ teams: enrichedTeams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/collaborate/teams
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, category, isPublic, userId } = body;

    if (!name || !userId) {
      return NextResponse.json({ error: 'Name and userId are required' }, { status: 400 });
    }

    // Create new team
    const teamId = uuidv4();
    const { error: teamError } = await supabase
      .from('teams')
      .insert({
        id: teamId,
        name,
        description: description || '',
        category: category || 'General',
        is_public: isPublic || false,
        owner_id: userId,
        created_at: new Date().toISOString(),
      });

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 500 });
    }

    // Add creator as team member with owner role
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role: 'owner',
        created_at: new Date().toISOString(),
      });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      teamId,
      message: 'Team created successfully' 
    });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
