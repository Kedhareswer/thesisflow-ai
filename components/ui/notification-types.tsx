import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  MessageSquare, 
  AtSign, 
  FileText, 
  Download, 
  UserPlus, 
  Settings, 
  X,
  Check,
  Clock
} from "lucide-react"
import Image from "next/image"

interface BaseNotification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  data?: any
  action_url?: string
}

interface NotificationItemProps {
  notification: BaseNotification
  onMarkRead?: (id: string) => void
  onDelete?: (id: string) => void
  onClick?: (notification: BaseNotification) => void
  className?: string
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

// Comment/Message Notification
export function CommentNotification({ notification, onMarkRead, onDelete, onClick, className }: NotificationItemProps) {
  const { data } = notification
  const authorName = data?.author_name || data?.user_name || "Someone"
  const authorAvatar = data?.author_avatar || data?.user_avatar
  const projectName = data?.project_name || data?.document_name || "a project"
  const commentText = data?.comment_text || data?.message_text || notification.message

  return (
    <div className={cn("p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer", className)} onClick={() => onClick?.(notification)}>
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={authorAvatar} alt={authorName} />
            <AvatarFallback className="text-xs">{authorName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
            <MessageSquare className="h-3 w-3 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">
              <span className="font-semibold">{authorName}</span> commented in{" "}
              <span className="font-semibold text-blue-600">{projectName}</span>
            </p>
            <div className="flex items-center gap-2">
              {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(notification.id)
                }}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mt-1 line-clamp-2 bg-gray-50 p-2 rounded italic">
            "{commentText}"
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-400">{formatTime(notification.created_at)}</p>
            <Badge variant="secondary" className="text-xs">Comment</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mention Notification
export function MentionNotification({ notification, onMarkRead, onDelete, onClick, className }: NotificationItemProps) {
  const { data } = notification
  const authorName = data?.author_name || data?.user_name || "Someone"
  const authorAvatar = data?.author_avatar || data?.user_avatar
  const projectName = data?.project_name || data?.document_name || "a project"
  const mentionContext = data?.mention_context || notification.message

  return (
    <div className={cn("p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer", className)} onClick={() => onClick?.(notification)}>
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={authorAvatar} alt={authorName} />
            <AvatarFallback className="text-xs">{authorName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-1">
            <AtSign className="h-3 w-3 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">
              <span className="font-semibold">{authorName}</span> mentioned you in{" "}
              <span className="font-semibold text-orange-600">{projectName}</span>
            </p>
            <div className="flex items-center gap-2">
              {!notification.read && <div className="w-2 h-2 bg-orange-500 rounded-full" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(notification.id)
                }}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {mentionContext}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-400">{formatTime(notification.created_at)}</p>
            <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">Mention</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

// File Sharing Notification
export function FileShareNotification({ notification, onMarkRead, onDelete, onClick, className }: NotificationItemProps) {
  const { data } = notification
  const sharerName = data?.sharer_name || data?.user_name || "Someone"
  const sharerAvatar = data?.sharer_avatar || data?.user_avatar
  const fileName = data?.file_name || "a file"
  const fileSize = data?.file_size || ""
  const fileType = data?.file_type || "file"

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('image')) return '🖼️'
    if (type.includes('video')) return '🎥'
    if (type.includes('audio')) return '🎵'
    return '📁'
  }

  return (
    <div className={cn("p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer", className)} onClick={() => onClick?.(notification)}>
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={sharerAvatar} alt={sharerName} />
            <AvatarFallback className="text-xs">{sharerName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
            <FileText className="h-3 w-3 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">
              <span className="font-semibold">{sharerName}</span> shared a file
            </p>
            <div className="flex items-center gap-2">
              {!notification.read && <div className="w-2 h-2 bg-green-500 rounded-full" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(notification.id)
                }}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="mt-2 p-2 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getFileIcon(fileType)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                {fileSize && <p className="text-xs text-gray-500">{fileSize}</p>}
              </div>
              <Button size="sm" variant="outline" className="h-7 px-2">
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-400">{formatTime(notification.created_at)}</p>
            <Badge variant="outline" className="text-xs border-green-200 text-green-700">File</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

// Team Member Added Notification
export function MemberAddedNotification({ notification, onMarkRead, onDelete, onClick, className }: NotificationItemProps) {
  const { data } = notification
  const memberName = data?.member_name || data?.user_name || "Someone"
  const memberAvatar = data?.member_avatar || data?.user_avatar
  const teamName = data?.team_name || "the team"
  const role = data?.role || "member"

  return (
    <div className={cn("p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer", className)} onClick={() => onClick?.(notification)}>
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={memberAvatar} alt={memberName} />
            <AvatarFallback className="text-xs">{memberName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-purple-500 rounded-full p-1">
            <UserPlus className="h-3 w-3 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">
              <span className="font-semibold">{memberName}</span> joined{" "}
              <span className="font-semibold text-purple-600">{teamName}</span>
            </p>
            <div className="flex items-center gap-2">
              {!notification.read && <div className="w-2 h-2 bg-purple-500 rounded-full" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(notification.id)
                }}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mt-1">
            New {role} added to the team
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-400">{formatTime(notification.created_at)}</p>
            <Badge variant="outline" className="text-xs border-purple-200 text-purple-700">Team</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

// Generic Notification (fallback)
export function GenericNotification({ notification, onMarkRead, onDelete, onClick, className }: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "team_invitation": return "👥"
      case "join_request": return "📨"
      case "member_added": return "✅"
      case "new_message": return "💬"
      case "message_mention": return "📌"
      case "document_shared": return "📄"
      case "role_changed": return "🔧"
      case "team_updated": return "📝"
      default: return "🔔"
    }
  }

  return (
    <div className={cn("p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer group", className)} onClick={() => onClick?.(notification)}>
      <div className="flex items-start gap-3">
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
                  onDelete?.(notification.id)
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
    </div>
  )
}

// Main notification renderer
export function NotificationItem({ notification, onMarkRead, onDelete, onClick, className }: NotificationItemProps) {
  const props = { notification, onMarkRead, onDelete, onClick, className }
  
  switch (notification.type) {
    case "new_message":
    case "comment":
      return <CommentNotification {...props} />
    case "message_mention":
    case "mention":
      return <MentionNotification {...props} />
    case "document_shared":
    case "file_shared":
      return <FileShareNotification {...props} />
    case "member_added":
      return <MemberAddedNotification {...props} />
    default:
      return <GenericNotification {...props} />
  }
}
