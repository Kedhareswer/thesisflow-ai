'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Bell, Loader2, Settings, Trash2, X, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { TeamInvitation } from "@/components/ui/team-invitation"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  action_url?: string
  data?: any
  created_at: string
}

interface NotificationPreferences {
  team_invitations: boolean
  member_added: boolean
  new_messages: boolean
  message_mentions: boolean
  document_shared: boolean
  role_changes: boolean
  email_notifications: boolean
  push_notifications: boolean
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    team_invitations: true,
    member_added: true,
    new_messages: true,
    message_mentions: true,
    document_shared: true,
    role_changes: true,
    email_notifications: false,
    push_notifications: true,
  })
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { user, session } = useSupabaseAuth()
  const { toast } = useToast()

  // Prevent hydration issues by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // API helper function with proper authentication
  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!session?.access_token) {
      throw new Error('Authentication required')
    }

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }, [session])

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user || !session) return

    try {
      setIsLoading(true)
      
      const data = await apiCall('/api/collaborate/notifications?limit=20')
      
      if (data.success) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
      // Only show toast if it's not an auth error and we have existing notifications
      if (notifications.length > 0 && !(error instanceof Error && error.message?.includes('Authentication'))) {
        toast({
          title: "Error",
          description: "Failed to load notifications",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [user, session, apiCall, toast, notifications.length])

  // Load notification preferences
  const loadPreferences = useCallback(async () => {
    if (!user || !session) return

    try {
      const data = await apiCall('/api/collaborate/notification-preferences')
      
      if (data.success && data.preferences) {
        setPreferences({
          team_invitations: data.preferences.team_invitations,
          member_added: data.preferences.member_added,
          new_messages: data.preferences.new_messages,
          message_mentions: data.preferences.message_mentions,
          document_shared: data.preferences.document_shared,
          role_changes: data.preferences.role_changes,
          email_notifications: data.preferences.email_notifications,
          push_notifications: data.preferences.push_notifications,
        })
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      // Silently fail on preferences load to prevent UI issues
    }
  }, [user, session, apiCall])

  // Initial load - only when user/session changes, not on every render
  useEffect(() => {
    if (user && session) {
      loadNotifications()
      loadPreferences()
    }
  }, [user?.id, session?.access_token]) // Only re-run when user ID or session token actually changes

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await apiCall('/api/collaborate/notifications', {
        method: 'PUT',
        body: JSON.stringify({
          notificationId,
          markAsRead: true,
        }),
      })

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      })
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await apiCall('/api/collaborate/notifications', {
        method: 'PUT',
        body: JSON.stringify({
          markAllAsRead: true,
        }),
      })

      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      )
      setUnreadCount(0)
      
      toast({
        title: "Success",
        description: "All notifications marked as read",
      })
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      })
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await apiCall(`/api/collaborate/notifications?id=${notificationId}`, {
        method: 'DELETE',
      })

      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      })
    }
  }

  // Clear all read notifications
  const clearAllRead = async () => {
    try {
      await apiCall('/api/collaborate/notifications?all=true', {
        method: 'DELETE',
      })

      // Update local state - remove all read notifications
      setNotifications(prev => prev.filter(notif => !notif.read))
      
      toast({
        title: "Success",
        description: "All read notifications cleared",
      })
    } catch (error) {
      console.error('Error clearing notifications:', error)
      toast({
        title: "Error",
        description: "Failed to clear notifications",
        variant: "destructive",
      })
    }
  }

  // Update preferences
  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      setIsUpdatingPreferences(true)
      
      await apiCall('/api/collaborate/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(updates),
      })

      setPreferences(prev => ({ ...prev, ...updates }))
      
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved",
      })
    } catch (error) {
      console.error('Error updating preferences:', error)
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingPreferences(false)
    }
  }

  // Handle invitation response
  const handleInvitationResponse = async (invitationId: string, action: 'accept' | 'reject') => {
    try {
      const data = await apiCall('/api/collaborate/invitations', {
        method: 'PUT',
        body: JSON.stringify({
          invitationId,
          action,
        }),
      })

      if (data.success) {
        // Remove the notification after response
        setNotifications(prev => prev.filter(n => 
          !(n.type === 'team_invitation' && n.data?.invitation_id === invitationId)
        ))
        
        toast({
          title: `Invitation ${action}ed`,
          description: data.message,
        })
      }
    } catch (error) {
      console.error('Error responding to invitation:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to respond to invitation",
        variant: "destructive",
      })
    }
  }

  // Navigate to notification action
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    // Navigate to action URL if provided
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  // Format time helper
  const formatTime = (timestamp: string) => {
    const now = new Date()
    const notifTime = new Date(timestamp)
    const diffMs = now.getTime() - notifTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return notifTime.toLocaleDateString()
  }

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'team_invitation':
        return '👥'
      case 'join_request':
        return '📨'
      case 'member_added':
        return '✅'
      case 'new_message':
        return '💬'
      case 'message_mention':
        return '📌'
      case 'document_shared':
        return '📄'
      case 'role_changed':
        return '🔧'
      case 'team_updated':
        return '📝'
      default:
        return '🔔'
    }
  }

  // Don't render anything until mounted or if user is not authenticated
  if (!mounted || !user || !session) {
    return null
  }

  return (
    <div className="relative">
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        }
        className="w-80 right-0"
      >
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            <div className="flex items-center gap-2">
              <Dialog open={isPreferencesOpen} onOpenChange={setIsPreferencesOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Notification Preferences</DialogTitle>
                    <DialogDescription>
                      Choose which notifications you'd like to receive
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Team Notifications</h4>
                      {[
                        { key: 'team_invitations', label: 'Team invitations' },
                        { key: 'member_added', label: 'New team members' },
                        { key: 'role_changes', label: 'Role changes' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between">
                          <span className="text-sm">{item.label}</span>
                          <input
                            type="checkbox"
                            checked={preferences[item.key as keyof NotificationPreferences]}
                            onChange={(e) => updatePreferences({ [item.key]: e.target.checked })}
                            disabled={isUpdatingPreferences}
                            className="rounded"
                          />
                        </div>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Chat Notifications</h4>
                      {[
                        { key: 'new_messages', label: 'New messages' },
                        { key: 'message_mentions', label: 'When mentioned' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between">
                          <span className="text-sm">{item.label}</span>
                          <input
                            type="checkbox"
                            checked={preferences[item.key as keyof NotificationPreferences]}
                            onChange={(e) => updatePreferences({ [item.key]: e.target.checked })}
                            disabled={isUpdatingPreferences}
                            className="rounded"
                          />
                        </div>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">File Notifications</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Document sharing</span>
                        <input
                          type="checkbox"
                          checked={preferences.document_shared}
                          onChange={(e) => updatePreferences({ document_shared: e.target.checked })}
                          disabled={isUpdatingPreferences}
                          className="rounded"
                        />
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs h-6 px-2"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => {
                // Special handling for team invitations
                if (notification.type === 'team_invitation' && notification.data) {
                  const invitation = {
                    id: notification.data.invitation_id,
                    team: {
                      id: notification.data.team_id,
                      name: notification.data.team_name,
                      description: notification.data.team_description
                    },
                    inviter: {
                      id: notification.data.inviter_id || '',
                      full_name: notification.data.inviter_name,
                      avatar_url: notification.data.inviter_avatar_url
                    },
                    role: notification.data.role,
                    personal_message: notification.data.personal_message,
                    created_at: notification.created_at
                  };

                  return (
                    <div key={notification.id} className="p-3">
                      <TeamInvitation
                        invitation={invitation}
                        onAccept={(invitationId) => handleInvitationResponse(invitationId, 'accept')}
                        onDecline={(invitationId) => handleInvitationResponse(invitationId, 'reject')}
                        className="w-full"
                      />
                    </div>
                  );
                }

                // Default notification rendering
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`p-0 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="w-full p-3 flex items-start gap-3">
                      <div className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1 ml-2">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
              
              {notifications.some(n => n.read) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearAllRead} className="justify-center">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear read notifications
                  </DropdownMenuItem>
                </>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No notifications yet</p>
            </div>
          )}
      </DropdownMenu>
    </div>
  )
}
