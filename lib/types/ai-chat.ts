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
    totalPapers?: number
    keyFindings?: string[]
    comprehensiveReport?: string
    executiveSummary?: string
    tables?: Array<{
      headers: string[]
      rows: string[][]
    }>
    charts?: Array<{
      type: 'bar' | 'line' | 'pie'
      title: string
      labels: string[]
      datasets: Array<{
        label: string
        data: number[]
        backgroundColor?: string | string[]
        borderColor?: string
        borderWidth?: number
      }>
    }>
    highlights?: Array<{
      type: 'info' | 'warning' | 'success' | 'error'
      title: string
      content: string
    }>
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
