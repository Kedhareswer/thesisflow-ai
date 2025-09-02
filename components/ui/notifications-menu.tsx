'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Bell, Settings, Trash2, X, Check, Users, MessageSquare, FileText, Shield } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { TeamInvitation } from "@/components/ui/team-invitation"
import { notificationCache } from '@/lib/services/cache.service'

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

interface NotificationsMenuProps {
  className?: string
}

export function NotificationsMenu({ className }: NotificationsMenuProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
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

  // Prevent hydration issues
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
  }, [session?.access_token])

  // Load notifications with caching
  const loadNotifications = useCallback(async (forceRefresh = false) => {
    if (!user || !session) return

    const cacheKey = `notifications_${user.id}`
    
    if (!forceRefresh) {
      const cached = notificationCache.get<{notifications: Notification[], unreadCount: number}>(cacheKey)
      if (cached) {
        setNotifications(cached.notifications || [])
        setUnreadCount(cached.unreadCount || 0)
        setIsLoading(false)
        return
      }
    }

    try {
      setIsLoading(true)
      
      const data = await apiCall('/api/collaborate/notifications?limit=20')
      
      if (data.success) {
        const notificationData = {
          notifications: data.notifications || [],
          unreadCount: data.unreadCount || 0
        }
        setNotifications(notificationData.notifications)
        setUnreadCount(notificationData.unreadCount)
        
        // Cache for 2 minutes
        notificationCache.set(cacheKey, notificationData, 2 * 60 * 1000)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
      if (notifications.length > 0 && !(error instanceof Error && error.message?.includes('Authentication'))) {
        toast({
          title: "Error",
          description: "Failed to load notifications",
          variant: "destructive",
        })
      }
      
      // Try stale cache on error
      const staleCache = notificationCache.get<{notifications: Notification[], unreadCount: number}>(cacheKey)
      if (staleCache) {
        setNotifications(staleCache.notifications || [])
        setUnreadCount(staleCache.unreadCount || 0)
      }
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, session?.access_token, apiCall, toast, notifications.length])

  // Load notification preferences
  const loadPreferences = useCallback(async (forceRefresh = false) => {
    if (!user || !session) return

    const cacheKey = `notif_prefs_${user.id}`
    
    if (!forceRefresh) {
      const cached = notificationCache.get<NotificationPreferences>(cacheKey)
      if (cached) {
        setPreferences(cached)
        return
      }
    }

    try {
      const data = await apiCall('/api/collaborate/notification-preferences')
      
      if (data.success && data.preferences) {
        const prefs = {
          team_invitations: data.preferences.team_invitations,
          member_added: data.preferences.member_added,
          new_messages: data.preferences.new_messages,
          message_mentions: data.preferences.message_mentions,
          document_shared: data.preferences.document_shared,
          role_changes: data.preferences.role_changes,
          email_notifications: data.preferences.email_notifications,
          push_notifications: data.preferences.push_notifications,
        }
        setPreferences(prefs)
        
        // Cache preferences for 10 minutes
        notificationCache.set(cacheKey, prefs, 10 * 60 * 1000)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      const staleCache = notificationCache.get<NotificationPreferences>(cacheKey)
      if (staleCache) {
        setPreferences(staleCache)
      }
    }
  }, [user?.id, session?.access_token, apiCall])

  // Initial load
  useEffect(() => {
    if (user && session) {
      loadNotifications()
      loadPreferences()
    }
  }, [user?.id, session?.access_token, loadNotifications, loadPreferences])

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
    if (!notification.read) {
      await markAsRead(notification.id)
    }

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
        return <Users className="h-4 w-4 text-blue-600" />
      case 'join_request':
        return <Users className="h-4 w-4 text-orange-600" />
      case 'member_added':
        return <Check className="h-4 w-4 text-green-600" />
      case 'new_message':
        return <MessageSquare className="h-4 w-4 text-blue-600" />
      case 'message_mention':
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      case 'document_shared':
        return <FileText className="h-4 w-4 text-indigo-600" />
      case 'role_changed':
        return <Shield className="h-4 w-4 text-amber-600" />
      case 'team_updated':
        return <Settings className="h-4 w-4 text-gray-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    switch (activeTab) {
      case 'unread':
        return !notification.read
      case 'mentions':
        return notification.type === 'message_mention'
      case 'teams':
        return ['team_invitation', 'member_added', 'role_changed', 'team_updated'].includes(notification.type)
      default:
        return true
    }
  })

  // Don't render until mounted or if user is not authenticated
  if (!mounted || !user || !session) {
    return null
  }

  return (
    <Card className={`w-96 shadow-lg border-0 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={isPreferencesOpen} onOpenChange={setIsPreferencesOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Notification Preferences</DialogTitle>
                  <DialogDescription>
                    Choose which notifications you'd like to receive
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Team Notifications</h4>
                    {[
                      { key: 'team_invitations', label: 'Team invitations', icon: <Users className="h-4 w-4" /> },
                      { key: 'member_added', label: 'New team members', icon: <Check className="h-4 w-4" /> },
                      { key: 'role_changes', label: 'Role changes', icon: <Shield className="h-4 w-4" /> },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <Label htmlFor={item.key} className="text-sm font-normal cursor-pointer">
                            {item.label}
                          </Label>
                        </div>
                        <Switch
                          id={item.key}
                          checked={preferences[item.key as keyof NotificationPreferences]}
                          onCheckedChange={(checked) => updatePreferences({ [item.key]: checked })}
                          disabled={isUpdatingPreferences}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Chat Notifications</h4>
                    {[
                      { key: 'new_messages', label: 'New messages', icon: <MessageSquare className="h-4 w-4" /> },
                      { key: 'message_mentions', label: 'When mentioned', icon: <MessageSquare className="h-4 w-4" /> },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <Label htmlFor={item.key} className="text-sm font-normal cursor-pointer">
                            {item.label}
                          </Label>
                        </div>
                        <Switch
                          id={item.key}
                          checked={preferences[item.key as keyof NotificationPreferences]}
                          onCheckedChange={(checked) => updatePreferences({ [item.key]: checked })}
                          disabled={isUpdatingPreferences}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">File Notifications</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4" />
                        <Label htmlFor="document_shared" className="text-sm font-normal cursor-pointer">
                          Document sharing
                        </Label>
                      </div>
                      <Switch
                        id="document_shared"
                        checked={preferences.document_shared}
                        onCheckedChange={(checked) => updatePreferences({ document_shared: checked })}
                        disabled={isUpdatingPreferences}
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
                className="text-xs h-8 px-3"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mx-4 mb-4">
            <TabsTrigger value="all" className="text-xs">
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mentions" className="text-xs">Mentions</TabsTrigger>
            <TabsTrigger value="teams" className="text-xs">Teams</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="space-y-1">
                  {filteredNotifications.map((notification) => {
                    // Special handling for team invitations
                    if (notification.type === 'team_invitation' && notification.data) {
                      const invitation = {
                        id: notification.data.invitation_id || notification.id,
                        team_name: notification.data.team_name,
                        role: notification.data.role || 'viewer',
                        status: notification.data.status || 'pending',
                        created_at: notification.created_at,
                        inviter_name: notification.data.inviter_name,
                        inviter_email: notification.data.inviter_email,
                        inviter_avatar: notification.data.inviter_avatar_url,
                        invitee_name: notification.data.invitee_name,
                        invitee_email: notification.data.invitee_email,
                        invitee_avatar: notification.data.invitee_avatar_url,
                      };

                      return (
                        <div key={notification.id} className="p-4 border-b border-border/50">
                          <TeamInvitation
                            invitation={invitation}
                            onAccept={(invitationId: string) => handleInvitationResponse(invitationId, 'accept')}
                            onReject={(invitationId: string) => handleInvitationResponse(invitationId, 'reject')}
                            className="w-full"
                          />
                        </div>
                      );
                    }

                    // Default notification rendering
                    return (
                      <div
                        key={notification.id}
                        className={`group p-4 border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors ${
                          !notification.read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm truncate">
                                {notification.title}
                              </p>
                              <div className="flex items-center gap-2 ml-2">
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteNotification(notification.id)
                                  }}
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {notifications.some(n => n.read) && (
                    <div className="p-4 border-t border-border">
                      <Button 
                        variant="ghost" 
                        onClick={clearAllRead} 
                        className="w-full justify-center gap-2 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        Clear read notifications
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-1">
                    {activeTab === 'all' ? 'No notifications yet' : 
                     activeTab === 'unread' ? 'No unread notifications' :
                     activeTab === 'mentions' ? 'No mentions' : 'No team notifications'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You'll see notifications here when they arrive
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default NotificationsMenu
