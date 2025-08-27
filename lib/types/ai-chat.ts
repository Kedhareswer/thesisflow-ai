export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    sources?: string[]
    citations?: string[]
    taskType?: string
    progress?: number
  }
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'completed' | 'error'
  taskConfig: {
    want: string
    use: string[]
    make: string[]
    query: string
  }
}

export interface DeepResearchProgress {
  phase: 'searching' | 'analyzing' | 'synthesizing' | 'completed'
  message: string
  progress: number
  sources?: {
    name: string
    count: number
  }[]
}
