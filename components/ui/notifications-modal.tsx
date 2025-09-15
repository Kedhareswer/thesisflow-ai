"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Bell, Check, Settings, Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { TeamInvitation } from "@/components/ui/team-invitation"
import { notificationCache } from "@/lib/services/cache.service"

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

function NotificationItem({ notification, onMarkRead, onDelete, onClick }: {
  notification: Notification
  onMarkRead?: (id: string) => void
  onDelete?: (id: string) => void
  onClick?: (notification: Notification) => void
}) {
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

  const getAbsoluteTime = (timestamp: string) => {
    const t = new Date(timestamp)
    return t.toLocaleDateString('en-US', { 
      weekday: 'long', 
      hour: 'numeric', 
      minute: '2-digit' 
    })
  }

  const { data } = notification
  const userName = data?.user_name || data?.author_name || data?.inviter_name || data?.sender_name || "Someone"
  const userAvatar = data?.user_avatar || data?.author_avatar || data?.inviter_avatar || data?.sender_avatar
  const targetName = data?.project_name || data?.team_name || data?.document_name || data?.channel_name || data?.workspace_name

  const getActionText = (type: string) => {
    switch (type) {
      case "new_message":
      case "comment": return "commented in"
      case "message_mention":
      case "mention": return "mentioned you in"
      case "document_shared":
      case "file_shared": return "shared a file in"
      case "member_added": return "joined"
      case "team_invitation": return "invited you to"
      case "follow": return "followed you"
      case "like": return "liked your comment in"
      default: return "notified you about"
    }
  }

  return (
    <div className="w-full py-4 first:pt-0 last:pb-0" onClick={() => onClick?.(notification)}>
      <div className="flex gap-3">
        <Avatar className="size-11">
          <AvatarImage
            src={userAvatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${userName}`}
            alt={`${userName}'s profile picture`}
            className="object-cover ring-1 ring-border"
          />
          <AvatarFallback>{userName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex flex-1 flex-col space-y-2">
          <div className="w-full items-start">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-medium">{userName}</span>
                  <span className="text-muted-foreground"> {getActionText(notification.type)} </span>
                  {targetName && (
                    <span className="font-medium">{targetName}</span>
                  )}
                </div>
                {!notification.read && (
                  <div className="size-1.5 rounded-full bg-emerald-500"></div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {getAbsoluteTime(notification.created_at)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTime(notification.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Comment content */}
          {(notification.type === "comment" || notification.type === "new_message") && data?.comment_text && (
            <div className="rounded-lg bg-muted p-2.5 text-sm tracking-[-0.006em]">
              {data.comment_text}
            </div>
          )}

          {/* Mention content */}
          {(notification.type === "mention" || notification.type === "message_mention") && data?.mention_context && (
            <div className="rounded-lg bg-muted p-2.5 text-sm tracking-[-0.006em]">
              {data.mention_context}
            </div>
          )}

          {/* File attachment */}
          {(notification.type === "file_shared" || notification.type === "document_shared") && data?.file_name && (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
              <svg
                width="34"
                height="34"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative shrink-0"
              >
                <path
                  d="M30 39.25H10C7.10051 39.25 4.75 36.8995 4.75 34V6C4.75 3.10051 7.10051 0.75 10 0.75H20.5147C21.9071 0.75 23.2425 1.30312 24.227 2.28769L33.7123 11.773C34.6969 12.7575 35.25 14.0929 35.25 15.4853V34C35.25 36.8995 32.8995 39.25 30 39.25Z"
                  className="fill-white stroke-border dark:fill-card/70"
                  strokeWidth="1.5"
                />
                <path
                  d="M23 1V9C23 11.2091 24.7909 13 27 13H35"
                  className="stroke-border dark:fill-muted-foreground"
                  strokeWidth="1.5"
                />
                <foreignObject x="0" y="0" width="40" height="40">
                  <div className="absolute bottom-1.5 left-0 flex h-4 items-center rounded bg-primary px-[3px] py-0.5 text-[11px] leading-none font-semibold text-white dark:bg-muted">
                    {data.file_type || "FILE"}
                  </div>
                </foreignObject>
              </svg>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {data.file_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.file_type || "FILE"} • {data.file_size || "Unknown size"}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="size-8">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Invitation actions */}
          {notification.type === "team_invitation" && data?.status === "pending" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs">
                Decline
              </Button>
              <Button size="sm" className="h-7 text-xs">
                Accept
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NotificationsModal() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("all")
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { user, session } = useSupabaseAuth()
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  // API helper function
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

  // Load notifications
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
          notificationCache.set(cacheKey, notificationData, 2 * 60 * 1000)
        }
      } catch (error) {
        console.error("Error loading notifications:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id, session?.access_token, apiCall]
  )

  useEffect(() => {
    if (user && session && isOpen) {
      loadNotifications()
    }
  }, [user?.id, session?.access_token, isOpen, loadNotifications])

  // Mark as read
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
    }
  }

  // Mark all as read
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
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await apiCall(`/api/collaborate/notifications?id=${notificationId}`, { method: "DELETE" })
      const deleted = notifications.find((n) => n.id === notificationId)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      if (deleted && !deleted.read) setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) await markAsRead(n.id)
    if (n.action_url) window.location.href = n.action_url
  }

  // Filter notifications
  const unread = useMemo(() => notifications.filter((n) => !n.read), [notifications])
  const mentions = useMemo(() => notifications.filter((n) => n.type === "mention" || n.type === "message_mention"), [notifications])

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case "unread": return unread
      case "mentions": return mentions
      default: return notifications
    }
  }

  const filteredNotifications = getFilteredNotifications()

  if (!mounted || !user || !session) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[520px] p-0 gap-0">
        <Card className="flex w-full flex-col gap-6 p-4 shadow-none border-0 md:p-8">
          <CardHeader className="p-0">
            <div className="flex items-center justify-between">
              <h3 className="text-base leading-none font-semibold tracking-[-0.006em]">
                Your notifications
              </h3>
              <div className="flex items-center gap-2">
                <Button className="size-8" variant="ghost" size="icon" onClick={markAllAsRead}>
                  <Check className="size-4.5 text-muted-foreground" />
                </Button>
                <Button className="size-8" variant="ghost" size="icon">
                  <Settings className="size-4.5 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full flex-col justify-start"
            >
              <div className="flex items-center justify-between">
                <TabsList className="**:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 [&_button]:gap-1.5">
                  <TabsTrigger value="all">
                    View all
                    <Badge variant="secondary">{notifications.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="unread">
                    Unread <Badge variant="secondary">{unread.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="mentions">
                    Mentions <Badge variant="secondary">{mentions.length}</Badge>
                  </TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          </CardHeader>

          <CardContent className="h-full p-0">
            <div className="space-y-0 divide-y divide-dashed divide-border max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center space-y-2.5 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm font-medium tracking-[-0.006em] text-muted-foreground">
                    Loading notifications...
                  </p>
                </div>
              ) : filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markAsRead}
                    onDelete={deleteNotification}
                    onClick={handleNotificationClick}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2.5 py-12 text-center">
                  <div className="rounded-full bg-muted p-4">
                    <Bell className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium tracking-[-0.006em] text-muted-foreground">
                    No notifications yet.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
