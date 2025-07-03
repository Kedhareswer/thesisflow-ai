"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { 
  Settings, 
  Users, 
  Bell, 
  AlertTriangle, 
  Loader2,
  Crown,
  Shield,
  Eye,
  UserMinus,
  LogOut,
  Trash2,
  Save,
  UserPlus,
  Search,
  Mail,
  Send
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'

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

interface TeamSettingsProps {
  isOpen: boolean
  onClose: () => void
  team: Team
  currentUserRole: string
  onTeamUpdate: (team: Team) => void
  onLeaveTeam: () => void
  apiCall?: (url: string, options?: RequestInit) => Promise<any>
}

export function TeamSettings({ 
  isOpen, 
  onClose, 
  team, 
  currentUserRole,
  onTeamUpdate,
  onLeaveTeam,
  apiCall
}: TeamSettingsProps) {
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  
  // Form states
  const [teamName, setTeamName] = useState(team.name)
  const [teamDescription, setTeamDescription] = useState(team.description)
  const [teamCategory, setTeamCategory] = useState(team.category)
  const [isPublic, setIsPublic] = useState(team.isPublic)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Notification preferences
  const [notifyNewMessages, setNotifyNewMessages] = useState(true)
  const [notifyMemberJoins, setNotifyMemberJoins] = useState(true)
  const [notifyMentions, setNotifyMentions] = useState(true)
  
  // Invite member states
  const [inviteQuery, setInviteQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor' | 'admin'>('viewer')

  // Check for changes
  useEffect(() => {
    const changed = 
      teamName !== team.name ||
      teamDescription !== team.description ||
      teamCategory !== team.category ||
      isPublic !== team.isPublic
    setHasChanges(changed)
  }, [teamName, teamDescription, teamCategory, isPublic, team])

  // Permissions based on role
  const canEditTeam = currentUserRole === 'owner' || currentUserRole === 'admin'
  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin'
  const canDeleteTeam = currentUserRole === 'owner'
  const canChangeRoles = currentUserRole === 'owner'

  const getRoleIcon = (role: User["role"]) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-600" />
      case "admin":
        return <Shield className="h-4 w-4 text-blue-600" />
      case "editor":
        return <Shield className="h-4 w-4 text-green-600" />
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-600" />
      default:
        return null
    }
  }

  // Save general settings
  const handleSaveGeneral = async () => {
    if (!canEditTeam) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to edit team settings",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('teams')
        .update({
          name: teamName,
          description: teamDescription,
          category: teamCategory,
          is_public: isPublic,
          updated_at: new Date().toISOString()
        })
        .eq('id', team.id)

      if (error) throw error

      const updatedTeam = {
        ...team,
        name: teamName,
        description: teamDescription,
        category: teamCategory,
        isPublic: isPublic
      }
      
      onTeamUpdate(updatedTeam)
      
      toast({
        title: "Settings saved",
        description: "Team settings have been updated successfully"
      })
      
      setHasChanges(false)
    } catch (error) {
      console.error('Error updating team:', error)
      toast({
        title: "Error",
        description: "Failed to update team settings",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Change member role
  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!canChangeRoles) {
      toast({
        title: "Permission denied",
        description: "Only team owners can change member roles",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('team_members')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('team_id', team.id)
        .eq('user_id', memberId)

      if (error) throw error

      // Update local state
      const updatedMembers = team.members.map(member => 
        member.id === memberId ? { ...member, role: newRole as User['role'] } : member
      )
      
      onTeamUpdate({ ...team, members: updatedMembers })
      
      toast({
        title: "Role updated",
        description: "Member role has been changed successfully"
      })
    } catch (error) {
      console.error('Error changing role:', error)
      toast({
        title: "Error",
        description: "Failed to change member role",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Remove member
  const handleRemoveMember = async (memberId: string) => {
    if (!canManageMembers) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to remove members",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', memberId)

      if (error) throw error

      // Update local state
      const updatedMembers = team.members.filter(member => member.id !== memberId)
      onTeamUpdate({ ...team, members: updatedMembers })
      
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully"
      })
    } catch (error) {
      console.error('Error removing member:', error)
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Leave team
  const handleLeaveTeam = async () => {
    if (currentUserRole === 'owner' && team.members.filter(m => m.role === 'owner').length === 1) {
      toast({
        title: "Cannot leave team",
        description: "You must transfer ownership before leaving the team",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', user?.id)

      if (error) throw error

      onLeaveTeam()
      onClose()
      
      toast({
        title: "Left team",
        description: "You have successfully left the team"
      })
    } catch (error) {
      console.error('Error leaving team:', error)
      toast({
        title: "Error",
        description: "Failed to leave team",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Delete team
  const handleDeleteTeam = async () => {
    if (!canDeleteTeam) {
      toast({
        title: "Permission denied",
        description: "Only team owners can delete teams",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', team.id)

      if (error) throw error

      onLeaveTeam()
      onClose()
      
      toast({
        title: "Team deleted",
        description: "The team has been permanently deleted"
      })
    } catch (error) {
      console.error('Error deleting team:', error)
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Save notification preferences
  const handleSaveNotifications = async () => {
    try {
      setIsLoading(true)
      
      // In a real app, this would save to user preferences
      toast({
        title: "Preferences saved",
        description: "Notification preferences have been updated"
      })
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Search users by username/email
  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      
      // Search in user_profiles table
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, display_name, email, avatar_url')
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5)

      if (error) throw error

      // Filter out existing members
      const existingMemberIds = team.members.map(m => m.id)
      const filteredResults = (data || []).filter(user => !existingMemberIds.includes(user.id))
      
      setSearchResults(filteredResults)
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search input change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(inviteQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [inviteQuery])

  // Invite member
  const handleInviteMember = async (userId: string, userEmail: string, userName: string) => {
    if (!canManageMembers) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to invite members",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      
      // Add member to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          role: selectedRole,
          created_at: new Date().toISOString()
        })

      if (memberError) throw memberError

      // Send system message
      await supabase
        .from('chat_messages')
        .insert({
          team_id: team.id,
          sender_id: 'system',
          sender_name: 'System',
          content: `${userName} joined the team`,
          message_type: 'system'
        })

      // Create notification for invited user
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'team_invitation',
          title: 'Team Invitation',
          message: `You've been added to the team "${team.name}"`,
          data: { team_id: team.id, inviter_id: user?.id },
          action_url: `/collaborate?team=${team.id}`
        })

      // Update local state
      const newMember: User = {
        id: userId,
        name: userName,
        email: userEmail,
        avatar: undefined,
        status: 'offline',
        role: selectedRole,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      }
      
      onTeamUpdate({ ...team, members: [...team.members, newMember] })
      
      // Reset search
      setInviteQuery('')
      setSearchResults([])
      setSelectedRole('viewer')
      
      toast({
        title: "Member invited",
        description: `${userName} has been added to the team as ${selectedRole}`
      })
    } catch (error) {
      console.error('Error inviting member:', error)
      toast({
        title: "Error",
        description: "Failed to invite member",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Team Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Information</CardTitle>
                <CardDescription>
                  Update your team's basic information and visibility settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    disabled={!canEditTeam || isLoading}
                    placeholder="Enter team name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-description">Description</Label>
                  <Textarea
                    id="team-description"
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    disabled={!canEditTeam || isLoading}
                    placeholder="Describe your team's purpose"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-category">Category</Label>
                  <Select 
                    value={teamCategory} 
                    onValueChange={setTeamCategory}
                    disabled={!canEditTeam || isLoading}
                  >
                    <SelectTrigger id="team-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Research">Research</SelectItem>
                      <SelectItem value="Study Group">Study Group</SelectItem>
                      <SelectItem value="Project">Project</SelectItem>
                      <SelectItem value="Discussion">Discussion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="public-team">Public Team</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow anyone to discover and request to join this team
                    </p>
                  </div>
                  <Switch
                    id="public-team"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                    disabled={!canEditTeam || isLoading}
                  />
                </div>

                {canEditTeam && (
                  <Button 
                    onClick={handleSaveGeneral} 
                    disabled={!hasChanges || isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Management */}
          <TabsContent value="members" className="space-y-4 mt-6">
            {/* Invite New Members Card */}
            {canManageMembers && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Invite Members
                  </CardTitle>
                  <CardDescription>
                    Search and invite users by username or email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by username or email..."
                        value={inviteQuery}
                        onChange={(e) => setInviteQuery(e.target.value)}
                        disabled={isLoading}
                        className="pl-9"
                      />
                    </div>
                    <Select
                      value={selectedRole}
                      onValueChange={(value: any) => setSelectedRole(value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Search Results */}
                  {isSearching && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Searching users...</span>
                    </div>
                  )}

                  {!isSearching && searchResults.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Found {searchResults.length} user(s)</p>
                      <div className="space-y-2">
                        {searchResults.map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={result.avatar_url} />
                                <AvatarFallback>
                                  {result.display_name?.charAt(0) || result.email?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{result.display_name || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{result.email}</p>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleInviteMember(
                                result.id,
                                result.email,
                                result.display_name || result.email
                              )}
                              disabled={isLoading}
                              size="sm"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-1" />
                                  Invite
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isSearching && inviteQuery.length >= 2 && searchResults.length === 0 && (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No users found matching "{inviteQuery}"
                        </p>
                      </div>
                      
                      {/* Invite by email if it looks like an email */}
                      {inviteQuery.includes('@') && (
                        <Card className="border-dashed">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Mail className="h-5 w-5 text-gray-600" />
                                </div>
                                <div>
                                  <p className="font-medium">Invite by email</p>
                                  <p className="text-sm text-muted-foreground">{inviteQuery}</p>
                                </div>
                              </div>
                              <Button
                                onClick={async () => {
                                  // For now, show a message that email invites are coming soon
                                  toast({
                                    title: "Coming soon",
                                    description: "Email invitations will be available in the next update",
                                  })
                                }}
                                variant="outline"
                                size="sm"
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                Send Invite
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {inviteQuery.length > 0 && inviteQuery.length < 2 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Type at least 2 characters to search
                    </p>
                  )}

                  {/* Role descriptions */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-gray-700">Member Roles:</p>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-5">Viewer</Badge>
                        <span>Can view team content and chat</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-5">Editor</Badge>
                        <span>Can edit shared documents and resources</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-5">Admin</Badge>
                        <span>Can manage team settings and members</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Members Card */}
            <Card>
              <CardHeader>
                <CardTitle>Team Members ({team.members.length})</CardTitle>
                <CardDescription>
                  View and manage existing team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.name}</p>
                            {getRoleIcon(member.role)}
                          </div>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canChangeRoles && member.id !== user?.id && (
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleChangeRole(member.id, value)}
                            disabled={isLoading || member.role === 'owner'}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        
                        {member.id === user?.id ? (
                          <Badge variant="outline">You</Badge>
                        ) : (
                          member.role === 'owner' && (
                            <Badge variant="outline">{member.role}</Badge>
                          )
                        )}

                        {canManageMembers && member.id !== user?.id && member.role !== 'owner' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isLoading}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.name} from the team? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Preferences */}
          <TabsContent value="notifications" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified about team activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>New Messages</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when someone sends a message
                      </p>
                    </div>
                    <Switch
                      checked={notifyNewMessages}
                      onCheckedChange={setNotifyNewMessages}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Member Joins</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when new members join the team
                      </p>
                    </div>
                    <Switch
                      checked={notifyMemberJoins}
                      onCheckedChange={setNotifyMemberJoins}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Mentions</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when someone mentions you
                      </p>
                    </div>
                    <Switch
                      checked={notifyMentions}
                      onCheckedChange={setNotifyMentions}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveNotifications} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Zone */}
          <TabsContent value="danger" className="space-y-4 mt-6">
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  Leave Team
                </CardTitle>
                <CardDescription>
                  Remove yourself from this team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full border-yellow-600 text-yellow-700 hover:bg-yellow-100">
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave Team
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave team?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to leave "{team.name}"? 
                        You'll need to be invited again to rejoin.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleLeaveTeam}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        Leave Team
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {canDeleteTeam && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-5 w-5" />
                    Delete Team
                  </CardTitle>
                  <CardDescription>
                    Permanently delete this team and all its data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full border-red-600 text-red-700 hover:bg-red-100">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Team
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete team permanently?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{team.name}"? 
                          This will permanently delete the team, all messages, and remove all members. 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteTeam}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Team
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
