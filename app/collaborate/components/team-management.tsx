"use client"

import { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Plus, Users, Crown, Shield, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from "@/hooks/use-toast"
import { AvatarGroup } from '@/components/animate-ui/components/avatar-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/animate-ui/base/toggle-group'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/animate-ui/base/tooltip'
import { IconButton } from '@/components/animate-ui/buttons/icon'

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

export interface Team {
  id: string
  name: string
  description?: string
  members?: User[]
  createdAt?: string
  isPublic?: boolean
  category?: string
  owner?: string
}

interface TeamManagementProps {
  teams: Team[]
  onTeamSelect: (team: Team) => void
  onTeamsUpdate: () => void
}

export function TeamManagement({ teams, onTeamSelect, onTeamsUpdate }: TeamManagementProps) {
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    category: 'Research',
    isPublic: false
  })
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
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
  
  // Handle team creation
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !newTeam.name.trim()) {
      setError('Team name is required')
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
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
        // Reset form and close dialog
        setNewTeam({ name: '', description: '', category: 'Research', isPublic: false })
        setIsCreateDialogOpen(false)
        
        toast({
          title: "Team created",
          description: `"${newTeam.name}" has been created successfully!`,
        })
        
        // Refresh teams list
        onTeamsUpdate()
      }
    } catch (error) {
      console.error('Error creating team:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create team'
      setError(errorMessage)
      toast({
        title: "Creation failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle member invitation
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !selectedTeam || !inviteEmail.trim()) {
      setError('Email address is required')
      return
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      setError('Please enter a valid email address')
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      const data = await apiCall('/api/collaborate/invitations', {
        method: 'POST',
        body: JSON.stringify({
          teamId: selectedTeam.id,
          inviteeEmail: inviteEmail.trim(),
          role: inviteRole,
          personalMessage: `Join our team "${selectedTeam.name}" to collaborate!`,
        }),
      })
      
      if (data.success) {
        // Reset form and close dialog
        setInviteEmail('')
        setInviteRole('viewer')
        setIsInviteDialogOpen(false)
        setSelectedTeam(null)
        
        toast({
          title: "Invitation sent",
          description: `Invitation sent to ${inviteEmail}`,
        })
        
        // Refresh teams list
        onTeamsUpdate()
      }
    } catch (error) {
      console.error('Error inviting member:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to invite member'
      setError(errorMessage)
      toast({
        title: "Invitation failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Open invite dialog for a team
  const openInviteDialog = (team: Team) => {
    setSelectedTeam(team)
    setError(null)
    setIsInviteDialogOpen(true)
  }
  
  // Get role icon
  const getRoleIcon = (role: string) => {
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
  
  // Get user role in team
  const getUserRole = (team: Team): string => {
    const member = (team.members ?? []).find(m => m.id === user?.id)
    return member?.role || 'viewer'
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Teams</h2>
          <p className="text-sm text-gray-600">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTeam} className="space-y-4 mt-4">
              <Input
                placeholder="Team Name"
                value={newTeam.name}
                onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                disabled={isLoading}
              />
              <Input
                placeholder="Description (optional)"
                value={newTeam.description}
                onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                disabled={isLoading}
              />
              <select
                value={newTeam.category}
                onChange={(e) => setNewTeam(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="Research">Research</option>
                <option value="Study Group">Study Group</option>
                <option value="Project">Project</option>
                <option value="Discussion">Discussion</option>
              </select>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="public-team-dialog"
                  checked={newTeam.isPublic}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded"
                  disabled={isLoading}
                />
                <label htmlFor="public-team-dialog" className="text-sm text-gray-700">
                  Public team (anyone can join)
                </label>
              </div>
              {error && (
                <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading || !newTeam.name.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Team'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {teams.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Users className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-gray-500 text-center mb-4">
              You don't have any teams yet. Create your first team to start collaborating.
            </p>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => {
            const userRole = getUserRole(team)
            const canInvite = ['owner', 'admin'].includes(userRole)
            
            return (
              <Card key={team.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base">{team.name}</CardTitle>
                        {getRoleIcon(userRole)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {team.category}
                        </Badge>
                        {team.isPublic && (
                          <Badge variant="secondary" className="text-xs">
                            Public
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {team.description || 'No description provided'}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <AvatarGroup>
                      {(team.members ?? []).slice(0, 5).map(m => (
                        <img key={m.id} src={m.avatar} alt={m.name} />
                      ))}
                    </AvatarGroup>
                    <Badge variant="outline" className="text-xs capitalize animate-pulse">
                      {userRole}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {(team.members ?? []).map(member => {
                      const canChangeRole = (userRole === 'owner' && member.role !== 'owner' && member.id !== user?.id) ||
                        (userRole === 'admin' && member.role !== 'owner' && member.role !== 'admin' && member.id !== user?.id)
                      return (
                        <div key={member.id} className="flex items-center gap-2">
                          <img src={member.avatar} alt={member.name} className="rounded-full w-8 h-8 object-cover" />
                          <span className="truncate text-sm font-medium">{member.name}</span>
                          <ToggleGroup toggleMultiple={false} value={[member.role]} disabled={!canChangeRole} onValueChange={role => {/* call API to update role */}}>
                            <Tooltip>
                              <TooltipTrigger>
                                <ToggleGroupItem value="viewer">👁️</ToggleGroupItem>
                              </TooltipTrigger>
                              <TooltipContent>Viewer - Can view and comment</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger>
                                <ToggleGroupItem value="editor">✏️</ToggleGroupItem>
                              </TooltipTrigger>
                              <TooltipContent>Editor - Can edit and create content</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger>
                                <ToggleGroupItem value="admin">🛡️</ToggleGroupItem>
                              </TooltipTrigger>
                              <TooltipContent>Admin - Can manage team and members</TooltipContent>
                            </Tooltip>
                          </ToggleGroup>
                          {!canChangeRole && (
                            <Tooltip>
                              <TooltipTrigger>
                                <IconButton icon={Shield} size="sm" />
                              </TooltipTrigger>
                              <TooltipContent>
                                {member.role === 'owner' ? 'Owner role cannot be changed' : member.id === user?.id ? 'You cannot change your own role' : 'Insufficient permissions'}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => onTeamSelect(team)}
                    >
                      Open Team
                    </Button>
                    {canInvite && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInviteDialog(team)}
                      >
                        Invite
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      
      {/* Invite Member Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Invite Member to {selectedTeam?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteMember} className="space-y-4 mt-4">
            <Input
              type="email"
              placeholder="Email Address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={isLoading}
            />
            <div>
              <label className="text-sm font-medium mb-2 block">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor' | 'admin')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="viewer">Viewer - Can view and comment</option>
                <option value="editor">Editor - Can edit and create content</option>
                <option value="admin">Admin - Can manage team and members</option>
              </select>
            </div>
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || !inviteEmail.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
