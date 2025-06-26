"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Plus, Users } from "lucide-react"
import { useAuth } from '@/lib/contexts/auth-context'
import { collaborateService } from '@/lib/services/collaborate.service'
import { Team } from '@/lib/supabase'

interface TeamManagementProps {
  teams: Team[]
  onTeamSelect: (team: Team) => void
  onTeamsUpdate: () => void
}

export function TeamManagement({ teams, onTeamSelect, onTeamsUpdate }: TeamManagementProps) {
  const { user } = useAuth()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Handle team creation
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !newTeamName.trim()) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      await collaborateService.createTeam(newTeamName)
      
      // Reset form and close dialog
      setNewTeamName('')
      setIsCreateDialogOpen(false)
      
      // Refresh teams list
      onTeamsUpdate()
    } catch (error) {
      console.error('Error creating team:', error)
      setError('Failed to create team')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle member invitation
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !selectedTeam || !inviteEmail.trim()) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      await collaborateService.addTeamMember(selectedTeam.id, inviteEmail)
      
      // Reset form and close dialog
      setInviteEmail('')
      setIsInviteDialogOpen(false)
      setSelectedTeam(null)
      
      // Refresh teams list
      onTeamsUpdate()
    } catch (error) {
      console.error('Error inviting member:', error)
      setError('Failed to invite member')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Open invite dialog for a team
  const openInviteDialog = (team: Team) => {
    setSelectedTeam(team)
    setIsInviteDialogOpen(true)
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Teams</h2>
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
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                disabled={isLoading}
              />
              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading || !newTeamName.trim()}>
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
            <p className="text-gray-500 text-center">
              You don't have any teams yet. Create your first team to start collaborating.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <Card key={team.id} className="overflow-hidden">
              <CardHeader className="p-4">
                <CardTitle className="text-base">{team.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-gray-500 mb-4">
                  {team.members?.length || 0} members
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => onTeamSelect(team)}
                  >
                    Open Chat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openInviteDialog(team)}
                  >
                    Invite
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || !inviteEmail.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting...
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
