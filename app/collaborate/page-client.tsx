"use client"

import { useState, useEffect } from 'react'
import { LoginForm } from './components/login'
import { TeamChat } from './components/team-chat'
import { TeamManagement, type Team as UiTeam } from './components/team-management'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { collaborateService } from '@/lib/services/collaborate.service'
import { Loader2 } from 'lucide-react'

export default function CollaborateClient() {
  const { user, isLoading: isAuthLoading } = useSupabaseAuth()
  const [teams, setTeams] = useState<UiTeam[]>([])
  const [selectedTeam, setSelectedTeam] = useState<UiTeam | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Normalize server team shape -> UI team shape
  const normalizeTeams = (serverTeams: any[]): UiTeam[] => {
    if (!Array.isArray(serverTeams)) return []
    return serverTeams.map((t) => ({
      id: t.id,
      name: t.name ?? 'Untitled',
      description: t.description ?? '',
      members: Array.isArray(t.members) ? t.members : [],
      createdAt: t.created_at ?? t.createdAt ?? new Date().toISOString(),
      isPublic: (t.isPublic ?? t.is_public) ?? false,
      category: t.category ?? 'Research',
      owner: t.owner ?? t.owner_id ?? ''
    }))
  }
  
  // Convert UI team -> TeamChat's required shape
  const toChatTeam = (t: UiTeam) => ({
    id: t.id,
    name: t.name,
    description: t.description || '',
    members: (t.members || []).map((m: any) => ({
      id: m.id,
      name: m.name || m.email || 'Member',
      email: m.email || '',
      avatar: m.avatar,
      status: m.status || 'offline',
      role: m.role || 'viewer',
      joinedAt: m.joinedAt || new Date().toISOString(),
      lastActive: m.lastActive || new Date().toISOString(),
    })),
    createdAt: t.createdAt || new Date().toISOString(),
    isPublic: Boolean(t.isPublic),
    category: t.category || 'Research',
    owner: t.owner || ''
  })
  
  // Fetch teams when user is authenticated
  useEffect(() => {
    const fetchTeams = async () => {
      if (!user) return
      
      try {
        setIsLoading(true)
        const userTeams = await collaborateService.getTeams(user.id)
        const normalized = normalizeTeams(userTeams)
        setTeams(normalized)
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
  const handleTeamSelect = (team: UiTeam) => {
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
      const normalized = normalizeTeams(userTeams)
      setTeams(normalized)
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
          <TeamChat team={toChatTeam(selectedTeam)} onClose={handleCloseChat} />
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
