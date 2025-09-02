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
      // Try unread filter with fallback: is_read -> read -> read_at IS NULL
      const tryIsRead = async () => {
        const q = type ? baseQuery().eq('type', type).eq('is_read', false) : baseQuery().eq('is_read', false)
        const res = await q
        return res
      }
      const tryRead = async () => {
        const q = type ? baseQuery().eq('type', type).eq('read', false) : baseQuery().eq('read', false)
        const res = await q
        return res
      }
      const tryReadAt = async () => {
        const q = type ? baseQuery().eq('type', type).is('read_at', null) : baseQuery().is('read_at', null)
        const res = await q
        return res
      }

      let res = await tryIsRead()
      if (res.error) {
        res = await tryRead()
        if (res.error) {
          res = await tryReadAt()
        }
      }
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

    // Get unread count with fallback
    let unreadCount = 0
    const countBase = () =>
      supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

    let countRes = await countBase().eq('is_read', false)
    if (countRes.error) {
      countRes = await countBase().eq('read', false)
      if (countRes.error) {
        countRes = await countBase().is('read_at', null)
      }
    }
    unreadCount = countRes.count || 0

    // Enrich notifications with user and team data
    const enrichedNotifications = await Promise.all(
      (notifications || []).map(async (n: any) => {
        const enrichedData = { ...n.data }

        // Get sender/user info if sender_id exists
        if (n.data?.sender_id) {
          const { data: sender } = await supabaseAdmin.auth.admin.getUserById(n.data.sender_id)
          if (sender?.user) {
            enrichedData.user_name = sender.user.user_metadata?.full_name || sender.user.user_metadata?.name || sender.user.email?.split('@')[0]
            enrichedData.user_avatar = sender.user.user_metadata?.avatar_url
          }
        }

        // Get team info if team_id exists
        if (n.data?.team_id) {
          const { data: team } = await supabaseAdmin
            .from('teams')
            .select('name, description')
            .eq('id', n.data.team_id)
            .single()
          if (team) {
            enrichedData.team_name = team.name
          }
        }

        // Get project info if project_id exists  
        if (n.data?.project_id) {
          const { data: project } = await supabaseAdmin
            .from('projects')
            .select('name, title')
            .eq('id', n.data.project_id)
            .single()
          if (project) {
            enrichedData.project_name = project.name || project.title
          }
        }

        return {
          ...n,
          data: enrichedData,
          read: typeof n.is_read === 'boolean' ? n.is_read : (typeof n.read === 'boolean' ? n.read : Boolean(n.read_at)),
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
      // Mark all notifications as read with unconditional fallbacks
      const attempt1 = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (!attempt1.error) {
        return NextResponse.json({ success: true, message: "All notifications marked as read" })
      }

      const attempt2 = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
      if (!attempt2.error) {
        return NextResponse.json({ success: true, message: "All notifications marked as read" })
      }

      const attempt3 = await supabaseAdmin
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null)
      if (!attempt3.error) {
        return NextResponse.json({ success: true, message: "All notifications marked as read" })
      }

      console.error('Error marking all notifications as read:', {
        attempt1: attempt1.error?.message,
        attempt2: attempt2.error?.message,
        attempt3: attempt3.error?.message,
      })
      return NextResponse.json(
        { error: `Failed to mark notifications as read: ${attempt3.error?.message || attempt2.error?.message || attempt1.error?.message || 'Unknown error'}` },
        { status: 500 }
      )

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

      // Try update with fallbacks: is_read -> read -> read_at
      const attempt1 = await supabaseAdmin
        .from('notifications')
        .update({ is_read: markAsRead === true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .select('id')

      if (!attempt1.error && attempt1.data && attempt1.data.length > 0) {
        return NextResponse.json({ success: true, message: `Notification marked as ${markAsRead ? 'read' : 'unread'}` })
      }

      const attempt2 = await supabaseAdmin
        .from('notifications')
        .update({ read: markAsRead === true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .select('id')

      if (!attempt2.error && attempt2.data && attempt2.data.length > 0) {
        return NextResponse.json({ success: true, message: `Notification marked as ${markAsRead ? 'read' : 'unread'}` })
      }

      const attempt3 = await supabaseAdmin
        .from('notifications')
        .update({ read_at: markAsRead ? new Date().toISOString() : null })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .select('id')

      if (!attempt3.error && attempt3.data && attempt3.data.length > 0) {
        return NextResponse.json({ success: true, message: `Notification marked as ${markAsRead ? 'read' : 'unread'}` })
      }

      console.error('Error updating notification with all fallbacks:', {
        attempt1: attempt1.error?.message,
        attempt2: attempt2.error?.message,
        attempt3: attempt3.error?.message,
      })
      return NextResponse.json(
        { error: `Failed to update notification: ${attempt3.error?.message || attempt2.error?.message || attempt1.error?.message || 'Unknown error'}` },
        { status: 500 }
      )

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
      // Delete all read notifications with unconditional fallbacks
      const attempt1 = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true)

      if (!attempt1.error) {
        return NextResponse.json({ success: true, message: "All read notifications deleted" })
      }

      const attempt2 = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('read', true)
      if (!attempt2.error) {
        return NextResponse.json({ success: true, message: "All read notifications deleted" })
      }

      const attempt3 = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .not('read_at', 'is', null)
      if (!attempt3.error) {
        return NextResponse.json({ success: true, message: "All read notifications deleted" })
      }

      console.error('Error deleting notifications with all fallbacks:', {
        attempt1: attempt1.error?.message,
        attempt2: attempt2.error?.message,
        attempt3: attempt3.error?.message,
      })
      return NextResponse.json(
        { error: `Failed to delete notifications: ${attempt3.error?.message || attempt2.error?.message || attempt1.error?.message || 'Unknown error'}` },
        { status: 500 }
      )

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
