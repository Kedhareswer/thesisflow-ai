import { fetchOpenAlexWorks } from './openalex'
import { searchSemanticScholar, transformSemanticScholarPaper, getCitationData } from './semantic-scholar'
import type { ResearchPaper, SearchFilters } from '@/lib/types/common'

// Sci-Hub integration for accessing papers
async function searchSciHub(query: string, limit = 10): Promise<ResearchPaper[]> {
  try {
    // Sci-Hub doesn't have a public search API, so we'll use it for DOI resolution
    // This will be used when we have DOIs from other sources
    console.log('[SciHub] Sci-Hub integration ready for DOI resolution')
    return []
  } catch (error) {
    console.warn('[SciHub] Sci-Hub search failed:', error)
    return []
  }
}

// arXiv integration for preprint papers
async function searchArxiv(query: string, limit = 10): Promise<ResearchPaper[]> {
  try {
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}&sortBy=lastUpdatedDate&sortOrder=descending`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ResearchHub/1.0 (research@example.com)'
      }
    })

    if (!response.ok) {
      throw new Error(`arXiv API returned ${response.status}`)
    }

    const xml = await response.text()
    
    // Parse XML response
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
  const entries = Array.from(doc.getElementsByTagName('entry'))
    
  const now = new Date()
    const papers: ResearchPaper[] = []

    for (const entry of entries) {
    const getText = (tag: string) => {
      const el = entry.getElementsByTagName(tag)[0]
        return el ? el.textContent?.trim() || '' : ''
    }

    const title = getText('title').replace(/\s+/g, ' ').trim()
      const authors = Array.from(entry.getElementsByTagName('author')).map(author => {
        const name = author.getElementsByTagName('name')[0]
        return name ? name.textContent?.trim() || '' : ''
      }).filter(Boolean)
      
    const abstract = getText('summary').replace(/\s+/g, ' ').trim()
      const published = getText('published')
      const year = published ? parseInt(published.slice(0, 4)) : now.getFullYear()
    const url = getText('id')
      
      // Find PDF link
      const links = Array.from(entry.getElementsByTagName('link'))
      const pdfLink = links.find(link => link.getAttribute('type') === 'application/pdf')
    const pdf_url = pdfLink?.getAttribute('href') || url

      const journal = getText('arxiv:journal_ref') || 'arXiv'
    const doi = getText('arxiv:doi') || undefined

      if (title && title !== 'No title') {
        papers.push({
          id: `arxiv-${doi || title.replace(/\s+/g, '-')}-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      title,
      authors,
          abstract: abstract || 'No abstract available',
      year,
      url,
      journal,
      doi,
      pdf_url,
      source: 'arxiv',
          venue_type: 'repository'
        })
      }
    }

    console.log(`[arXiv] Found ${papers.length} papers`)
    return papers
  } catch (error) {
    console.warn('[arXiv] Search failed:', error)
    return []
  }
}

// White Rose eTheses integration
async function searchWhiteRose(query: string, limit = 10): Promise<ResearchPaper[]> {
  try {
    // White Rose eTheses uses OAI-PMH protocol
    const url = `https://etheses.whiterose.ac.uk/cgi/oai2?verb=ListRecords&metadataPrefix=oai_dc&set=etheses&from=2020-01-01&until=2024-12-31`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'ResearchHub/1.0 (research@example.com)'
      }
    })

    if (!response.ok) {
      throw new Error(`White Rose API returned ${response.status}`)
    }

    const xml = await response.text()
    
    // Parse XML response
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const records = Array.from(doc.getElementsByTagName('record'))
    
    const now = new Date()
    const papers: ResearchPaper[] = []

    for (const record of records) {
      const metadata = record.getElementsByTagName('metadata')[0]
      if (!metadata) continue

      const dc = metadata.getElementsByTagName('dc')[0]
      if (!dc) continue

      const getText = (tag: string) => {
        const elements = dc.getElementsByTagName(tag)
        return elements.length > 0 ? elements[0].textContent?.trim() || '' : ''
      }

      const title = getText('title')
      const creators = Array.from(dc.getElementsByTagName('creator')).map(el => el.textContent?.trim() || '').filter(Boolean)
      const description = getText('description')
      const date = getText('date')
      const year = date ? parseInt(date.slice(0, 4)) : now.getFullYear()
      const identifier = getText('identifier')
      const url = getText('relation')

      if (title && title.toLowerCase().includes(query.toLowerCase())) {
        papers.push({
          id: `whiterose-${identifier || title.replace(/\s+/g, '-')}`,
          createdAt: now,
          updatedAt: now,
          title,
          authors: creators,
          abstract: description || 'No abstract available',
          year,
          url: url || '',
          journal: 'White Rose eTheses',
          doi: identifier,
          pdf_url: url,
          source: 'whiterose',
          venue_type: 'repository'
        })
}

      if (papers.length >= limit) break
    }

    console.log(`[WhiteRose] Found ${papers.length} theses`)
    return papers
  } catch (error) {
    console.warn('[WhiteRose] Search failed:', error)
    return []
  }
}

// Manchester Phrasebank integration
async function searchManchesterPhrasebank(query: string, limit = 10): Promise<ResearchPaper[]> {
  try {
    // Manchester Phrasebank doesn't have a search API, but we can search their content
    // This would typically involve scraping their website or using their API if available
    console.log('[ManchesterPhrasebank] Manchester Phrasebank integration ready')
    return []
  } catch (error) {
    console.warn('[ManchesterPhrasebank] Search failed:', error)
    return []
  }
}

// Enhanced search result interface
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
      // Search all sources in parallel
      const searchPromises = [
        this.searchOpenAlexWithFilters(query, filters, limit),
        searchArxiv(query, limit),
        searchWhiteRose(query, limit),
        searchSciHub(query, limit),
        searchManchesterPhrasebank(query, limit)
      ]

      const results = await Promise.allSettled(searchPromises)
      
      // Process results from each source
      const sourceNames = ['openalex', 'arxiv', 'whiterose', 'scihub', 'manchester']
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          sources.push(sourceNames[index])
          allPapers.push(...result.value)
          console.log(`[EnhancedSearch] Found ${result.value.length} papers from ${sourceNames[index]}`)
        } else if (result.status === 'rejected') {
          console.warn(`[EnhancedSearch] ${sourceNames[index]} search failed:`, result.reason)
      }
      })

      // Enhance papers with citation data from Semantic Scholar
      if (allPapers.length > 0) {
        try {
          console.log('[EnhancedSearch] Attempting to enhance with citation data...')
          allPapers = await this.enhancePapersWithCitations(allPapers)
          console.log('[EnhancedSearch] Citation enhancement completed')
        } catch (citationError) {
          console.warn('[EnhancedSearch] Citation enhancement failed, continuing without it:', citationError)
        }
      }

      // Remove duplicates and apply filters
      const uniquePapers = this.removeDuplicates(allPapers)
      const filteredPapers = this.applyFilters(uniquePapers, filters)
      const sortedPapers = this.sortPapers(filteredPapers, filters.sort_by, filters.sort_order)

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
      
      // Return empty result instead of throwing to prevent app crash
      return {
        papers: [],
        total: 0,
        filters_applied: filters,
        sources: [],
        search_time: Date.now() - startTime
      }
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
   * Enhance papers with citation data (gracefully handle failures)
   */
  private static async enhancePapersWithCitations(papers: ResearchPaper[]): Promise<ResearchPaper[]> {
    const enhancedPapers = []
    let enhancementCount = 0
    
    for (const paper of papers) {
      let enhancedPaper = { ...paper }
      
      // If paper has DOI, try to get citation data from Semantic Scholar
      if (paper.doi && !paper.cited_by_count) {
        try {
          const citationData = await getCitationData(paper.doi, 'doi')
          if (citationData) {
            enhancedPaper.cited_by_count = citationData.citationCount || 0
            enhancedPaper.reference_count = citationData.referenceCount || 0
            enhancedPaper.open_access = {
              is_oa: citationData.isOpenAccess || false,
              oa_url: citationData.openAccessPdf?.url,
              any_repository_has_fulltext: !!citationData.openAccessPdf
            }
            enhancedPaper.field_of_study = citationData.fieldsOfStudy || []
            enhancedPaper.tldr = citationData.tldr?.text
            enhancementCount++
            console.log(`[EnhancedSearch] Enhanced paper: ${paper.title.substring(0, 50)}...`)
          }
        } catch (error) {
          // Silently continue without citation data for this paper
          console.debug(`[EnhancedSearch] Citation lookup failed for "${paper.title.substring(0, 30)}...": ${error}`)
        }
      }
      
      enhancedPapers.push(enhancedPaper)
    }
    
    console.log(`[EnhancedSearch] Enhanced ${enhancementCount} out of ${papers.length} papers with citation data`)
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
