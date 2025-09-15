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
  Brain,
  Paperclip
} from "lucide-react"

import { useSocket as useAppSocket } from "@/lib/services/socket.service"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { RouteGuard } from "@/components/route-guard"
import { TeamSettings } from "./components/team-settings"
import TeamSidebar from "./components/team-sidebar"
import { TeamFiles } from "./components/team-files"
import NotificationBell from "./components/notification-bell"
import { InvitationsDialog } from "./components/invitations-dialog"
import { DevelopmentNotice } from "@/components/ui/development-notice"
import IntegrationsSection from "@/components/ui/integrations-component"
import { useUserPlan } from "@/hooks/use-user-plan"
import { PlanStatus } from "@/components/ui/plan-status"
import { TeamLimitBanner } from "@/components/ui/smart-upgrade-banner"
import { collaborateService } from "@/lib/services/collaborate.service"
import { cn } from "@/lib/utils"
import { ChatSearch } from "@/components/ui/chat-search"
import { ChatMessageSkeleton } from "@/components/ui/skeleton-loader"

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
  const [isSwitchingTeam, setIsSwitchingTeam] = useState(false)
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
  const [teamFileMentions, setTeamFileMentions] = useState<MentionData[]>([])
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const lastScrollTimeRef = useRef<number>(0)
  const loadMessagesRef = useRef<((teamId: string) => Promise<void>) | undefined>(undefined)
  const mapMentionsRef = useRef<((ids: any) => MentionData[]) | undefined>(undefined)
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
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false)

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

  // Load team files for @mentions in composer
  const loadTeamFilesForMentions = useCallback(async () => {
    if (!selectedTeamId) return
    try {
      const data = await apiCall(`/api/collaborate/files?teamId=${selectedTeamId}&limit=50`)
      if (data?.success && Array.isArray(data.files)) {
        const mapped: MentionData[] = data.files.map((file: any) => ({
          id: file.id,
          type: 'file' as const,
          name: file.name,
          fileType: file.mime_type,
          fileSize: (file.size ?? file.file_size ?? 0).toString(),
          fileUrl: file.url || file.file_url,
        }))
        console.log('[Team Files Debug] Loaded team files for mentions:', mapped)
        setTeamFileMentions(mapped)
      } else {
        setTeamFileMentions([])
      }
    } catch {
      setTeamFileMentions([])
    }
  }, [apiCall, selectedTeamId])

  useEffect(() => {
    loadTeamFilesForMentions()
  }, [loadTeamFilesForMentions])

  // Map mention ids from backend to MentionData objects for UI chips
  const mapMentions = useCallback((ids: any): MentionData[] => {
    const selectedTeam = teams.find(t => t.id === selectedTeamId)
    const members = (selectedTeam?.members || []).map(m => ({
      id: m.id,
      type: 'user' as const,
      name: m.name || m.email,
      email: m.email,
      avatar: m.avatar,
    }))
    const files = teamFileMentions
    const idArray: string[] = Array.isArray(ids) ? ids : []
    return idArray
      .map(id => members.find(u => u.id === id) || files.find(f => f.id === id))
      .filter(Boolean) as MentionData[]
  }, [teams, selectedTeamId, teamFileMentions])

  // Store the latest mapMentions function in ref
  mapMentionsRef.current = mapMentions

  // Attach from cloud: Google Drive picker → save to team → insert mention
  const handleAttachFromCloud = useCallback(async () => {
    try {
      const { supabaseStorageManager, GoogleDriveOAuthHandler } = await import('@/lib/storage/supabase-storage-manager')
      // Ensure Drive connected
      if (!supabaseStorageManager.isGoogleDriveConnected()) {
        const oauth = GoogleDriveOAuthHandler.getInstance()
        await oauth.authenticate()
        await supabaseStorageManager.loadUserProviders()
      }
      // List files
      const driveFiles = await supabaseStorageManager.listGoogleDriveFiles()
      if (!driveFiles || driveFiles.length === 0) {
        toast({ title: 'No Drive files', description: 'Your Google Drive appears empty.' })
        return
      }
      // Simple numeric prompt for now (keeps UI light)
      const options = driveFiles.slice(0, 10).map((f, i) => `${i + 1}. ${f.name}`).join('\n')
      const pick = window.prompt(`Pick a file to attach by number:\n${options}`, '1')
      const index = Math.max(1, Math.min(10, parseInt(pick || '1', 10))) - 1
      const chosen = driveFiles[index]
      if (!chosen || !selectedTeamId) return
      // Create a team_files record
      const result = await apiCall('/api/collaborate/files', {
        method: 'POST',
        body: JSON.stringify({
          teamId: selectedTeamId,
          type: 'file',
          name: chosen.name,
          url: chosen.webViewUrl,
          description: 'Shared from Google Drive',
          tags: ['google-drive'],
          isPublic: false,
          fileType: chosen.mimeType,
          fileSize: chosen.size,
        }),
      })
      if (!result?.success || !result.file) return
      // Insert an @mention token for the new file
      const mentionToken = `@[${result.file.name}](${result.file.id})`
      setNewMessage(prev => (prev ? `${prev} ${mentionToken}` : mentionToken))
      setCurrentMentions(prev => ([
        ...prev,
        { id: result.file.id, type: 'file', name: result.file.name, fileType: result.file.mime_type, fileSize: String(result.file.size || result.file.file_size || 0), fileUrl: result.file.url }
      ]))
      // Refresh mentions list for future suggestions
      await loadTeamFilesForMentions()
    } catch (e) {
      console.error('Attach from cloud failed:', e)
      toast({ title: 'Attach failed', description: e instanceof Error ? e.message : 'Could not attach from cloud', variant: 'destructive' })
    }
  }, [apiCall, selectedTeamId, loadTeamFilesForMentions, toast])

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
    try {
      if (socket && (socket as any).connected) {
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              ;(socket as any).off('messages', handler)
              reject(new Error('Socket timeout'))
            }, 5000) // 5 second timeout
            
            const handler = (payload: any) => {
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
                // @ts-ignore - extended at runtime: map mention ids to data
                mentions: mapMentionsRef.current?.(Array.isArray(msg.mentions) ? msg.mentions : []) || [],
                // @ts-ignore - extended at runtime
                replyTo: msg.replyTo || null,
              }))
              setMessages(formatted.reverse())
              ;(socket as any).off('messages', handler)
              resolve()
            }
            ;(socket as any).on('messages', handler)
            ;(socket as any).emit('get_messages', { teamId, limit: 50 })
          })
          return
        } catch (socketError) {
          // Continue to API fallback
        }
      }
      
      // Fallback to API if socket unavailable or failed
      const data = await apiCall(`/api/collaborate/messages?teamId=${teamId}&limit=50`)
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
          mentions: mapMentionsRef.current?.(msg.mentions || []) || [],
          // @ts-ignore - extended at runtime
          replyTo: msg.replyTo || null,
        }))
        setMessages(formattedMessages.reverse())
      } else {
        console.error('Failed to load messages:', data.error)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }, [apiCall, socket])

  // Store the latest loadMessages function in ref
  loadMessagesRef.current = loadMessages

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
      // First, persist the user's message that mentions Nova
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

      // Extract file mentions from current message and fetch their content
      const fileMentions = (currentMentions || []).filter(m => m.type === 'file')
      const fileContents: Array<{name: string, content: string, url?: string}> = []
      
      console.log('[File Mentions Debug] Current mentions:', currentMentions)
      console.log('[File Mentions Debug] File mentions found:', fileMentions)
      
      for (const fileMention of fileMentions) {
        try {
          console.log('[File Mentions Debug] Processing file:', fileMention.name, 'URL:', fileMention.fileUrl)
          // If the file mention has a URL, fetch the content
          if (fileMention.fileUrl) {
            const response = await fetch(fileMention.fileUrl)
            console.log('[File Mentions Debug] Fetch response status:', response.status)
            if (response.ok) {
              const content = await response.text()
              console.log('[File Mentions Debug] Fetched content length:', content.length)
              fileContents.push({
                name: fileMention.name,
                content: content,
                url: fileMention.fileUrl
              })
            } else {
              console.error('[File Mentions Debug] Failed to fetch file:', response.status, response.statusText)
            }
          } else {
            console.log('[File Mentions Debug] No fileUrl found for:', fileMention.name)
          }
        } catch (error) {
          console.error(`Failed to fetch content for file ${fileMention.name}:`, error)
        }
      }
      
      console.log('[File Mentions Debug] Final file contents:', fileContents)

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
        actionType: NovaAIService.extractNovaCommand(prompt)?.action || 'general' as const,
        fileContents: fileContents
      }
      
      console.log('[AI Context Debug] Final AI context being sent to Nova:', {
        teamId: aiContext.teamId,
        fileContentsCount: aiContext.fileContents.length,
        fileContents: aiContext.fileContents.map(f => ({ name: f.name, contentLength: f.content.length, url: f.url }))
      })

      // Create initial AI message for streaming
      const aiMessageId = `ai-${Date.now()}`
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        senderId: 'nova-ai',
        senderName: 'Nova',
        senderAvatar: '/assistant-avatar.svg',
        content: '', // Start with empty content for streaming
        timestamp: new Date().toISOString(),
        teamId: selectedTeamId,
        type: 'text'
      }
      
      // Add AI message to local state immediately
      setMessages(prev => [...prev, aiMessage])
      
      // Auto-scroll to show the new AI message
      setTimeout(() => {
        throttledScrollToBottom(true) // Use smooth scrolling
      }, 100)
      
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
          
          // Throttled auto-scroll to prevent glitching
          throttledScrollToBottom(true)
        },
        // onComplete - finalize the message
        async (response) => {
          const finalContent = `🤖 **Nova Response:**\n\n${response.content}`
          
          // Update the local AI message with final content
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: finalContent, status: 'sent' }
              : msg
          ))
          
          // Final scroll to bottom when AI response is complete
          setTimeout(() => {
            throttledScrollToBottom(true) // Use smooth scrolling
          }, 200)
          
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
          const errorContent = `🤖 **Nova Response:**\n\nI'm having trouble connecting right now. Please try again in a moment.`
          
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: errorContent, status: 'sent' }
              : msg
          ))
          
          toast({
            title: "AI Assistant Error",
            description: "Nova is temporarily unavailable",
            variant: "destructive",
          })
        }
      )
      
    } catch (error) {
      console.error('Error with AI assistance:', error)
      toast({
        title: "AI Assistant Error",
        description: "Nova is temporarily unavailable",
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
  const [hasNewMessages, setHasNewMessages] = useState(false)
  
  // Check if scrolled to bottom
  const checkScrollPosition = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isBottom = scrollTop + clientHeight >= scrollHeight - 10
      setIsScrolledToBottom(isBottom)
      setShowScrollButton(!isBottom)
      
      // Clear unread count when user scrolls to bottom
      if (isBottom && unreadCount > 0) {
        setUnreadCount(0)
        setHasNewMessages(false)
    }
    }
  }, [unreadCount])
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        })
      } else {
        container.scrollTop = container.scrollHeight
      }
      setShowScrollButton(false)
      setUnreadCount(0)
      setHasNewMessages(false)
    }
  }, [])

  // Throttled scroll function for streaming content
  const throttledScrollToBottom = useCallback((smooth = true) => {
    const now = Date.now()
    if (now - lastScrollTimeRef.current > 100) { // Throttle to max once per 100ms
      lastScrollTimeRef.current = now
      scrollToBottom(smooth)
    }
  }, [scrollToBottom])

  // Enhanced team selection with presence loading and realtime presence subscriptions
  useEffect(() => {
    if (selectedTeamId) {
      setIsSwitchingTeam(true) // Trigger switching state on team selection
      let cancelled = false
      ;(async () => {
        try {
          await Promise.all([
            loadMessagesRef.current?.(selectedTeamId),
            loadTeamPresence(selectedTeamId)
          ])
        } finally {
          if (!cancelled) setIsSwitchingTeam(false)
        }
      })()
      updatePresence('online', 'Viewing team chat')
      
      // Subscribe to real-time messages for this team
      const unsubscribe = collaborateService.subscribeToMessages(
        selectedTeamId,
        (newMessage: ChatMessage) => {
          // Map mentions for new realtime message
          const mappedMentions = mapMentionsRef.current?.((newMessage as any).mentions || []) || []
          const enriched = { ...newMessage, mentions: mappedMentions } as any
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some(m => m.id === enriched.id)
            if (exists) return prev
            return [...prev, enriched]
          })
        }
      )
      
      // Define handlers in scope so cleanup can access them
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
      const handleTyping = (data: { userId: string, teamId: string, isTyping: boolean }) => {
        if (data.teamId === selectedTeamId && data.userId !== user?.id) {
          setTypingUsers(prev => {
            const newSet = new Set(prev)
            if (data.isTyping) {
              newSet.add(data.userId)
            } else {
              newSet.delete(data.userId)
            }
            return newSet
          })
        }
      }

      // Socket presence/typing events and join
      if (socket) {
        ;(socket as any).on('user-status-changed', handleStatusChanged)
        ;(socket as any).on('user-joined', handleUserJoined)
        ;(socket as any).on('user-left', handleUserLeft)
        ;(socket as any).on('user-typing', handleTyping)
        // Request live presence snapshot on join (server should respond with 'team-presence')
        ;(socket as any).emit('join_team', { teamId: selectedTeamId })
      }

      // Setup scroll listener
      if (messagesContainerRef.current) {
        messagesContainerRef.current.addEventListener('scroll', checkScrollPosition)
      }
      
      return () => {
        cancelled = true
        unsubscribe()
        if (socket) {
          ;(socket as any).off('user-status-changed', handleStatusChanged)
          ;(socket as any).off('user-joined', handleUserJoined)
          ;(socket as any).off('user-left', handleUserLeft)
          ;(socket as any).off('user-typing', handleTyping)
          ;(socket as any).emit('leave_team', { teamId: selectedTeamId })
        }
        if (messagesContainerRef.current) {
          messagesContainerRef.current.removeEventListener('scroll', checkScrollPosition)
        }
        ;(socket as any).off('user-typing')
      }
    }
  }, [selectedTeamId, loadTeamPresence, checkScrollPosition, socket])
  
  // Auto-scroll to bottom when messages first load or team changes
  useEffect(() => {
    if (teamMessages.length > 0) {
      // Use immediate scroll (not smooth) for initial load
      scrollToBottom(false)
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in an input field
      const isInInput = (e.target as HTMLElement)?.tagName === 'INPUT' || 
                       (e.target as HTMLElement)?.tagName === 'TEXTAREA' ||
                       (e.target as HTMLElement)?.contentEditable === 'true'
      
      if (!isInInput && (e.ctrlKey || e.metaKey) && e.key === 'f' && selectedTeamId) {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedTeamId])

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

  // Video call handler
  const handleVideoCall = useCallback(() => {
    // Open Google Meet in a new tab
    window.open('https://meet.google.com/landing', '_blank')
  }, [])

  // Search handlers
  const handleSearchOpen = useCallback(() => {
    setIsSearchOpen(true)
  }, [])

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false)
  }, [])

  const handleMessageSelect = useCallback((messageId: string) => {
    // Close search
    setIsSearchOpen(false)
    
    // Scroll to the message
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
      if (messageElement) {
        messageElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
        // Highlight the message briefly
        messageElement.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20', 'transition-all', 'duration-300')
        setTimeout(() => {
          messageElement.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20')
        }, 3000)
      }
    }, 100)
  }, [])

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

  // Auto-scroll to bottom when chat is first opened
  useEffect(() => {
    if (selectedTeamId && teamMessages.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        scrollToBottom(false)
      }, 100)
    }
  }, [selectedTeamId, teamMessages.length, scrollToBottom])

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
        <div className="px-4 md:px-6 pt-0 pb-0 h-full w-full">
          {/* Upgrade Banner for Free Users */}
          <div className="mb-3">
            <TeamLimitBanner currentUsage={teams.length} />
          </div>
          <div className="grid gap-6 lg:gap-8 lg:grid-cols-12">
            {/* Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3 animate-fade-in">
              <TeamSidebar
                teams={teams as any}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedTeamId={selectedTeamId}
                setSelectedTeamId={(id)=>{
                  if (id && id !== selectedTeamId) {
                    setIsSwitchingTeam(true)
                    // Optional: clear current messages for visual clarity during switch
                    setMessages([])
                  }
                  setSelectedTeamId(id)
                }}
                canUseTeamMembers={canUseFeature('team_members')}
                planLoading={planLoading}
                onCreateTeam={() => setIsCreateTeamOpen(true)}
                onInviteMember={() => setIsInviteDialogOpen(true)}
                onOpenInvitations={() => setIsInvitationsDialogOpen(true)}
              />
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
                        <div className="h-[80vh] md:h-[85vh] lg:h-[90vh] relative flex flex-col bg-background">
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
                            onSearchClick={handleSearchOpen}
                            onVideoClick={handleVideoCall}
                            onSettingsClick={() => setIsSettingsOpen(true)}
                          />

                          {/* Enhanced Messages Area */}
                          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto bg-background pb-0">
                            {isSwitchingTeam ? (
                              <div className="p-4 space-y-4">
                                {[...Array(6)].map((_, i) => (
                                  <ChatMessageSkeleton key={i} />
                                ))}
                              </div>
                            ) : teamMessages.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mb-6">
                                  <MessageSquare className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2 text-foreground">Welcome to your team chat!</h3>
                                <p className="text-sm text-center max-w-sm mb-4">
                                  Start the conversation with your team members. You can mention people with @, ask Nova for help, or share files.
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                  <Badge variant="outline" className="text-xs">
                                    <Bot className="w-3 h-3 mr-1" />
                                    @nova for AI help
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    <Users className="w-3 h-3 mr-1" />
                                    @username to mention
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    <Paperclip className="w-3 h-3 mr-1" />
                                    Attach files
                                  </Badge>
                                </div>
                              </div>
                            ) : (
                              teamMessages.map((message, index) => {
                                const isSystemMessage = message.type === 'system'
                                const prevMessage = index > 0 ? teamMessages[index - 1] : null
                                // Normalize AI messages to a stable sender id to avoid
                                // treating AI responses as the current user after persistence
                                const isAIMessage = message.content.includes('🤖 **Nova Response:**') || message.senderId === 'nova-ai'
                                const prevIsAIMessage = Boolean(prevMessage && (prevMessage.content?.includes('🤖 **Nova Response:**') || prevMessage.senderId === 'nova-ai'))
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
                                
                                // For AI messages, use the enhanced ProductivityMessage component for consistent alignment
                                if (isAIMessage) {
                                  const displayContent = message.content.includes('🤖 **Nova Response:**') 
                                    ? message.content.replace('🤖 **Nova Response:**\n\n', '')
                                    : message.content
                                  
                                  return (
                                    <div key={message.id} data-message-id={message.id}>
                                      <EnhancedMessage
                                      message={{
                                        id: message.id,
                                        senderId: 'nova-ai',
                                        content: displayContent,
                                        timestamp: message.timestamp,
                                        type: 'ai_response',
                                        reactions: {},
                                        mentions: [],
                                        status: 'sent',
                                        priority: 'normal',
                                        category: 'discussion'
                                      }}
                                      user={{
                                        id: 'nova-ai',
                                        name: 'Nova Assistant',
                                        email: '',
                                        avatar: '/assistant-avatar.svg',
                                        status: 'online',
                                        activity: 'AI Assistant'
                                      }}
                                      currentUserId={user?.id || ''}
                                      allUsers={selectedTeam.members.map(m => ({
                                        id: m.id,
                                        name: m.name,
                                        email: m.email,
                                        avatar: m.avatar,
                                        status: userPresence[m.id]?.status || m.status as "online" | "offline" | "away" | "busy",
                                        activity: userPresence[m.id]?.activity
                                      }))}
                                      isConsecutive={isConsecutive}
                                      onReply={(messageId) => {
                                        const replyMessage = teamMessages.find(m => m.id === messageId)
                                              if (replyMessage) {
                                                setReplyingTo({
                                                  id: replyMessage.id,
                                                  senderId: replyMessage.senderId,
                                                  senderName: 'Nova',
                                                  content: replyMessage.content,
                                                  timestamp: replyMessage.timestamp,
                                                  type: replyMessage.type as any,
                                                  reactions: {},
                                                  status: 'sent'
                                                })
                                              }
                                            }}
                                      onReact={() => {}}
                                      onEdit={() => {}}
                                      onDelete={() => {}}
                                      onPin={() => {}}
                                      onAIAssist={(messageId, context) => {
                                        handleAIAssistance(`Help me understand this AI response: "${context}"`)
                                      }}
                                      />
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
                                  <div key={message.id} data-message-id={message.id}>
                                    <EnhancedMessage
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
                                        const isOriginalFromAI = original.content.includes('🤖 **Nova Response:**') || original.senderId === 'nova-ai';
                                        return isOriginalFromAI ? 'Nova' : (info?.name || original.senderName)
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
                                        const isReplyFromAI = replyMessage.content.includes('🤖 **Nova Response:**') || replyMessage.senderId === 'nova-ai';
                                        const senderInfo = selectedTeam.members.find(m => m.id === replyMessage.senderId)
                                        const senderName = isReplyFromAI 
                                          ? 'Nova' 
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
                                  </div>
                                )
                              })
                            )}
                          </div>

                          {/* Scroll to Bottom Button */}
                          {showScrollButton && (
                            <div className="absolute bottom-24 right-6 z-10">
                              <Button
                                onClick={() => scrollToBottom()}
                                size="sm"
                                className={cn(
                                  "rounded-full px-3 py-2 shadow-lg transition-all",
                                  hasNewMessages 
                                    ? "bg-green-600 text-white hover:bg-green-700 animate-pulse" 
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                                )}
                              >
                                <div className="flex items-center gap-1">
                                  {hasNewMessages ? (
                                    <>
                                      <span className="text-xs font-medium">
                                        {unreadCount > 0 ? `${unreadCount} new` : 'New message'}
                                  </span>
                                      <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-xs">↓</span>
                                  <ChevronDown className="w-3 h-3" />
                                    </>
                                  )}
                                </div>
                              </Button>
                            </div>
                          )}

                          {/* Typing Indicator */}
                          {typingUsers.size > 0 && (
                            <div className="px-4 py-2 bg-muted/30 border-t">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span>
                                  {Array.from(typingUsers).map(userId => {
                                    const user = selectedTeam.members.find(m => m.id === userId)
                                    return user?.name || 'Someone'
                                  }).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                                </span>
                              </div>
                            </div>
                          )}


                          {/* Enhanced Productivity Message Input */}
                          <EnhancedMessageInput
                                  value={newMessage}
                                  onChange={(val, mentions) => {
                                    setNewMessage(val)
                                    setCurrentMentions(mentions)
                                    
                                    // Simple typing detection
                                    if (val.trim() && selectedTeamId) {
                                      // Emit typing event
                                      if (socket) {
                                        (socket as any).emit('typing', { teamId: selectedTeamId, isTyping: true })
                                      }
                                      
                                      // Clear typing after 3 seconds
                                      setTimeout(() => {
                                        if (socket) {
                                          (socket as any).emit('typing', { teamId: selectedTeamId, isTyping: false })
                                        }
                                      }, 3000)
                                    }
                                  }}
                            onSend={handleSendMessage}
                            onAttach={handleAttachFromCloud}
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
                                  files={teamFileMentions}
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
                          
                          {/* Chat Search Overlay */}
                          <ChatSearch
                            messages={teamMessages}
                            isOpen={isSearchOpen}
                            onClose={handleSearchClose}
                            onMessageSelect={handleMessageSelect}
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
                        <TeamFiles teamId={selectedTeam.id} currentUserRole={currentUserRole} apiCall={apiCall} />
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
