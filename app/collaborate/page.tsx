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

// Custom hook for safe localStorage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const item = window.localStorage.getItem(key)
        if (item) {
          setStoredValue(JSON.parse(item))
        }
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
    }
  }, [key])

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue],
  )

  return [storedValue, setValue] as const
}

// Toast notification hook (simplified)
function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "success" | "error" }>>([])

  const toast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return { toast, toasts }
}

export default function CollaboratePage() {
  // State management
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useLocalStorage<Team[]>("collaboration_teams", [])
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>("collaboration_messages", [])
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

  const { toast, toasts } = useToast()

  // Current user (mock)
  const currentUser: User = {
    id: "current-user",
    name: "You",
    email: "you@example.com",
    status: "online",
    role: "owner",
    joinedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  }

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // If no teams exist, create sample data
        if (teams.length === 0) {
          const sampleTeams: Team[] = [
            {
              id: "team-1",
              name: "ML Research Group",
              description: "Collaborative research on machine learning algorithms and applications",
              members: [
                currentUser,
                {
                  id: "user-2",
                  name: "Dr. Sarah Chen",
                  email: "sarah@university.edu",
                  status: "online",
                  role: "editor",
                  joinedAt: new Date(Date.now() - 86400000).toISOString(),
                  lastActive: new Date(Date.now() - 300000).toISOString(),
                },
                {
                  id: "user-3",
                  name: "Alex Rodriguez",
                  email: "alex@research.com",
                  status: "away",
                  role: "viewer",
                  joinedAt: new Date(Date.now() - 172800000).toISOString(),
                  lastActive: new Date(Date.now() - 3600000).toISOString(),
                },
              ],
              createdAt: new Date(Date.now() - 604800000).toISOString(),
              isPublic: false,
              category: "Research",
              owner: currentUser.id,
            },
            {
              id: "team-2",
              name: "Data Science Study Group",
              description: "Weekly discussions on data science topics and projects",
              members: [
                currentUser,
                {
                  id: "user-4",
                  name: "Emma Wilson",
                  email: "emma@datascience.org",
                  status: "offline",
                  role: "admin",
                  joinedAt: new Date(Date.now() - 259200000).toISOString(),
                  lastActive: new Date(Date.now() - 7200000).toISOString(),
                },
              ],
              createdAt: new Date(Date.now() - 1209600000).toISOString(),
              isPublic: true,
              category: "Study Group",
              owner: currentUser.id,
            },
          ]
          setTeams(sampleTeams)
          setSelectedTeamId(sampleTeams[0].id)
        } else if (teams.length > 0 && !selectedTeamId) {
          setSelectedTeamId(teams[0].id)
        }

        await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate loading
      } catch (err) {
        console.error("Error initializing data:", err)
        setError("Failed to load collaboration data")
      } finally {
        setIsLoading(false)
      }
    }

    initializeData()
  }, [teams.length, selectedTeamId, setTeams])

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
  const handleCreateTeam = () => {
    if (!newTeam.name.trim()) {
      toast("Team name is required", "error")
      return
    }

    const team: Team = {
      id: `team-${Date.now()}`,
      name: newTeam.name.trim(),
      description: newTeam.description.trim(),
      members: [currentUser],
      createdAt: new Date().toISOString(),
      isPublic: newTeam.isPublic,
      category: newTeam.category,
      owner: currentUser.id,
    }

    setTeams((prev) => [team, ...prev])
    setSelectedTeamId(team.id)
    setNewTeam({ name: "", description: "", category: "Research", isPublic: false })
    toast(`Team "${team.name}" created successfully!`)
  }

  const handleInviteMember = () => {
    if (!inviteEmail.trim() || !selectedTeamId) {
      toast("Email address is required", "error")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      toast("Please enter a valid email address", "error")
      return
    }

    const selectedTeam = teams.find((t) => t.id === selectedTeamId)
    if (!selectedTeam) return

    if (selectedTeam.members.some((m) => m.email === inviteEmail)) {
      toast("User is already a member of this team", "error")
      return
    }

    const newMember: User = {
      id: `user-${Date.now()}`,
      name: inviteEmail.split("@")[0].charAt(0).toUpperCase() + inviteEmail.split("@")[0].slice(1),
      email: inviteEmail,
      status: "offline",
      role: "viewer",
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    }

    setTeams((prev) =>
      prev.map((team) => (team.id === selectedTeamId ? { ...team, members: [...team.members, newMember] } : team)),
    )

    // Add system message
    const systemMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: "system",
      senderName: "System",
      content: `${newMember.name} joined the team`,
      timestamp: new Date().toISOString(),
      teamId: selectedTeamId,
      type: "system",
    }

    setMessages((prev) => [...prev, systemMessage])
    setInviteEmail("")
    toast(`Invitation sent to ${inviteEmail}`)
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTeamId) return

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      teamId: selectedTeamId,
      type: "text",
    }

    setMessages((prev) => [...prev, message])
    setNewMessage("")
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-md shadow-lg ${
              toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
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
