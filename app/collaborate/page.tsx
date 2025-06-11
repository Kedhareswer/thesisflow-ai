"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
} from "lucide-react"
import { useSocket } from "@/components/socket-provider"
import { useToast } from "@/hooks/use-toast"

interface Collaborator {
  id: string
  name: string
  email: string
  avatar?: string
  status: "online" | "offline" | "away"
  role: "owner" | "editor" | "viewer"
  joinedAt: Date
  lastActive: Date
}

interface Team {
  id: string
  name: string
  description: string
  members: Collaborator[]
  createdAt: Date
  isPublic: boolean
  category: string
}

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: Date
  teamId: string
  type: "text" | "system"
}

export default function CollaborationPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
    category: "Research",
    isPublic: false,
  })
  const [inviteEmail, setInviteEmail] = useState("")
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const { socket, activeUsers } = useSocket()
  const { toast } = useToast()

  // Mock current user
  const currentUser: Collaborator = {
    id: "current-user",
    name: "You",
    email: "you@example.com",
    status: "online",
    role: "owner",
    joinedAt: new Date(),
    lastActive: new Date(),
  }

  useEffect(() => {
    // Initialize with sample data
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
            joinedAt: new Date(Date.now() - 86400000),
            lastActive: new Date(Date.now() - 300000),
          },
          {
            id: "user-3",
            name: "Alex Rodriguez",
            email: "alex@research.org",
            status: "away",
            role: "viewer",
            joinedAt: new Date(Date.now() - 172800000),
            lastActive: new Date(Date.now() - 3600000),
          },
        ],
        createdAt: new Date(Date.now() - 604800000),
        isPublic: false,
        category: "Research",
      },
      {
        id: "team-2",
        name: "NLP Study Group",
        description: "Natural Language Processing research and paper discussions",
        members: [
          currentUser,
          {
            id: "user-4",
            name: "Prof. Michael Kim",
            email: "mkim@tech.edu",
            status: "offline",
            role: "editor",
            joinedAt: new Date(Date.now() - 259200000),
            lastActive: new Date(Date.now() - 7200000),
          },
        ],
        createdAt: new Date(Date.now() - 432000000),
        isPublic: true,
        category: "Study Group",
      },
    ]

    setTeams(sampleTeams)
    setSelectedTeam(sampleTeams[0].id)

    // Sample messages
    const sampleMessages: Message[] = [
      {
        id: "msg-1",
        senderId: "user-2",
        senderName: "Dr. Sarah Chen",
        content: "I've uploaded the latest dataset for our transformer experiments. The results look promising!",
        timestamp: new Date(Date.now() - 3600000),
        teamId: sampleTeams[0].id,
        type: "text",
      },
      {
        id: "msg-2",
        senderId: "current-user",
        senderName: "You",
        content:
          "Great! I'll start running the baseline models this afternoon. Should we schedule a meeting to discuss the preliminary results?",
        timestamp: new Date(Date.now() - 1800000),
        teamId: sampleTeams[0].id,
        type: "text",
      },
      {
        id: "msg-3",
        senderId: "user-3",
        senderName: "Alex Rodriguez",
        content:
          "I can join the meeting. Also, I found some interesting related work that might be relevant to our approach.",
        timestamp: new Date(Date.now() - 900000),
        teamId: sampleTeams[0].id,
        type: "text",
      },
    ]

    setMessages(sampleMessages)
  }, [])

  const createTeam = () => {
    if (!newTeam.name.trim()) return

    const team: Team = {
      id: `team-${Date.now()}`,
      name: newTeam.name,
      description: newTeam.description,
      members: [currentUser],
      createdAt: new Date(),
      isPublic: newTeam.isPublic,
      category: newTeam.category,
    }

    setTeams((prev) => [team, ...prev])
    setNewTeam({ name: "", description: "", category: "Research", isPublic: false })

    if (socket) {
      socket.emit("team_created", {
        teamName: team.name,
        description: team.description,
      })
    }

    toast({
      title: "Team created",
      description: `"${team.name}" has been created successfully`,
    })
  }

  const inviteCollaborator = (teamId: string) => {
    if (!inviteEmail.trim()) return

    const team = teams.find((t) => t.id === teamId)
    if (!team) return

    // Check if user already exists
    if (team.members.some((m) => m.email === inviteEmail)) {
      toast({
        title: "User already in team",
        description: "This user is already a member of the team",
        variant: "destructive",
      })
      return
    }

    // Simulate adding collaborator
    const newCollaborator: Collaborator = {
      id: `user-${Date.now()}`,
      name: inviteEmail.split("@")[0].charAt(0).toUpperCase() + inviteEmail.split("@")[0].slice(1),
      email: inviteEmail,
      status: "offline",
      role: "viewer",
      joinedAt: new Date(),
      lastActive: new Date(),
    }

    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, members: [...t.members, newCollaborator] } : t)))

    // Add system message
    const systemMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: "system",
      senderName: "System",
      content: `${newCollaborator.name} joined the team`,
      timestamp: new Date(),
      teamId: teamId,
      type: "system",
    }

    setMessages((prev) => [...prev, systemMessage])
    setInviteEmail("")

    if (socket) {
      socket.emit("collaborator_joined", {
        name: newCollaborator.name,
        email: newCollaborator.email,
        teamId: teamId,
      })
    }

    toast({
      title: "Invitation sent",
      description: `Invitation sent to ${inviteEmail}`,
    })
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedTeam) return

    const message: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: newMessage,
      timestamp: new Date(),
      teamId: selectedTeam,
      type: "text",
    }

    setMessages((prev) => [...prev, message])
    setNewMessage("")

    if (socket) {
      socket.emit("chat_message", {
        content: message.content,
        teamId: selectedTeam,
      })
    }
  }

  const getStatusColor = (status: Collaborator["status"]) => {
    switch (status) {
      case "online":
        return "bg-black"
      case "away":
        return "bg-gray-500"
      case "offline":
        return "bg-gray-300"
    }
  }

  const getRoleIcon = (role: Collaborator["role"]) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3 w-3 text-black" />
      case "editor":
        return <Shield className="h-3 w-3 text-gray-600" />
      case "viewer":
        return <Eye className="h-3 w-3 text-gray-400" />
    }
  }

  const selectedTeamData = teams.find((t) => t.id === selectedTeam)
  const teamMessages = messages.filter((m) => m.teamId === selectedTeam)
  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const categories = Array.from(new Set(teams.map((t) => t.category)))

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-8 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-sm mb-8">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-5xl font-light text-black mb-6 tracking-tight">Research Collaboration</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed font-light">
            Connect with researchers worldwide, share ideas, and collaborate on groundbreaking projects
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-4">
          {/* Teams Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Create Team */}
            <div className="border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-black flex items-center gap-3">
                  <div className="w-1 h-6 bg-black"></div>
                  Create Team
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <Input
                  placeholder="Team name"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam((prev) => ({ ...prev, name: e.target.value }))}
                  className="border-gray-300 focus:border-black focus:ring-black font-light"
                />
                <Input
                  placeholder="Description"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam((prev) => ({ ...prev, description: e.target.value }))}
                  className="border-gray-300 focus:border-black focus:ring-black font-light"
                />
                <select
                  value={newTeam.category}
                  onChange={(e) => setNewTeam((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-black focus:ring-black font-light"
                >
                  <option value="Research">Research</option>
                  <option value="Study Group">Study Group</option>
                  <option value="Project">Project</option>
                  <option value="Discussion">Discussion</option>
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="public-team"
                    checked={newTeam.isPublic}
                    onChange={(e) => setNewTeam((prev) => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="public-team" className="text-sm text-gray-700 font-light">
                    Public team
                  </label>
                </div>
                <Button
                  onClick={createTeam}
                  disabled={!newTeam.name.trim()}
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium"
                >
                  Create Team
                </Button>
              </div>
            </div>

            {/* Search Teams */}
            <div className="border border-gray-200 p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-black focus:ring-black font-light"
                />
              </div>
            </div>

            {/* Teams List */}
            <div className="border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-black">Your Teams ({teams.length})</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {filteredTeams.map((team) => (
                    <div
                      key={team.id}
                      className={`p-4 cursor-pointer transition-all duration-200 border ${
                        selectedTeam === team.id
                          ? "bg-black text-white border-black"
                          : "hover:bg-gray-50 border-gray-100"
                      }`}
                      onClick={() => setSelectedTeam(team.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{team.name}</h4>
                          {team.isPublic && <Globe className="h-4 w-4" />}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${selectedTeam === team.id ? "border-white text-white" : ""}`}
                        >
                          {team.category}
                        </Badge>
                      </div>
                      <p
                        className={`text-sm mb-3 line-clamp-2 ${selectedTeam === team.id ? "text-gray-300" : "text-gray-600"} font-light`}
                      >
                        {team.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">{team.members.length} members</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-1">
                            {team.members.slice(0, 3).map((member) => (
                              <div key={member.id} className="relative">
                                <Avatar className="h-6 w-6 border-2 border-white">
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
                    </div>
                  ))}
                  {filteredTeams.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm font-light">{searchTerm ? "No teams found" : "No teams yet"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {selectedTeamData ? (
              <>
                {/* Team Header */}
                <div className="border border-gray-200">
                  <div className="p-8 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 bg-black text-white">
                            <Users className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h2 className="text-2xl font-light text-black">{selectedTeamData.name}</h2>
                              {selectedTeamData.isPublic && <Globe className="h-5 w-5 text-gray-600" />}
                              <Badge variant="outline" className="text-xs">
                                {selectedTeamData.category}
                              </Badge>
                            </div>
                            <p className="text-gray-600 font-light">{selectedTeamData.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-gray-300 hover:bg-gray-50">
                          <Video className="h-4 w-4 mr-2" />
                          Video Call
                        </Button>
                        <Button variant="outline" size="sm" className="border-gray-300 hover:bg-gray-50">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-8">
                    <Tabs defaultValue="chat" className="space-y-6">
                      <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
                        <TabsTrigger
                          value="chat"
                          className="data-[state=active]:bg-white data-[state=active]:text-black font-medium"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Chat
                        </TabsTrigger>
                        <TabsTrigger
                          value="members"
                          className="data-[state=active]:bg-white data-[state=active]:text-black font-medium"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Members ({selectedTeamData.members.length})
                        </TabsTrigger>
                        <TabsTrigger
                          value="files"
                          className="data-[state=active]:bg-white data-[state=active]:text-black font-medium"
                        >
                          <Share className="h-4 w-4 mr-2" />
                          Files
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="chat" className="space-y-6">
                        {/* Chat Messages */}
                        <div className="border border-gray-200 h-96 flex flex-col">
                          <div className="flex-1 p-6 overflow-y-auto space-y-4">
                            {teamMessages.map((message) => (
                              <div
                                key={message.id}
                                className={`flex gap-3 ${message.type === "system" ? "justify-center" : ""}`}
                              >
                                {message.type === "system" ? (
                                  <div className="text-center">
                                    <Badge variant="outline" className="text-xs">
                                      {message.content}
                                    </Badge>
                                  </div>
                                ) : (
                                  <>
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="text-xs">
                                        {message.senderName.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-black text-sm">{message.senderName}</span>
                                        <span className="text-xs text-gray-500">
                                          {message.timestamp.toLocaleTimeString()}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-700 leading-relaxed font-light">
                                        {message.content}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                            {teamMessages.length === 0 && (
                              <div className="text-center py-12 text-gray-500">
                                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                <p className="text-lg font-medium mb-2">No messages yet</p>
                                <p className="text-sm font-light">Start the conversation with your team</p>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-gray-200 p-4">
                            <div className="flex gap-2">
                              <Input
                                placeholder="Type your message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                                className="flex-1 border-gray-300 focus:border-black focus:ring-black font-light"
                              />
                              <Button
                                onClick={sendMessage}
                                disabled={!newMessage.trim()}
                                className="bg-black hover:bg-gray-800 text-white"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="members" className="space-y-6">
                        {/* Invite Member */}
                        <div className="border border-gray-200 p-6">
                          <h4 className="font-medium text-black mb-4 flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Invite New Member
                          </h4>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter email address"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              className="flex-1 border-gray-300 focus:border-black focus:ring-black font-light"
                            />
                            <Button
                              onClick={() => inviteCollaborator(selectedTeam!)}
                              disabled={!inviteEmail.trim()}
                              className="bg-black hover:bg-gray-800 text-white"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Members List */}
                        <div className="border border-gray-200">
                          <div className="p-6 border-b border-gray-200">
                            <h4 className="font-medium text-black">Team Members</h4>
                          </div>
                          <div className="p-6">
                            <div className="space-y-4">
                              {selectedTeamData.members.map((member) => (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between p-4 border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center gap-4">
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
                                        <p className="font-medium text-black">{member.name}</p>
                                        {getRoleIcon(member.role)}
                                      </div>
                                      <p className="text-sm text-gray-600 font-light">{member.email}</p>
                                      <p className="text-xs text-gray-500">
                                        Last active: {member.lastActive.toLocaleDateString()}
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
                                          ? "border-black text-black"
                                          : "border-gray-300 text-gray-600"
                                      }`}
                                    >
                                      {member.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="files" className="space-y-6">
                        <div className="border border-gray-200">
                          <div className="text-center py-20 px-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 mb-8">
                              <Share className="h-8 w-8 text-gray-600" />
                            </div>
                            <h3 className="text-xl font-medium text-black mb-4">Shared Files</h3>
                            <p className="text-gray-600 max-w-md mx-auto leading-relaxed font-light mb-8">
                              File sharing and collaborative document editing coming soon
                            </p>
                            <div className="flex justify-center gap-6">
                              <div className="text-center">
                                <div className="w-8 h-8 bg-black mb-2 mx-auto"></div>
                                <span className="text-xs text-gray-600 uppercase tracking-wide">Document Sync</span>
                              </div>
                              <div className="text-center">
                                <div className="w-8 h-8 bg-gray-300 mb-2 mx-auto"></div>
                                <span className="text-xs text-gray-600 uppercase tracking-wide">Version Control</span>
                              </div>
                              <div className="text-center">
                                <div className="w-8 h-8 bg-gray-500 mb-2 mx-auto"></div>
                                <span className="text-xs text-gray-600 uppercase tracking-wide">Real-time Edit</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </>
            ) : (
              /* Welcome State */
              <div className="border border-gray-200">
                <div className="text-center py-20 px-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 mb-8">
                    <Users className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="text-2xl font-light text-black mb-4">Select a Team</h3>
                  <p className="text-gray-600 max-w-md mx-auto leading-relaxed font-light mb-8">
                    Choose a team from the sidebar to start collaborating, or create a new team to get started
                  </p>
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-black mb-2 mx-auto"></div>
                      <span className="text-xs text-gray-600 uppercase tracking-wide">Team Chat</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-gray-300 mb-2 mx-auto"></div>
                      <span className="text-xs text-gray-600 uppercase tracking-wide">File Sharing</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-gray-500 mb-2 mx-auto"></div>
                      <span className="text-xs text-gray-600 uppercase tracking-wide">Video Calls</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Users */}
            {activeUsers && activeUsers.length > 0 && (
              <div className="border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-black">Currently Online</h3>
                  <p className="text-gray-600 text-sm mt-1">Users active on the platform</p>
                </div>
                <div className="p-6">
                  <div className="flex gap-4">
                    {activeUsers.slice(0, 8).map((user, index) => (
                      <div key={index} className="text-center">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-sm">{user.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-black rounded-full border-2 border-white" />
                        </div>
                        <p className="text-xs text-gray-600 mt-2 font-light">{user}</p>
                      </div>
                    ))}
                    {activeUsers.length > 8 && (
                      <div className="text-center">
                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm text-gray-600">+{activeUsers.length - 8}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 font-light">more</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
