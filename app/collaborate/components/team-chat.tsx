"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send } from "lucide-react"
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { collaborateService } from '@/lib/services/collaborate.service'
import { socketService, SocketEvent } from '@/lib/services/socket.service'
import { usePresence } from '@/lib/services/presence.service'
import { ChatMessage, Team, TeamMember } from '@/lib/supabase'

interface TeamChatProps {
  team: Team
  onClose: () => void
}

export function TeamChat({ team, onClose }: TeamChatProps) {
  const { user } = useSupabaseAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})
  const userPresences = usePresence(user?.id || null)
  
  // Fetch messages and members on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !team) return
      
      try {
        setIsLoading(true)
        
        // Fetch messages
        const fetchedMessages = await collaborateService.getMessages(team.id)
        setMessages(fetchedMessages)
        
        // Fetch members
        const fetchedMembers = await collaborateService.getTeamMembers(team.id)
        setMembers(fetchedMembers)
        
        // Join team room
        socketService.joinTeam(team.id)
      } catch (error) {
        console.error('Error fetching team data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
    
    // Cleanup: leave team room
    return () => {
      socketService.leaveTeam(team.id)
    }
  }, [team, user])
  
  // Subscribe to socket events
  useEffect(() => {
    if (!user || !team) return
    
    // Handle new messages
    const handleNewMessage = (message: ChatMessage) => {
      if (message.team_id === team.id) {
        setMessages(prev => [...prev, message])
        
        // Clear typing indicator for the sender
        if (typingTimeoutsRef.current[message.sender_id]) {
          clearTimeout(typingTimeoutsRef.current[message.sender_id])
          setIsTyping(prev => ({ ...prev, [message.sender_id]: false }))
        }
      }
    }
    
    // Handle typing indicator
    const handleTyping = (data: { userId: string; teamId: string; isTyping: boolean }) => {
      if (data.teamId === team.id && data.userId !== user.id) {
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
    
    // Handle member join/leave
    const handleMemberUpdate = async () => {
      try {
        const fetchedMembers = await collaborateService.getTeamMembers(team.id)
        setMembers(fetchedMembers)
      } catch (error) {
        console.error('Error updating members:', error)
      }
    }
    
    // Subscribe to events
    socketService.on(SocketEvent.NEW_MESSAGE, handleNewMessage)
    socketService.on(SocketEvent.TYPING, handleTyping)
    socketService.on(SocketEvent.MEMBER_JOINED, handleMemberUpdate)
    socketService.on(SocketEvent.MEMBER_LEFT, handleMemberUpdate)
    
    return () => {
      // Unsubscribe from events
      socketService.off(SocketEvent.NEW_MESSAGE, handleNewMessage)
      socketService.off(SocketEvent.TYPING, handleTyping)
      socketService.off(SocketEvent.MEMBER_JOINED, handleMemberUpdate)
      socketService.off(SocketEvent.MEMBER_LEFT, handleMemberUpdate)
      
      // Clear all typing timeouts
      Object.values(typingTimeoutsRef.current).forEach(timeout => clearTimeout(timeout))
    }
  }, [team, user])
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !team || !newMessage.trim()) return
    
    try {
      setIsSending(true)
      
      // Send typing indicator (stopped typing)
      socketService.sendTypingStatus(team.id, false)
      
      // Send message
      await collaborateService.sendMessage(team.id, user.id, newMessage)
      
      // Clear input
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }
  
  // Handle typing indicator
  const handleTypingIndicator = () => {
    if (!user || !team) return
    
    socketService.sendTypingStatus(team.id, true)
  }
  
  // Get user status
  const getUserStatus = (userId: string) => {
    const presence = userPresences.get(userId)
    return presence?.status || 'offline'
  }
  
  // Get member name by ID
  const getMemberName = (userId: string) => {
    const member = members.find(m => m.id === userId || m.user_id === userId)
    return member?.name || member?.full_name || 'Unknown User'
  }
  
  // Get member avatar by ID
  const getMemberAvatar = (userId: string) => {
    const member = members.find(m => m.id === userId || m.user_id === userId)
    return member?.avatar || member?.avatar_url
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
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  // Format message date
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }
  
  // Group messages by date
  const groupedMessages = messages.reduce((groups: Record<string, ChatMessage[]>, message) => {
    const date = formatDate(message.created_at)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {})
  
  // Get typing users
  const typingUsers = Object.entries(isTyping)
    .filter(([userId, isTyping]) => isTyping && userId !== user?.id)
    .map(([userId]) => getMemberName(userId))
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">{team.name}</h2>
          <p className="text-sm text-gray-500">{members.length} members</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      
      {/* Chat area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date} className="mb-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs">
                      {date}
                    </div>
                  </div>
                  
                  {dateMessages.map((message, index) => {
                    const isCurrentUser = message.sender_id === user?.id
                                         const isSystem = message.message_type === 'system'
                    
                    if (isSystem) {
                      return (
                        <div key={message.id} className="flex justify-center my-2">
                          <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-500">
                            {message.content}
                          </div>
                        </div>
                      )
                    }
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isCurrentUser && (
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={getMemberAvatar(message.sender_id)} />
                            <AvatarFallback>
                              {getInitials(getMemberName(message.sender_id))}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={`max-w-[70%]`}>
                          {!isCurrentUser && (
                            <div className="text-xs text-gray-500 mb-1">
                              {getMemberName(message.sender_id)}
                            </div>
                          )}
                          
                          <div className="flex items-end gap-2">
                            <div
                              className={`p-3 rounded-lg ${
                                isCurrentUser
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 dark:bg-gray-800'
                              }`}
                            >
                              {message.content}
                              <div
                                className={`text-xs mt-1 ${
                                  isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                                }`}
                              >
                                {formatTime(message.created_at)}
                              </div>
                            </div>
                            
                            {isCurrentUser && (
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user?.avatar} />
                                <AvatarFallback>
                                  {getInitials(user?.name || '')}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              
              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="text-xs text-gray-500 italic mb-2">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}
              
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        
        {/* Member list */}
        <div className="w-64 border-l p-4 hidden md:block overflow-y-auto">
          <h3 className="font-medium mb-4">Members</h3>
          <div className="space-y-3">
            {members.map(member => {
              const userId = member.id || member.user_id
              const status = getUserStatus(userId)
              const statusColor = {
                online: 'bg-green-500',
                away: 'bg-yellow-500',
                offline: 'bg-gray-500',
              }[status]
              
              return (
                <div key={member.id || member.user_id} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar || member.avatar_url} />
                      <AvatarFallback>
                        {getInitials(member.name || member.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${statusColor} ring-1 ring-white`}
                    />
                  </div>
                  <div className="text-sm">
                    {member.name || member.full_name}
                    {member.role === 'owner' && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        Owner
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleTypingIndicator}
            disabled={isSending}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
