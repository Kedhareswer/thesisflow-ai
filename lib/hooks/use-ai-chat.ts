"use client"

import { useState, useCallback } from "react"
import { ChatSession, ChatMessage, DeepResearchProgress } from "@/lib/types/ai-chat"
import { v4 as uuidv4 } from "uuid"

export function useAIChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<DeepResearchProgress | null>(null)

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
    
    // Add initial user message
    addMessage(sessionId, {
      role: 'user',
      content: query
    })

    // Simulate research phases
    const phases: DeepResearchProgress[] = [
      {
        phase: 'searching',
        message: 'Searching academic databases...',
        progress: 20,
        sources: [
          { name: 'arXiv', count: 245 },
          { name: 'PubMed', count: 312 },
          { name: 'Google Scholar', count: 162 }
        ]
      },
      {
        phase: 'analyzing',
        message: 'Analyzing paper quality and relevance...',
        progress: 60
      },
      {
        phase: 'synthesizing',
        message: 'Synthesizing findings and generating insights...',
        progress: 90
      },
      {
        phase: 'completed',
        message: 'Analysis complete! Generated comprehensive review.',
        progress: 100
      }
    ]

    for (let i = 0; i < phases.length; i++) {
      setProgress(phases[i])
      
      // Add system message for each phase
      addMessage(sessionId, {
        role: 'system',
        content: phases[i].message,
        metadata: {
          progress: phases[i].progress,
          sources: phases[i].sources?.map(s => s.name)
        }
      })

      // Wait between phases
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Add final AI response
    addMessage(sessionId, {
      role: 'assistant',
      content: `# Research Summary

I've completed a comprehensive analysis of your query: "${query}"

## Key Findings:
- Found and analyzed 719 relevant papers across major databases
- Identified 4 main research themes
- Generated actionable insights and recommendations

## Sources Analyzed:
- **arXiv**: 245 papers
- **PubMed**: 312 papers  
- **Google Scholar**: 162 papers

## Next Steps:
Would you like me to:
1. Generate a detailed report
2. Create visualizations of the data
3. Export findings to a specific format
4. Explore a particular aspect in more depth

The analysis is now ready for your review!`,
      metadata: {
        sources: ['arXiv', 'PubMed', 'Google Scholar'],
        taskType: 'deep-research'
      }
    })

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
