"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
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
  Video,
  Pin,
  CheckCheck,
  Check,
  Clock,
  Bot,
  Sparkles,
  Zap,
  Brain,
  Target
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MentionInput, MentionData, MessageWithMentions } from './mention-input'
import { MarkdownRenderer } from './markdown-renderer'

// Enhanced Types
export interface ProductivityUser {
  id: string
  name: string
  email: string
  avatar?: string
  status: "online" | "offline" | "away" | "busy"
  activity?: string
  lastSeen?: string
  role?: string
  timezone?: string
}

export interface MessageReaction {
  emoji: string
  count: number
  users: string[]
  userNames?: string[]
}

export interface ProductivityMessage {
  id: string
  senderId: string
  senderName?: string
  content: string
  timestamp: string
  type: "text" | "image" | "file" | "audio" | "system" | "ai_response"
  reactions: Record<string, MessageReaction>
  replyTo?: string
  replyToContent?: string
  replyToSenderName?: string
  mentions?: MentionData[]
  attachments?: Attachment[]
  edited?: boolean
  editedAt?: string
  status: "sending" | "sent" | "delivered" | "read"
  priority?: "low" | "normal" | "high" | "urgent"
  category?: "discussion" | "task" | "decision" | "announcement" | "question"
  pinned?: boolean
  aiContext?: any
}

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  thumbnail?: string
}

// Emoji picker data - productivity focused
const PRODUCTIVITY_EMOJIS = [
  { emoji: '👍', name: 'thumbs up', category: 'reactions' },
  { emoji: '❤️', name: 'heart', category: 'reactions' },
  { emoji: '😊', name: 'smile', category: 'reactions' },
  { emoji: '🎉', name: 'celebrate', category: 'reactions' },
  { emoji: '🚀', name: 'rocket', category: 'productivity' },
  { emoji: '✅', name: 'check', category: 'productivity' },
  { emoji: '⭐', name: 'star', category: 'productivity' },
  { emoji: '🔥', name: 'fire', category: 'productivity' },
  { emoji: '💡', name: 'idea', category: 'productivity' },
  { emoji: '🎯', name: 'target', category: 'productivity' },
  { emoji: '⚡', name: 'lightning', category: 'productivity' },
  { emoji: '🤔', name: 'thinking', category: 'responses' },
  { emoji: '👀', name: 'eyes', category: 'responses' },
  { emoji: '🙏', name: 'thanks', category: 'responses' },
  { emoji: '💪', name: 'strong', category: 'responses' }
]

const EMOJI_CATEGORIES = [
  { id: 'reactions', name: 'Reactions', emojis: PRODUCTIVITY_EMOJIS.filter(e => e.category === 'reactions') },
  { id: 'productivity', name: 'Productivity', emojis: PRODUCTIVITY_EMOJIS.filter(e => e.category === 'productivity') },
  { id: 'responses', name: 'Responses', emojis: PRODUCTIVITY_EMOJIS.filter(e => e.category === 'responses') }
]

// Custom Emoji Picker Component
interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  className?: string
}

function ProductivityEmojiPicker({ onEmojiSelect, className }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState('reactions')

  return (
    <div className={cn("w-80 p-4 bg-background border rounded-lg shadow-lg", className)}>
      <div className="flex gap-1 mb-3 border-b pb-2">
        {EMOJI_CATEGORIES.map(category => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </Button>
        ))}
      </div>
      
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_CATEGORIES
          .find(cat => cat.id === selectedCategory)
          ?.emojis.map(({ emoji, name }) => (
            <Button
              key={emoji}
              variant="ghost"
              className="h-8 w-8 p-0 text-lg hover:bg-muted transition-colors"
              onClick={() => onEmojiSelect(emoji)}
              title={name}
            >
              {emoji}
            </Button>
          ))}
      </div>
    </div>
  )
}

// Enhanced Message Component with working reactions
interface ProductivityMessageProps {
  message: ProductivityMessage
  user: ProductivityUser
  currentUserId: string
  allUsers: ProductivityUser[]
  isConsecutive?: boolean
  onReply?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string) => void
  onPin?: (messageId: string) => void
  onAIAssist?: (messageId: string, context: string) => void
}

export function ProductivityMessage({
  message,
  user,
  currentUserId,
  allUsers,
  isConsecutive = false,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  onAIAssist
}: ProductivityMessageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const isOwn = message.senderId === currentUserId
  const isAI = message.type === 'ai_response'

  // Get user names for reaction tooltips
  const getReactionTooltip = useCallback((reaction: MessageReaction) => {
    const names = reaction.users
      .map(userId => allUsers.find(u => u.id === userId)?.name || 'Unknown')
      .slice(0, 3)
    
    const remainingCount = reaction.users.length - names.length
    let tooltip = names.join(', ')
    
    if (remainingCount > 0) {
      tooltip += ` and ${remainingCount} more`
    }
    
    return tooltip
  }, [allUsers])

  const handleEmojiSelect = useCallback((emoji: string) => {
    onReact?.(message.id, emoji)
    setShowEmojiPicker(false)
  }, [onReact, message.id])

  const statusIcon = {
    sending: <Clock className="w-3 h-3 text-muted-foreground animate-pulse" />,
    sent: <Check className="w-3 h-3 text-muted-foreground" />,
    delivered: <CheckCheck className="w-3 h-3 text-muted-foreground" />,
    read: <CheckCheck className="w-3 h-3 text-blue-500" />
  }[message.status]

  const priorityColors = {
    low: 'border-l-gray-400',
    normal: '',
    high: 'border-l-orange-400',
    urgent: 'border-l-red-500'
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "group relative flex gap-3 px-4 py-1 hover:bg-muted/30 transition-colors border-l-2 border-l-transparent",
          isConsecutive && "mt-0.5",
          !isConsecutive && "mt-4",
          message.priority && priorityColors[message.priority],
          message.pinned && "bg-blue-50 dark:bg-blue-950/20"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {!isConsecutive ? (
            <div className="relative">
              <Avatar className={cn("h-8 w-8", isAI && "ring-2 ring-blue-500")}>
                <AvatarImage src={user.avatar} />
                <AvatarFallback className={cn(
                  "text-xs",
                  isAI && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                )}>
                  {isAI ? <Bot className="w-4 h-4" /> : user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <ProductivityStatusIndicator 
                status={user.status} 
                className="absolute -bottom-0.5 -right-0.5" 
              />
            </div>
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
          {/* Header */}
          {!isConsecutive && (
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "font-semibold text-sm",
                isAI && "text-blue-600 dark:text-blue-400"
              )}>
                {isAI ? 'Nova AI Assistant' : user.name}
              </span>
              
              {/* Mention indicator */}
              {message.mentions?.some(m => m.id === currentUserId) && (
                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                  <Target className="h-3 w-3 mr-1" />
                  Mentioned you
                </Badge>
              )}
              
              {isAI && <Sparkles className="w-3 h-3 text-blue-500" />}
              
              <ProductivityStatusBadge 
                status={user.status} 
                activity={user.activity}
              />
              
              <span className="text-xs text-muted-foreground">
                {formatTime(message.timestamp)}
              </span>
              
              {message.edited && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  edited
                </Badge>
              )}
              
              {message.category && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs px-1 py-0", getCategoryStyle(message.category))}
                >
                  {message.category}
                </Badge>
              )}
              
              {message.pinned && (
                <Pin className="w-3 h-3 text-amber-500" />
              )}
            </div>
          )}

          {/* Reply Display */}
          {message.replyTo && (
            <div className="mb-2 pl-3 pr-2 py-1 border-l-2 border-muted-foreground/30">
              <div className="flex items-center gap-2">
                <Reply className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {message.replyToSenderName ? `Replying to ${message.replyToSenderName}` : 'Replying to message'}
                </span>
              </div>
              {message.replyToContent && (
                <div className="mt-0.5 text-sm italic text-muted-foreground truncate max-w-[360px]">
                  {message.replyToContent}
                </div>
              )}
            </div>
          )}

          {/* Message Body */}
          <div className="text-sm text-foreground leading-relaxed">
            {message.type === 'text' || message.type === 'ai_response' ? (
              isAI ? (
                <MarkdownRenderer 
                  content={message.content} 
                  className={cn(
                    "prose prose-sm max-w-none",
                    // Highlight messages that mention the current user
                    message.mentions?.some(m => m.id === currentUserId) && 
                    "bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded-lg border-l-4 border-l-yellow-400"
                  )}
                />
              ) : (
                <MessageWithMentions 
                  content={message.content} 
                  mentions={message.mentions} 
                  className={cn(
                    // Highlight messages that mention the current user
                    message.mentions?.some(m => m.id === currentUserId) && 
                    "bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded-lg border-l-4 border-l-yellow-400"
                  )}
                  currentUserId={currentUserId}
                />
              )
            ) : (
              <MessageAttachment message={message} />
            )}
          </div>

          {/* Reactions */}
          {Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(message.reactions).map(([emoji, reaction]) => (
                <Tooltip key={emoji}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-6 px-2 py-0 text-xs hover:bg-primary/10 transition-colors",
                        reaction.users.includes(currentUserId) && "bg-primary/20 border-primary/40"
                      )}
                      onClick={() => onReact?.(message.id, emoji)}
                    >
                      <span className="mr-1">{emoji}</span>
                      <span>{reaction.count}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getReactionTooltip(reaction)}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}

          {/* Message Status */}
          {isOwn && (
            <div className="flex items-center justify-end mt-1">
              {statusIcon}
            </div>
          )}
        </div>

        {/* Message Actions */}
        {isHovered && (
          <div className="absolute -top-2 right-4 bg-background border rounded-lg shadow-lg flex items-center">
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Smile className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <ProductivityEmojiPicker onEmojiSelect={handleEmojiSelect} />
              </PopoverContent>
            </Popover>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onReply?.(message.id)}
            >
              <Reply className="h-3 w-3" />
            </Button>
            
            {!isAI && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onAIAssist?.(message.id, message.content)}
                title="Ask Nova AI"
              >
                <Brain className="h-3 w-3 text-blue-500" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPin?.(message.id)}
            >
              <Pin className="h-3 w-3" />
            </Button>
            
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// Enhanced Status Components
function ProductivityStatusIndicator({ status, className }: { status: ProductivityUser['status'], className?: string }) {
  const statusConfig = {
    online: { color: 'bg-green-500', pulse: 'animate-pulse' },
    away: { color: 'bg-yellow-500', pulse: '' },
    busy: { color: 'bg-red-500', pulse: '' },
    offline: { color: 'bg-gray-400', pulse: '' }
  }

  const config = statusConfig[status]

  return (
    <div className={cn(
      "w-3 h-3 rounded-full border-2 border-background",
      config.color,
      status === 'online' && config.pulse,
      className
    )} />
  )
}

function ProductivityStatusBadge({ 
  status, 
  activity 
}: { 
  status: ProductivityUser['status']
  activity?: string 
}) {
  const statusConfig = {
    online: { color: 'text-green-600', label: 'Online' },
    away: { color: 'text-yellow-600', label: 'Away' },
    busy: { color: 'text-red-600', label: 'Busy' },
    offline: { color: 'text-gray-500', label: 'Offline' }
  }

  const config = statusConfig[status]

  if (activity) {
    return (
      <Badge variant="outline" className={cn("text-xs px-1.5 py-0", config.color)}>
        {activity}
      </Badge>
    )
  }

  return null
}

// Enhanced Message Input with AI integration
interface ProductivityMessageInputProps {
  value: string
  onChange: (value: string, mentions: MentionData[]) => void
  onSend: () => void
  onAttach?: () => void
  onAIAssist?: (prompt: string) => void
  disabled?: boolean
  placeholder?: string
  users?: MentionData[]
  files?: MentionData[]
  currentUser?: ProductivityUser
  replyingTo?: ProductivityMessage
  onCancelReply?: () => void
}

export function ProductivityMessageInput({
  value,
  onChange,
  onSend,
  onAttach,
  onAIAssist,
  disabled = false,
  placeholder = "Type a message... Use @ to mention team members or @nova for AI assistance",
  users = [],
  files = [],
  currentUser,
  replyingTo,
  onCancelReply
}: ProductivityMessageInputProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [category, setCategory] = useState<string>('discussion')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        onSend()
      }
    }
    
    if (e.key === 'Escape' && replyingTo) {
      onCancelReply?.()
    }
  }

  const handleSend = () => {
    if (value.trim()) {
      onSend()
    }
  }

  const handleAIAssist = () => {
    if (value.trim()) {
      onAIAssist?.(value)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    const currentValue = value
    const newValue = currentValue + emoji
    onChange(newValue, [])
    setShowEmojiPicker(false)
    textareaRef.current?.focus()
  }

  // Enhanced users list with Nova AI
  const enhancedUsers = [
    {
      id: 'nova-ai',
      type: 'ai' as const,
      name: 'Nova AI',
      avatar: '/assistant-avatar.svg'
    },
    ...users
  ]

  return (
    <div className="border-t bg-background">
      {/* Enhanced Reply Preview */}
      {replyingTo && (
        <div className="mx-4 mt-4 mb-2">
          <div className="relative bg-muted/30 rounded-lg p-3 border-l-4 border-primary/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Reply className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Replying to {replyingTo.senderName || (replyingTo.senderId === 'nova-ai' ? 'Nova AI' : 'Someone')}
                  </span>
                </div>
                <div className="text-sm text-foreground/80 truncate max-w-[280px]">
                  {replyingTo.content.length > 60 
                    ? `${replyingTo.content.substring(0, 60)}...` 
                    : replyingTo.content}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                onClick={onCancelReply}
              >
                ×
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="p-4">
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
                className="min-h-[40px] max-h-32 resize-none border-0 p-0 focus-visible:ring-0 text-sm"
                users={enhancedUsers}
                files={files}
                onKeyDown={handleKeyDown}
              />
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
                
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Smile className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <ProductivityEmojiPicker onEmojiSelect={handleEmojiSelect} />
                  </PopoverContent>
                </Popover>
                
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onAttach}>
                  <Paperclip className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={handleAIAssist}
                  disabled={!value.trim()}
                >
                  <Brain className="h-3 w-3 mr-1" />
                  AI
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {replyingTo ? 'Enter to send reply • Esc to cancel' : 'Enter to send, Shift+Enter for new line'}
                </span>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={disabled || !value.trim()}
                  className={cn(
                    "h-8 px-3",
                    replyingTo && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <Send className="h-3 w-3 mr-1" />
                  {replyingTo ? 'Reply' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Chat Header with productivity features
interface ProductivityChatHeaderProps {
  title: string
  subtitle?: string
  members?: ProductivityUser[]
  onSearchClick?: () => void
  onCallClick?: () => void
  onVideoClick?: () => void
  onSettingsClick?: () => void
  onClose?: () => void
}

export function ProductivityChatHeader({
  title,
  subtitle,
  members = [],
  onSearchClick,
  onCallClick,
  onVideoClick,
  onSettingsClick,
  onClose
}: ProductivityChatHeaderProps) {
  const onlineCount = members.filter(m => m.status === 'online').length
  const activeCount = members.filter(m => ['online', 'away'].includes(m.status)).length

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
        </div>
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            {title}
            <Zap className="w-4 h-4 text-blue-500" />
          </h3>
          <div className="text-sm text-muted-foreground flex items-center gap-4">
            <span>{onlineCount} online, {activeCount} active</span>
            <span>•</span>
            <span>{members.length} members</span>
            {subtitle && (
              <>
                <span>•</span>
                <span>{subtitle}</span>
              </>
            )}
          </div>
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

function getCategoryStyle(category: string) {
  const styles = {
    discussion: 'text-blue-600 border-blue-300',
    task: 'text-green-600 border-green-300',
    decision: 'text-purple-600 border-purple-300',
    announcement: 'text-orange-600 border-orange-300',
    question: 'text-yellow-600 border-yellow-300'
  }
  return styles[category as keyof typeof styles] || ''
}

// Message Attachment Component (reused from previous implementation)
function MessageAttachment({ message }: { message: ProductivityMessage }) {
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

  return <span className="text-muted-foreground italic">{message.content}</span>
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
