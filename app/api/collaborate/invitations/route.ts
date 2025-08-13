import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

// Type definition for the find_user_by_email function return
type UserByEmail = {
  id: string
  full_name: string
  avatar_url: string | null
  email: string
}

// Invitation API endpoints
// Handles: Send invitations, Accept/Reject, View invitations, Cancel invitations

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-invitations")
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // 'sent', 'received', 'all'
    const status = searchParams.get('status') || 'all' // 'pending', 'accepted', 'rejected', 'all'
    
    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    let query = supabaseAdmin
      .from('team_invitations')
      .select(`
        *,
        team:teams!team_invitations_team_id_fkey(id, name, description, is_public, category)
      `)
      .order('created_at', { ascending: false })

    // Filter by type
    if (type === 'sent') {
      query = query.eq('inviter_id', user.id)
    } else if (type === 'received') {
      query = query.eq('invitee_id', user.id)
    } else {
      query = query.or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`)
    }

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: invitations, error } = await query

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invitations: invitations || []
    })

  } catch (error) {
    console.error("Invitations GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-invitations")
    
    const { teamId, inviteeEmail, role = 'viewer', personalMessage } = await request.json()

    if (!teamId || !inviteeEmail) {
      return NextResponse.json(
        { error: "Team ID and invitee email are required" },
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

    // Check plan restrictions for team invitations
    const { data: planData } = await supabaseAdmin.rpc('get_user_plan', { p_user_uuid: user.id });
    
    if (!planData || planData.length === 0) {
      // User doesn't have a plan, assign them to free plan
      await supabaseAdmin
        .from('user_plans')
        .insert({
          user_id: user.id,
          plan_type: 'free',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    // Check if user can use team features
    const { data: canUseTeams, error: canUseError } = await supabaseAdmin.rpc('can_use_feature', { 
       p_user_uuid: user.id, 
       p_feature_name: 'team_members' 
     });

     if (canUseError) {
       console.error('can_use_feature error:', canUseError);
       return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
       );
     }

    if (!canUseTeams) {
      return NextResponse.json(
        { error: "Team collaboration is only available for Pro and Enterprise plans. Please upgrade your plan to invite team members." },
        { status: 403 }
      );
    }

    // Validate role
    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role specified" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteeEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Check if user can assign this role
    const { data: canAssign, error: assignError } = await supabaseAdmin
      .rpc('can_assign_role', {
        p_team_uuid: teamId,
        p_user_uuid: user.id,
        p_target_role: role
      });

    if (assignError) {
      console.error('can_assign_role error:', assignError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    if (!canAssign) {
      return NextResponse.json(
        { error: "You don't have permission to assign this role" },
        { status: 403 }
      )
    }

    // Find the invitee user by joining with auth.users table
    const { data: inviteeUser, error: userError } = await supabaseAdmin
      .rpc('find_user_by_email', { p_user_email: inviteeEmail })

    if (userError) {
      console.error('Error finding user:', userError)
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      )
    }

    if (!inviteeUser) {
      return NextResponse.json(
        { error: "User not found. The user must have an account to receive invitations." },
        { status: 404 }
      )
    }

    // Type assertion for the user data
    const userData = inviteeUser as UserByEmail

    // Check if user is already a team member
    const { data: existingMember } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userData.id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this team" },
        { status: 400 }
      )
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabaseAdmin
      .from('team_invitations')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('invitee_id', userData.id)
      .eq('status', 'pending')
      .single()

    if (existingInvitation) {
      return NextResponse.json(
        { error: "There is already a pending invitation for this user" },
        { status: 400 }
      )
    }

    // Rate limiting removed - users can now send unlimited invitations

    // Get team information for the invitation
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('name, description')
      .eq('id', teamId)
      .single()

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      )
    }

    // Attempt to create the invitation. If a duplicate exists (unique constraint),
    // update the existing record instead (acts like resend).
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('team_invitations')
      .upsert({
        team_id: teamId,
        inviter_id: user.id,
        invitee_id: userData.id,
        invited_email: inviteeEmail, // Use invited_email which is part of unique constraint
        invitee_email: inviteeEmail, // Keep both for compatibility
        role: role,
        personal_message: personalMessage || null,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        updated_at: new Date().toISOString()
      }, { onConflict: 'team_id,invited_email' })
      .select(`
        *,
        team:teams!team_invitations_team_id_fkey(id, name, description)
      `)
      .single();

    if (inviteError) {
      // If duplicate error persists for some other constraint
      console.error('Error creating/upserting invitation:', inviteError);
      return NextResponse.json(
        { error: "Failed to create invitation", details: inviteError.message },
        { status: 500 }
      )
    }

    // Rate limit tracking removed

    // Create notification for the invitee
    const notificationData = {
      related_id: invitation.id,
      invitation_id: invitation.id,
      team_id: teamId,
      team_name: team.name,
      inviter_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Someone',
      role: role
    }

    // Create notification for the invitee
    const { data: notificationResult, error: notificationError } = await supabaseAdmin.rpc('create_notification', {
      target_user_id: userData.id,
      notification_type: 'team_invitation',
      notification_title: `Team Invitation: ${team.name}`,
      notification_message: `${notificationData.inviter_name} invited you to join "${team.name}" as ${role}`,
      notification_data: notificationData,
      action_url: `/collaborate?invitation=${invitation.id}`
    })

    if (notificationError) {
      console.error('Error creating notification:', notificationError)
      console.error('Notification error details:', notificationError)
      // Don't fail the invitation if notification fails, but log detailed error
    } else {
      console.log('Notification created successfully:', notificationResult)
    }

    return NextResponse.json({
      success: true,
      invitation,
      message: `Invitation sent to ${inviteeEmail}`
    })

  } catch (error) {
    console.error("Invitations POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-invitations")
    
    const { invitationId, action, response } = await request.json()

    if (!invitationId || !action) {
      return NextResponse.json(
        { error: "Invitation ID and action are required" },
        { status: 400 }
      )
    }

    if (!['accept', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept', 'reject', or 'cancel'" },
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

    // Get the invitation
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from('team_invitations')
      .select(`
        *,
        team:teams!team_invitations_team_id_fkey(id, name, description)
      `)
      .eq('id', invitationId)
      .single()

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    // Check if user has permission to perform this action
    if (action === 'cancel' && invitation.inviter_id !== user.id) {
      return NextResponse.json(
        { error: "Only the inviter can cancel an invitation" },
        { status: 403 }
      )
    }

    if ((action === 'accept' || action === 'reject') && invitation.invitee_id !== user.id) {
      return NextResponse.json(
        { error: "Only the invitee can accept or reject an invitation" },
        { status: 403 }
      )
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Invitation is already ${invitation.status}` },
        { status: 400 }
      )
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabaseAdmin
        .from('team_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId)

      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      )
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (action === 'accept') {
      updateData.status = 'accepted'
      
      // Add user to team members
      const { error: memberError } = await supabaseAdmin
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: invitation.invitee_id,
          role: invitation.role,
          joined_at: new Date().toISOString()
        })

      if (memberError) {
        console.error('Error adding team member:', memberError)
        return NextResponse.json(
          { error: "Failed to add you to the team" },
          { status: 500 }
        )
      }

      // Create notification for the inviter
      await supabaseAdmin.rpc('create_notification', {
        target_user_id: invitation.inviter_id,
        notification_type: 'member_added',
        notification_title: 'Invitation Accepted',
        notification_message: `${user.user_metadata?.display_name || user.email?.split('@')[0]} accepted your invitation to join "${invitation.team.name}"`,
        notification_data: {
          team_id: invitation.team_id,
          team_name: invitation.team.name,
          new_member_id: user.id,
          new_member_name: user.user_metadata?.display_name || user.email?.split('@')[0]
        },
        action_url: `/collaborate?team=${invitation.team_id}`
      })

    } else if (action === 'reject') {
      updateData.status = 'rejected'
      
      // Create notification for the inviter
      await supabaseAdmin.rpc('create_notification', {
        target_user_id: invitation.inviter_id,
        notification_type: 'invitation_rejected',
        notification_title: 'Invitation Declined',
        notification_message: `${user.user_metadata?.display_name || user.email?.split('@')[0]} declined your invitation to join "${invitation.team.name}"${response ? `: "${response}"` : ''}`,
        notification_data: {
          team_id: invitation.team_id,
          team_name: invitation.team.name,
          response: response
        }
      })

    } else if (action === 'cancel') {
      updateData.status = 'cancelled'
      
      // Create notification for the invitee
      await supabaseAdmin.rpc('create_notification', {
        target_user_id: invitation.invitee_id,
        notification_type: 'invitation_cancelled',
        notification_title: 'Invitation Cancelled',
        notification_message: `The invitation to join "${invitation.team.name}" has been cancelled`,
        notification_data: {
          team_id: invitation.team_id,
          team_name: invitation.team.name
        }
      })
    }

    // Update the invitation
    const { error: updateError } = await supabaseAdmin
      .from('team_invitations')
      .update(updateData)
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      return NextResponse.json(
        { error: "Failed to update invitation" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Invitation ${action}ed successfully`,
      action,
      teamName: invitation.team.name
    })

  } catch (error) {
    console.error("Invitations PUT error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-invitations")
    
    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
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

    // Check if user is the inviter
    const { data: invitation } = await supabaseAdmin
      .from('team_invitations')
      .select('inviter_id, status')
      .eq('id', invitationId)
      .single()

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    if (invitation.inviter_id !== user.id) {
      return NextResponse.json(
        { error: "Only the inviter can delete an invitation" },
        { status: 403 }
      )
    }

    // Delete the invitation
    const { error: deleteError } = await supabaseAdmin
      .from('team_invitations')
      .delete()
      .eq('id', invitationId)

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError)
      return NextResponse.json(
        { error: "Failed to delete invitation" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Invitation deleted successfully"
    })

  } catch (error) {
    console.error("Invitations DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
