import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

// Team Members API
// PUT: change member role
// DELETE: remove member from team

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request, 'collaborate-team-members')
    const { teamId, memberId, newRole } = await request.json()

    if (!teamId || !memberId || !newRole) {
      return NextResponse.json({ error: 'teamId, memberId and newRole are required' }, { status: 400 })
    }

    if (!['viewer', 'editor', 'admin'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()
    if (!supabase) return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })

    // Requester membership
    const { data: requesterMembership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!requesterMembership) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 })
    }

    const requesterRole = requesterMembership.role as 'owner' | 'admin' | 'editor' | 'viewer'

    // Target membership
    const { data: targetMembership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', memberId)
      .maybeSingle()

    if (!targetMembership) {
      return NextResponse.json({ error: 'Target member not found' }, { status: 404 })
    }

    const targetRole = targetMembership.role as 'owner' | 'admin' | 'editor' | 'viewer'

    // Permission rules
    // owner: can change anyone except other owners
    // admin: can change viewer/editor only; cannot assign admin; cannot edit owners
    if (requesterRole === 'owner') {
      if (targetRole === 'owner') {
        return NextResponse.json({ error: 'Cannot modify another owner' }, { status: 403 })
      }
    } else if (requesterRole === 'admin') {
      if (targetRole === 'owner' || targetRole === 'admin') {
        return NextResponse.json({ error: 'Admins can only modify viewer/editor' }, { status: 403 })
      }
      if (newRole === 'admin') {
        return NextResponse.json({ error: 'Admins cannot assign admin role' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Only owners or admins can change roles' }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from('team_members')
      .update({ role: newRole })
      .eq('team_id', teamId)
      .eq('user_id', memberId)

    if (updateError) {
      console.error('Update role error:', updateError)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    // Notify target user
    try {
      await supabase.rpc('create_notification', {
        target_user_id: memberId,
        notification_type: 'team_updated',
        notification_title: 'Role Updated',
        notification_message: `Your role was changed to ${newRole}`,
        notification_data: { team_id: teamId, new_role: newRole },
      })
    } catch {}

    return NextResponse.json({ success: true, message: 'Role updated' })
  } catch (error) {
    console.error('Team Members PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request, 'collaborate-team-members')
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const memberId = searchParams.get('memberId')

    if (!teamId || !memberId) {
      return NextResponse.json({ error: 'teamId and memberId are required' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()
    if (!supabase) return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })

    // Requester membership
    const { data: requesterMembership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!requesterMembership) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 })
    }

    const requesterRole = requesterMembership.role as 'owner' | 'admin' | 'editor' | 'viewer'

    // Target membership
    const { data: targetMembership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', memberId)
      .maybeSingle()

    if (!targetMembership) {
      return NextResponse.json({ error: 'Target member not found' }, { status: 404 })
    }

    const targetRole = targetMembership.role as 'owner' | 'admin' | 'editor' | 'viewer'

    // Permission rules for removal
    // owner: can remove anyone except other owners
    // admin: can remove viewer/editor only
    if (requesterRole === 'owner') {
      if (targetRole === 'owner') {
        return NextResponse.json({ error: 'Cannot remove another owner' }, { status: 403 })
      }
    } else if (requesterRole === 'admin') {
      if (targetRole !== 'viewer' && targetRole !== 'editor') {
        return NextResponse.json({ error: 'Admins can only remove viewer/editor' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Only owners or admins can remove members' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', memberId)

    if (deleteError) {
      console.error('Remove member error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    try {
      await supabase.rpc('create_notification', {
        target_user_id: memberId,
        notification_type: 'team_updated',
        notification_title: 'Removed from Team',
        notification_message: `You were removed from a team`,
        notification_data: { team_id: teamId },
      })
    } catch {}

    return NextResponse.json({ success: true, message: 'Member removed' })
  } catch (error) {
    console.error('Team Members DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
