"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Bell, Loader2, Settings, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { TeamInvitation } from "@/components/ui/team-invitation"
import { notificationCache } from "@/lib/services/cache.service"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

export default function NotificationsMenu() {
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

  useEffect(() => {
    setMounted(true)
  }, [])

  // API helper function with proper authentication
  const apiCall = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!session?.access_token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          ...options.headers,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Network error" }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      return response.json()
    },
    [session?.access_token]
  )

  // Load notifications with caching
  const loadNotifications = useCallback(
    async (forceRefresh = false) => {
      if (!user || !session) return

      const cacheKey = `notifications_${user.id}`

      if (!forceRefresh) {
        const cached = notificationCache.get<{ notifications: Notification[]; unreadCount: number }>(cacheKey)
        if (cached) {
          setNotifications(cached.notifications || [])
          setUnreadCount(cached.unreadCount || 0)
          setIsLoading(false)
          return
        }
      }

      try {
        setIsLoading(true)
        const data = await apiCall("/api/collaborate/notifications?limit=20")
        if (data.success) {
          const notificationData = {
            notifications: (data.notifications || []) as Notification[],
            unreadCount: (data.unreadCount || 0) as number,
          }
          setNotifications(notificationData.notifications)
          setUnreadCount(notificationData.unreadCount)
          // Cache for 2 minutes
          notificationCache.set(cacheKey, notificationData, 2 * 60 * 1000)
        }
      } catch (error) {
        console.error("Error loading notifications:", error)
        // Only show toast if it's not an auth error and we have existing notifications
        if (notifications.length > 0 && !(error instanceof Error && error.message?.includes("Authentication"))) {
          toast({
            title: "Error",
            description: "Failed to load notifications",
            variant: "destructive",
          })
        }
        const staleCache = notificationCache.get<{ notifications: Notification[]; unreadCount: number }>(cacheKey)
        if (staleCache) {
          setNotifications(staleCache.notifications || [])
          setUnreadCount(staleCache.unreadCount || 0)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id, session?.access_token, apiCall, toast]
  )

  // Load preferences with caching
  const loadPreferences = useCallback(
    async (forceRefresh = false) => {
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
        const data = await apiCall("/api/collaborate/notification-preferences")
        if (data.success && data.preferences) {
          const prefs: NotificationPreferences = {
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
          notificationCache.set(cacheKey, prefs, 10 * 60 * 1000)
        }
      } catch (error) {
        console.error("Error loading preferences:", error)
        const staleCache = notificationCache.get<NotificationPreferences>(cacheKey)
        if (staleCache) setPreferences(staleCache)
      }
    },
    [user?.id, session?.access_token, apiCall]
  )

  useEffect(() => {
    if (user && session) {
      loadNotifications()
      loadPreferences()
    }
  }, [user?.id, session?.access_token, loadNotifications, loadPreferences])

  // Actions
  const markAsRead = async (notificationId: string) => {
    try {
      await apiCall("/api/collaborate/notifications", {
        method: "PUT",
        body: JSON.stringify({ notificationId, markAsRead: true }),
      })
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({ title: "Error", description: "Failed to mark notification as read", variant: "destructive" })
    }
  }

  const markAllAsRead = async () => {
    try {
      await apiCall("/api/collaborate/notifications", {
        method: "PUT",
        body: JSON.stringify({ markAllAsRead: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      toast({ title: "Success", description: "All notifications marked as read" })
    } catch (error) {
      console.error("Error marking all as read:", error)
      toast({ title: "Error", description: "Failed to mark all notifications as read", variant: "destructive" })
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiCall(`/api/collaborate/notifications?id=${notificationId}`, { method: "DELETE" })
      const deleted = notifications.find((n) => n.id === notificationId)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      if (deleted && !deleted.read) setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast({ title: "Error", description: "Failed to delete notification", variant: "destructive" })
    }
  }

  const clearAllRead = async () => {
    try {
      await apiCall("/api/collaborate/notifications?all=true", { method: "DELETE" })
      setNotifications((prev) => prev.filter((n) => !n.read))
      toast({ title: "Success", description: "All read notifications cleared" })
    } catch (error) {
      console.error("Error clearing notifications:", error)
      toast({ title: "Error", description: "Failed to clear notifications", variant: "destructive" })
    }
  }

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      setIsUpdatingPreferences(true)
      await apiCall("/api/collaborate/notification-preferences", { method: "PUT", body: JSON.stringify(updates) })
      setPreferences((prev) => ({ ...prev, ...updates }))
      toast({ title: "Preferences updated", description: "Your notification preferences have been saved" })
    } catch (error) {
      console.error("Error updating preferences:", error)
      toast({ title: "Error", description: "Failed to update preferences", variant: "destructive" })
    } finally {
      setIsUpdatingPreferences(false)
    }
  }

  const handleInvitationResponse = async (invitationId: string, action: "accept" | "reject") => {
    try {
      const data = await apiCall("/api/collaborate/invitations", {
        method: "PUT",
        body: JSON.stringify({ invitationId, action }),
      })
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => !(n.type === "team_invitation" && n.data?.invitation_id === invitationId)))
        toast({ title: `Invitation ${action}ed`, description: data.message })
      }
    } catch (error) {
      console.error("Error responding to invitation:", error)
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to respond to invitation", variant: "destructive" })
    }
  }

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) await markAsRead(n.id)
    if (n.action_url) window.location.href = n.action_url
  }

  const formatTime = (timestamp: string) => {
    const now = new Date()
    const t = new Date(timestamp)
    const diffMs = now.getTime() - t.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return t.toLocaleDateString()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "team_invitation":
        return "👥"
      case "join_request":
        return "📨"
      case "member_added":
        return "✅"
      case "new_message":
        return "💬"
      case "message_mention":
        return "📌"
      case "document_shared":
        return "📄"
      case "role_changed":
        return "🔧"
      case "team_updated":
        return "📝"
      default:
        return "🔔"
    }
  }

  const unread = useMemo(() => notifications.filter((n) => !n.read), [notifications])
  const team = useMemo(
    () => notifications.filter((n) => ["team_invitation", "member_added", "role_changed", "team_updated"].includes(n.type)),
    [notifications]
  )

  if (!mounted || !user || !session) return null

  return (
    <div className="relative">
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        }
        className="w-[22rem]"
        side="right"
        align="end"
        sideOffset={8}
        alignOffset={0}
        openOnHover
        hoverOpenDelay={75}
        hoverCloseDelay={150}
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
                  <DialogDescription>Choose which notifications you'd like to receive</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Team Notifications</h4>
                    {[
                      { key: "team_invitations", label: "Team invitations" },
                      { key: "member_added", label: "New team members" },
                      { key: "role_changes", label: "Role changes" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="text-sm">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={preferences[item.key as keyof NotificationPreferences]}
                          onChange={(e) => updatePreferences({ [item.key]: e.target.checked } as any)}
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
                      { key: "new_messages", label: "New messages" },
                      { key: "message_mentions", label: "When mentioned" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="text-sm">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={preferences[item.key as keyof NotificationPreferences]}
                          onChange={(e) => updatePreferences({ [item.key]: e.target.checked } as any)}
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
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-6 px-2">
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
          <div className="max-h-96 overflow-y-auto p-1">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-2">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    notification.type === "team_invitation" && notification.data ? (
                      <div key={notification.id} className="p-2">
                        <TeamInvitation
                          invitation={{
                            id: notification.data.invitation_id || notification.id,
                            team_name: notification.data.team_name,
                            role: notification.data.role || "viewer",
                            status: notification.data.status || "pending",
                            created_at: notification.created_at,
                            inviter_name: notification.data.inviter_name,
                            inviter_email: notification.data.inviter_email,
                            inviter_avatar: notification.data.inviter_avatar_url,
                            invitee_name: notification.data.invitee_name,
                            invitee_email: notification.data.invitee_email,
                            invitee_avatar: notification.data.invitee_avatar_url,
                          }}
                          onAccept={(invitationId: string) => handleInvitationResponse(invitationId, "accept")}
                          onReject={(invitationId: string) => handleInvitationResponse(invitationId, "reject")}
                          className="w-full"
                        />
                      </div>
                    ) : (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`group p-0 cursor-pointer ${!notification.read ? "bg-blue-50" : ""}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="w-full p-3 flex items-start gap-3">
                          <div className="text-lg">{getNotificationIcon(notification.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm truncate">{notification.title}</p>
                              <div className="flex items-center gap-1 ml-2">
                                {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
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
                            <p className="text-xs text-gray-600 mt-1 truncate">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatTime(notification.created_at)}</p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    )
                  ))}

                  {notifications.some((n) => n.read) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={clearAllRead} className="justify-center">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear read notifications
                      </DropdownMenuItem>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="unread">
                <div className="space-y-1">
                  {unread.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">You're all caught up</p>
                    </div>
                  ) : (
                    unread.map((notification) => (
                      notification.type === "team_invitation" && notification.data ? (
                        <div key={notification.id} className="p-2">
                          <TeamInvitation
                            invitation={{
                              id: notification.data.invitation_id || notification.id,
                              team_name: notification.data.team_name,
                              role: notification.data.role || "viewer",
                              status: notification.data.status || "pending",
                              created_at: notification.created_at,
                              inviter_name: notification.data.inviter_name,
                              inviter_email: notification.data.inviter_email,
                              inviter_avatar: notification.data.inviter_avatar_url,
                              invitee_name: notification.data.invitee_name,
                              invitee_email: notification.data.invitee_email,
                              invitee_avatar: notification.data.invitee_avatar_url,
                            }}
                            onAccept={(invitationId: string) => handleInvitationResponse(invitationId, "accept")}
                            onReject={(invitationId: string) => handleInvitationResponse(invitationId, "reject")}
                            className="w-full"
                          />
                        </div>
                      ) : (
                        <DropdownMenuItem
                          key={notification.id}
                          className={`group p-0 cursor-pointer ${!notification.read ? "bg-blue-50" : ""}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="w-full p-3 flex items-start gap-3">
                            <div className="text-lg">{getNotificationIcon(notification.type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm truncate">{notification.title}</p>
                                <div className="flex items-center gap-1 ml-2">
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
                              <p className="text-xs text-gray-600 mt-1 truncate">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{formatTime(notification.created_at)}</p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      )
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="team">
                <div className="space-y-1">
                  {team.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No team notifications</p>
                    </div>
                  ) : (
                    team.map((notification) => (
                      notification.type === "team_invitation" && notification.data ? (
                        <div key={notification.id} className="p-2">
                          <TeamInvitation
                            invitation={{
                              id: notification.data.invitation_id || notification.id,
                              team_name: notification.data.team_name,
                              role: notification.data.role || "viewer",
                              status: notification.data.status || "pending",
                              created_at: notification.created_at,
                              inviter_name: notification.data.inviter_name,
                              inviter_email: notification.data.inviter_email,
                              inviter_avatar: notification.data.inviter_avatar_url,
                              invitee_name: notification.data.invitee_name,
                              invitee_email: notification.data.invitee_email,
                              invitee_avatar: notification.data.invitee_avatar_url,
                            }}
                            onAccept={(invitationId: string) => handleInvitationResponse(invitationId, "accept")}
                            onReject={(invitationId: string) => handleInvitationResponse(invitationId, "reject")}
                            className="w-full"
                          />
                        </div>
                      ) : (
                        <DropdownMenuItem
                          key={notification.id}
                          className={`group p-0 cursor-pointer ${!notification.read ? "bg-blue-50" : ""}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="w-full p-3 flex items-start gap-3">
                            <div className="text-lg">{getNotificationIcon(notification.type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm truncate">{notification.title}</p>
                                <div className="flex items-center gap-1 ml-2">
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
                              <p className="text-xs text-gray-600 mt-1 truncate">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{formatTime(notification.created_at)}</p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      )
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
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
