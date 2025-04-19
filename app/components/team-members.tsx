"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TeamMember, getTeamMembers, inviteTeamMember } from '../../lib/team-service'
import { useToast } from "@/hooks/use-toast"
import { UserPlus, MoreVertical, Mail } from "lucide-react"

export function TeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      const teamMembers = await getTeamMembers()
      setMembers(teamMembers)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    try {
      await inviteTeamMember(inviteEmail, 'editor')
      setInviteEmail('')
      loadMembers()
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      })
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Research Team</h2>
      </div>

      <form onSubmit={handleInvite} className="flex gap-2">
        <Input
          type="email"
          placeholder="Invite by email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite
        </Button>
      </form>

      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={member.avatar_url} />
                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-gray-500">{member.role}</p>
              </div>
            </div>
            {member.status === 'invited' && (
              <div className="flex items-center text-sm text-gray-500">
                <Mail className="h-4 w-4 mr-1" />
                Invitation sent
              </div>
            )}
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  )
} 