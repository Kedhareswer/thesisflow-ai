import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

// Join Requests API endpoints
// Handles: Request to join public teams, Approve/Reject requests

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-join-requests")
    
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const type = searchParams.get('type') || 'all' // 'sent', 'received', 'all'
    const status = searchParams.get('status') || 'all' // 'pending', 'approved', 'rejected', 'all'
    
    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    let query = supabaseAdmin
      .from('team_join_requests')
      .select(`
        *,
        team:teams!team_join_requests_team_id_fkey(id, name, description, category),
        requester:user_profiles!team_join_requests_requester_id_fkey(id, full_name, avatar_url),
        reviewer:user_profiles!team_join_requests_reviewed_by_fkey(id, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (teamId) {
      // Get requests for a specific team (admin/owner view)
      query = query.eq('team_id', teamId)
      
      // Verify user is admin/owner of this team
      const { data: membership } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single()

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return NextResponse.json(
          { error: "Only team owners and admins can view join requests" },
          { status: 403 }
        )
      }
    } else {
      // Filter by type
      if (type === 'sent') {
        query = query.eq('requester_id', user.id)
      } else if (type === 'received') {
        // Get requests for teams where user is admin/owner
        const { data: adminTeams } = await supabaseAdmin
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .in('role', ['owner', 'admin'])

        if (!adminTeams || adminTeams.length === 0) {
          return NextResponse.json({
            success: true,
            joinRequests: []
          })
        }

        const teamIds = adminTeams.map(t => t.team_id)
        query = query.in('team_id', teamIds)
      } else {
        // All requests (sent + received)
        const { data: adminTeams } = await supabaseAdmin
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .in('role', ['owner', 'admin'])

        const teamIds = adminTeams?.map(t => t.team_id) || []
        
        if (teamIds.length > 0) {
          query = query.or(`requester_id.eq.${user.id},team_id.in.(${teamIds.join(',')})`)
        } else {
          query = query.eq('requester_id', user.id)
        }
      }
    }

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: joinRequests, error } = await query

    if (error) {
      console.error('Error fetching join requests:', error)
      return NextResponse.json(
        { error: "Failed to fetch join requests" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      joinRequests: joinRequests || []
    })

  } catch (error) {
    console.error("Join Requests GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-join-requests")
    
    const { teamId, requestMessage } = await request.json()

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    // Check if team exists and is public
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('id, name, is_public, owner_id')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      )
    }

    if (!team.is_public) {
      return NextResponse.json(
        { error: "This team is not public. You need an invitation to join." },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this team" },
        { status: 400 }
      )
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await supabaseAdmin
      .from('team_join_requests')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('requester_id', user.id)
      .in('status', ['pending'])
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending request for this team" },
        { status: 400 }
      )
    }

    // Get user profile for email
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 400 }
      )
    }

    // Create the join request
    const { data: joinRequest, error: requestError } = await supabaseAdmin
      .from('team_join_requests')
      .insert({
        team_id: teamId,
        requester_id: user.id,
        requester_email: userProfile.email,
        request_message: requestMessage || '',
        status: 'pending'
      })
      .select(`
        *,
        team:teams!team_join_requests_team_id_fkey(id, name, description),
        requester:user_profiles!team_join_requests_requester_id_fkey(id, full_name, avatar_url)
      `)
      .single()

    if (requestError) {
      console.error('Error creating join request:', requestError)
      return NextResponse.json(
        { error: "Failed to create join request" },
        { status: 500 }
      )
    }

    // Notify team owner and admins
    const { data: teamAdmins } = await supabaseAdmin
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .in('role', ['owner', 'admin'])

    if (teamAdmins && teamAdmins.length > 0) {
      const notificationData = {
        join_request_id: joinRequest.id,
        team_id: teamId,
        team_name: team.name,
        requester_name: userProfile.full_name || user.email?.split('@')[0] || 'Someone',
        requester_email: userProfile.email
      }

      // Create notifications for all admins
      for (const admin of teamAdmins) {
        await supabaseAdmin.rpc('create_notification', {
          target_user_id: admin.user_id,
          notification_type: 'join_request',
          notification_title: `Join Request: ${team.name}`,
          notification_message: `${notificationData.requester_name} wants to join "${team.name}"`,
          notification_data: notificationData,
          action_url: `/collaborate?team=${teamId}&tab=requests`
        })
      }
    }

    return NextResponse.json({
      success: true,
      joinRequest,
      message: `Join request sent for team "${team.name}"`
    })

  } catch (error) {
    console.error("Join Requests POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-join-requests")
    
    const { requestId, action, adminResponse, role = 'viewer' } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Request ID and action are required" },
        { status: 400 }
      )
    }

    if (!['approve', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve', 'reject', or 'cancel'" },
        { status: 400 }
      )
    }

    // Validate role for approval
    if (action === 'approve' && !['viewer', 'editor'].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Can only assign 'viewer' or 'editor' roles through join requests" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    // Get the join request
    const { data: joinRequest, error: fetchError } = await supabaseAdmin
      .from('team_join_requests')
      .select(`
        *,
        team:teams!team_join_requests_team_id_fkey(id, name, description),
        requester:user_profiles!team_join_requests_requester_id_fkey(id, full_name, email)
      `)
      .eq('id', requestId)
      .single()

    if (fetchError || !joinRequest) {
      return NextResponse.json(
        { error: "Join request not found" },
        { status: 404 }
      )
    }

    // Check if request is still pending
    if (joinRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Join request is already ${joinRequest.status}` },
        { status: 400 }
      )
    }

    // Check permissions
    if (action === 'cancel') {
      if (joinRequest.requester_id !== user.id) {
        return NextResponse.json(
          { error: "Only the requester can cancel a join request" },
          { status: 403 }
        )
      }
    } else {
      // Check if user is admin/owner of the team
      const { data: membership } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', joinRequest.team_id)
        .eq('user_id', user.id)
        .single()

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return NextResponse.json(
          { error: "Only team owners and admins can approve or reject join requests" },
          { status: 403 }
        )
      }
    }

    let updateData: any = {
      updated_at: new Date().toISOString(),
      reviewed_by: action === 'cancel' ? null : user.id,
      reviewed_at: action === 'cancel' ? null : new Date().toISOString()
    }

    if (action === 'approve') {
      updateData.status = 'approved'
      updateData.admin_response = adminResponse

      // Add user to team members
      const { error: memberError } = await supabaseAdmin
        .from('team_members')
        .insert({
          team_id: joinRequest.team_id,
          user_id: joinRequest.requester_id,
          role: role,
          joined_at: new Date().toISOString()
        })

      if (memberError) {
        console.error('Error adding team member:', memberError)
        return NextResponse.json(
          { error: "Failed to add user to team" },
          { status: 500 }
        )
      }

      // Create notification for the requester
      await supabaseAdmin.rpc('create_notification', {
        target_user_id: joinRequest.requester_id,
        notification_type: 'join_request',
        notification_title: 'Join Request Approved',
        notification_message: `Your request to join "${joinRequest.team.name}" has been approved${adminResponse ? `: "${adminResponse}"` : ''}`,
        notification_data: {
          team_id: joinRequest.team_id,
          team_name: joinRequest.team.name,
          role: role,
          admin_response: adminResponse
        },
        action_url: `/collaborate?team=${joinRequest.team_id}`
      })

    } else if (action === 'reject') {
      updateData.status = 'rejected'
      updateData.admin_response = adminResponse

      // Create notification for the requester
      await supabaseAdmin.rpc('create_notification', {
        target_user_id: joinRequest.requester_id,
        notification_type: 'join_request',
        notification_title: 'Join Request Declined',
        notification_message: `Your request to join "${joinRequest.team.name}" has been declined${adminResponse ? `: "${adminResponse}"` : ''}`,
        notification_data: {
          team_id: joinRequest.team_id,
          team_name: joinRequest.team.name,
          admin_response: adminResponse
        }
      })

    } else if (action === 'cancel') {
      updateData.status = 'cancelled'
      updateData.reviewed_by = null
      updateData.reviewed_at = null
    }

    // Update the join request
    const { error: updateError } = await supabaseAdmin
      .from('team_join_requests')
      .update(updateData)
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating join request:', updateError)
      return NextResponse.json(
        { error: "Failed to update join request" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Join request ${action}d successfully`,
      action,
      teamName: joinRequest.team.name
    })

  } catch (error) {
    console.error("Join Requests PUT error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-join-requests")
    
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('id')

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    // Check if user is the requester or team admin
    const { data: joinRequest } = await supabaseAdmin
      .from('team_join_requests')
      .select('requester_id, team_id, status')
      .eq('id', requestId)
      .single()

    if (!joinRequest) {
      return NextResponse.json(
        { error: "Join request not found" },
        { status: 404 }
      )
    }

    let canDelete = false

    if (joinRequest.requester_id === user.id) {
      canDelete = true
    } else {
      // Check if user is admin/owner of the team
      const { data: membership } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', joinRequest.team_id)
        .eq('user_id', user.id)
        .single()

      if (membership && ['owner', 'admin'].includes(membership.role)) {
        canDelete = true
      }
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: "You don't have permission to delete this join request" },
        { status: 403 }
      )
    }

    // Delete the join request
    const { error: deleteError } = await supabaseAdmin
      .from('team_join_requests')
      .delete()
      .eq('id', requestId)

    if (deleteError) {
      console.error('Error deleting join request:', deleteError)
      return NextResponse.json(
        { error: "Failed to delete join request" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Join request deleted successfully"
    })

  } catch (error) {
    console.error("Join Requests DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 