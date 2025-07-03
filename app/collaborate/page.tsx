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
import { RouteGuard } from "@/components/route-guard"
import { TeamSettings } from "./components/team-settings"
import { TeamFiles } from "./components/team-files"
import NotificationBell from "./components/notification-bell"

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
  // State management
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
    category: "Research",
    isPublic: false,
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)

  const { toast } = useToast()
  const { socket } = useSocket()
  const { user, isLoading: authLoading, session } = useSupabaseAuth()

  // API helper functions with proper authentication
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

  // Load user's teams
  const loadTeams = useCallback(async () => {
    if (!user || !session) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const data = await apiCall('/api/collaborate/teams')
      
      if (data.success) {
        setTeams(data.teams || [])
        
        // Auto-select first team if none selected
        if (!selectedTeamId && data.teams?.length > 0) {
          setSelectedTeamId(data.teams[0].id)
        }
        
        if (data.teams?.length === 0) {
          toast({
            title: "Welcome to Collaboration",
            description: "Create your first team to get started!",
          })
        }
      }
    } catch (error) {
      console.error('Error loading teams:', error)
      setError(error instanceof Error ? error.message : 'Failed to load teams')
      toast({
        title: "Error",
        description: "Failed to load teams. Please try refreshing the page.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, session, selectedTeamId, apiCall, toast])

  // Load chat messages for selected team
  const loadMessages = useCallback(async (teamId: string) => {
    if (!teamId) return
    
    try {
      const data = await apiCall(`/api/collaborate/messages?teamId=${teamId}&limit=50`)
      
      if (data.success) {
        const formattedMessages: ChatMessage[] = data.messages.map((msg: any) => ({
          id: msg.id,
          senderId: msg.sender_id,
          senderName: msg.sender?.full_name || 'Unknown User',
          senderAvatar: msg.sender?.avatar_url,
          content: msg.content,
          timestamp: msg.created_at,
          teamId: msg.team_id,
          type: msg.message_type || "text",
        }))
        
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      toast({
        title: "Error",
        description: "Failed to load chat messages",
        variant: "destructive",
      })
    }
  }, [apiCall, toast])

  // Initialize data
  useEffect(() => {
    if (user && session && !authLoading) {
      loadTeams()
    }
  }, [user, session, authLoading, loadTeams])

  // Load messages when team changes
  useEffect(() => {
    if (selectedTeamId) {
      loadMessages(selectedTeamId)
    } else {
      setMessages([])
    }
  }, [selectedTeamId, loadMessages])

  // Socket event handlers for real-time updates
  useEffect(() => {
    if (!socket || !selectedTeamId) return

    const handleNewMessage = (data: any) => {
      if (data.teamId === selectedTeamId) {
        const newMessage: ChatMessage = {
          id: data.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          content: data.content,
          timestamp: data.timestamp,
          teamId: data.teamId,
          type: data.type || "text",
        }
        setMessages(prev => [...prev, newMessage])
      }
    }

    const handleTeamUpdate = () => {
      loadTeams() // Reload teams when updates occur
    }

    socket.on('new-message', handleNewMessage)
    socket.on('team-updated', handleTeamUpdate)
    socket.on('member-joined', handleTeamUpdate)
    socket.on('member-left', handleTeamUpdate)

    return () => {
      socket.off('new-message', handleNewMessage)
      socket.off('team-updated', handleTeamUpdate)
      socket.off('member-joined', handleTeamUpdate)
      socket.off('member-left', handleTeamUpdate)
    }
  }, [socket, selectedTeamId, loadTeams])

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
        description: "Team name is required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreatingTeam(true)
      
      const data = await apiCall('/api/collaborate/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: newTeam.name.trim(),
          description: newTeam.description.trim(),
          category: newTeam.category,
          isPublic: newTeam.isPublic,
        }),
      })

      if (data.success) {
        toast({
          title: "Team created",
          description: `"${newTeam.name}" has been created successfully!`,
        })
        
        // Reset form
        setNewTeam({ name: "", description: "", category: "Research", isPublic: false })
        
        // Reload teams and select the new one
        await loadTeams()
        if (data.team?.id) {
          setSelectedTeamId(data.team.id)
        }
      }
    } catch (error) {
      console.error("Error creating team:", error)
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "Could not create team. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingTeam(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTeamId || !user) return

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
        // Message will be added via socket event
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Message failed",
        description: error instanceof Error ? error.message : "Could not send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handler for team updates from settings
  const handleTeamUpdate = (updatedTeam: Team) => {
    setTeams(prev => prev.map(team => 
      team.id === updatedTeam.id ? updatedTeam : team
    ))
  }

  // Handler for leaving/deleting team
  const handleLeaveTeam = () => {
    setTeams(prev => prev.filter(team => team.id !== selectedTeamId))
    setSelectedTeamId(null)
    loadTeams() // Reload teams
  }

  // Computed values
  const selectedTeam = teams.find((t) => t.id === selectedTeamId)
  const currentUserRole = selectedTeam?.members.find(m => m.id === user?.id)?.role || 'viewer'
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
    <RouteGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        {/* Header with Notification Bell */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3 max-w-7xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold">Collaborate</h1>
                {selectedTeam && (
                  <Badge variant="outline">{selectedTeam.name}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {user.user_metadata?.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
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
                    disabled={isCreatingTeam}
                  />
                  <Input
                    placeholder="Description"
                    value={newTeam.description}
                    onChange={(e) => setNewTeam((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={isCreatingTeam}
                  />
                  <select
                    value={newTeam.category}
                    onChange={(e) => setNewTeam((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isCreatingTeam}
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
                      disabled={isCreatingTeam}
                    />
                    <label htmlFor="public-team" className="text-sm text-gray-700">
                      Public team
                    </label>
                  </div>
                  <Button 
                    onClick={handleCreateTeam} 
                    disabled={!newTeam.name.trim() || isCreatingTeam} 
                    className="w-full"
                  >
                    {isCreatingTeam ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Team'
                    )}
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
                                      <AvatarImage src={message.senderAvatar} />
                                      <AvatarFallback className="text-xs">{message.senderName?.charAt(0) || 'U'}</AvatarFallback>
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
                                disabled={isSendingMessage}
                              />
                              <Button 
                                onClick={handleSendMessage} 
                                disabled={!newMessage.trim() || isSendingMessage}
                              >
                                {isSendingMessage ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="members" className="mt-6 space-y-6">
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
                                        <AvatarFallback>{member.name?.charAt(0) || 'U'}</AvatarFallback>
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
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <div className="text-center py-20">
                      <Users className="h-16 w-16 mx-auto mb-6 text-gray-400" />
                      <h3 className="text-2xl font-medium mb-4">Select a Team</h3>
                      <p className="text-gray-600 max-w-md mx-auto mb-8">
                        Choose a team from the sidebar to start collaborating, or create a new team to get started
                      </p>
                      <div className="flex justify-center gap-6">
                        {[
                          { id: 'chat', icon: MessageSquare, label: 'Team Chat', color: 'bg-blue-500' },
                          { id: 'files', icon: Share, label: 'File Sharing', color: 'bg-green-500' },
                          { id: 'video', icon: Video, label: 'Video Calls', color: 'bg-purple-500' }
                        ].map((feature) => (
                          <div key={feature.id} className="text-center">
                            <div className={`w-12 h-12 ${feature.color} mb-3 mx-auto rounded-lg flex items-center justify-center`}>
                              <feature.icon className="h-6 w-6 text-white" />
                          </div>
                            <span className="text-sm text-gray-600">{feature.label}</span>
                        </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
        
        {/* Team Settings Modal */}
        {selectedTeam && (
          <TeamSettings
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            team={selectedTeam}
            currentUserRole={currentUserRole}
            onTeamUpdate={handleTeamUpdate}
            onLeaveTeam={handleLeaveTeam}
            apiCall={apiCall}
          />
        )}
      </div>
    </RouteGuard>
  )
}
