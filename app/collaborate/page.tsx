"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Check } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Users,
  MessageSquare,
  Share,
  UserPlus,
  Globe,
  Search,
  Settings,
  Crown,
  Shield,
  Eye,
  Send,
  Video,
  Plus,
  Loader2,
  AlertCircle,
  X,
  MoreHorizontal,
  Bell,
  FileText,
  Zap,
  Lock,
  ChevronRight,
} from "lucide-react"

import { useSocket } from "@/components/socket-provider"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { RouteGuard } from "@/components/route-guard"
import { TeamSettings } from "./components/team-settings"
import { TeamFiles } from "./components/team-files"
import NotificationBell from "./components/notification-bell"
import { InvitationsDialog } from "./components/invitations-dialog"
import { DevelopmentNotice } from "@/components/ui/development-notice"
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
  const [isSendingMessage, setIsSendingMessage] = useState(false)
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

  const { toast } = useToast()
  const { socket } = useSocket()
  const { user, isLoading: authLoading, session } = useSupabaseAuth()

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

  // Load teams
  const loadTeams = useCallback(async () => {
    if (!user || !session) return
    
    try {
      setIsLoading(true)
      setError(null)
      
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
  }, [user, apiCall])

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
          type: msg.type || 'text'
        }))
        
        // Reverse messages so newest appears at bottom (WhatsApp style)
        setMessages(formattedMessages.reverse())
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }, [apiCall])

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

  // Effects
  useEffect(() => {
    if (!authLoading && session && user) {
      loadTeams()
    }
  }, [authLoading, session, user, loadTeams])

  // Real-time message subscription
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    if (selectedTeamId) {
      loadMessages(selectedTeamId)
      
      // Subscribe to real-time messages for this team
      const unsubscribe = collaborateService.subscribeToMessages(
        selectedTeamId,
        (newMessage: ChatMessage) => {
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) return prev
            
            // Add new message to the end (bottom of chat)
            const updated = [...prev, newMessage]
            
            // Auto-scroll to bottom after state update
            setTimeout(scrollToBottom, 10)
            
            return updated
          })
        }
      )
      
      // Cleanup subscription when team changes or component unmounts
      return unsubscribe
    }
  }, [selectedTeamId, loadMessages, scrollToBottom])
  
  // Auto-scroll to bottom when messages first load
  useEffect(() => {
    if (teamMessages.length > 0) {
      scrollToBottom()
    }
  }, [selectedTeamId, scrollToBottom])

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTeamId) return

    try {
      setIsSendingMessage(true)
      
      const data = await apiCall('/api/collaborate/messages', {
        method: 'POST',
        body: JSON.stringify({
          teamId: selectedTeamId,
          content: newMessage.trim(),
          type: 'text',
        }),
      })

      if (data.success) {
        setNewMessage("")
        loadMessages(selectedTeamId)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsSendingMessage(false)
    }
  }

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
  const teamMessages = messages.filter((m) => m.teamId === selectedTeamId);

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
      <div className="min-h-screen bg-background">
        {/* Modern Header */}
        {/* Removed duplicate header here */}
        <div className="container mx-auto px-6 py-8 max-w-7xl">
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
              {process.env.NODE_ENV === 'development' && planData && (
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
              )}
              
              {selectedTeam ? (
                <Card className="border-none shadow-sm h-full">
                  <CardHeader className="border-b bg-muted/30">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-3 text-xl">
                            {selectedTeam.name}
                            {selectedTeam.isPublic && <Globe className="h-4 w-4 text-muted-foreground" />}
                            <Badge variant="outline" className="font-normal">{selectedTeam.category}</Badge>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{selectedTeam.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Video className="h-4 w-4" />
                          <span className="hidden sm:inline">Video Call</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsSettingsOpen(true)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Tabs defaultValue="chat" className="h-full">
                      <TabsList className="grid w-full grid-cols-3 bg-transparent border-b rounded-none h-12">
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
                      </TabsList>

                      <TabsContent value="chat" className="mt-0 p-0">
                        <div className="h-[600px] flex flex-col bg-background">
                          {/* Chat Header */}
                          <div className="px-6 py-4 border-b bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                  <Users className="w-5 h-5 text-primary" />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm">{selectedTeam.name}</h3>
                                <p className="text-xs text-muted-foreground">{selectedTeam.members.length} members</p>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {teamMessages.length} messages
                            </div>
                          </div>

                          {/* Messages Area */}
                          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-muted/5">
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
                                const isOwnMessage = message.senderId === user?.id
                                const prevMessage = index > 0 ? teamMessages[index - 1] : null
                                const showAvatar = !isOwnMessage && (!prevMessage || prevMessage.senderId !== message.senderId)
                                const isSystemMessage = message.type === 'system'
                                
                                if (isSystemMessage) {
                                  return (
                                    <div key={message.id} className="flex justify-center my-4">
                                      <div className="bg-muted/80 px-3 py-1 rounded-full">
                                        <span className="text-xs text-muted-foreground">{message.content}</span>
                                      </div>
                                    </div>
                                  )
                                }
                                
                                return (
                                  <div key={message.id} className={`flex items-end gap-2 animate-fade-in ${
                                    isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                                  }`}>
                                    {/* Avatar for received messages */}
                                    {!isOwnMessage && (
                                      <div className="flex-shrink-0 mb-1">
                                        {showAvatar ? (
                                          <Avatar className="w-7 h-7">
                                            <AvatarImage src={message.senderAvatar || ''} />
                                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                              {message.senderName?.charAt(0)?.toUpperCase() || 'U'}
                                            </AvatarFallback>
                                          </Avatar>
                                        ) : (
                                          <div className="w-7 h-7" />
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Message Bubble */}
                                    <div className={`max-w-[70%] relative group ${
                                      isOwnMessage ? 'ml-auto' : 'mr-auto'
                                    }`}>
                                      {/* Sender name for received messages */}
                                      {!isOwnMessage && showAvatar && (
                                        <div className="text-xs text-muted-foreground mb-1 px-3">
                                          {message.senderName}
                                        </div>
                                      )}
                                      
                                      {/* Message content */}
                                      <div className={`px-4 py-2 rounded-2xl shadow-sm ${
                                        isOwnMessage 
                                          ? 'bg-primary text-primary-foreground rounded-br-md' 
                                          : 'bg-background border rounded-bl-md'
                                      }`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                        
                                        {/* Timestamp */}
                                        <div className={`text-xs mt-1 opacity-70 ${
                                          isOwnMessage ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground'
                                        }`}>
                                          {new Date(message.timestamp).toLocaleTimeString([], { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>

                          {/* Message Input */}
                          <div className="px-4 py-3 border-t bg-background">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 relative">
                                <Input
                                  placeholder="Type a message..."
                                  value={newMessage}
                                  onChange={(e) => setNewMessage(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      handleSendMessage()
                                    }
                                  }}
                                  className="pr-12 rounded-full border-muted-foreground/20 focus:border-primary/50 transition-colors"
                                  disabled={isSendingMessage}
                                />
                              </div>
                              <Button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim() || isSendingMessage}
                                size="sm"
                                className="rounded-full w-10 h-10 p-0 shadow-md hover:shadow-lg transition-shadow"
                              >
                                {isSendingMessage ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
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
                        <TeamFiles 
                          teamId={selectedTeam.id} 
                          currentUserRole={currentUserRole} 
                          apiCall={apiCall}
                        />
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
    </RouteGuard>
  )
}
