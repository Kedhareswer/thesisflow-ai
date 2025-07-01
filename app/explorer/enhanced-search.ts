import { fetchOpenAlexWorks } from './openalex'
import { searchSemanticScholar, transformSemanticScholarPaper, getCitationData } from './semantic-scholar'
import type { ResearchPaper, SearchFilters } from '@/lib/types/common'

interface EnhancedSearchResult {
  papers: ResearchPaper[]
  total: number
  filters_applied: SearchFilters
  sources: string[]
  search_time: number
}

/**
 * Enhanced search service combining multiple academic databases
 */
export class EnhancedSearchService {
  
  /**
   * Search papers with advanced filtering and multi-source data
   */
  static async searchPapers(
    query: string, 
    filters: SearchFilters = {},
    limit = 20
  ): Promise<EnhancedSearchResult> {
    const startTime = Date.now()
    const sources: string[] = []
    let allPapers: ResearchPaper[] = []

    try {
      // Search OpenAlex first (primary source)
      console.log('[EnhancedSearch] Searching OpenAlex...')
      const openAlexPapers = await EnhancedSearchService.searchOpenAlexWithFilters(query, filters, limit)
      if (openAlexPapers.length > 0) {
        sources.push('openalex')
        allPapers.push(...openAlexPapers)
        console.log(`[EnhancedSearch] Found ${openAlexPapers.length} papers from OpenAlex`)
      }

      // Enhance OpenAlex papers with citation data from Semantic Scholar
      allPapers = await EnhancedSearchService.enhancePapersWithCitations(allPapers)

      // Remove duplicates and apply filters
      const uniquePapers = EnhancedSearchService.removeDuplicates(allPapers)
      const filteredPapers = EnhancedSearchService.applyFilters(uniquePapers, filters)
      const sortedPapers = EnhancedSearchService.sortPapers(filteredPapers, filters.sort_by, filters.sort_order)

      const searchTime = Date.now() - startTime

      return {
        papers: sortedPapers.slice(0, limit),
        total: sortedPapers.length,
        filters_applied: filters,
        sources,
        search_time: searchTime
      }
    } catch (error) {
      console.error('[EnhancedSearch] Search failed:', error)
      throw error
    }
  }

  /**
   * Search OpenAlex with filters
   */
  private static async searchOpenAlexWithFilters(
    query: string, 
    filters: SearchFilters, 
    limit: number
  ): Promise<ResearchPaper[]> {
    try {
      const openAlexPapers = await fetchOpenAlexWorks(query, limit)
      return openAlexPapers.map(paper => ({
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        year: paper.publication_year,
        journal: paper.host_venue,
        url: paper.url,
        doi: paper.doi,
        venue: paper.host_venue,
        source: 'openalex' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    } catch (error) {
      console.error('[EnhancedSearch] OpenAlex search failed:', error)
      return []
    }
  }

  /**
   * Enhance papers with citation data
   */
  private static async enhancePapersWithCitations(papers: ResearchPaper[]): Promise<ResearchPaper[]> {
    const enhancedPapers = []
    
    for (const paper of papers) {
      let enhancedPaper = { ...paper }
      
      // If paper is from OpenAlex and has DOI, get citation data from Semantic Scholar
      if (paper.source === 'openalex' && paper.doi && !paper.cited_by_count) {
        try {
          const citationData = await getCitationData(paper.doi, 'doi')
          if (citationData) {
            enhancedPaper.cited_by_count = citationData.citationCount
            enhancedPaper.reference_count = citationData.referenceCount
            enhancedPaper.open_access = {
              is_oa: citationData.isOpenAccess,
              oa_url: citationData.openAccessPdf?.url,
              any_repository_has_fulltext: !!citationData.openAccessPdf
            }
            enhancedPaper.field_of_study = citationData.fieldsOfStudy || []
            enhancedPaper.tldr = citationData.tldr?.text
          }
        } catch (error) {
          console.warn(`[EnhancedSearch] Failed to get citation data for ${paper.title}:`, error)
        }
      }
      
      enhancedPapers.push(enhancedPaper)
    }
    
    return enhancedPapers
  }

  /**
   * Remove duplicate papers based on title and authors
   */
  private static removeDuplicates(papers: ResearchPaper[]): ResearchPaper[] {
    const seen = new Set()
    return papers.filter(paper => {
      const key = `${paper.title.toLowerCase().trim()}:${paper.authors[0]?.toLowerCase().trim() || ''}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  /**
   * Apply filters to papers
   */
  private static applyFilters(papers: ResearchPaper[], filters: SearchFilters): ResearchPaper[] {
    return papers.filter(paper => {
      // Year range filter
      if (filters.publication_year_min && paper.year < filters.publication_year_min) return false
      if (filters.publication_year_max && paper.year > filters.publication_year_max) return false
      
      // Citation filter
      if (filters.min_citations && (paper.cited_by_count || 0) < filters.min_citations) return false
      
      // Open access filter
      if (filters.open_access !== undefined && paper.open_access?.is_oa !== filters.open_access) return false
      
      // Venue type filter
      if (filters.venue_type && filters.venue_type.length > 0) {
        if (!paper.venue_type || !filters.venue_type.includes(paper.venue_type)) return false
      }
      
      // Field of study filter
      if (filters.field_of_study && filters.field_of_study.length > 0) {
        const paperFields = paper.field_of_study || []
        const hasMatchingField = filters.field_of_study.some(field => 
          paperFields.some(paperField => 
            paperField.toLowerCase().includes(field.toLowerCase())
          )
        )
        if (!hasMatchingField) return false
      }
      
      return true
    })
  }

  /**
   * Sort papers based on criteria
   */
  private static sortPapers(
    papers: ResearchPaper[], 
    sortBy: SearchFilters['sort_by'] = 'relevance',
    sortOrder: SearchFilters['sort_order'] = 'desc'
  ): ResearchPaper[] {
    const sortedPapers = [...papers]
    
    sortedPapers.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'publication_date':
          comparison = (a.year || 0) - (b.year || 0)
          break
        case 'cited_by_count':
          comparison = (a.cited_by_count || 0) - (b.cited_by_count || 0)
          break
        case 'relevance':
        default:
          // Simple relevance based on citation count and recency
          const aScore = (a.cited_by_count || 0) * 0.7 + (a.year || 0) * 0.3
          const bScore = (b.cited_by_count || 0) * 0.7 + (b.year || 0) * 0.3
          comparison = aScore - bScore
          break
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })
    
    return sortedPapers
  }

  /**
   * Get filter options for UI
   */
  static getFilterOptions() {
    return {
      venue_types: [
        { value: 'journal', label: 'Journal' },
        { value: 'conference', label: 'Conference' },
        { value: 'book', label: 'Book' },
        { value: 'repository', label: 'Repository' },
        { value: 'other', label: 'Other' }
      ],
      sort_options: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'publication_date', label: 'Publication Date' },
        { value: 'cited_by_count', label: 'Citation Count' }
      ],
      field_of_study_options: [
        'Computer Science',
        'Medicine',
        'Biology',
        'Physics',
        'Chemistry',
        'Mathematics',
        'Engineering',
        'Psychology',
        'Economics',
        'Sociology'
      ]
    }
  }
} 