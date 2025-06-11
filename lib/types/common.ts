// Common types used across the application
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface User extends BaseEntity {
  email: string
  name: string
  avatar?: string
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

export interface PaginationParams {
  page: number
  limit: number
  total?: number
}

export interface SearchParams {
  query: string
  filters?: Record<string, any>
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

// Research-specific types
export interface ResearchPaper extends BaseEntity {
  title: string
  authors: string[]
  abstract: string
  year: number
  url: string
  citations?: number
  journal?: string
  keywords?: string[]
}

export interface ResearchIdea extends BaseEntity {
  title: string
  description: string
  methodology: string
  potentialImpact: string
  keyChallenges: string[]
  nextSteps: string[]
  feasibilityScore?: number
  noveltyScore?: number
}

export interface Summary extends BaseEntity {
  originalText: string
  summary: string
  keyPoints: string[]
  source: "text" | "file" | "url"
  type: "comprehensive" | "executive" | "methodology"
}
