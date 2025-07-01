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

    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by read status
    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    // Filter by type
    if (type) {
      query = query.eq('type', type)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      )
    }

    // Get unread count
    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
      hasMore: (notifications?.length || 0) === limit
    })

  } catch (error) {
    console.error("Notifications GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-notifications")
    
    const { notificationId, markAsRead, markAllAsRead } = await request.json()

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    if (markAllAsRead) {
      // Mark all notifications as read
      const { error: updateError } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (updateError) {
        console.error('Error marking all notifications as read:', updateError)
        return NextResponse.json(
          { error: "Failed to mark notifications as read" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read"
      })

    } else if (notificationId) {
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

      const { error: updateError } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: markAsRead === true })
        .eq('id', notificationId)

      if (updateError) {
        console.error('Error updating notification:', updateError)
        return NextResponse.json(
          { error: "Failed to update notification" },
          { status: 500 }
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

  } catch (error) {
    console.error("Notifications PUT error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
      // Delete all read notifications
      const { error: deleteError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true)

      if (deleteError) {
        console.error('Error deleting all notifications:', deleteError)
        return NextResponse.json(
          { error: "Failed to delete notifications" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "All read notifications deleted"
      })

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

  } catch (error) {
    console.error("Notifications DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 