import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

// Notifications API endpoints
// Handles: Get notifications, Mark as read, Update preferences

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-notifications")
    
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    const baseQuery = () =>
      supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    let notifications: any[] = []
    let error: any = null

    if (!unreadOnly) {
      const res = await (type ? baseQuery().eq('type', type) : baseQuery())
      notifications = res.data || []
      error = res.error
    } else {
      // Filter for unread notifications using the correct field name
      const res = await (type ? baseQuery().eq('type', type).eq('read', false) : baseQuery().eq('read', false))
      notifications = res.data || []
      error = res.error
    }

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      )
    }

    // Get unread count using the correct field name
    const { count: unreadCount, error: countError } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (countError) {
      console.error('Error counting unread notifications:', countError)
    }

    // Enrich notifications with user and team data using efficient joins
    const enrichedNotifications = await Promise.all(
      (notifications || []).map(async (n: any) => {
        let enrichedData = { ...n.data }

        // Extract user and team IDs from various sources
        const potentialSenderId = n.data?.sender_id || n.related_id
        const potentialTeamId = n.data?.team_id
        const potentialUserId = n.data?.user_id

        // Get sender/user info from user_profiles if we have an ID
        if (potentialSenderId || potentialUserId) {
          const targetUserId = potentialSenderId || potentialUserId
          const { data: userProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('full_name, display_name, email, avatar_url')
            .eq('id', targetUserId)
            .single()
          
          if (userProfile) {
            enrichedData.user_name = userProfile.display_name || userProfile.full_name || userProfile.email?.split('@')[0] || 'Someone'
            enrichedData.user_avatar = userProfile.avatar_url
            enrichedData.sender_name = enrichedData.user_name  // For backward compatibility
            enrichedData.sender_avatar = enrichedData.user_avatar
          }
        }

        // If we still don't have user info, try to extract from message content
        if (!enrichedData.user_name && n.message && n.message.includes(':')) {
          const extractedName = n.message.split(':')[0].trim()
          if (extractedName && extractedName !== 'Someone') {
            enrichedData.user_name = extractedName
            enrichedData.sender_name = extractedName
          }
        }

        // Get team info if team_id exists
        if (potentialTeamId) {
          const { data: team } = await supabaseAdmin
            .from('teams')
            .select('name, description')
            .eq('id', potentialTeamId)
            .single()
          
          if (team) {
            enrichedData.team_name = team.name
            enrichedData.project_name = team.name  // For backward compatibility
          }
        }

        // If we still don't have team info, try to extract from title
        if (!enrichedData.team_name && n.title && n.title.includes('message in ')) {
          const extractedTeam = n.title.split('message in ')[1]?.trim()
          if (extractedTeam) {
            enrichedData.team_name = extractedTeam
            enrichedData.project_name = extractedTeam
          }
        }

        // Ensure we have fallback values
        if (!enrichedData.user_name) {
          enrichedData.user_name = 'Someone'
          enrichedData.sender_name = 'Someone'
        }

        return {
          ...n,
          data: enrichedData,
          read: n.read, // Use the actual field name from the database
        }
      })
    )

    return NextResponse.json({
      success: true,
      notifications: enrichedNotifications,
      unreadCount: unreadCount || 0,
      hasMore: (notifications?.length || 0) === limit
    })

  } catch (error: any) {
    console.error("Notifications GET error:", error)
    const msg = typeof error?.message === 'string' ? error.message : ''
    const status = msg.includes('Authentication required') ? 401 : 500
    return NextResponse.json(
      { error: status === 401 ? 'Authentication required' : 'Internal server error' },
      { status }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-notifications")
    
    const { notificationId, markAsRead, markAllAsRead } = await request.json()

    // Basic input validation
    if (!markAllAsRead && !notificationId) {
      return NextResponse.json(
        { error: "Either notificationId or markAllAsRead is required" },
        { status: 400 }
      )
    }

    // Simple UUID v4-ish check (relaxed)
    const isValidUuid = (v: string) => /^[0-9a-fA-F-]{36}$/.test(v)

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    if (markAllAsRead) {
      // Mark all notifications as read using the correct field name
      const { error: updateError } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (updateError) {
        console.error('Error marking all notifications as read:', updateError)
        return NextResponse.json(
          { error: `Failed to mark notifications as read: ${updateError.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, message: "All notifications marked as read" })

    } else if (notificationId) {
      if (!isValidUuid(notificationId)) {
        return NextResponse.json(
          { error: "Invalid notificationId" },
          { status: 400 }
        )
      }
      // Mark specific notification as read/unread
      const { data: notification, error: fetchError } = await supabaseAdmin
        .from('notifications')
        .select('user_id')
        .eq('id', notificationId)
        .single()

      if (fetchError || !notification) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        )
      }

      if (notification.user_id !== user.id) {
        return NextResponse.json(
          { error: "You can only update your own notifications" },
          { status: 403 }
        )
      }

      // Update notification read status using the correct field name
      const { data: updatedNotification, error: updateError } = await supabaseAdmin
        .from('notifications')
        .update({ read: markAsRead === true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .select('id')

      if (updateError) {
        console.error('Error updating notification:', updateError)
        return NextResponse.json(
          { error: `Failed to update notification: ${updateError.message}` },
          { status: 500 }
        )
      }

      if (!updatedNotification || updatedNotification.length === 0) {
        return NextResponse.json(
          { error: "Notification not found or no changes made" },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Notification marked as ${markAsRead ? 'read' : 'unread'}`
      })

    } else {
      return NextResponse.json(
        { error: "Either notificationId or markAllAsRead is required" },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.error("Notifications PUT error:", error)
    const msg = typeof error?.message === 'string' ? error.message : ''
    const status = msg.includes('Authentication required') ? 401 : 500
    return NextResponse.json(
      { error: status === 401 ? 'Authentication required' : 'Internal server error' },
      { status }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-notifications")
    
    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')
    const deleteAll = searchParams.get('all') === 'true'

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    if (deleteAll) {
      // Delete all read notifications using the correct field name
      const { error: deleteError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('read', true)

      if (deleteError) {
        console.error('Error deleting all read notifications:', deleteError)
        return NextResponse.json(
          { error: `Failed to delete notifications: ${deleteError.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, message: "All read notifications deleted" })

    } else if (notificationId) {
      // Delete specific notification
      const { data: notification, error: fetchError } = await supabaseAdmin
        .from('notifications')
        .select('user_id')
        .eq('id', notificationId)
        .single()

      if (fetchError || !notification) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        )
      }

      if (notification.user_id !== user.id) {
        return NextResponse.json(
          { error: "You can only delete your own notifications" },
          { status: 403 }
        )
      }

      const { error: deleteError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (deleteError) {
        console.error('Error deleting notification:', deleteError)
        return NextResponse.json(
          { error: "Failed to delete notification" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Notification deleted"
      })

    } else {
      return NextResponse.json(
        { error: "Either notification ID or 'all' parameter is required" },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.error("Notifications DELETE error:", error)
    const msg = typeof error?.message === 'string' ? error.message : ''
    const status = msg.includes('Authentication required') ? 401 : 500
    return NextResponse.json(
      { error: status === 401 ? 'Authentication required' : 'Internal server error' },
      { status }
    )
  }
}
