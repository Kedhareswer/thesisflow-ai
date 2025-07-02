"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react'
import { 
  researchSessionService, 
  ResearchSessionData, 
  ResearchTopic, 
  ResearchIdea,
  SearchSession
} from '@/lib/services/research-session.service'
import { ResearchPaper, SearchFilters } from '@/lib/types/common'

interface ResearchSessionContextType {
  // Session data
  session: ResearchSessionData
  
  // Session management
  createNewSession: (name?: string) => void
  updateSessionMeta: (updates: { name?: string, currentTopic?: string, currentObjective?: string }) => void
  clearSession: () => void
  exportSession: () => string
  importSession: (data: string) => boolean
  
  // Topic management
  addTopic: (topic: Omit<ResearchTopic, 'id' | 'exploredAt'>) => void
  updateTopic: (topicId: string, updates: Partial<ResearchTopic>) => void
  
  // Literature management
  addPapers: (papers: ResearchPaper[], searchQuery?: string, filters?: SearchFilters) => void
  selectPaper: (paperId: string, selected: boolean) => void
  getSelectedPapers: () => ResearchPaper[]
  
  // Ideas management
  addIdeas: (ideas: Omit<ResearchIdea, 'id' | 'savedAt'>[]) => void
  selectIdea: (ideaId: string, selected: boolean) => void
  getSelectedIdeas: () => ResearchIdea[]
  
  // Chat management
  addChatMessage: (role: 'user' | 'assistant', content: string, contextUsed?: string[]) => void
  clearChatHistory: () => void
  
  // Context building
  buildResearchContext: () => string
  
  // Convenience getters
  hasContext: boolean
  contextSummary: string
}

const ResearchSessionContext = createContext<ResearchSessionContextType | null>(null)

interface ResearchSessionProviderProps {
  children: ReactNode
}

export function ResearchSessionProvider({ children }: ResearchSessionProviderProps) {
  const [session, setSession] = useState<ResearchSessionData>(researchSessionService.getSession())

  useEffect(() => {
    // Subscribe to session updates
    const unsubscribe = researchSessionService.subscribe((updatedSession) => {
      setSession(updatedSession)
    })

    return unsubscribe
  }, [])

  // Compute derived values
  const hasContext = session.topics.length > 0 || 
                    session.selectedPapers.length > 0 || 
                    session.selectedIdeas.length > 0 ||
                    session.searchSessions.length > 0

  const contextSummary = useMemo(() => {
    const parts: string[] = []
    
    if (session.currentTopic) {
      parts.push(`Topic: ${session.currentTopic}`)
    }
    
    if (session.selectedPapers.length > 0) {
      parts.push(`${session.selectedPapers.length} papers`)
    }
    
    if (session.selectedIdeas.length > 0) {
      parts.push(`${session.selectedIdeas.length} ideas`)
    }
    
    if (session.searchSessions.length > 0) {
      parts.push(`${session.searchSessions.length} searches`)
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'No research context yet'
  }, [session.currentTopic, session.selectedPapers.length, session.selectedIdeas.length, session.searchSessions.length])

  // Memoize the bound functions to prevent recreation on every render
  const stableActions = useMemo(() => ({
    createNewSession: researchSessionService.createNewSession.bind(researchSessionService),
    updateSessionMeta: researchSessionService.updateSessionMeta.bind(researchSessionService),
    clearSession: researchSessionService.clearSession.bind(researchSessionService),
    exportSession: researchSessionService.exportSession.bind(researchSessionService),
    importSession: researchSessionService.importSession.bind(researchSessionService),
    addTopic: researchSessionService.addTopic.bind(researchSessionService),
    updateTopic: researchSessionService.updateTopic.bind(researchSessionService),
    addPapers: researchSessionService.addPapers.bind(researchSessionService),
    selectPaper: researchSessionService.selectPaper.bind(researchSessionService),
    getSelectedPapers: researchSessionService.getSelectedPapers.bind(researchSessionService),
    addIdeas: researchSessionService.addIdeas.bind(researchSessionService),
    selectIdea: researchSessionService.selectIdea.bind(researchSessionService),
    getSelectedIdeas: researchSessionService.getSelectedIdeas.bind(researchSessionService),
    addChatMessage: researchSessionService.addChatMessage.bind(researchSessionService),
    clearChatHistory: researchSessionService.clearChatHistory.bind(researchSessionService),
    buildResearchContext: researchSessionService.buildResearchContext.bind(researchSessionService),
  }), [])

  const contextValue: ResearchSessionContextType = useMemo(() => ({
    session,
    ...stableActions,
    hasContext,
    contextSummary
  }), [session, stableActions, hasContext, contextSummary])

  return (
    <ResearchSessionContext.Provider value={contextValue}>
      {children}
    </ResearchSessionContext.Provider>
  )
}

// Custom hook to use the research session context
export function useResearchSession(): ResearchSessionContextType {
  const context = useContext(ResearchSessionContext)
  if (!context) {
    throw new Error('useResearchSession must be used within a ResearchSessionProvider')
  }
  return context
}

// Convenience hooks for specific functionality
export function useResearchContext(): {
  hasContext: boolean
  contextSummary: string
  buildContext: () => string
  currentTopic?: string
} {
  const { hasContext, contextSummary, buildResearchContext, session } = useResearchSession()
  
  return useMemo(() => ({
    hasContext,
    contextSummary,
    buildContext: buildResearchContext,
    currentTopic: session.currentTopic
  }), [hasContext, contextSummary, buildResearchContext, session.currentTopic])
}

export function useResearchPapers(): {
  papers: ResearchPaper[]
  selectedPapers: ResearchPaper[]
  selectPaper: (paperId: string, selected: boolean) => void
  addPapers: (papers: ResearchPaper[], searchQuery?: string, filters?: SearchFilters) => void
} {
  const { session, selectPaper, addPapers } = useResearchSession()
  
  const selectedPapers = useMemo(() => {
    return session.papers.filter(paper => 
      session.selectedPapers.includes(paper.id)
    )
  }, [session.papers, session.selectedPapers])
  
  return useMemo(() => ({
    papers: session.papers,
    selectedPapers,
    selectPaper,
    addPapers
  }), [session.papers, selectedPapers, selectPaper, addPapers])
}

export function useResearchIdeas(): {
  ideas: ResearchIdea[]
  selectedIdeas: ResearchIdea[]
  selectIdea: (ideaId: string, selected: boolean) => void
  addIdeas: (ideas: Omit<ResearchIdea, 'id' | 'savedAt'>[]) => void
} {
  const { session, selectIdea, addIdeas } = useResearchSession()
  
  const selectedIdeas = useMemo(() => {
    return session.ideas.filter(idea => 
      session.selectedIdeas.includes(idea.id)
    )
  }, [session.ideas, session.selectedIdeas])
  
  return useMemo(() => ({
    ideas: session.ideas,
    selectedIdeas,
    selectIdea,
    addIdeas
  }), [session.ideas, selectedIdeas, selectIdea, addIdeas])
}

export function useResearchTopics(): {
  topics: ResearchTopic[]
  currentTopic?: string
  addTopic: (topic: Omit<ResearchTopic, 'id' | 'exploredAt'>) => void
  updateTopic: (topicId: string, updates: Partial<ResearchTopic>) => void
} {
  const { session, addTopic, updateTopic } = useResearchSession()
  
  return useMemo(() => ({
    topics: session.topics,
    currentTopic: session.currentTopic,
    addTopic,
    updateTopic
  }), [session.topics, session.currentTopic, addTopic, updateTopic])
}
