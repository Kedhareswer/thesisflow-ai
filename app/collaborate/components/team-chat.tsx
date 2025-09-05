"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, Users, Minimize2 } from "lucide-react"
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from "@/hooks/use-toast"
import { useSocket, SocketEvent } from '@/lib/services/socket.service'
import { MentionInput, MentionData, MessageWithMentions } from '@/components/ui/mention-input'
import { Response } from '@/src/components/ai-elements/response'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  status: "online" | "offline" | "away"
  role: "owner" | "admin" | "editor" | "viewer"
  joinedAt: string
  lastActive: string
}

interface Team {
  id: string
  name: string
  description: string
  members: User[]
  createdAt: string
  isPublic: boolean
  category: string
  owner: string
}

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  teamId: string
  type: "text" | "system"
  senderAvatar?: string
  mentions?: MentionData[]
}

interface TeamChatProps {
  team: Team
  onClose: () => void
}

export function TeamChat({ team, onClose }: TeamChatProps) {
  const { user } = useSupabaseAuth()
  const socket = useSocket(user?.id || null)
  const { toast } = useToast()
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentMentions, setCurrentMentions] = useState<MentionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({})
  const [teamFiles, setTeamFiles] = useState<MentionData[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})
  
  // API helper function
  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }
    return response.json()
  }, [])
  
  // Format message date label for grouping
  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      const isYesterday = date.toDateString() === new Date(now.getTime() - 86400000).toDateString()
      
      if (isToday) return 'Today'
      if (isYesterday) return 'Yesterday'
      return date.toLocaleDateString()
    } catch {
      return 'Invalid date'
    }
  }

  // Group messages by date
  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groupedMessages: Record<string, ChatMessage[]> = {}
    messages.forEach((message) => {
      const date = formatDate(message.timestamp)
      if (!groupedMessages[date]) {
        groupedMessages[date] = []
      }
      groupedMessages[date].push(message)
    })
    return groupedMessages
  }

  // Determine if a message is from Nova AI Assistant
  const isAIMessage = (message: ChatMessage) => {
    const name = (message.senderName || '').toLowerCase()
    const id = (message.senderId || '').toLowerCase()
    // Heuristics: explicit type, known id, or recognizable name
    return (
      (message as any).type === 'ai' ||
      id === 'nova-ai' || id === 'nova_ai' || id === 'assistant' ||
      name.includes('nova ai') || name.includes('nova ai assistant') || name === 'assistant'
    )
  }

  // Load chat messages via socket
  const loadMessages = useCallback(async () => {
    if (!team?.id || !socket) return
    try {
      setIsLoading(true)
      await new Promise<void>((resolve) => {
        const handler = (payload: any) => {
          if (!payload || payload.teamId !== team.id) return
          const formattedMessages: ChatMessage[] = (payload.messages || []).map((msg: any) => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName || 'Unknown User',
            senderAvatar: msg.senderAvatar,
            content: msg.content,
            timestamp: msg.timestamp,
            teamId: msg.teamId,
            type: msg.type || 'text',
            mentions: Array.isArray(msg.mentions) ? msg.mentions : [],
          }))
          setMessages(formattedMessages)
          socket.off('messages', handler)
          resolve()
        }
        socket.on('messages', handler)
        socket.emit('get_messages', { teamId: team.id, limit: 50 })
      })
    } catch (error) {
      console.error('Error loading messages (socket):', error)
      toast({
        title: 'Error',
        description: 'Failed to load chat messages',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [team?.id, socket, toast])
  
  // Load team files for mentions
  const loadTeamFiles = useCallback(async () => {
    if (!team?.id) {
      console.log('No team ID for loading files')
      return
    }
    
    try {
      const data = await apiCall(`/api/collaborate/files?teamId=${team.id}&limit=20`)
      
      if (data.success && data.files) {
        const fileData: MentionData[] = data.files.map((file: any) => ({
          id: file.id,
          type: 'file' as const,
          name: file.name,
          fileType: file.file_type,
          fileSize: file.file_size?.toString(),
          fileUrl: file.file_url,
        }))
        
        console.log('Team files loaded:', fileData.length, 'files')
        setTeamFiles(fileData)
      } else {
        console.log('No files returned from API')
        setTeamFiles([])
      }
    } catch (error) {
      console.error('Error loading team files:', error)
      setTeamFiles([]) // Set empty array on error
    }
  }, [team?.id, apiCall])

  // Initialize data
  useEffect(() => {
    if (team?.id) {
      loadMessages()
      loadTeamFiles()
    }
  }, [team?.id, loadMessages, loadTeamFiles])
  
  // Socket event handlers
  useEffect(() => {
    if (!socket || !team?.id) return

    const handleNewMessage = (data: any) => {
      if (data.teamId === team.id) {
        const newMessage: ChatMessage = {
          id: data.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          content: data.content,
          timestamp: data.timestamp,
          teamId: data.teamId,
          type: data.type || "text",
          mentions: data.mentions || [],
        }
        setMessages(prev => [...prev, newMessage])
        
        // Clear typing indicator for the sender
        if (typingTimeoutsRef.current[data.senderId]) {
          clearTimeout(typingTimeoutsRef.current[data.senderId])
          setIsTyping(prev => ({ ...prev, [data.senderId]: false }))
        }
      }
    }

    const handleTyping = (data: { userId: string; teamId: string; isTyping: boolean; userName: string }) => {
      if (data.teamId === team.id && data.userId !== user?.id) {
        setIsTyping(prev => ({ ...prev, [data.userId]: data.isTyping }))
        
        // Clear previous timeout
        if (typingTimeoutsRef.current[data.userId]) {
          clearTimeout(typingTimeoutsRef.current[data.userId])
        }
        
        // Auto-clear typing indicator after 3 seconds
        if (data.isTyping) {
          typingTimeoutsRef.current[data.userId] = setTimeout(() => {
            setIsTyping(prev => ({ ...prev, [data.userId]: false }))
          }, 3000)
        }
      }
    }

    const handleMemberUpdate = () => {}

    // Join team room
    socket.emit(SocketEvent.JOIN_TEAM, { teamId: team.id, userId: user?.id })

    // Subscribe to events
    socket.on(SocketEvent.NEW_MESSAGE, handleNewMessage)
    socket.on(SocketEvent.TYPING, handleTyping)
    socket.on('member-joined', handleMemberUpdate)
    socket.on('member-left', handleMemberUpdate)

    return () => {
      // Leave team room
      socket.emit(SocketEvent.LEAVE_TEAM, { teamId: team.id, userId: user?.id })
      
      // Unsubscribe from events
      socket.off(SocketEvent.NEW_MESSAGE, handleNewMessage)
      socket.off(SocketEvent.TYPING, handleTyping)
      socket.off('member-joined', handleMemberUpdate)
      socket.off('member-left', handleMemberUpdate)
      
      // Clear all typing timeouts
      Object.values(typingTimeoutsRef.current).forEach(timeout => clearTimeout(timeout))
    }
  }, [socket, team?.id, user?.id, loadMessages])
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !team?.id || !newMessage.trim()) return
    
    try {
      setIsSending(true)
      
      // Send typing indicator (stopped typing)
      if (socket) {
        socket.emit(SocketEvent.STOP_TYPING, {
          teamId: team.id,
          userId: user.id,
        })
      }
      
      // Send message via socket
      if (socket) {
        socket.emit(SocketEvent.NEW_MESSAGE, {
          teamId: team.id,
          content: newMessage.trim(),
          type: 'text',
          mentions: currentMentions.map(m => m.id),
        })
        setNewMessage('')
        setCurrentMentions([])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Message failed",
        description: error instanceof Error ? error.message : "Could not send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }
  
  // Handle typing indicator
  const handleTypingIndicator = () => {
    if (!user || !team?.id || !socket) return
    
    socket.emit(SocketEvent.TYPING, {
      teamId: team.id,
      userId: user.id,
    })
  }
  
  // Handle mention input changes
  const handleMentionChange = (value: string, mentions: MentionData[]) => {
    setNewMessage(value)
    setCurrentMentions(mentions)
    handleTypingIndicator()
  }
  
  // Get team members as mention data
  const getTeamMentions = (): MentionData[] => {
    if (!team?.members) {
      console.log('No team members available for mentions')
      return []
    }
    
    const mentions = team.members.map(member => ({
      id: member.id,
      type: 'user' as const,
      name: member.name,
      email: member.email,
      avatar: member.avatar,
    }))
    
    console.log('Team mentions prepared:', mentions)
    return mentions
  }
  
  // Get user status based on team members
  const getUserStatus = (userId: string): "online" | "offline" | "away" => {
    const member = team.members.find(m => m.id === userId)
    return member?.status || 'offline'
  }
  
  // Get member info by ID
  const getMemberInfo = (userId: string) => {
    const member = team.members.find(m => m.id === userId)
    if (member) {
      return {
        name: member.name,
        avatar: member.avatar,
        status: member.status
      }
    }
    
    // Fallback for system messages or unknown users
    if (userId === 'system') {
      return {
        name: 'System',
        avatar: undefined,
        status: 'online' as const
      }
    }
    
    return {
      name: 'Unknown User',
      avatar: undefined,
      status: 'offline' as const
    }
  }
  
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }
  
  // Format message timestamp
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'Invalid time'
    }
  }
  
  
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'away':
        return 'bg-yellow-500'
      case 'offline':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }
  
  // Get typing users
  const getTypingUsers = () => {
    return Object.entries(isTyping)
      .filter(([userId, typing]) => typing && userId !== user?.id)
      .map(([userId]) => {
        const memberInfo = getMemberInfo(userId)
        return memberInfo.name
      })
  }
  
  const typingUsers = getTypingUsers()
  const groupedMessages = groupMessagesByDate(messages)
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">{team.name}</h3>
            <p className="text-sm text-gray-600">{team.members.length} members</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm text-gray-600">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No messages yet</p>
            <p className="text-sm">Start the conversation with your team</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date divider */}
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-gray-200" />
                <Badge variant="outline" className="mx-4 text-xs">
                  {date}
                </Badge>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              
              {/* Messages for this date */}
              {dateMessages.map((message) => {
                const memberInfo = getMemberInfo(message.senderId)
                
                return (
                  <div key={message.id}>
                    {message.type === "system" ? (
                      <div className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {message.content}
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex gap-3 hover:bg-gray-50 p-2 rounded">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.senderAvatar || memberInfo.avatar} />
                            <AvatarFallback className="text-xs">
                              {getInitials(message.senderName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(memberInfo.status)}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{message.senderName}</span>
                            <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                          </div>
                          {isAIMessage(message) ? (
                            <div className="prose prose-sm max-w-none text-gray-900">
                              <Response>
                                {message.content}
                              </Response>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                              <MessageWithMentions 
                                content={message.content}
                                mentions={message.mentions}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        )}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`
              }
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t bg-gray-50 rounded-b-lg">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <MentionInput
            value={newMessage}
            onChange={handleMentionChange}
            placeholder="Type your message... Use @ to mention team members, Nova AI, or files"
            disabled={isSending}
            className="flex-1"
            users={getTeamMentions()}
            files={teamFiles}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isSending) {
                e.preventDefault()
                handleSendMessage(e)
              }
            }}
          />
          <Button 
            type="button"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            size="sm"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
