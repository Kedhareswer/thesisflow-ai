import { ResearchPaper, SearchFilters } from '@/lib/types/common'

// Research Session Data Types
export interface ResearchTopic {
  id: string
  name: string
  description?: string
  exploredAt: string
  insights?: string
  confidence?: number
}

export interface ResearchIdea {
  id: string
  title: string
  description: string
  topic?: string
  selected?: boolean
  savedAt: string
  source: 'generated' | 'manual'
}

export interface SearchSession {
  id: string
  query: string
  filters: SearchFilters
  resultsCount: number
  searchedAt: string
  selectedPapers: string[] // paper IDs
}

export interface ResearchSessionData {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  
  // Current research focus
  currentTopic?: string
  currentObjective?: string
  
  // Exploration data
  topics: ResearchTopic[]
  
  // Literature data
  papers: ResearchPaper[]
  searchSessions: SearchSession[]
  selectedPapers: string[]
  
  // Ideas and insights
  ideas: ResearchIdea[]
  selectedIdeas: string[]
  
  // Chat context
  chatHistory: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    contextUsed?: string[]
  }>
  
  // User preferences
  preferences: {
    autoSaveEnabled: boolean
    contextDepth: 'minimal' | 'moderate' | 'comprehensive'
    aiProvider?: string
    aiModel?: string
  }
}

export type ResearchSessionListener = (session: ResearchSessionData) => void

class ResearchSessionService {
  private static instance: ResearchSessionService
  private session: ResearchSessionData
  private listeners: Set<ResearchSessionListener> = new Set()
  private autoSaveTimer: NodeJS.Timeout | null = null
  private debouncedSaveTimer: NodeJS.Timeout | null = null
  private storageKey = 'research-session-data'

  private constructor() {
    this.session = this.createDefaultSession()
    this.loadFromStorage()
    this.setupAutoSave()
    
    // Listen for storage changes from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange.bind(this))
      window.addEventListener('beforeunload', this.saveToStorage.bind(this))
    }
  }

  static getInstance(): ResearchSessionService {
    if (!ResearchSessionService.instance) {
      ResearchSessionService.instance = new ResearchSessionService()
    }
    return ResearchSessionService.instance
  }

  // Session Management
  private createDefaultSession(): ResearchSessionData {
    const now = new Date().toISOString()
    return {
      id: `session-${Date.now()}`,
      name: 'Research Session',
      createdAt: now,
      updatedAt: now,
      topics: [],
      papers: [],
      searchSessions: [],
      selectedPapers: [],
      ideas: [],
      selectedIdeas: [],
      chatHistory: [],
      preferences: {
        autoSaveEnabled: true,
        contextDepth: 'moderate'
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        const parsedSession = JSON.parse(saved)
        // Validate and merge with default session
        this.session = { ...this.createDefaultSession(), ...parsedSession }
        this.notifyListeners()
      }
    } catch (error) {
      console.warn('Failed to load research session from storage:', error)
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      this.session.updatedAt = new Date().toISOString()
      localStorage.setItem(this.storageKey, JSON.stringify(this.session))
    } catch (error) {
      console.warn('Failed to save research session to storage:', error)
    }
  }

  private setupAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
    }
    
    // Auto-save every 30 seconds
    this.autoSaveTimer = setInterval(() => {
      if (this.session.preferences.autoSaveEnabled) {
        this.saveToStorage()
      }
    }, 30000)
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === this.storageKey && event.newValue) {
      try {
        const updatedSession = JSON.parse(event.newValue)
        this.session = updatedSession
        this.notifyListeners()
      } catch (error) {
        console.warn('Failed to sync research session from other tab:', error)
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.session)
      } catch (error) {
        console.warn('Error in research session listener:', error)
      }
    })
  }

  private updateSession(updates: Partial<ResearchSessionData>): void {
    const oldSession = this.session
    this.session = { ...this.session, ...updates, updatedAt: new Date().toISOString() }
    
    // Only notify if data actually changed (excluding updatedAt field)
    const { updatedAt: oldUpdatedAt, ...oldData } = oldSession
    const { updatedAt: newUpdatedAt, ...newData } = this.session
    
    if (JSON.stringify(oldData) !== JSON.stringify(newData)) {
      this.notifyListeners()
      
      if (this.session.preferences.autoSaveEnabled) {
        // Debounced save
        if (this.debouncedSaveTimer) {
          clearTimeout(this.debouncedSaveTimer)
        }
        this.debouncedSaveTimer = setTimeout(() => this.saveToStorage(), 1000)
      }
    }
  }

  // Public API
  getSession(): ResearchSessionData {
    return { ...this.session }
  }

  subscribe(listener: ResearchSessionListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Topic Management
  addTopic(topic: Omit<ResearchTopic, 'id' | 'exploredAt'>): void {
    const newTopic: ResearchTopic = {
      ...topic,
      id: `topic-${Date.now()}`,
      exploredAt: new Date().toISOString()
    }
    
    this.updateSession({
      topics: [...this.session.topics, newTopic],
      currentTopic: topic.name
    })
  }

  updateTopic(topicId: string, updates: Partial<ResearchTopic>): void {
    const topics = this.session.topics.map(topic =>
      topic.id === topicId ? { ...topic, ...updates } : topic
    )
    this.updateSession({ topics })
  }

  // Literature Management
  addPapers(papers: ResearchPaper[], searchQuery?: string, filters?: SearchFilters): void {
    // Avoid duplicates
    const existingIds = new Set(this.session.papers.map(p => p.id))
    const newPapers = papers.filter(paper => !existingIds.has(paper.id))
    
    const searchSession: SearchSession | undefined = searchQuery ? {
      id: `search-${Date.now()}`,
      query: searchQuery,
      filters: filters || {},
      resultsCount: papers.length,
      searchedAt: new Date().toISOString(),
      selectedPapers: []
    } : undefined

    this.updateSession({
      papers: [...this.session.papers, ...newPapers],
      searchSessions: searchSession 
        ? [...this.session.searchSessions, searchSession] 
        : this.session.searchSessions
    })
  }

  selectPaper(paperId: string, selected: boolean): void {
    const selectedPapers = new Set(this.session.selectedPapers)
    if (selected) {
      selectedPapers.add(paperId)
    } else {
      selectedPapers.delete(paperId)
    }
    
    this.updateSession({ selectedPapers: Array.from(selectedPapers) })
  }

  getSelectedPapers(): ResearchPaper[] {
    return this.session.papers.filter(paper => 
      this.session.selectedPapers.includes(paper.id)
    )
  }

  // Ideas Management
  addIdeas(ideas: Omit<ResearchIdea, 'id' | 'savedAt'>[]): void {
    const newIdeas: ResearchIdea[] = ideas.map(idea => ({
      ...idea,
      id: `idea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      savedAt: new Date().toISOString()
    }))
    
    this.updateSession({ ideas: [...this.session.ideas, ...newIdeas] })
  }

  selectIdea(ideaId: string, selected: boolean): void {
    const selectedIdeas = new Set(this.session.selectedIdeas)
    if (selected) {
      selectedIdeas.add(ideaId)
    } else {
      selectedIdeas.delete(ideaId)
    }
    
    this.updateSession({ selectedIdeas: Array.from(selectedIdeas) })
  }

  getSelectedIdeas(): ResearchIdea[] {
    return this.session.ideas.filter(idea => 
      this.session.selectedIdeas.includes(idea.id)
    )
  }

  // Chat Management
  addChatMessage(role: 'user' | 'assistant', content: string, contextUsed?: string[]): void {
    const message = {
      role,
      content,
      timestamp: new Date().toISOString(),
      contextUsed
    }
    
    this.updateSession({
      chatHistory: [...this.session.chatHistory, message]
    })
  }

  clearChatHistory(): void {
    this.updateSession({ chatHistory: [] })
  }

  /**
   * Replace the entire chat history. Useful for reverting to a previous point.
   */
  setChatHistory(chatHistory: ResearchSessionData['chatHistory']): void {
    this.updateSession({ chatHistory })
  }

  // Context Building
  buildResearchContext(): string {
    const context: string[] = []
    
    // Current focus
    if (this.session.currentTopic) {
      context.push(`TOPIC: ${this.session.currentTopic}`)
    }
    if (this.session.currentObjective) {
      context.push(`OBJECTIVE: ${this.session.currentObjective}`)
    }

    // Recent topics (max 3)
    const recentTopics = this.session.topics
      .sort((a, b) => new Date(b.exploredAt).getTime() - new Date(a.exploredAt).getTime())
      .slice(0, 3)
    
    if (recentTopics.length > 0) {
      context.push(`\nTOPICS EXPLORED:`)
      recentTopics.forEach((topic, i) => {
        context.push(`${i + 1}. ${topic.name}${topic.insights ? ` | ${topic.insights.substring(0, 100)}...` : ''}`)
      })
    }

    // Selected papers (max 3)
    const selectedPapers = this.getSelectedPapers().slice(0, 3)
    if (selectedPapers.length > 0) {
      context.push(`\nKEY PAPERS:`)
      selectedPapers.forEach((paper, i) => {
        context.push(`${i + 1}. ${paper.title} (${paper.year || 'N/A'})${paper.abstract ? ` | ${paper.abstract.substring(0, 120)}...` : ''}`)
      })
    }

    // Selected ideas (max 3)
    const selectedIdeas = this.getSelectedIdeas().slice(0, 3)
    if (selectedIdeas.length > 0) {
      context.push(`\nRESEARCH IDEAS:`)
      selectedIdeas.forEach((idea, i) => {
        context.push(`${i + 1}. ${idea.title} | ${idea.description.substring(0, 100)}...`)
      })
    }

    // Recent searches (max 2)
    const recentSearches = this.session.searchSessions
      .sort((a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime())
      .slice(0, 2)
    
    if (recentSearches.length > 0) {
      context.push(`\nRECENT SEARCHES: ${recentSearches.map(s => `"${s.query}" (${s.resultsCount})`).join(', ')}`)
    }

    return context.join('\n')
  }

  // Session Management
  createNewSession(name?: string): void {
    this.session = this.createDefaultSession()
    if (name) {
      this.session.name = name
    }
    this.saveToStorage()
    this.notifyListeners()
  }

  updateSessionMeta(updates: { name?: string, currentTopic?: string, currentObjective?: string }): void {
    this.updateSession(updates)
  }

  exportSession(): string {
    return JSON.stringify(this.session, null, 2)
  }

  importSession(sessionData: string): boolean {
    try {
      const imported = JSON.parse(sessionData)
      this.session = { ...this.createDefaultSession(), ...imported }
      this.saveToStorage()
      this.notifyListeners()
      return true
    } catch (error) {
      console.error('Failed to import session:', error)
      return false
    }
  }

  clearSession(): void {
    this.session = this.createDefaultSession()
    this.saveToStorage()
    this.notifyListeners()
  }

  // Cleanup
  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
    }
    
    if (this.debouncedSaveTimer) {
      clearTimeout(this.debouncedSaveTimer)
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageChange.bind(this))
      window.removeEventListener('beforeunload', this.saveToStorage.bind(this))
    }
    
    this.listeners.clear()
  }
}

export const researchSessionService = ResearchSessionService.getInstance()
