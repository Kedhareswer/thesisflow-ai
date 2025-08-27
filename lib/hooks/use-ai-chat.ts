"use client"

import { useState, useCallback, useEffect } from "react"
import { ChatSession, ChatMessage, DeepResearchProgress } from "@/lib/types/ai-chat"
import { v4 as uuidv4 } from "uuid"
import { AIResearchService } from "@/lib/services/ai-research.service"

export function useAIChat() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    // Load sessions from localStorage on initialization
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ai-chat-sessions')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          // Convert date strings back to Date objects
          return parsed.map((session: any) => ({
            ...session,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
            messages: session.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }))
        } catch (e) {
          console.error('Failed to parse stored sessions:', e)
        }
      }
    }
    return []
  })
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<DeepResearchProgress | null>(null)

  // Save sessions to localStorage whenever sessions change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-chat-sessions', JSON.stringify(sessions))
    }
  }, [sessions])

  const createSession = useCallback((taskConfig: ChatSession['taskConfig']) => {
    const sessionId = uuidv4()
    const newSession: ChatSession = {
      id: sessionId,
      title: taskConfig.query.length > 50 ? taskConfig.query.substring(0, 50) + "..." : taskConfig.query,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      taskConfig
    }

    setSessions(prev => [newSession, ...prev])
    setCurrentSession(newSession)
    return sessionId
  }, [])

  const addMessage = useCallback((sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date()
    }

    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, messages: [...session.messages, newMessage], updatedAt: new Date() }
        : session
    ))

    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMessage],
        updatedAt: new Date()
      } : null)
    }

    return newMessage.id
  }, [currentSession])

  const simulateDeepResearch = useCallback(async (sessionId: string, query: string) => {
    setIsLoading(true)
    const researchService = new AIResearchService()
    
    // Add initial user message
    addMessage(sessionId, {
      role: 'user',
      content: query
    })

    try {
      // Conduct real research with progress updates
      const result = await researchService.conductResearch(query, (progress) => {
        setProgress({
          phase: progress.phase as any,
          message: progress.message,
          progress: progress.progress,
          sources: progress.sources
        })
        
        // Add system message for each phase
        addMessage(sessionId, {
          role: 'system',
          content: progress.message,
          metadata: {
            progress: progress.progress,
            sources: progress.sources?.map(s => s.name)
          }
        })
      })

      // Add comprehensive AI response with real research results
      addMessage(sessionId, {
        role: 'assistant',
        content: result.summary,
        metadata: {
          sources: result.sources.map(s => s.name),
          taskType: 'deep-research',
          totalPapers: result.totalPapers,
          keyFindings: result.keyFindings
        }
      })

    } catch (error) {
      console.error('Research failed:', error)
      
      // Add error message
      addMessage(sessionId, {
        role: 'assistant',
        content: `I encountered an issue while conducting the research: ${error instanceof Error ? error.message : 'Unknown error'}

I'll try alternative approaches to get you the information you need. Would you like me to:

1. **Try a simpler search** with different terms
2. **Focus on specific databases** (arXiv, PubMed, etc.)
3. **Break down your query** into smaller research questions
4. **Use cached results** from previous similar searches

Please let me know how you'd like to proceed, or rephrase your research question.`,
        metadata: {
          sources: [],
          taskType: 'error-recovery'
        }
      })
    }

    setIsLoading(false)
    setProgress(null)
  }, [addMessage])

  const getSession = useCallback((sessionId: string) => {
    return sessions.find(s => s.id === sessionId) || null
  }, [sessions])

  const loadSession = useCallback((sessionId: string) => {
    const session = getSession(sessionId)
    setCurrentSession(session)
    return session
  }, [getSession])

  return {
    sessions,
    currentSession,
    isLoading,
    progress,
    createSession,
    addMessage,
    simulateDeepResearch,
    getSession,
    loadSession
  }
}
