'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Check, CheckCheck, Settings, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { useSocket } from '@/components/socket-provider'
import Link from 'next/link'
import type { Socket } from 'socket.io-client'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: any
  is_read: boolean
  action_url?: string
  created_at: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const { socket } = useSocket()

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/collaborate/notifications?limit=20')
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/collaborate/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          markAsRead: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

      // Notify server via WebSocket if available
      if (socket && 'emit' in socket) {
        (socket as Socket).emit('mark-notification-read', notificationId)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/collaborate/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markAllAsRead: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)

      toast({
        title: 'Success',
        description: 'All notifications marked as read'
      })
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive'
      })
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/collaborate/notifications?id=${notificationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete notification')
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      // Update unread count if necessary
      const notification = notifications.find(n => n.id === notificationId)
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Clear all read notifications
  const clearAll = async () => {
    try {
      const response = await fetch('/api/collaborate/notifications?all=true', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to clear notifications')
      }

      // Update local state - keep only unread
      setNotifications(prev => prev.filter(n => !n.is_read))

      toast({
        title: 'Success',
        description: 'Cleared all read notifications'
      })
    } catch (error) {
      console.error('Error clearing notifications:', error)
      toast({
        title: 'Error',
        description: 'Failed to clear notifications',
        variant: 'destructive'
      })
    }
  }

  // Socket event handlers
  useEffect(() => {
    if (socket && 'on' in socket && 'off' in socket) {
      const socketInstance = socket as Socket
      
      // Handle new notifications
      const handleNotification = (notification: Notification) => {
        // Add to top of list
        setNotifications(prev => [notification, ...prev])
        setUnreadCount(prev => prev + 1)

        // Show toast for important notifications
        toast({
          title: notification.title,
          description: notification.message,
          action: notification.action_url ? (
            <Link href={notification.action_url}>
              <Button size="sm" variant="outline">View</Button>
            </Link>
          ) : undefined
        })
      }

      socketInstance.on('notification', handleNotification)

      return () => {
        socketInstance.off('notification', handleNotification)
      }
    }
  }, [socket, toast])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'team_invitation':
        return '📨'
      case 'join_request':
        return '🤝'
      case 'member_added':
        return '👥'
      case 'new_message':
        return '💬'
      case 'message_mention':
        return '@'
      case 'document_shared':
        return '📄'
      case 'role_changed':
        return '🛡️'
      default:
        return '🔔'
    }
  }

  const notificationContent = (
    <div className="w-80">
      <DropdownMenuLabel className="flex items-center justify-between">
        <span>Notifications</span>
        <div className="flex gap-1">
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                markAllAsRead()
              }}
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
          <Link href="/settings#notifications">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </DropdownMenuLabel>
      
      <DropdownMenuSeparator />

      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="py-2">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-3 cursor-pointer ${!notification.is_read ? 'bg-accent/50' : ''}`}
                onClick={() => {
                  if (!notification.is_read) {
                    markAsRead(notification.id)
                  }
                  if (notification.action_url) {
                    window.location.href = notification.action_url
                  }
                }}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      <p className="text-sm font-medium leading-none">
                        {notification.title}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        deleteNotification(notification.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </ScrollArea>

      {notifications.some(n => n.is_read) && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-center cursor-pointer"
            onClick={clearAll}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear all read
          </DropdownMenuItem>
        </>
      )}
    </div>
  )

  return (
    <DropdownMenu 
      open={open} 
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      }
    >
      {notificationContent}
    </DropdownMenu>
  )
} 