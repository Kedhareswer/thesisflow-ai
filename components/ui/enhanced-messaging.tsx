"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical, 
  Reply, 
  Heart,
  ThumbsUp,
  Plus,
  Image as ImageIcon,
  File,
  Mic,
  Settings,
  Search,
  Users,
  Phone,
  Video
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MentionInput, MentionData, MessageWithMentions } from './mention-input'

// Types
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  status: "online" | "offline" | "away"
  lastSeen?: string
}

export interface Message {
  id: string
  senderId: string
  content: string
  timestamp: string
  type: "text" | "image" | "file" | "audio" | "system"
  reactions?: Reaction[]
  replyTo?: string
  mentions?: MentionData[]
  attachments?: Attachment[]
  edited?: boolean
  editedAt?: string
}

export interface Reaction {
  emoji: string
  count: number
  users: string[]
}

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  thumbnail?: string
}

// Enhanced Message Component
interface EnhancedMessageProps {
  message: Message
  user: User
  currentUserId: string
  isConsecutive?: boolean
  onReply?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string) => void
}

export function EnhancedMessage({
  message,
  user,
  currentUserId,
  isConsecutive = false,
  onReply,
  onReact,
  onEdit,
  onDelete
}: EnhancedMessageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const isOwn = message.senderId === currentUserId
  const timeAgo = formatTimeAgo(message.timestamp)

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-1 hover:bg-muted/30 transition-colors",
        isConsecutive && "mt-0.5",
        !isConsecutive && "mt-4"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar - only show if not consecutive */}
      <div className="flex-shrink-0">
        {!isConsecutive ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xs">
              {user.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 h-8 flex items-center justify-center">
            {isHovered && (
              <span className="text-xs text-muted-foreground font-mono">
                {formatTime(message.timestamp)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header - only show if not consecutive */}
        {!isConsecutive && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-foreground">
              {user.name}
            </span>
            <UserStatusBadge status={user.status} />
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
            {message.edited && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                edited
              </Badge>
            )}
          </div>
        )}

        {/* Message Body */}
        <div className="text-sm text-foreground leading-relaxed">
          {message.type === 'text' ? (
            <MessageWithMentions 
              content={message.content} 
              mentions={message.mentions} 
            />
          ) : (
            <MessageAttachment message={message} />
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.map((reaction) => (
              <ReactionBadge
                key={reaction.emoji}
                reaction={reaction}
                onClick={() => onReact?.(message.id, reaction.emoji)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Message Actions */}
      {isHovered && (
        <div className="absolute -top-2 right-4 bg-background border rounded-lg shadow-lg flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onReact?.(message.id, '👍')}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onReact?.(message.id, '❤️')}
          >
            <Heart className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onReply?.(message.id)}
          >
            <Reply className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

// User Status Badge
function UserStatusBadge({ status }: { status: User['status'] }) {
  const statusConfig = {
    online: { color: 'bg-green-500', label: 'Online' },
    away: { color: 'bg-yellow-500', label: 'Away' },
    offline: { color: 'bg-gray-400', label: 'Offline' }
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-1">
      <div className={cn("w-2 h-2 rounded-full", config.color)} />
    </div>
  )
}

// Reaction Badge
function ReactionBadge({ 
  reaction, 
  onClick 
}: { 
  reaction: Reaction
  onClick: () => void 
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-6 px-2 py-0 text-xs hover:bg-primary/10 transition-colors"
      onClick={onClick}
    >
      <span className="mr-1">{reaction.emoji}</span>
      <span>{reaction.count}</span>
    </Button>
  )
}

// Message Attachment Component
function MessageAttachment({ message }: { message: Message }) {
  if (message.type === 'image' && message.attachments?.[0]) {
    const attachment = message.attachments[0]
    return (
      <div className="max-w-sm">
        <img
          src={attachment.url}
          alt={attachment.name}
          className="rounded-lg border max-w-full h-auto"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {attachment.name} • {formatFileSize(attachment.size)}
        </p>
      </div>
    )
  }

  if (message.type === 'file' && message.attachments?.[0]) {
    const attachment = message.attachments[0]
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg max-w-sm hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex-shrink-0">
          <File className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{attachment.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(attachment.size)}
          </p>
        </div>
      </div>
    )
  }

  if (message.type === 'audio') {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg max-w-sm">
        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
          <Mic className="h-4 w-4" />
        </Button>
        <div className="flex-1 h-2 bg-muted rounded-full">
          <div className="h-full w-1/3 bg-primary rounded-full"></div>
        </div>
        <span className="text-xs text-muted-foreground">00:28</span>
      </div>
    )
  }

  return <span className="text-muted-foreground italic">{message.content}</span>
}

// Enhanced Message Input
interface EnhancedMessageInputProps {
  value: string
  onChange: (value: string, mentions: MentionData[]) => void
  onSend: () => void
  onAttach?: () => void
  disabled?: boolean
  placeholder?: string
  users?: MentionData[]
  files?: MentionData[]
  currentUser?: User
}

export function EnhancedMessageInput({
  value,
  onChange,
  onSend,
  onAttach,
  disabled = false,
  placeholder = "Type a message...",
  users = [],
  files = [],
  currentUser
}: EnhancedMessageInputProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        onSend()
      }
    }
  }

  const handleSend = () => {
    if (value.trim()) {
      onSend()
    }
  }

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-start gap-3">
        {/* User Avatar */}
        <Avatar className="h-8 w-8 mt-1">
          <AvatarImage src={currentUser?.avatar} />
          <AvatarFallback className="text-xs">
            {currentUser?.name?.substring(0, 2).toUpperCase() || 'ME'}
          </AvatarFallback>
        </Avatar>

        {/* Input Area */}
        <div className="flex-1">
          <div className="border rounded-lg p-3 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <MentionInput
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-[20px] max-h-32 resize-none border-0 p-0 focus-visible:ring-0 text-sm"
              users={users}
              files={files}
              onKeyDown={handleKeyDown}
            />
            
            {/* Attachment Area - if expanded */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={onAttach}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Image
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onAttach}>
                    <File className="h-4 w-4 mr-2" />
                    File
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Mic className="h-4 w-4 mr-2" />
                    Audio
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <Plus className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-45")} />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Smile className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onAttach}>
                <Paperclip className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </span>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={disabled || !value.trim()}
                className="h-8 px-3"
              >
                <Send className="h-3 w-3 mr-1" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Chat Header
interface EnhancedChatHeaderProps {
  title: string
  subtitle?: string
  members?: User[]
  onSearchClick?: () => void
  onCallClick?: () => void
  onVideoClick?: () => void
  onSettingsClick?: () => void
  onClose?: () => void
}

export function EnhancedChatHeader({
  title,
  subtitle,
  members = [],
  onSearchClick,
  onCallClick,
  onVideoClick,
  onSettingsClick,
  onClose
}: EnhancedChatHeaderProps) {
  const onlineCount = members.filter(m => m.status === 'online').length

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {members.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {onlineCount} of {members.length} online
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onSearchClick}>
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onCallClick}>
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onVideoClick}>
          <Video className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onSettingsClick}>
          <Settings className="h-4 w-4" />
        </Button>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        )}
      </div>
    </div>
  )
}

// Utility functions
function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '00:00'
  }
}

function formatTimeAgo(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
