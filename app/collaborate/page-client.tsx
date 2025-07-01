"use client"

import { useState, useEffect } from 'react'
import { LoginForm } from './components/login'
import { TeamManagement } from './components/team-management'
import { TeamChat } from './components/team-chat'
import { useAuth } from '@/lib/contexts/auth-context'
import { collaborateService } from '@/lib/services/collaborate.service'
import { Team } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function CollaborateClient() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Fetch teams when user is authenticated
  useEffect(() => {
    const fetchTeams = async () => {
      if (!user) return
      
      try {
        setIsLoading(true)
        const userTeams = await collaborateService.getTeams(user.id)
        setTeams(userTeams)
      } catch (error) {
        console.error('Error fetching teams:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      fetchTeams()
    } else {
      setIsLoading(false)
    }
  }, [user])
  
  // Handle team selection
  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team)
  }
  
  // Handle closing team chat
  const handleCloseChat = () => {
    setSelectedTeam(null)
  }
  
  // Handle teams update (refresh)
  const handleTeamsUpdate = async () => {
    if (!user) return
    
    try {
      const userTeams = await collaborateService.getTeams(user.id)
      setTeams(userTeams)
    } catch (error) {
      console.error('Error refreshing teams:', error)
    }
  }
  
  // Show loading state
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }
  
  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="container max-w-screen-lg mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <h1 className="text-2xl font-bold mb-8">Collaborate</h1>
          <LoginForm />
        </div>
      </div>
    )
  }
  
  return (
    <div className="container max-w-screen-lg mx-auto py-8 px-4">
      {selectedTeam ? (
        <div className="bg-white dark:bg-gray-950 border rounded-lg shadow-sm h-[80vh]">
          <TeamChat team={selectedTeam} onClose={handleCloseChat} />
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold mb-8">Collaborate</h1>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <TeamManagement
              teams={teams}
              onTeamSelect={handleTeamSelect}
              onTeamsUpdate={handleTeamsUpdate}
            />
          )}
        </div>
      )}
    </div>
  )
}
