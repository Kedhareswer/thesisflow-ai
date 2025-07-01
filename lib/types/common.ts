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
  // Enhanced fields
  doi?: string
  pdf_url?: string
  venue?: string
  venue_type?: 'journal' | 'conference' | 'book' | 'repository' | 'other'
  impact_factor?: number
  h_index?: number
  publication_date?: string
  concepts?: Array<{
    id: string
    display_name: string
    score: number
    level: number
  }>
  cited_by_count?: number
  reference_count?: number
  open_access?: {
    is_oa: boolean
    oa_date?: string
    oa_url?: string
    any_repository_has_fulltext?: boolean
  }
  language?: string
  type?: string
  source?: 'openalex' | 'semantic_scholar' | 'arxiv' | 'pubmed'
  field_of_study?: string[]
  tldr?: string
}

export interface SearchFilters {
  publication_year_min?: number
  publication_year_max?: number
  venue_type?: string[]
  open_access?: boolean
  min_citations?: number
  field_of_study?: string[]
  concepts?: string[]
  sort_by?: 'relevance' | 'publication_date' | 'cited_by_count'
  sort_order?: 'desc' | 'asc'
}

export interface ExportFormat {
  format: 'bibtex' | 'apa' | 'mla' | 'chicago' | 'harvard' | 'json' | 'csv'
  papers: ResearchPaper[]
}

export interface PaperAnnotation {
  id: string
  paper_id: string
  user_id: string
  type: 'highlight' | 'note' | 'bookmark'
  content: string
  position?: {
    page?: number
    start?: number
    end?: number
  }
  created_at: Date
  updated_at: Date
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
