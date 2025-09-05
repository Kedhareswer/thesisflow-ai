"use client"

import type React from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MentionInput, MessageWithMentions, type MentionData } from "@/components/ui/mention-input"
import { 
  ProductivityMessage as EnhancedMessage, 
  ProductivityMessageInput as EnhancedMessageInput, 
  ProductivityChatHeader as EnhancedChatHeader,
  ProductivityUser as EnhancedUser,
  ProductivityMessage as EnhancedMessageType
} from '@/components/ui/productivity-messaging'
import { StreamingAIMessage } from '@/components/ui/streaming-ai-message'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { NovaAIService } from '@/lib/services/nova-ai.service'
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Users,
  MessageSquare,
  Plus,
  MoreHorizontal,
  Settings,
  LogOut,
  Search,
  Crown,
  Edit,
  Trash,
  Check,
  X,
  Send,
  Video,
  ChevronDown,
  Clock,
  Loader2,
  UserPlus,
  Mail,
  ExternalLink,
  Share,
  Shield,
  ChevronRight,
  Home,
  User,
  DollarSign,
  Sparkles,
  Zap,
  FileText,
  Eye,
  AlertCircle,
  Globe,
  Lock,
  Bot,
  Copy,
  Reply,
  Brain
} from "lucide-react"

import { useSocket as useAppSocket } from "@/lib/services/socket.service"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { RouteGuard } from "@/components/route-guard"
import { TeamSettings } from "./components/team-settings"
import { TeamFiles } from "./components/team-files"
import NotificationBell from "./components/notification-bell"
import { InvitationsDialog } from "./components/invitations-dialog"
import { DevelopmentNotice } from "@/components/ui/development-notice"
import IntegrationsSection from "@/components/ui/integrations-component"
import { useUserPlan } from "@/hooks/use-user-plan"
import { PlanStatus } from "@/components/ui/plan-status"
import { TeamLimitBanner } from "@/components/ui/smart-upgrade-banner"
import { collaborateService } from "@/lib/services/collaborate.service"

// Type definitions
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
}

export default function CollaboratePage() {
  // Plan system
  const { canUseFeature, isProfessionalOrHigher, refreshPlanData, planData, getUsageForFeature, loading: planLoading, isPlanDataReady } = useUserPlan()
  
  // Dev-only, one-time debug logging to avoid spam
  const hasLoggedPlanRef = useRef(false)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !hasLoggedPlanRef.current && !planLoading && isPlanDataReady()) {
      // Consolidated single log block
      // eslint-disable-next-line no-console
      console.log('[Collaborate] Plan snapshot', {
        planData,
        planLoading,
        ready: isPlanDataReady(),
        canTeam: canUseFeature('team_members'),
        proOrHigher: isProfessionalOrHigher(),
      })
      hasLoggedPlanRef.current = true
    }
  }, [planLoading, isPlanDataReady, canUseFeature, isProfessionalOrHigher, planData])
  
  // State management
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  // Enhanced productivity features
  const [userPresence, setUserPresence] = useState<Record<string, EnhancedUser>>({})
  const [replyingTo, setReplyingTo] = useState<EnhancedMessageType | null>(null)
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  // Removed lastActivity state to prevent infinite loop - using local variable in useEffect instead
  const novaAI = NovaAIService.getInstance()
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [currentMentions, setCurrentMentions] = useState<MentionData[]>([])
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor" | "admin">("viewer")
  const [isInviting, setIsInviting] = useState(false)
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)
  const [invitationDialog, setInvitationDialog] = useState<{
    open: boolean
    invitation?: any
    action?: 'accept' | 'reject'
  }>({ open: false })
  const [isRespondingToInvitation, setIsRespondingToInvitation] = useState(false)
  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
    category: "Research",
    isPublic: false,
  })
  const [isInvitationsDialogOpen, setIsInvitationsDialogOpen] = useState(false)
  // global navigation sidebar collapse state
  const [collapsed, setCollapsed] = useState(false)

  const { toast } = useToast()
  const { user, isLoading: authLoading, session } = useSupabaseAuth()
  // Use authenticated socket from lib (attaches Supabase token)
  const socket = useAppSocket(user?.id || null)

  // API helper functions
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

  // Load teams (prefer websocket request-response, fallback to REST once)
  const loadTeams = useCallback(async () => {
    if (!user || !session) return
    try {
      setIsLoading(true)
      setError(null)

      // Try sockets first for a single-shot fetch (no polling)
      if (socket && (socket as any).connected) {
        await new Promise<void>((resolve) => {
          const handleTeams = (payload: any) => {
            if (!payload) return
            ;(socket as any).off('user-teams', handleTeams)
            if (payload.success) {
              const transformed = (payload.teams || []).map((team: any) => ({
                id: team.id,
                name: team.name,
                description: team.description,
                category: team.category,
                isPublic: team.is_public,
                createdAt: team.created_at,
                owner: team.owner_id,
                members: (team.members || []).map((member: any) => ({
                  id: member.user_id,
                  name: member.user_profile?.full_name || member.email || 'Unknown User',
                  email: member.email || member.user_profile?.email || '',
                  avatar: member.user_profile?.avatar_url,
                  status: member.user_profile?.status || 'offline',
                  role: member.role,
                  joinedAt: member.joined_at,
                  lastActive: member.user_profile?.last_active || member.joined_at,
                })),
              }))
              setTeams(transformed)
              if (!selectedTeamId && transformed.length > 0) {
                setSelectedTeamId(transformed[0].id)
              }
            } else {
              setError(payload.error || 'Failed to load teams')
            }
            resolve()
          }
          ;(socket as any).on('user-teams', handleTeams)
          ;(socket as any).emit('get_user_teams')
        })
        return
      }

      // Fallback to REST once (no interval/polling)
      const data = await apiCall('/api/collaborate/teams')
      if (data.success) {
        const transformedTeams = data.teams.map((team: any) => ({
          id: team.id,
          name: team.name,
          description: team.description,
          category: team.category,
          isPublic: team.is_public,
          createdAt: team.created_at,
          owner: team.owner_id,
          members: team.members?.map((member: any) => ({
            id: member.user_id,
            name: member.user_profile?.full_name || member.email || 'Unknown User',
            email: member.email || member.user_profile?.email || '',
            avatar: member.user_profile?.avatar_url,
            status: member.user_profile?.status || 'offline',
            role: member.role,
            joinedAt: member.joined_at,
            lastActive: member.user_profile?.last_active || member.joined_at
          })) || []
        }))
        setTeams(transformedTeams)
        if (!selectedTeamId && transformedTeams?.length > 0) {
          setSelectedTeamId(transformedTeams[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading teams:', error)
      setError(error instanceof Error ? error.message : 'Failed to load teams')
    } finally {
      setIsLoading(false)
    }
  }, [user, session, socket, apiCall])

  // Handle invitation responses
  const handleInvitationResponse = useCallback(async (invitationId: string, action: 'accept' | 'reject') => {
    try {
      const data = await apiCall('/api/collaborate/invitations', {
        method: 'PUT',
        body: JSON.stringify({
          invitationId,
          action,
        }),
      })

      if (data.success) {
        toast({
          title: action === 'accept' ? "Invitation accepted" : "Invitation rejected",
          description: action === 'accept' ? "You've joined the team!" : "You've declined the invitation",
        })
        
        // Reload teams if accepted
        if (action === 'accept') {
          loadTeams()
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} invitation`,
        variant: "destructive",
      })
      throw error
    }
  }, [apiCall, toast, loadTeams])

  // Load messages
  const loadMessages = useCallback(async (teamId: string) => {
    if (!teamId) return
    console.log('[loadMessages] Loading messages for team:', teamId, 'Socket connected:', socket?.connected)
    try {
      if (socket && (socket as any).connected) {
        console.log('[loadMessages] Using socket to load messages')
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.log('[loadMessages] Socket timeout, falling back to API')
              ;(socket as any).off('messages', handler)
              reject(new Error('Socket timeout'))
            }, 5000) // 5 second timeout
            
            const handler = (payload: any) => {
              console.log('[loadMessages] Socket response:', payload)
              clearTimeout(timeout)
              if (!payload || payload.teamId !== teamId) return
              const formatted: ChatMessage[] = (payload.messages || []).map((msg: any) => ({
                id: msg.id,
                senderId: msg.senderId,
                senderName: msg.senderName || 'Unknown User',
                senderAvatar: msg.senderAvatar,
                content: msg.content,
                timestamp: msg.timestamp,
                teamId: msg.teamId,
                type: msg.type || 'text',
                // @ts-ignore - extended at runtime
                mentions: Array.isArray(msg.mentions) ? msg.mentions : [],
                // @ts-ignore - extended at runtime
                replyTo: msg.replyTo || null,
              }))
              console.log('[loadMessages] Formatted messages:', formatted)
              setMessages(formatted.reverse())
              ;(socket as any).off('messages', handler)
              resolve()
            }
            ;(socket as any).on('messages', handler)
            ;(socket as any).emit('get_messages', { teamId, limit: 50 })
          })
          return
        } catch (socketError) {
          console.log('[loadMessages] Socket failed, using API fallback:', socketError)
          // Continue to API fallback
        }
      }
      
      // Fallback to API if socket unavailable or failed
      console.log('[loadMessages] Using API fallback to load messages')
      const data = await apiCall(`/api/collaborate/messages?teamId=${teamId}&limit=50`)
      console.log('[loadMessages] API response:', data)
      if (data.success) {
        const formattedMessages: ChatMessage[] = data.messages.map((msg: any) => ({
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName || 'Unknown User',
          senderAvatar: msg.senderAvatar,
          content: msg.content,
          timestamp: msg.timestamp,
          teamId: msg.teamId,
          type: msg.type || 'text',
          // @ts-ignore - extended at runtime
          mentions: msg.mentions || [],
          // @ts-ignore - extended at runtime
          replyTo: msg.replyTo || null,
        }))
        console.log('[loadMessages] API formatted messages:', formattedMessages)
        setMessages(formattedMessages.reverse())
      } else {
        console.error('[loadMessages] API returned error:', data.error)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }, [apiCall, socket])

  // Enhanced messaging functions
  
  // Handle message reactions
  const handleMessageReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!selectedTeamId) return
    
    try {
      const response = await fetch('/api/collaborate/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          emoji,
          action: 'add' // We'll determine add/remove based on current state
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        // Update messages with new reaction data
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        ))
      }
    } catch (error) {
      console.error('Error handling reaction:', error)
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      })
    }
  }, [selectedTeamId, toast])

  // Update user presence (prefer websocket; fallback to API if needed)
  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline', activity?: string) => {
    try {
      if (socket && (socket as any).connected) {
        ;(socket as any).emit('update-status', status)
        // Optimistically update current user's activity locally
        if (user?.id) {
          setUserPresence(prev => ({
            ...prev,
            [user.id]: {
              ...(prev[user.id] || {
                id: user.id,
                name: user.user_metadata?.full_name || user.email || 'You',
                email: user.email || '',
                avatar: user.user_metadata?.avatar_url,
                status: 'online' as const,
              }),
              status,
              activity,
              lastSeen: new Date().toISOString(),
            } as any,
          }))
        }
        return
      }
      // Socket-only approach - no API fallback
      console.log('Socket not available for presence update')
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }, [apiCall, socket, user])

  // Load team presence data via socket request-response (no REST polling)
  const loadTeamPresence = useCallback(async (teamId: string) => {
    if (!socket) return
    try {
      await new Promise<void>((resolve) => {
        ;(socket as any).emit('get_team_presence', { teamId })
        const handler = (payload: any) => {
          if (!payload || payload.teamId !== teamId) return
          const presenceMap: Record<string, EnhancedUser> = {}
          ;(payload.members || []).forEach((p: any) => {
            presenceMap[p.id] = {
              id: p.id,
              name: p.name,
              email: p.email,
              avatar: p.avatar,
              status: (p.status || 'offline') as 'online' | 'offline' | 'away' | 'busy',
              activity: p.activity,
              lastSeen: p.lastSeen,
            }
          })
          setUserPresence(presenceMap)
          ;(socket as any).off('team-presence', handler)
          resolve()
        }
        ;(socket as any).on('team-presence', handler)
      })
    } catch (error) {
      console.error('Error loading team presence (socket):', error)
    }
  }, [socket])

  // Handle AI assistance with streaming
  const handleAIAssistance = useCallback(async (prompt: string, context?: string) => {
    if (!selectedTeamId || !user) return
    
    setIsProcessingAI(true)
    
    try {
      // First, persist the user's message that mentions Nova AI
      let userMessageId: string | undefined;
      let userMessage: ChatMessage | undefined;
      
      try {
        const userMessageResult = await collaborateService.sendMessage(
          selectedTeamId,
          user.id,
          prompt,
          'text',
          (currentMentions || []).map(m => m.id),
          undefined // Use API to get message ID
        )
        
        if (userMessageResult.success && userMessageResult.message) {
          userMessageId = userMessageResult.message.id;
          userMessage = {
            id: userMessageResult.message.id,
            senderId: user.id,
            senderName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
            senderAvatar: user.user_metadata?.avatar_url,
            content: prompt,
            timestamp: (userMessageResult.message as any).timestamp || (userMessageResult.message as any).created_at || new Date().toISOString(),
            teamId: selectedTeamId,
            type: 'text'
          };
          
          // Add user message to local state
          setMessages(prev => [...prev, userMessage!]);
        }
      } catch (error) {
        console.error('Error persisting user message:', error)
        // Continue with AI processing even if user message fails to persist
      }
      
      // Get recent messages for context (last 50 messages for better context)
      const recentMessages = messages.slice(-100).map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        content: msg.content,
        timestamp: msg.timestamp,
        type: msg.type as any,
        reactions: {},
        status: 'sent' as const,
        mentions: (msg as any).mentions || []
      }))
      
      // Debug: Log recent messages to see what's being passed to AI
      console.log('[AI Context] Total messages:', messages.length)
      console.log('[AI Context] Recent messages count:', recentMessages.length)
      console.log('[AI Context] Recent messages:', recentMessages.slice(-5)) // Show last 5 for debugging

      const selectedTeam = teams.find(t => t.id === selectedTeamId)
      const teamMembers = selectedTeam?.members.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        avatar: m.avatar,
        status: userPresence[m.id]?.status || 'offline' as const
      })) || []

      const aiContext = {
        teamId: selectedTeamId,
        recentMessages,
        currentUser: {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          status: 'online' as const
        },
        mentionedUsers: teamMembers,
        actionType: NovaAIService.extractNovaCommand(prompt)?.action || 'general' as const
      }

      // Create initial AI message for streaming
      const aiMessageId = `ai-${Date.now()}`
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        senderId: 'nova-ai',
        senderName: 'Nova AI',
        senderAvatar: '/assistant-avatar.svg',
        content: '', // Start with empty content for streaming
        timestamp: new Date().toISOString(),
        teamId: selectedTeamId,
        type: 'text'
      }
      
      // Add AI message to local state immediately
      setMessages(prev => [...prev, aiMessage])
      
      // Start streaming AI response
      let streamedContent = ''
      
      await novaAI.processMessageStream(
        prompt,
        aiContext,
        // onChunk - update the message content as chunks arrive
        (chunk: string) => {
          streamedContent += chunk
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: streamedContent }
              : msg
          ))
        },
        // onComplete - finalize the message
        async (response) => {
          const finalContent = `🤖 **Nova AI Response:**\n\n${response.content}`
          
          // Update the local AI message with final content
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: finalContent, status: 'sent' }
              : msg
          ))
          
          // Persist the final AI message
          try {
            const result = await collaborateService.sendMessage(
              selectedTeamId,
              user.id, // Send as current user for authentication
              finalContent,
              'text',
              [], // No mentions for AI responses
              undefined // Don't use socket for AI messages to get proper response
            )
            
            if (result.success && result.message) {
              // Update the local AI message with the persisted message data
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                  ? {
                      ...msg,
                      id: result.message!.id,
                      content: result.message!.content,
                      timestamp: (result.message as any).timestamp || (result.message as any).created_at || new Date().toISOString(),
                      status: 'sent'
                    }
                  : msg
              ))
            }
          } catch (error) {
            console.error('Error persisting AI message:', error)
            // Don't show error to user, message is still visible locally
          }
        },
        // onError - handle streaming errors
        (error) => {
          console.error('AI streaming error:', error)
          const errorContent = `🤖 **Nova AI Response:**\n\nI'm having trouble connecting right now. Please try again in a moment.`
          
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: errorContent, status: 'sent' }
              : msg
          ))
          
          toast({
            title: "AI Assistant Error",
            description: "Nova AI is temporarily unavailable",
            variant: "destructive",
          })
        }
      )
      
    } catch (error) {
      console.error('Error with AI assistance:', error)
      toast({
        title: "AI Assistant Error",
        description: "Nova AI is temporarily unavailable",
        variant: "destructive",
      })
    } finally {
      setIsProcessingAI(false)
    }
  }, [selectedTeamId, user, messages, teams, userPresence, novaAI, toast])

  // Enhanced message sending with AI detection
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedTeamId || isSendingMessage) return

    setIsSendingMessage(true)

    try {
      // Detect AI requests
      const isAIRequest = NovaAIService.isNovaAIMentioned(newMessage)
      if (isAIRequest) {
        // Clear input immediately for better UX
        const messageToSend = newMessage;
        setNewMessage('')
        setCurrentMentions([])
        setReplyingTo(null)
        
        // Process AI request
        await handleAIAssistance(messageToSend)
        return
      }

      // Optimistic UI message
      if (user) {
        const tempId = `client-${Date.now()}`
        const optimisticMessage: ChatMessage = {
          id: tempId,
          senderId: user.id,
          senderName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
          senderAvatar: user.user_metadata?.avatar_url,
          content: newMessage,
          timestamp: new Date().toISOString(),
          teamId: selectedTeamId,
          type: 'text',
        }
        setMessages(prev => [...prev, { ...optimisticMessage, ...(replyingTo ? ({ replyTo: replyingTo.id } as any) : {}), ...(currentMentions?.length ? ({ mentions: currentMentions } as any) : {}) } as any])
        // Immediately clear input and reply state
        setNewMessage('')
        setCurrentMentions([])
        setReplyingTo(null)
        // Keep presence fresh
        updatePresence('online', 'Active in chat')

        // Send via realtime service (socket preferred, include optimistic id for correlation)
        await collaborateService.sendMessage(
          selectedTeamId,
          user.id,
          optimisticMessage.content,
          'text',
          (currentMentions || []).map(m => m.id),
          socket, // Pass the socket instance
          tempId
        )
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      })
    } finally {
      setIsSendingMessage(false)
    }
  }, [newMessage, selectedTeamId, isSendingMessage, currentMentions, replyingTo, handleAIAssistance, updatePresence, collaborateService, toast, user, socket])

  // Member management handlers
  const changeMemberRole = useCallback(async (teamId: string, memberId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    // Optimistic update first
    let previousRole: 'viewer' | 'editor' | 'admin' | 'owner' | undefined
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t
      return {
        ...t,
        members: t.members.map(m => {
          if (m.id !== memberId) return m
          previousRole = m.role
          return { ...m, role: newRole }
        })
      }
    }))
    try {
      const res = await apiCall('/api/collaborate/team-members', {
        method: 'PUT',
        body: JSON.stringify({ teamId, memberId, newRole })
      })
      if (res?.success) {
        toast({ title: 'Role updated', description: `Member role changed to ${newRole}` })
      } else {
        throw new Error(res?.error || 'Role update failed')
      }
    } catch (e) {
      // Rollback
      if (previousRole) {
        setTeams(prev => prev.map(t => t.id === teamId ? {
          ...t,
          members: t.members.map(m => m.id === memberId ? { ...m, role: previousRole! } : m)
        } : t))
      }
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' })
    }
  }, [apiCall, toast, setTeams])
  // Confirm remove dialog state
  const [removeConfirm, setRemoveConfirm] = useState<{ open: boolean, teamId?: string, member?: { id: string, name?: string } }>({ open: false })

  const promptRemoveMember = useCallback((teamId: string, memberId: string, name?: string) => {
    setRemoveConfirm({ open: true, teamId, member: { id: memberId, name } })
  }, [])

  const removeMemberConfirmed = useCallback(async () => {
    if (!removeConfirm.open || !removeConfirm.teamId || !removeConfirm.member) return
    const { teamId, member } = removeConfirm
    // Optimistic remove
    let removedMember: any
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t
      const remaining = t.members.filter(m => {
        if (m.id === member.id) { removedMember = m; return false }
        return true
      })
      return { ...t, members: remaining }
    }))
    setRemoveConfirm({ open: false })
    try {
      const res = await apiCall(`/api/collaborate/team-members?teamId=${teamId}&memberId=${member.id}`, { method: 'DELETE' })
      if (res?.success) {
        toast({ title: 'Member removed', description: 'The user has been removed from the team.' })
      } else {
        throw new Error(res?.error || 'Remove failed')
      }
    } catch (e) {
      // Rollback
      if (removedMember) {
        setTeams(prev => prev.map(t => t.id === teamId ? {
          ...t,
          members: [...t.members, removedMember]
        } : t))
      }
      toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' })
    }
  }, [apiCall, removeConfirm, setTeams, toast])

  // Optimistic team add after accepting an invitation (no extra API calls)
  const handleJoinedTeam = useCallback((args: { team: { id: string; name: string; description?: string; category?: string; isPublic?: boolean; createdAt?: string; owner?: string }, role: 'viewer' | 'editor' | 'admin' }) => {
    const { team, role } = args
    if (!team?.id || !user) return

    setTeams((prev) => {
      if (prev.some(t => t.id === team.id)) return prev

      const now = new Date().toISOString()
      const optimisticTeam: Team = {
        id: team.id,
        name: team.name,
        description: team.description || '',
        category: team.category || 'Research',
        isPublic: !!team.isPublic,
        createdAt: team.createdAt || now,
        owner: team.owner || '',
        members: [
          {
            id: user.id,
            name: (user as any)?.user_metadata?.full_name || user.email || 'You',
            email: user.email || '',
            avatar: undefined,
            status: 'online',
            role,
            joinedAt: now,
            lastActive: now,
          },
        ],
      }
      return [optimisticTeam, ...prev]
    })

    // Optionally select the new team if none selected
    setSelectedTeamId((prev) => prev || team.id)
  }, [user])

  // Track if teams have been loaded to prevent multiple calls
  const teamsLoadedRef = useRef(false)

  // Effects
  useEffect(() => {
    if (!authLoading && session && user && !teamsLoadedRef.current) {
      teamsLoadedRef.current = true
      loadTeams()
    }
  }, [authLoading, session, user, loadTeams])

  // Reset teams loaded flag when user changes
  useEffect(() => {
    teamsLoadedRef.current = false
  }, [user?.id])

  // Real-time message subscription
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)
  
  // Check if scrolled to bottom
  const checkScrollPosition = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isBottom = scrollTop + clientHeight >= scrollHeight - 10
      setIsScrolledToBottom(isBottom)
      setShowScrollButton(!isBottom)
    }
  }, [])
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      setShowScrollButton(false)
      setUnreadCount(0)
    }
  }, [])

  // Enhanced team selection with presence loading and realtime presence subscriptions
  useEffect(() => {
    if (selectedTeamId) {
      loadMessages(selectedTeamId)
      loadTeamPresence(selectedTeamId)
      updatePresence('online', 'Viewing team chat')
      
      // Subscribe to real-time messages for this team
      const unsubscribe = collaborateService.subscribeToMessages(
        selectedTeamId,
        (newMessage: ChatMessage) => {
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) return prev

            // Replace optimistic by clientMessageId if present
            const clientId = (newMessage as any).clientMessageId
            let updated = prev
            if (clientId) {
              updated = prev.map(m => (m.id === clientId ? { ...newMessage } : m))
              // if not found, append
              if (!updated.some(m => m.id === newMessage.id)) {
                updated = [...updated, newMessage]
              }
            } else {
              updated = [...prev, newMessage]
            }
            
            // Auto-scroll only if already at bottom
            setTimeout(() => {
              if (isScrolledToBottom) {
                scrollToBottom()
              } else {
                // Increment unread count if not at bottom
                setUnreadCount(prev => prev + 1)
              }
            }, 10)
            
            return updated
          })
        },
        socket // Pass the socket instance
      )
      
      // Subscribe to realtime presence via socket
      const handleStatusChanged = (data: any) => {
        if (!data) return
        const { userId, status, teamId } = data
        if (teamId && teamId !== selectedTeamId) return
        setUserPresence(prev => ({
          ...prev,
          [userId]: {
            ...(prev[userId] || {} as any),
            status,
            lastSeen: new Date().toISOString(),
          } as any,
        }))
      }
      const handleUserJoined = (data: any) => {
        if (!data) return
        const { userId, teamId } = data
        if (teamId && teamId !== selectedTeamId) return
        setUserPresence(prev => ({
          ...prev,
          [userId]: {
            ...(prev[userId] || {} as any),
            status: 'online',
            lastSeen: new Date().toISOString(),
          } as any,
        }))
      }
      const handleUserLeft = (data: any) => {
        if (!data) return
        const { userId, teamId } = data
        if (teamId && teamId !== selectedTeamId) return
        setUserPresence(prev => ({
          ...prev,
          [userId]: {
            ...(prev[userId] || {} as any),
            status: 'offline',
            lastSeen: new Date().toISOString(),
          } as any,
        }))
      }
      
      if (socket) {
        ;(socket as any).on('user-status-changed', handleStatusChanged)
        ;(socket as any).on('user-joined', handleUserJoined)
        ;(socket as any).on('user-left', handleUserLeft)
        // Request live presence snapshot on join (server should respond with 'team-presence')
        ;(socket as any).emit('join_team', { teamId: selectedTeamId })
      }
      
      // Setup scroll listener
      if (messagesContainerRef.current) {
        messagesContainerRef.current.addEventListener('scroll', checkScrollPosition)
      }
      
      // Cleanup
      return () => {
        unsubscribe()
        if (socket) {
          ;(socket as any).off('user-status-changed', handleStatusChanged)
          ;(socket as any).off('user-joined', handleUserJoined)
          ;(socket as any).off('user-left', handleUserLeft)
          ;(socket as any).emit('leave_team', { teamId: selectedTeamId })
        }
        if (messagesContainerRef.current) {
          messagesContainerRef.current.removeEventListener('scroll', checkScrollPosition)
        }
      }
    }
  }, [selectedTeamId, loadMessages, loadTeamPresence, checkScrollPosition, socket])
  
  // Auto-scroll to bottom when messages first load
  useEffect(() => {
    if (teamMessages.length > 0) {
      scrollToBottom()
    }
  }, [selectedTeamId, scrollToBottom])

  // Activity tracking and auto-away
  useEffect(() => {
    let lastActivityTime = Date.now()
    let presenceUpdateTimeout: NodeJS.Timeout | null = null

    const throttledUpdatePresence = (status: 'online' | 'away' | 'offline', activity?: string) => {
      if (presenceUpdateTimeout) {
        clearTimeout(presenceUpdateTimeout)
      }
      
      presenceUpdateTimeout = setTimeout(() => {
        updatePresence(status, activity)
      }, 2000) // Throttle presence updates to every 2 seconds
    }

    const handleActivity = () => {
      lastActivityTime = Date.now()
      // Remove setLastActivity to prevent infinite loop - we don't need to track this in state
      
      // Only update presence if we haven't updated recently
      if (!presenceUpdateTimeout) {
        throttledUpdatePresence('online', 'Active')
      }
    }

    const handleInactivity = () => {
      const timeSinceLastActivity = Date.now() - lastActivityTime
      if (timeSinceLastActivity > 300000) { // 5 minutes
        updatePresence('away', 'Away from keyboard')
      }
    }

    // Only set up event listeners if we have a selected team
    if (selectedTeamId) {
      // Track user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
      events.forEach(event => {
        document.addEventListener(event, handleActivity, { passive: true })
      })

      // Check for inactivity every minute
      const inactivityInterval = setInterval(handleInactivity, 60000)

      // Set user as online when component mounts
      updatePresence('online', 'Active in chat')

      // Cleanup
      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleActivity)
        })
        clearInterval(inactivityInterval)
        
        if (presenceUpdateTimeout) {
          clearTimeout(presenceUpdateTimeout)
        }
        
        // Set offline when leaving
        updatePresence('offline')
      }
    }
  }, [selectedTeamId, updatePresence]) // Removed lastActivity from dependencies

  // Handle invitation URL parameter
  useEffect(() => {
    const handleInvitation = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const invitationId = urlParams.get('invitation')
      
      if (invitationId && user) {
        try {
          // Fetch all invitations and find the specific one
          const invitationData = await apiCall('/api/collaborate/invitations')
          
          if (invitationData.success && invitationData.invitations) {
            const invitation = invitationData.invitations.find((inv: any) => inv.id === invitationId)
            
            if (invitation) {
              // Show invitation response dialog
              setInvitationDialog({
                open: true,
                invitation: invitation,
                action: 'accept' // Default to accept
              })
              
              // Clear the URL parameter
              const newUrl = window.location.pathname
              window.history.replaceState({}, '', newUrl)
            } else {
              toast({
                title: "Error",
                description: "Invitation not found or already processed",
                variant: "destructive",
              })
            }
          }
        } catch (error) {
          console.error('Error handling invitation:', error)
          toast({
            title: "Error",
            description: "Failed to load invitation details",
            variant: "destructive",
          })
        }
      }
    }

    if (user && session) {
      handleInvitation()
    }
  }, [user, session, apiCall, toast])

  // Handlers
  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) return

    // Removed verbose debug logs

    // Ensure plan data is available before proceeding
    if (!isPlanDataReady()) {
      // Ensure plan data is fresh before proceeding
      await refreshPlanData()

      const maxWaitMs = 3000 // 3 s timeout
      const start = Date.now()
      while (!isPlanDataReady() && Date.now() - start < maxWaitMs) {
        await new Promise((res) => setTimeout(res, 100))
      }

      if (!isPlanDataReady()) {
        toast({
          title: 'Unable to verify plan',
          description: 'Please try again in a moment',
          variant: 'destructive',
        })
        return
      }
    }

    // Plan checks completed

    // Check plan restrictions before creating a team
    if (!canUseFeature('team_members')) {
      toast({
        title: "Plan upgrade required",
        description: "Team collaboration is only available for Pro and Enterprise plans.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreatingTeam(true)
      
      const data = await apiCall('/api/collaborate/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: newTeam.name,
          description: newTeam.description,
          category: newTeam.category,
          isPublic: newTeam.isPublic,
        }),
      })

      if (data.success) {
        toast({
          title: "Team created",
          description: `${newTeam.name} has been created successfully.`,
        })
        
        setNewTeam({ name: "", description: "", category: "Research", isPublic: false })
        setIsCreateTeamOpen(false)
        teamsLoadedRef.current = false
        loadTeams()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create team",
        variant: "destructive",
      })
    } finally {
      setIsCreatingTeam(false)
    }
  }

  // Old handleSendMessage removed - using enhanced version with AI functionality

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedTeamId) return

    // Force refresh plan data to ensure we have the latest data
    await refreshPlanData()

    // Check plan restrictions
    if (!canUseFeature('team_members')) {
      toast({
        title: "Plan upgrade required",
        description: "Team collaboration is only available for Pro and Enterprise plans. Please upgrade your plan to invite team members.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsInviting(true)
      
      const data = await apiCall('/api/collaborate/invitations', {
        method: 'POST',
        body: JSON.stringify({
          teamId: selectedTeamId,
          inviteeEmail: inviteEmail.trim(),
          role: inviteRole,
          personalMessage: `Join our team "${selectedTeam?.name}" to collaborate!`,
        }),
      })

      if (data.success) {
        toast({
          title: "Invitation sent",
          description: `Invitation sent to ${inviteEmail}`,
        })
        
        setInviteEmail("")
        setInviteRole("viewer")
        setIsInviteDialogOpen(false)
        teamsLoadedRef.current = false
        loadTeams()
      }
    } catch (error) {
      toast({
        title: "Invitation failed",
        description: error instanceof Error ? error.message : "Failed to send invitation",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRespondToInvitation = async () => {
    if (!invitationDialog.invitation || !invitationDialog.action) return

    try {
      setIsRespondingToInvitation(true)
      
      const data = await apiCall('/api/collaborate/invitations', {
        method: 'PUT',
        body: JSON.stringify({
          invitationId: invitationDialog.invitation.id,
          action: invitationDialog.action,
        }),
      })

      if (data.success) {
        toast({
          title: `Invitation ${invitationDialog.action}ed`,
          description: data.message,
        })
        
        setInvitationDialog({ open: false })
        teamsLoadedRef.current = false
        loadTeams() // Refresh teams to show the new team if accepted
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to respond to invitation",
        variant: "destructive",
      })
    } finally {
      setIsRespondingToInvitation(false)
    }
  }

  // Computed values
  const selectedTeam = teams.find((t) => t.id === selectedTeamId)
  const currentUserRole = selectedTeam?.members.find(m => m.id === user?.id)?.role || 'viewer'
  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )
  const teamMessages = useMemo(() => {
    const list = messages.filter((m) => m.teamId === selectedTeamId)
    const map = new Map<string, ChatMessage>()
    for (const m of list) {
      map.set(m.id, m)
    }
    if (map.size !== list.length) {
      try {
        console.warn('[CollaboratePage] Deduped duplicate message IDs', { duplicates: list.length - map.size })
      } catch {}
    }
    const deduped = Array.from(map.values())
    deduped.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    return deduped
  }, [messages, selectedTeamId])

  // Utility functions
  const getStatusColor = (status: User["status"]) => {
    switch (status) {
      case "online": return "bg-green-500"
      case "away": return "bg-yellow-500"
      default: return "bg-gray-400"
    }
  }

  const getRoleIcon = (role: User["role"]) => {
    switch (role) {
      case "owner": return <Crown className="h-4 w-4 text-yellow-600" />
      case "admin": return <Shield className="h-4 w-4 text-blue-600" />
      case "editor": return <FileText className="h-4 w-4 text-green-600" />
      default: return <Eye className="h-4 w-4 text-gray-500" />
    }
  }

  // Loading and error states
  if (isLoading && teams.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-fade-in">
          <Card className="w-full max-w-md p-8 border-none shadow-lg">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium tracking-tight">Loading Collaboration</h3>
                <p className="text-sm text-muted-foreground">Preparing your workspace...</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-fade-in">
          <Card className="w-full max-w-md p-8 border-none shadow-lg">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium tracking-tight">Something went wrong</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={() => window.location.reload()} className="w-full">
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-fade-in">
          <Card className="w-full max-w-md p-8 border-none shadow-lg">
            <div className="text-center space-y-4">
              <Users className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium tracking-tight">Authentication Required</h3>
                <p className="text-sm text-muted-foreground">Please sign in to access collaboration features</p>
              </div>
              <Button onClick={() => window.location.href = '/login'} className="w-full">
                Sign In
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <RouteGuard requireAuth={true}>
      <div className="flex min-h-screen bg-[#F8F9FA] overflow-hidden">
          {/* Global Navigation Sidebar */}
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v=>!v)} />

          {/* Collaborate workspace */}
          <div className="flex-1 bg-background overflow-hidden">
        {/* Modern Header */}
        {/* Removed duplicate header here */}
        <div className="container mx-auto px-6 pt-4 pb-0 max-w-7xl h-full">
          {/* Upgrade Banner for Free Users */}
          <div className="mb-6">
            <TeamLimitBanner currentUsage={teams.length} />
          </div>
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3 animate-fade-in">
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={() => setIsCreateTeamOpen(true)}
                      className="w-full justify-start gap-3 h-12"
                      variant="outline"
                      disabled={!canUseFeature('team_members') || planLoading}
                      title={!canUseFeature('team_members') ? "Upgrade to Pro plan to create teams" : ""}
                    >
                      <Plus className="h-4 w-4" />
                      {planLoading ? 'Loading...' : 'Create Team'}
                      {!canUseFeature('team_members') && <Crown className="h-4 w-4 ml-auto" />}
                    </Button>
                    <Button
                      onClick={() => setIsInviteDialogOpen(true)}
                      className="w-full justify-start gap-3 h-12"
                      variant="outline"
                      disabled={!selectedTeam || !canUseFeature('team_members') || planLoading}
                      title={!canUseFeature('team_members') ? "Upgrade to Pro plan to invite team members" : ""}
                    >
                      <UserPlus className="h-4 w-4" />
                      {planLoading ? 'Loading...' : 'Invite Member'}
                      {!canUseFeature('team_members') && <Crown className="h-4 w-4 ml-auto" />}
                    </Button>
                    <Button
                      className="w-full justify-start gap-3 h-12"
                      variant="outline"
                      disabled={!selectedTeam}
                    >
                      <Video className="h-4 w-4" />
                      Video Call
                    </Button>
                  </CardContent>
                </Card>

                {/* Search */}
                <Card className="border-none shadow-sm">
                  <CardContent className="pt-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search teams..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-none bg-muted/50 focus:bg-muted/80 transition-colors"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Invitations */}
                <Card className="border-none shadow-sm">
                  <CardContent className="pt-6">
                    <Button
                      onClick={() => setIsInvitationsDialogOpen(true)}
                      className="w-full justify-between gap-3 h-12"
                      variant="outline"
                    >
                      <div className="flex items-center gap-3">
                        <UserPlus className="h-4 w-4" />
                        Invitations
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Teams List */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Your Teams</CardTitle>
                      <Badge variant="secondary" className="font-normal">
                        {teams.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filteredTeams.map((team) => (
                        <div
                          key={team.id}
                          className={`group p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm ${
                            selectedTeamId === team.id
                              ? "bg-primary/10 border-2 border-primary/20"
                              : "bg-muted/30 hover:bg-muted/50 border-2 border-transparent"
                          }`}
                          onClick={() => setSelectedTeamId(team.id)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-md ${selectedTeamId === team.id ? 'bg-primary/20' : 'bg-muted'}`}>
                                <Users className="h-3 w-3" />
                              </div>
                              <h4 className="font-medium text-sm">{team.name}</h4>
                            </div>
                            <div className="flex items-center gap-1">
                              {team.isPublic && <Globe className="h-3 w-3 text-muted-foreground" />}
                              <Badge variant="outline" className="text-xs font-normal">
                                {team.category}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{team.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {team.members.length} members
                              </span>
                            </div>
                            <div className="flex -space-x-1">
                              {team.members.slice(0, 3).map((member) => (
                                <div key={member.id} className="relative">
                                  <Avatar className="h-5 w-5 border border-white">
                                    <AvatarImage src={member.avatar || ""} />
                                    <AvatarFallback className="text-xs">{member.name?.charAt(0) || 'U'}</AvatarFallback>
                                  </Avatar>
                                  <div
                                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${getStatusColor(member.status)}`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredTeams.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">{searchTerm ? "No teams found" : "No teams yet"}</p>
                          <p className="text-xs mt-1">Create your first team to get started</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8 xl:col-span-9 animate-fade-in">
              {/* Debug Section - Only show in development */}
              {/* {process.env.NODE_ENV === 'development' && planData && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">Debug Info (Development Only)</h3>
                  <div className="text-sm text-yellow-700">
                    <p><strong>Plan Type:</strong> {planData.plan?.plan_type}</p>
                    <p><strong>Can Use Team Members:</strong> {canUseFeature('team_members') ? 'Yes' : 'No'}</p>
                    <p><strong>Team Members Usage:</strong> {JSON.stringify(getUsageForFeature('team_members'))}</p>
                    <p><strong>All Usage:</strong> {JSON.stringify(planData.usage)}</p>
                  </div>
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={refreshPlanData}
                      className="text-yellow-700 border-yellow-300"
                    >
                      Refresh Plan Data
                    </Button>
                  </div>
                </div>
              )} */}
              
              {selectedTeam ? (
                <Card className="border-none shadow-sm h-full">
                  <CardContent className="p-0">
                    <Tabs defaultValue="chat" className="h-full">
                      <TabsList className="grid w-full grid-cols-4 bg-transparent border-b rounded-none h-12">
                        <TabsTrigger value="chat" className="gap-2 data-[state=active]:bg-background">
                          <MessageSquare className="h-4 w-4" />
                          Chat
                        </TabsTrigger>
                        <TabsTrigger value="members" className="gap-2 data-[state=active]:bg-background">
                          <Users className="h-4 w-4" />
                          Members ({selectedTeam.members.length})
                        </TabsTrigger>
                        <TabsTrigger value="files" className="gap-2 data-[state=active]:bg-background">
                          <Share className="h-4 w-4" />
                          Files
                        </TabsTrigger>
                        <TabsTrigger value="integrations" className="gap-2 data-[state=active]:bg-background">
                          <Zap className="h-4 w-4" />
                          Integrations
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="chat" className="mt-0 p-0">
                        <div className="h-[85vh] md:h-[90vh] lg:h-[95vh] relative flex flex-col bg-background">
                          {/* Enhanced Productivity Chat Header */}
                          <EnhancedChatHeader
                            title={selectedTeam.name}
                            subtitle={selectedTeam.description || "Hyper-productive team collaboration"}
                            members={selectedTeam.members.map((m) => ({
                              id: m.id,
                              name: m.name || m.email,
                              email: m.email,
                              avatar: m.avatar,
                              status: userPresence[m.id]?.status || (m.status as "online" | "offline" | "away" | "busy"),
                              activity: userPresence[m.id]?.activity,
                              lastSeen: m.lastActive,
                              role: m.role
                            }))}
                            onSearchClick={() => {/* TODO: Implement search */}}
                            onCallClick={() => {/* TODO: Implement call */}}
                            onVideoClick={() => {/* TODO: Implement video */}}
                            onSettingsClick={() => setIsSettingsOpen(true)}
                          />

                          {/* Enhanced Messages Area */}
                          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto bg-background">
                            {teamMessages.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                  <MessageSquare className="w-8 h-8" />
                                </div>
                                <h3 className="font-medium mb-1">No messages yet</h3>
                                <p className="text-sm text-center max-w-xs">Start the conversation with your team members</p>
                              </div>
                            ) : (
                              teamMessages.map((message, index) => {
                                const isSystemMessage = message.type === 'system'
                                const prevMessage = index > 0 ? teamMessages[index - 1] : null
                                // Normalize AI messages to a stable sender id to avoid
                                // treating AI responses as the current user after persistence
                                const isAIMessage = message.content.includes('🤖 **Nova AI Response:**') || message.senderId === 'nova-ai'
                                const prevIsAIMessage = Boolean(prevMessage && (prevMessage.content?.includes('🤖 **Nova AI Response:**') || prevMessage.senderId === 'nova-ai'))
                                const currentSenderForGrouping = isAIMessage ? 'nova-ai' : message.senderId
                                const prevSenderForGrouping = prevMessage ? (prevIsAIMessage ? 'nova-ai' : prevMessage.senderId) : null
                                const isConsecutive = Boolean(prevMessage && 
                                  prevSenderForGrouping === currentSenderForGrouping &&
                                  prevMessage.type !== 'system' && 
                                  message.type !== 'system' &&
                                  (new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime()) < 300000) // 5 minutes
                                
                                if (isSystemMessage) {
                                  return (
                                    <div key={message.id} className="flex justify-center my-4">
                                      <div className="bg-muted/80 px-3 py-1 rounded-full">
                                        <span className="text-xs text-muted-foreground">{message.content}</span>
                                      </div>
                                    </div>
                                  )
                                }
                                
                                // isAIMessage already computed above
                                
                                // For AI messages, use the enhanced streaming component with ResearchAssistant-style rendering
                                if (isAIMessage) {
                                  const isStreaming = message.content === '' || (!message.content.includes('🤖 **Nova AI Response:**'))
                                  const displayContent = message.content.includes('🤖 **Nova AI Response:**') 
                                    ? message.content.replace('🤖 **Nova AI Response:**\n\n', '')
                                    : message.content
                                  
                                  return (
                                    <div key={message.id} className="flex gap-3 justify-start">
                                      {/* AI Avatar */}
                                      <div className="flex-shrink-0">
                                        <div className="relative">
                                          <Avatar className="h-8 w-8 ring-2 ring-blue-500">
                                            <AvatarImage src="/assistant-avatar.svg" />
                                            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                              <Bot className="w-4 h-4" />
                                            </AvatarFallback>
                                          </Avatar>
                                          {isStreaming && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-background animate-pulse">
                                              <Loader2 className="w-2 h-2 text-white animate-spin" />
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Message Content */}
                                      <div className="flex-1 min-w-0">
                                        {/* Header */}
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                                            Nova AI Assistant
                                          </span>
                                          <Sparkles className="w-3 h-3 text-blue-500" />
                                          <Badge variant="outline" className="text-xs px-1.5 py-0 text-blue-600 border-blue-300">
                                            {isStreaming ? 'thinking...' : 'online'}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>

                                        {/* Message Body with Enhanced Rendering */}
                                        <div className="text-sm text-foreground leading-relaxed">
                                          {/* Sources Panel */}
                                          {(() => {
                                            const urls = displayContent.match(/https?:\/\/[^\s)\]\}"'<>]+/g) || []
                                            if (urls.length === 0) return null
                                            return (
                                              <div className="mb-2">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                  <ExternalLink className="w-3 h-3" />
                                                  <span>{urls.length} source{urls.length > 1 ? 's' : ''}</span>
                                                </div>
                                              </div>
                                            )
                                          })()}

                                          {/* Enhanced Response with Markdown */}
                                          <div className="prose prose-sm max-w-none">
                                            <MarkdownRenderer 
                                              content={displayContent} 
                                              className=""
                                            />
                                          </div>
                                          
                                          {isStreaming && (
                                            <span className="inline-block w-0.5 h-4 bg-blue-500 ml-1 animate-pulse" />
                                          )}
                                        </div>

                                        {/* Message Actions */}
                                        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => {
                                              navigator.clipboard.writeText(displayContent)
                                              toast({ title: "Copied", description: "AI response copied to clipboard" })
                                            }}
                                          >
                                            <Copy className="h-3 w-3" />
                                          </Button>
                                          
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => {
                                              const replyMessage = teamMessages.find(m => m.id === message.id)
                                              if (replyMessage) {
                                                setReplyingTo({
                                                  id: replyMessage.id,
                                                  senderId: replyMessage.senderId,
                                                  senderName: 'Nova AI',
                                                  content: replyMessage.content,
                                                  timestamp: replyMessage.timestamp,
                                                  type: replyMessage.type as any,
                                                  reactions: {},
                                                  status: 'sent'
                                                })
                                              }
                                            }}
                                          >
                                            <Reply className="h-3 w-3" />
                                          </Button>
                                          
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleAIAssistance(`Help me understand this AI response: "${displayContent}"`)}
                                            title="Ask Nova AI about this"
                                          >
                                            <Brain className="h-3 w-3 text-blue-500" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                }
                                
                                // Find sender user info with presence for non-AI messages
                                const senderUser = selectedTeam.members.find(m => m.id === message.senderId) || {
                                  id: message.senderId,
                                  name: message.senderName || 'Unknown User',
                                  email: '',
                                  avatar: message.senderAvatar,
                                  status: 'offline' as const
                                }

                                // Get user presence status
                                const presenceStatus = userPresence[senderUser.id]?.status || senderUser.status as "online" | "offline" | "away" | "busy"
                                const userActivity = userPresence[senderUser.id]?.activity
                                
                                return (
                                  <EnhancedMessage
                                    key={message.id}
                                    message={{
                                      id: message.id,
                                      senderId: message.senderId,
                                      content: message.content,
                                      timestamp: message.timestamp,
                                      type: message.type as "text" | "image" | "file" | "audio" | "system",
                                      reactions: (message as any).reactions || {},
                                      mentions: (message as any).mentions || [],
                                      replyTo: (message as any).replyTo || null,
                                      replyToContent: (() => {
                                        const original = teamMessages.find(m => m.id === (message as any).replyTo)
                                        return original?.content
                                      })(),
                                      replyToSenderName: (() => {
                                        const original = teamMessages.find(m => m.id === (message as any).replyTo)
                                        if (!original) return undefined
                                        const info = selectedTeam.members.find(m => m.id === original.senderId)
                                        const isOriginalFromAI = original.content.includes('🤖 **Nova AI Response:**') || original.senderId === 'nova-ai';
                                        return isOriginalFromAI ? 'Nova AI' : (info?.name || original.senderName)
                                      })(),
                                      status: (message.id || '').startsWith('client-') ? 'sending' : 'sent',
                                      priority: 'normal',
                                      category: 'discussion'
                                    }}
                                    user={{
                                      id: senderUser.id,
                                      name: senderUser.name || senderUser.email,
                                      email: senderUser.email,
                                      avatar: senderUser.avatar,
                                      status: presenceStatus,
                                      activity: userActivity,
                                      lastSeen: userPresence[senderUser.id]?.lastSeen
                                    }}
                                    allUsers={selectedTeam.members.map(m => ({
                                      id: m.id,
                                      name: m.name || m.email,
                                      email: m.email,
                                      avatar: m.avatar,
                                      status: userPresence[m.id]?.status || 'offline',
                                      activity: userPresence[m.id]?.activity
                                    }))}
                                    currentUserId={user?.id || ''}
                                    isConsecutive={isConsecutive}
                                    onReply={(messageId) => {
                                      const replyMessage = teamMessages.find(m => m.id === messageId)
                                      if (replyMessage) {
                                        // Find the sender's name
                                        const isReplyFromAI = replyMessage.content.includes('🤖 **Nova AI Response:**') || replyMessage.senderId === 'nova-ai';
                                        const senderInfo = selectedTeam.members.find(m => m.id === replyMessage.senderId)
                                        const senderName = isReplyFromAI 
                                          ? 'Nova AI' 
                                          : senderInfo?.name || replyMessage.senderName || 'Unknown User'
                                        
                                        setReplyingTo({
                                          id: replyMessage.id,
                                          senderId: replyMessage.senderId,
                                          senderName: senderName,
                                          content: replyMessage.content,
                                          timestamp: replyMessage.timestamp,
                                          type: replyMessage.type as any,
                                          reactions: {},
                                          status: 'sent'
                                        })
                                      }
                                    }}
                                    onReact={handleMessageReaction}
                                    onPin={(messageId) => {
                                      // TODO: Implement pin functionality
                                      console.log('Pin message:', messageId)
                                    }}
                                    onAIAssist={(messageId, context) => {
                                      handleAIAssistance(`Help me understand this message: "${context}"`)
                                    }}
                                  />
                                )
                              })
                            )}
                          </div>

                          {/* Scroll to Bottom Button */}
                          {showScrollButton && (
                            <div className="absolute bottom-24 right-6 z-10">
                              <Button
                                onClick={scrollToBottom}
                                size="sm"
                                className="rounded-full px-3 py-2 shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                              >
                                <div className="flex items-center gap-1">
                                  <span className="text-xs">
                                    {unreadCount > 0 ? `${unreadCount} new` : '↓'}
                                  </span>
                                  <ChevronDown className="w-3 h-3" />
                                </div>
                              </Button>
                            </div>
                          )}

                          {/* Enhanced Productivity Message Input */}
                          <EnhancedMessageInput
                                  value={newMessage}
                                  onChange={(val, mentions) => {
                                    setNewMessage(val)
                                    setCurrentMentions(mentions)
                                  }}
                            onSend={handleSendMessage}
                            onAttach={() => {
                              // TODO: Implement file attachment
                              console.log('Attach file clicked')
                            }}
                            onAIAssist={handleAIAssistance}
                            disabled={isSendingMessage || isProcessingAI}
                            placeholder="Type a message... Use @ to mention team members or @nova for AI assistance"
                                  users={(selectedTeam?.members || []).map((m) => ({
                                    id: m.id,
                                    type: 'user' as const,
                                    name: m.name || m.email,
                                    email: m.email,
                                    avatar: m.avatar,
                                  }))}
                                  files={[]}
                            currentUser={user ? {
                              id: user.id,
                              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Me',
                              email: user.email || '',
                              avatar: user.user_metadata?.avatar_url,
                              status: 'online'
                            } : undefined}
                            replyingTo={replyingTo || undefined}
                            onCancelReply={() => setReplyingTo(null)}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="members" className="mt-0 p-6">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-medium">Team Members</h3>
                              <p className="text-sm text-muted-foreground">
                                Manage your team collaboration
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3">
                            {selectedTeam.members.map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={member.avatar || ""} />
                                      <AvatarFallback>{member.name?.charAt(0) || member.email?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div
                                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(member.status)}`}
                                    />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{member.name || member.email}</p>
                                      {getRoleIcon(member.role)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{member.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Joined: {new Date(member.joinedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge 
                                    variant={member.role === 'owner' ? 'default' : 'outline'} 
                                    className={`font-normal ${
                                      member.role === 'owner' ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' : ''
                                    }`}
                                  >
                                    {member.role}
                                  </Badge>
                                  {['owner', 'admin'].includes(currentUserRole) && member.id !== user?.id && (
                                    <DropdownMenu
                                      trigger={
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/50">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      }
                                      className="w-48"
                                    >
                                      <DropdownMenuLabel>Edit Member</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {(() => {
                                        const disableVE = (currentUserRole === 'admin' && member.role !== 'viewer' && member.role !== 'editor') || member.role === 'owner'
                                        const disableAdmin = currentUserRole !== 'owner' || member.role === 'owner'
                                        const disableRemove = (currentUserRole === 'admin' && !(member.role === 'viewer' || member.role === 'editor')) || member.role === 'owner'
                                        const items: React.ReactNode[] = []
                                        if (disableVE) {
                                          items.push(
                                            <div key="view-disabled" className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground opacity-60 cursor-not-allowed" aria-disabled>
                                              Set as Viewer
                                            </div>
                                          )
                                        } else {
                                          items.push(
                                            <DropdownMenuItem key="view" onClick={() => changeMemberRole(selectedTeam.id, member.id, 'viewer')}>
                                              Set as Viewer
                                            </DropdownMenuItem>
                                          )
                                        }
                                        if (disableVE) {
                                          items.push(
                                            <div key="edit-disabled" className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground opacity-60 cursor-not-allowed" aria-disabled>
                                              Set as Editor
                                            </div>
                                          )
                                        } else {
                                          items.push(
                                            <DropdownMenuItem key="edit" onClick={() => changeMemberRole(selectedTeam.id, member.id, 'editor')}>
                                              Set as Editor
                                            </DropdownMenuItem>
                                          )
                                        }
                                        if (disableAdmin) {
                                          items.push(
                                            <div key="admin-disabled" className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground opacity-60 cursor-not-allowed" aria-disabled>
                                              Set as Admin
                                            </div>
                                          )
                                        } else {
                                          items.push(
                                            <DropdownMenuItem key="admin" onClick={() => changeMemberRole(selectedTeam.id, member.id, 'admin')}>
                                              Set as Admin
                                            </DropdownMenuItem>
                                          )
                                        }
                                        items.push(<DropdownMenuSeparator key="sep" />)
                                        if (disableRemove) {
                                          items.push(
                                            <div key="remove-disabled" className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground opacity-60 cursor-not-allowed" aria-disabled>
                                              Remove Member
                                            </div>
                                          )
                                        } else {
                                          items.push(
                                            <DropdownMenuItem key="remove" className="text-destructive" onClick={() => promptRemoveMember(selectedTeam.id, member.id)}>
                                              Remove Member
                                            </DropdownMenuItem>
                                          )
                                        }
                                        return items
                                      })()}
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {selectedTeam.members.length === 0 && (
                            <div className="text-center py-16">
                              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                              <h3 className="text-lg font-medium mb-2">No members yet</h3>
                              <p className="text-sm text-muted-foreground mb-6">Invite team members to start collaborating</p>
                              {['owner', 'admin'].includes(currentUserRole) && (
                                <Button
                                  variant="outline"
                                  onClick={() => setIsInviteDialogOpen(true)}
                                  className="gap-2"
                                >
                                  <UserPlus className="h-4 w-4" />
                                  Invite First Member
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="files" className="mt-0 p-6">
                        <TeamFiles teamId={selectedTeam.id} currentUserRole={currentUserRole} />
                      </TabsContent>

                      <TabsContent value="integrations" className="mt-0 p-6">
                        <IntegrationsSection />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                /* Welcome State */
                <Card className="border-none shadow-sm h-full">
                  <CardContent className="pt-16">
                    <div className="text-center py-20 animate-fade-in">
                      <div className="mb-8">
                        <div className="p-6 bg-primary/10 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                          <Users className="h-12 w-12 text-primary" />
                        </div>
                        <h3 className="text-2xl font-medium mb-4 tracking-tight">Welcome to Collaboration</h3>
                        <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                          Select a team from the sidebar to start collaborating, or create a new team to begin your journey
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                        {[
                          { id: 'chat', icon: MessageSquare, label: 'Team Chat', description: 'Real-time messaging', color: 'bg-blue-500' },
                          { id: 'files', icon: Share, label: 'File Sharing', description: 'Secure collaboration', color: 'bg-green-500' },
                          { id: 'video', icon: Video, label: 'Video Calls', description: 'Face-to-face meetings', color: 'bg-purple-500' }
                        ].map((feature) => (
                          <div key={feature.id} className="p-6 border rounded-xl hover:bg-muted/50 transition-colors">
                            <div className={`w-12 h-12 ${feature.color} mb-4 mx-auto rounded-lg flex items-center justify-center`}>
                              <feature.icon className="h-6 w-6 text-white" />
                            </div>
                            <h4 className="font-medium mb-2">{feature.label}</h4>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Remove Member Confirm Dialog */}
          <Dialog open={removeConfirm.open} onOpenChange={(o) => setRemoveConfirm(prev => ({ ...prev, open: o }))}>
            <DialogContent className="sm:max-w-[380px]">
              <DialogHeader>
                <DialogTitle>Remove member?</DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  {(() => {
                    const mem = selectedTeam?.members?.find(m => m.id === removeConfirm.member?.id)
                    const name = removeConfirm.member?.name || (mem as any)?.full_name || (mem as any)?.name || (mem as any)?.email || 'this member'
                    return <>This will remove <span className="font-medium text-foreground">{name}</span> from the team.</>
                  })()}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRemoveConfirm({ open: false })}
                    className="rounded-md flex items-center justify-center h-8 w-8 p-0 hover:bg-red-50 text-zinc-500 hover:text-red-600 transition-colors"
                    aria-label="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={removeMemberConfirmed}
                    className="rounded-md flex items-center justify-center h-8 w-8 p-0 hover:bg-emerald-50 text-zinc-500 hover:text-emerald-600 transition-colors"
                    aria-label="Confirm"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Team Settings Modal */}
        {selectedTeam && (
          <TeamSettings
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            team={selectedTeam}
            currentUserRole={currentUserRole}
            onTeamUpdate={(updatedTeam) => {
              setTeams(prev => prev.map(team => 
                team.id === updatedTeam.id ? updatedTeam : team
              ))
            }}
            onLeaveTeam={() => {
              setTeams(prev => prev.filter(team => team.id !== selectedTeamId))
              setSelectedTeamId(null)
              teamsLoadedRef.current = false
              loadTeams()
            }}
            apiCall={apiCall}
          />
        )}

        {/* Create Team Modal */}
        <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                Create New Team
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="team-name" className="text-sm font-medium">
                  Team Name
                </Label>
                <Input
                  id="team-name"
                  placeholder="Enter team name..."
                  value={newTeam.name}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                  disabled={isCreatingTeam}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="What's this team about?"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                  disabled={isCreatingTeam}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category
                </Label>
                <Select 
                  value={newTeam.category} 
                  onValueChange={(value) => setNewTeam(prev => ({ ...prev, category: value }))}
                  disabled={isCreatingTeam}
                >
                  <SelectTrigger id="category" className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Research">🔬 Research</SelectItem>
                    <SelectItem value="Study Group">📚 Study Group</SelectItem>
                    <SelectItem value="Project">🚀 Project</SelectItem>
                    <SelectItem value="Discussion">💬 Discussion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-medium">Privacy & Access</Label>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${newTeam.isPublic ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {newTeam.isPublic ? (
                        <Globe className="h-4 w-4 text-green-600" />
                      ) : (
                        <Lock className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {newTeam.isPublic ? "Public Team" : "Private Team"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {newTeam.isPublic 
                          ? "Anyone can discover and join this team"
                          : "Only invited members can access this team"
                        }
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={newTeam.isPublic}
                    onCheckedChange={(checked) => setNewTeam(prev => ({ ...prev, isPublic: checked }))}
                    disabled={isCreatingTeam}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setIsCreateTeamOpen(false)} 
                  disabled={isCreatingTeam}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTeam}
                  disabled={!newTeam.name.trim() || isCreatingTeam}
                  className="gap-2"
                >
                  {isCreatingTeam ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      Create Team
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invite Member Dialog */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite Member to {selectedTeam?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-6">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isInviting}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="role" className="text-sm font-medium">Role & Permissions</Label>
                <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                  <SelectTrigger id="role" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Viewer</div>
                          <div className="text-xs text-muted-foreground">Can view and comment</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Editor</div>
                          <div className="text-xs text-muted-foreground">Can edit and create content</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Admin</div>
                          <div className="text-xs text-muted-foreground">Can manage team and members</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} disabled={isInviting}>
                  Cancel
                </Button>
                <Button onClick={handleInviteMember} disabled={!inviteEmail.trim() || isInviting}>
                  {isInviting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invitation Response Dialog */}
        <Dialog open={invitationDialog.open} onOpenChange={(open) => setInvitationDialog({ ...invitationDialog, open })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Team Invitation
              </DialogTitle>
            </DialogHeader>
            {invitationDialog.invitation && (
              <div className="space-y-6 mt-6">
                <p className="text-sm text-muted-foreground">
                  You have been invited to join the team "{invitationDialog.invitation.team_name}".
                </p>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setInvitationDialog({ ...invitationDialog, action: 'reject' })}
                    disabled={isRespondingToInvitation}
                  >
                    Decline
                  </Button>
                  <Button 
                    onClick={() => setInvitationDialog({ ...invitationDialog, action: 'accept' })}
                    disabled={isRespondingToInvitation}
                  >
                    {isRespondingToInvitation ? "Processing..." : "Accept"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Invitations Dialog */}
        <InvitationsDialog 
          open={isInvitationsDialogOpen}
          onOpenChange={setIsInvitationsDialogOpen}
          apiCall={apiCall}
          user={user || undefined}
          onJoinedTeam={handleJoinedTeam}
        />

        {/* Development Notice Popup */}
        <DevelopmentNotice />
        
        {/* Plan Restriction Notice for Free Users */}
        {!isProfessionalOrHigher() && (
          <div className="fixed top-20 right-4 z-50">
            <Card className="border-orange-200 bg-orange-50 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Team Collaboration</p>
                    <p className="text-xs text-orange-700">Upgrade to Professional to access team features</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </div>
    </RouteGuard>
  )
}
