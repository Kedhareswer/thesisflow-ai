"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
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
  ArrowRight,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { useSocket } from "@/components/socket-provider"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { supabase } from "@/integrations/supabase/client"

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
}

export default function CollaboratePage() {
  // State management
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
    category: "Research",
    isPublic: false,
  })

  const { toast } = useToast()
  const { socket } = useSocket()
  const { user, isLoading: authLoading } = useSupabaseAuth()

  // Initialize data from Supabase
  useEffect(() => {
    const initializeData = async () => {
      if (!user || authLoading) return

      try {
        setIsLoading(true)
        setError(null)

        // Fetch user's teams
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select(`
            *,
            team_members!inner(
              user_id,
              role,
              joined_at
            )
          `)
          .eq('team_members.user_id', user.id)

        // Handle the case where no teams are found (not an error)
        if (teamsError && teamsError.code !== 'PGRST116') {
          throw teamsError
        }

        // Transform the data to match our interface (handle null/empty results)
        const transformedTeams: Team[] = (teamsData || []).map((team: any) => ({
          id: team.id,
          name: team.name,
          description: team.description || "",
          members: [], // Will be populated separately
          createdAt: team.created_at,
          isPublic: team.is_public || false,
          category: team.category || "Research",
          owner: team.owner_id,
        }))

        setTeams(transformedTeams)

        // Select first team if available
        if (transformedTeams.length > 0 && !selectedTeamId) {
          setSelectedTeamId(transformedTeams[0].id)
        }

        // Fetch team members for each team
        for (const team of transformedTeams) {
          await loadTeamMembers(team.id)
        }

        // Show appropriate message based on results
        if (transformedTeams.length > 0) {
          toast({
            title: "Teams loaded",
            description: `Found ${transformedTeams.length} team(s)`,
          })
        } else {
          toast({
            title: "Welcome to Collaboration",
            description: "Create your first team to get started!",
          })
        }
      } catch (err) {
        // Silently handle errors and show demo mode
        console.log("Database connection not available, using demo mode")
        
        // Always show demo mode if there's any error
        toast({
          title: "Demo Mode",
          description: "Using demo collaboration workspace. Database connection not available.",
        })
        
        // Create demo teams for demonstration
        const demoTeams: Team[] = [
          {
            id: 'demo-team-1',
            name: 'AI Research Lab',
            description: 'Exploring cutting-edge machine learning techniques and neural networks.',
            members: [
              {
                id: user.id,
                name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'You',
                email: user.email || '',
                status: 'online',
                role: 'owner',
                joinedAt: new Date().toISOString(),
                lastActive: new Date().toISOString(),
              }
            ],
            createdAt: new Date().toISOString(),
            isPublic: false,
            category: 'Research',
            owner: user.id,
          },
          {
            id: 'demo-team-2',
            name: 'Data Science Team',
            description: 'Working on predictive analytics and statistical modeling projects.',
            members: [
              {
                id: user.id,
                name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'You',
                email: user.email || '',
                status: 'online',
                role: 'owner',
                joinedAt: new Date().toISOString(),
                lastActive: new Date().toISOString(),
              }
            ],
            createdAt: new Date().toISOString(),
            isPublic: true,
            category: 'Research',
            owner: user.id,
          }
        ]
        
        setTeams(demoTeams)
        setSelectedTeamId(demoTeams[0].id)
      } finally {
        setIsLoading(false)
      }
    }

    initializeData()
  }, [user, authLoading, selectedTeamId, supabase, toast])

  // Load team members
  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          user_profiles!inner(*)
        `)
        .eq('team_id', teamId)

      if (error) throw error

      // Transform members data
      const members: User[] = data.map((member: any) => ({
        id: member.user_id,
        name: member.user_profiles?.display_name || member.user_profiles?.email?.split('@')[0] || 'Unknown',
        email: member.user_profiles?.email || '',
        avatar: member.user_profiles?.avatar_url,
        status: "offline", // Will be updated via real-time presence
        role: member.role,
        joinedAt: member.joined_at,
        lastActive: member.user_profiles?.last_active || new Date().toISOString(),
      }))

      // Update the team with members
      setTeams(prev => prev.map(team => 
        team.id === teamId 
          ? { ...team, members }
          : team
      ))
    } catch (error) {
      console.error("Error loading team members:", error)
    }
  }

  // Load chat messages for selected team
  useEffect(() => {
    if (!selectedTeamId || !user) return

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('team_id', selectedTeamId)
          .order('created_at', { ascending: true })
          .limit(50)

        if (error) throw error

        const transformedMessages: ChatMessage[] = data.map((msg: any) => ({
          id: msg.id,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          content: msg.content,
          timestamp: msg.created_at,
          teamId: msg.team_id,
          type: msg.message_type || "text",
        }))

        setMessages(transformedMessages)
      } catch (error) {
        console.error("Error loading messages:", error)
      }
    }

    loadMessages()

    // Subscribe to real-time messages
    const messageSubscription = supabase
      .channel(`chat:${selectedTeamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `team_id=eq.${selectedTeamId}`,
        },
        (payload: any) => {
          const newMessage: ChatMessage = {
            id: payload.new.id,
            senderId: payload.new.sender_id,
            senderName: payload.new.sender_name,
            content: payload.new.content,
            timestamp: payload.new.created_at,
            teamId: payload.new.team_id,
            type: payload.new.message_type || "text",
          }
          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe()

    return () => {
      messageSubscription.unsubscribe()
    }
  }, [selectedTeamId, user, supabase])

  // Helper functions
  const getStatusColor = (status: User["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "away":
        return "bg-yellow-500"
      case "offline":
        return "bg-gray-400"
      default:
        return "bg-gray-400"
    }
  }

  const getRoleIcon = (role: User["role"]) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3 w-3 text-yellow-600" />
      case "admin":
        return <Shield className="h-3 w-3 text-blue-600" />
      case "editor":
        return <Shield className="h-3 w-3 text-green-600" />
      case "viewer":
        return <Eye className="h-3 w-3 text-gray-600" />
      default:
        return null
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch {
      return "Invalid time"
    }
  }

  const formatDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleDateString()
    } catch {
      return "Invalid date"
    }
  }

  // Event handlers
  const handleCreateTeam = async () => {
    if (!newTeam.name.trim() || !user) {
      toast({
        title: "Missing information",
        description: "Team name is required and you must be logged in",
        variant: "destructive",
      })
      return
    }

    try {
      // Check if we're in demo mode by trying to create team in database
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([
          {
            name: newTeam.name.trim(),
            description: newTeam.description.trim(),
            owner_id: user.id,
            is_public: newTeam.isPublic,
            category: newTeam.category,
          }
        ])
        .select()
        .single()

      // If database connection fails, create demo team locally
      if (teamError && (teamError.message?.includes('Invalid URL') || teamError.message?.includes('placeholder'))) {
        // Demo mode - create team locally
        const newTeamData: Team = {
          id: `demo-team-${Date.now()}`,
          name: newTeam.name.trim(),
          description: newTeam.description.trim() || "",
          members: [{
            id: user.id,
            name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'You',
            email: user.email || '',
            status: "online",
            role: "owner",
            joinedAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
          }],
          createdAt: new Date().toISOString(),
          isPublic: newTeam.isPublic,
          category: newTeam.category,
          owner: user.id,
        }

        setTeams(prev => [newTeamData, ...prev])
        setSelectedTeamId(newTeamData.id)
        setNewTeam({ name: "", description: "", category: "Research", isPublic: false })

        toast({
          title: "Demo team created",
          description: `"${newTeamData.name}" created in demo mode. Set up database for persistence.`,
        })
        return
      }

      if (teamError) throw teamError

      // Add creator as team member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          {
            team_id: teamData.id,
            user_id: user.id,
            role: 'owner',
          }
        ])

      if (memberError) throw memberError

      // Transform to local format
      const newTeamData: Team = {
        id: teamData.id,
        name: teamData.name,
        description: teamData.description || "",
        members: [{
          id: user.id,
          name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'You',
          email: user.email || '',
          status: "online",
          role: "owner",
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        }],
        createdAt: teamData.created_at,
        isPublic: teamData.is_public || false,
        category: teamData.category || "Research",
        owner: teamData.owner_id,
      }

      setTeams(prev => [newTeamData, ...prev])
      setSelectedTeamId(newTeamData.id)
      setNewTeam({ name: "", description: "", category: "Research", isPublic: false })

      toast({
        title: "Team created",
        description: `"${newTeamData.name}" has been created successfully!`,
      })

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("team_created", {
          teamId: newTeamData.id,
          name: newTeamData.name,
        })
      }
    } catch (error) {
      console.error("Error creating team:", error)
      toast({
        title: "Creation failed",
        description: "Could not create team. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedTeamId || !user) {
      toast({
        title: "Missing information",
        description: "Email address and team selection are required",
        variant: "destructive",
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    try {
      // Check if user exists in user_profiles
      const { data: existingUser, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', inviteEmail)
        .single()

      if (userError && userError.code !== 'PGRST116') {
        throw userError
      }

      if (!existingUser) {
        toast({
          title: "User not found",
          description: "This user needs to sign up first before being invited",
          variant: "destructive",
        })
        return
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', selectedTeamId)
        .eq('user_id', existingUser.user_id)
        .single()

      if (existingMember) {
        toast({
          title: "Already a member",
          description: "This user is already a member of this team",
          variant: "destructive",
        })
        return
      }

      // Add member to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          {
            team_id: selectedTeamId,
            user_id: existingUser.user_id,
            role: 'viewer',
          }
        ])

      if (memberError) throw memberError

      // Add system message
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert([
          {
            team_id: selectedTeamId,
            sender_id: 'system',
            sender_name: 'System',
            content: `${existingUser.display_name || existingUser.email} joined the team`,
            message_type: 'system',
          }
        ])

      if (messageError) throw messageError

      // Reload team members
      await loadTeamMembers(selectedTeamId)
      setInviteEmail("")

      toast({
        title: "Member invited",
        description: `${inviteEmail} has been added to the team`,
      })
    } catch (error) {
      console.error("Error inviting member:", error)
      toast({
        title: "Invitation failed",
        description: "Could not invite member. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTeamId || !user) return

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([
          {
            team_id: selectedTeamId,
            sender_id: user.id,
            sender_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
            content: newMessage.trim(),
            message_type: 'text',
          }
        ])

      if (error) throw error

      setNewMessage("")

      // Emit socket event
      if (socket) {
        socket.emit("message_sent", {
          teamId: selectedTeamId,
          content: newMessage.trim(),
        })
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Message failed",
        description: "Could not send message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Computed values
  const selectedTeam = teams.find((t) => t.id === selectedTeamId)
  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )
  const teamMessages = messages.filter((m) => m.teamId === selectedTeamId)

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading collaboration workspace...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} className="w-full">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Auth check
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-gray-600 mb-4">Please sign in to access collaboration features</p>
              <Button onClick={() => window.location.href = '/login'} className="w-full">
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {/* Toast notifications from useToast */}
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Create Team Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Team name"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Description"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam((prev) => ({ ...prev, description: e.target.value }))}
                />
                <select
                  value={newTeam.category}
                  onChange={(e) => setNewTeam((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Research">Research</option>
                  <option value="Study Group">Study Group</option>
                  <option value="Project">Project</option>
                  <option value="Discussion">Discussion</option>
                </select>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="public-team"
                    checked={newTeam.isPublic}
                    onChange={(e) => setNewTeam((prev) => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="public-team" className="text-sm text-gray-700">
                    Public team
                  </label>
                </div>
                <Button onClick={handleCreateTeam} disabled={!newTeam.name.trim()} className="w-full">
                  Create Team
                </Button>
              </CardContent>
            </Card>

            {/* Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Teams List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Teams ({teams.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredTeams.map((team) => (
                    <div
                      key={team.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedTeamId === team.id
                          ? "bg-blue-100 border-2 border-blue-500"
                          : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                      }`}
                      onClick={() => setSelectedTeamId(team.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{team.name}</h4>
                        <div className="flex items-center gap-1">
                          {team.isPublic && <Globe className="h-3 w-3 text-gray-500" />}
                          <Badge variant="outline" className="text-xs">
                            {team.category}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{team.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-600">{team.members.length}</span>
                        </div>
                        <div className="flex -space-x-1">
                          {team.members.slice(0, 3).map((member) => (
                            <div key={member.id} className="relative">
                              <Avatar className="h-5 w-5 border border-white">
                                <AvatarImage src={member.avatar || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
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
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">{searchTerm ? "No teams found" : "No teams yet"}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedTeam ? (
              <Card className="h-full">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {selectedTeam.name}
                            {selectedTeam.isPublic && <Globe className="h-4 w-4 text-gray-500" />}
                            <Badge variant="outline">{selectedTeam.category}</Badge>
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{selectedTeam.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Video className="h-4 w-4 mr-2" />
                        Video Call
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="chat" className="h-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="chat">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat
                      </TabsTrigger>
                      <TabsTrigger value="members">
                        <Users className="h-4 w-4 mr-2" />
                        Members ({selectedTeam.members.length})
                      </TabsTrigger>
                      <TabsTrigger value="files">
                        <Share className="h-4 w-4 mr-2" />
                        Files
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="chat" className="mt-6">
                      <div className="border rounded-lg h-96 flex flex-col">
                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                          {teamMessages.map((message) => (
                            <div key={message.id}>
                              {message.type === "system" ? (
                                <div className="text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {message.content}
                                  </Badge>
                                </div>
                              ) : (
                                <div className="flex gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">{message.senderName.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-sm">{message.senderName}</span>
                                      <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                                    </div>
                                    <p className="text-sm text-gray-700">{message.content}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {teamMessages.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                              <p className="text-lg font-medium mb-2">No messages yet</p>
                              <p className="text-sm">Start the conversation with your team</p>
                            </div>
                          )}
                        </div>
                        <Separator />
                        <div className="p-4">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Type your message..."
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={handleKeyPress}
                              className="flex-1"
                            />
                            <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="members" className="mt-6 space-y-6">
                      {/* Invite Member */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Invite New Member
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter email address"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              className="flex-1"
                            />
                            <Button onClick={handleInviteMember} disabled={!inviteEmail.trim()}>
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Members List */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Team Members</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {selectedTeam.members.map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={member.avatar || "/placeholder.svg"} />
                                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div
                                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(member.status)}`}
                                    />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{member.name}</p>
                                      {getRoleIcon(member.role)}
                                    </div>
                                    <p className="text-sm text-gray-600">{member.email}</p>
                                    <p className="text-xs text-gray-500">
                                      Last active: {formatDate(member.lastActive)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {member.role}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      member.status === "online"
                                        ? "border-green-500 text-green-700"
                                        : member.status === "away"
                                          ? "border-yellow-500 text-yellow-700"
                                          : "border-gray-300 text-gray-600"
                                    }`}
                                  >
                                    {member.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="files" className="mt-6">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-12">
                            <Share className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-medium mb-2">Shared Files</h3>
                            <p className="text-gray-600 mb-4">
                              File sharing and collaborative document editing coming soon
                            </p>
                            <div className="flex justify-center gap-4">
                              <div className="text-center">
                                <div className="w-8 h-8 bg-blue-500 mb-2 mx-auto rounded"></div>
                                <span className="text-xs text-gray-600">Document Sync</span>
                              </div>
                              <div className="text-center">
                                <div className="w-8 h-8 bg-green-500 mb-2 mx-auto rounded"></div>
                                <span className="text-xs text-gray-600">Version Control</span>
                              </div>
                              <div className="text-center">
                                <div className="w-8 h-8 bg-purple-500 mb-2 mx-auto rounded"></div>
                                <span className="text-xs text-gray-600">Real-time Edit</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              /* Welcome State */
              <Card className="h-full">
                <CardContent className="pt-6">
                  <div className="text-center py-20">
                    <Users className="h-16 w-16 mx-auto mb-6 text-gray-400" />
                    <h3 className="text-2xl font-medium mb-4">Select a Team</h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-8">
                      Choose a team from the sidebar to start collaborating, or create a new team to get started
                    </p>
                    <div className="flex justify-center gap-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-500 mb-3 mx-auto rounded-lg flex items-center justify-center">
                          <MessageSquare className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-sm text-gray-600">Team Chat</span>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-500 mb-3 mx-auto rounded-lg flex items-center justify-center">
                          <Share className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-sm text-gray-600">File Sharing</span>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-purple-500 mb-3 mx-auto rounded-lg flex items-center justify-center">
                          <Video className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-sm text-gray-600">Video Calls</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
