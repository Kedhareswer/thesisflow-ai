import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils';

// Teams API endpoints
// Handles: Create team, Get user teams, Update team, Delete team

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-teams");
    
    const { searchParams } = new URL(request.url);
    const includePublic = searchParams.get('public') === 'true';
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    // Get teams where user is a member or owner
    let query = supabaseAdmin
      .from('teams')
      .select(`
        *,
        team_members!inner(user_id, role, joined_at)
      `)
      .eq('team_members.user_id', user.id)
      .order('created_at', { ascending: false });

    // Add category filter if specified
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Add search filter if specified
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: userTeams, error: userTeamsError } = await query;

    if (userTeamsError) {
      console.error('Error fetching user teams:', userTeamsError);
      return NextResponse.json(
        { error: "Failed to fetch teams" },
        { status: 500 }
      );
    }

    let allTeams = userTeams || [];

    // Get emails from auth.users for all users
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    // Create a map of auth users for email lookup
    const authUsersMap: { [key: string]: any } = {};
    if (!authError && authUsers) {
      authUsers.forEach(user => {
        authUsersMap[user.id] = user;
      });
    }

    // Get all team members for these teams with their profiles
    if (allTeams.length > 0) {
      const teamIds = allTeams.map(team => team.id);
      
      const { data: teamMembersData, error: membersError } = await supabaseAdmin
        .from('team_members')
        .select(`
          team_id,
          user_id,
          role,
          joined_at
        `)
        .in('team_id', teamIds);

      if (!membersError && teamMembersData) {
        // Get user profiles for all members
        const userIds = [...new Set(teamMembersData.map(member => member.user_id))];
        
        const { data: userProfiles, error: profilesError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, full_name, avatar_url, status, last_active')
          .in('id', userIds);

        if (!profilesError && userProfiles) {
          // Create a map of user profiles for quick lookup
          const profilesMap: { [key: string]: any } = userProfiles.reduce((acc: { [key: string]: any }, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});

          // Add members data to teams
          allTeams = allTeams.map(team => {
            const teamMembers = teamMembersData
              .filter(member => member.team_id === team.id)
              .map(member => {
                const profile = profilesMap[member.user_id] || {};
                const authUser = authUsersMap[member.user_id] || {};
                return {
                user_id: member.user_id,
                role: member.role,
                joined_at: member.joined_at,
                  user_profile: {
                    ...profile,
                    email: authUser.email || profile.email || ''
                  }
                };
              });

            return {
              ...team,
              members: teamMembers
            };
          });
        }
      }
    }

    // If includePublic is true, also fetch public teams user is not a member of
    if (includePublic) {
      const userTeamIds = allTeams.map(team => team.id);
      
      let publicQuery = supabaseAdmin
        .from('teams')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      // Exclude teams user is already a member of
      if (userTeamIds.length > 0) {
        publicQuery = publicQuery.not('id', 'in', `(${userTeamIds.join(',')})`);
      }

      // Add category filter if specified
      if (category && category !== 'all') {
        publicQuery = publicQuery.eq('category', category);
      }

      // Add search filter if specified
      if (search) {
        publicQuery = publicQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data: publicTeams, error: publicTeamsError } = await publicQuery;

      if (!publicTeamsError && publicTeams && publicTeams.length > 0) {
        // Get members for public teams
        const publicTeamIds = publicTeams.map(team => team.id);
        
        const { data: publicTeamMembersData, error: publicMembersError } = await supabaseAdmin
          .from('team_members')
          .select(`
            team_id,
            user_id,
            role,
            joined_at
          `)
          .in('team_id', publicTeamIds);

        if (!publicMembersError && publicTeamMembersData) {
          // Get user profiles for public team members
          const publicUserIds = [...new Set(publicTeamMembersData.map(member => member.user_id))];
          
          const { data: publicUserProfiles, error: publicProfilesError } = await supabaseAdmin
            .from('user_profiles')
            .select('id, full_name, avatar_url, status, last_active')
            .in('id', publicUserIds);

          if (!publicProfilesError && publicUserProfiles) {
            // Create a map of user profiles for quick lookup
            const publicProfilesMap: { [key: string]: any } = publicUserProfiles.reduce((acc: { [key: string]: any }, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {});

            // Add members data to public teams and mark as discoverable
            const discoverableTeams = publicTeams.map(team => {
              const teamMembers = publicTeamMembersData
                .filter(member => member.team_id === team.id)
                .map(member => {
                  const profile = publicProfilesMap[member.user_id] || {};
                  const authUser = authUsersMap[member.user_id] || {};
                  return {
                  user_id: member.user_id,
                  role: member.role,
                  joined_at: member.joined_at,
                    user_profile: {
                      ...profile,
                      email: authUser.email || profile.email || ''
                    }
                  };
                });

              return {
                ...team,
                members: teamMembers,
                isDiscoverable: true,
                userRole: null
              };
            });
            allTeams = [...allTeams, ...discoverableTeams];
          }
        }
      }
    }

    // Transform the data to include member count and user role
    const transformedTeams = allTeams.map(team => {
      const userMember = team.team_members?.find((member: any) => member.user_id === user.id);

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        category: team.category,
        is_public: team.is_public,
        owner_id: team.owner_id,
        created_at: team.created_at,
        updated_at: team.updated_at,
        member_count: team.members?.length || 0,
        user_role: userMember?.role || null,
        joined_at: userMember?.joined_at || null,
        isDiscoverable: team.isDiscoverable || false,
        members: team.members?.map((member: any) => ({
          user_id: member.user_id,
          role: member.role,
          joined_at: member.joined_at,
          user_profile: member.user_profile
        })) || []
      };
    });

    return NextResponse.json({
      success: true,
      teams: transformedTeams
    });
  } catch (error) {
    console.error("Teams GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-teams");
    
    const { name, description, category = 'Research', isPublic = false } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['Research', 'Study Group', 'Project', 'Discussion'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    // Check if user already has too many teams (optional limit)
    const { data: userTeamsCount } = await supabaseAdmin
      .from('team_members')
      .select('team_id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('role', 'owner');

    if (userTeamsCount && userTeamsCount.length >= 10) { // Limit to 10 owned teams
      return NextResponse.json(
        { error: "You have reached the maximum number of teams (10)" },
        { status: 429 }
      );
    }

    // Create the team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        name: name.trim(),
        description: description?.trim() || '',
        category,
        is_public: isPublic,
        owner_id: user.id
      })
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError);
      return NextResponse.json(
        { error: "Failed to create team" },
        { status: 500 }
      );
    }

    // Add creator as team owner
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'owner',
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      console.error('Error adding team owner:', memberError);
      
      // Cleanup: delete the team if we can't add the owner
      await supabaseAdmin
        .from('teams')
        .delete()
        .eq('id', team.id);

      return NextResponse.json(
        { error: "Failed to set up team ownership" },
        { status: 500 }
      );
    }

    // Get the complete team data with member info
    const { data: completeTeam } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', team.id)
      .single();

    // Get team members separately
    const { data: teamMembers } = await supabaseAdmin
      .from('team_members')
      .select(`
        user_id,
        role,
        joined_at
      `)
      .eq('team_id', team.id);

    // Get user profiles for members
    if (teamMembers && teamMembers.length > 0) {
      const memberUserIds = teamMembers.map(member => member.user_id);
      
      const { data: memberProfiles } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', memberUserIds);

      if (memberProfiles) {
        const profilesMap: { [key: string]: any } = memberProfiles.reduce((acc: { [key: string]: any }, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});

        completeTeam.members = teamMembers.map(member => ({
          user_id: member.user_id,
          role: member.role,
          joined_at: member.joined_at,
          user_profile: profilesMap[member.user_id] || null
        }));
      } else {
        completeTeam.members = teamMembers;
      }
    } else {
      completeTeam.members = [];
    }

    return NextResponse.json({
      success: true,
      team: {
        ...completeTeam,
        member_count: completeTeam.members?.length || 0,
        user_role: 'owner'
      },
      message: `Team "${team.name}" created successfully`
    });
  } catch (error) {
    console.error("Teams POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-teams");
    
    const { teamId, name, description, category, isPublic } = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    // Check if user is owner or admin
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only team owners and admins can update team settings" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name?.trim()) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || '';
    if (category) {
      const validCategories = ['Research', 'Study Group', 'Project', 'Discussion'];
      if (validCategories.includes(category)) {
        updateData.category = category;
      }
    }
    if (typeof isPublic === 'boolean') updateData.is_public = isPublic;

    // Update the team
    const { data: updatedTeam, error: updateError } = await supabaseAdmin
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team:', updateError);
      return NextResponse.json(
        { error: "Failed to update team" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      team: updatedTeam,
      message: "Team updated successfully"
    });
  } catch (error) {
    console.error("Teams PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-teams");
    
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('id');

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    // Check if user is the owner
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('owner_id, name')
      .eq('id', teamId)
      .single();

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    if (team.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Only the team owner can delete the team" },
        { status: 403 }
      );
    }

    // Get all team members for notifications
    const { data: members } = await supabaseAdmin
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .neq('user_id', user.id); // Exclude the owner

    // Delete the team (cascades to team_members, invitations, etc.)
    const { error: deleteError } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) {
      console.error('Error deleting team:', deleteError);
      return NextResponse.json(
        { error: "Failed to delete team" },
        { status: 500 }
      );
    }

    // Send notifications to all members about team deletion
    if (members && members.length > 0) {
      const notifications = members.map(member => ({
        target_user_id: member.user_id,
        notification_type: 'team_updated',
        notification_title: 'Team Deleted',
        notification_message: `The team "${team.name}" has been deleted by the owner`,
        notification_data: { team_name: team.name }
      }));

      // Create notifications for all members
      for (const notification of notifications) {
        await supabaseAdmin.rpc('create_notification', notification);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Team "${team.name}" deleted successfully`
    });
  } catch (error) {
    console.error("Teams DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
