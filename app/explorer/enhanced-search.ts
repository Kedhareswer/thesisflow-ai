import { fetchOpenAlexWorks } from './openalex'
// Polyfill DOMParser in Node.js environments (e.g. Next.js API routes)
// `xmldom` is already included as a dependency in package.json
// We alias it to `NodeDOMParser` to avoid shadowing the global DOMParser in browsers.
import { DOMParser as NodeDOMParser } from 'xmldom'
import { searchSemanticScholar, transformSemanticScholarPaper, getCitationData } from './semantic-scholar'
import type { ResearchPaper, SearchFilters } from '@/lib/types/common'

// Enhanced DOI resolution and paper access using multiple sources
async function searchSciHub(query: string, limit = 10, userEmail?: string | null): Promise<ResearchPaper[]> {
  try {
    console.log('[SciHub] Searching for papers with DOI resolution:', query)
    
    // Use Unpaywall API for open access paper discovery
    // Priority: user email > environment variable > fallback
    const UNPAYWALL_EMAIL = userEmail || process.env.UNPAYWALL_EMAIL || 'research@example.com'
    console.log('[SciHub] Using email for Unpaywall:', UNPAYWALL_EMAIL)
    
    // Search for papers with DOIs that might be accessible
    const papers: ResearchPaper[] = []
    const now = new Date()
    
    // Try to find DOIs in the query or search for papers with DOIs
    const doiPattern = /10\.\d{4,}\/[-._;()\/:A-Z0-9]+/i
    const foundDois = query.match(doiPattern)
    
    if (foundDois) {
      for (const doi of foundDois.slice(0, limit)) {
        try {
          // Check Unpaywall for open access status
          const unpaywallUrl = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(UNPAYWALL_EMAIL)}`
          
          const response = await fetch(unpaywallUrl)
          if (response.ok) {
            const data = await response.json()
            
            if (data.is_oa && data.best_oa_location) {
              papers.push({
                id: `unpaywall-${doi.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
                createdAt: now,
                updatedAt: now,
                title: data.title || 'Paper with DOI',
                authors: data.z_authors?.map((author: any) => author.given + ' ' + author.family) || ['Unknown Author'],
                abstract: data.abstract || 'No abstract available',
                year: data.year || now.getFullYear(),
                url: data.best_oa_location.url_for_pdf || data.doi_url,
                journal: data.host_venue?.name || 'Unknown Journal',
                doi: doi,
                pdf_url: data.best_oa_location.url_for_pdf || data.doi_url,
                source: 'scihub',
                venue_type: 'journal'
              })
            }
          }
        } catch (error) {
          console.warn(`[SciHub] Failed to resolve DOI ${doi}:`, error)
        }
      }
    }
    
    // If no DOIs found, try to search for papers that might have open access versions
    if (papers.length === 0) {
      // Use Google Scholar-like search to find papers with potential open access
      const searchTerms = query.split(' ').slice(0, 3).join(' ')
      const searchQuery = `${searchTerms} "open access" "full text" filetype:pdf`
      
      // This would typically use a search API, but for now we'll return empty
      // as we don't want to implement web scraping without proper permissions
      console.log('[SciHub] No DOIs found, would search for open access papers')
    }
    
    console.log(`[SciHub] Found ${papers.length} accessible papers`)
    return papers
  } catch (error) {
    console.warn('[SciHub] Search failed:', error)
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
    // Use browser DOMParser if available, otherwise fall back to NodeDOMParser
const parser = typeof window === 'undefined' ? new NodeDOMParser() : new DOMParser()
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

// White Rose eTheses integration with proper OAI-PMH implementation
async function searchWhiteRose(query: string, limit = 10): Promise<ResearchPaper[]> {
  try {
    console.log('[WhiteRose] Searching for:', query)
    
    // Use OAI-PMH ListRecords with proper filtering
    // Note: some repositories have varying set names; to maximize compatibility, we omit 'set'
    const baseUrl = 'https://etheses.whiterose.ac.uk/cgi/oai2'
    const params = new URLSearchParams({
      verb: 'ListRecords',
      metadataPrefix: 'oai_dc',
      from: '2020-01-01',
      until: new Date().toISOString().split('T')[0] // Today's date
    })
    
    const url = `${baseUrl}?${params.toString()}`
    console.log('[WhiteRose] Fetching from:', url)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ResearchHub/1.0 (research@example.com)',
        'Accept': 'application/xml'
      }
    })

    if (!response.ok) {
      throw new Error(`White Rose API returned ${response.status}`)
    }

    const xml = await response.text()
    // Use browser DOMParser if available, otherwise fall back to NodeDOMParser
const parser = typeof window === 'undefined' ? new NodeDOMParser() : new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    
    // Check for OAI errors
    const errors = doc.getElementsByTagName('error')
    if (errors.length > 0) {
      throw new Error(`OAI Error: ${errors[0].textContent}`)
    }

    const records = Array.from(doc.getElementsByTagName('record'))
    const papers: ResearchPaper[] = []
    const now = new Date()

    // Helper: collect texts by localName (namespace-agnostic)
    const getTextsByLocal = (parent: Element, local: string) => {
      const all = Array.from(parent.getElementsByTagName('*')) as Element[]
      return all
        .filter(el => (el.localName || el.nodeName) === local)
        .map(el => el.textContent?.trim() || '')
        .filter(Boolean)
    }

    for (const record of records.slice(0, limit)) {
      // Find metadata element irrespective of prefix (e.g., oai_dc:dc)
      const mdCandidate = Array.from(record.getElementsByTagName('*'))
        .find((el: any) => (el.localName || el.nodeName) === 'dc') as Element | undefined
      const metadata = mdCandidate
      if (!metadata) continue

      const getText = (localTag: string) => getTextsByLocal(metadata, localTag)

      const titles = getText('title')
      const creators = getText('creator')
      const descriptions = getText('description')
      const dates = getText('date')
      const subjects = getText('subject')
      const identifiers = getText('identifier')
      const types = getText('type')

      // Filter for thesis/dissertation types and match query
      const isThesis = types.some(type => 
        type.toLowerCase().includes('thesis') || 
        type.toLowerCase().includes('dissertation')
      )

      if (!isThesis) continue

      // Check if any title or subject matches the query
      const allText = [...titles, ...subjects, ...descriptions].join(' ').toLowerCase()
      const queryLower = query.toLowerCase()
      
      if (!allText.includes(queryLower) && !queryLower.split(' ').some(word => allText.includes(word))) {
        continue
      }

      const title = titles[0] || 'Untitled Thesis'
      const authors = creators
      const abstract = descriptions[0] || 'No abstract available'
      const year = dates[0] ? parseInt(dates[0].slice(0, 4)) : now.getFullYear()
      
      // Find the thesis URL
      const thesisUrl = identifiers.find(id => id.includes('etheses.whiterose.ac.uk')) || 
                       identifiers.find(id => id.startsWith('http')) ||
                       `https://etheses.whiterose.ac.uk/`

        papers.push({
        id: `whiterose-${title.replace(/\s+/g, '-')}-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
          title,
        authors,
        abstract,
          year,
        url: thesisUrl,
          journal: 'White Rose eTheses',
        doi: undefined,
        pdf_url: thesisUrl,
          source: 'whiterose',
          venue_type: 'repository'
        })
    }

    console.log(`[WhiteRose] Found ${papers.length} theses`)
    return papers
  } catch (error) {
    console.warn('[WhiteRose] Search failed:', error)
    return []
  }
}

// Manchester Phrasebank integration with Google Search API
async function searchManchesterPhrasebank(query: string, limit = 10): Promise<ResearchPaper[]> {
  try {
    console.log('[Manchester] Searching for academic phrases related to:', query)
    
    // Use Google Custom Search API to find academic writing resources
    const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY
    const GOOGLE_SEARCH_CSE_ID = process.env.GOOGLE_SEARCH_CSE_ID
    
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CSE_ID) {
      console.warn('[Manchester] Google Search API credentials not configured')
    return []
    }
    
    // Search for academic writing resources and phrasebank content
    const searchQuery = `${query} "academic writing" "phrasebank" site:phrasebank.manchester.ac.uk OR site:academic-englishuk.com OR site:writingcenter.unc.edu`
    
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_CSE_ID}&q=${encodeURIComponent(searchQuery)}&num=${limit}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.warn(`[Manchester] Google Search API returned ${response.status}. Check GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CSE_ID (cx).`)
      return []
    }
    
    const data = await response.json()
    const papers: ResearchPaper[] = []
    const now = new Date()
    
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        const title = item.title || 'Academic Writing Resource'
        const snippet = item.snippet || 'No description available'
        const itemUrl = item.link || ''
        
        // Extract domain for source identification
        const domain = new URL(itemUrl).hostname
        
        papers.push({
          id: `manchester-${title.replace(/\s+/g, '-')}-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
          title,
          authors: ['Academic Writing Resource'],
          abstract: snippet,
          year: now.getFullYear(),
          url: itemUrl,
          journal: domain,
          doi: undefined,
          pdf_url: itemUrl,
          source: 'manchester',
          venue_type: 'other'
        })
      }
    }
    
    console.log(`[Manchester] Found ${papers.length} academic writing resources`)
    return papers
  } catch (error) {
    console.warn('[Manchester] Search failed:', error)
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
    limit = 20,
    userEmail?: string | null
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
        searchSciHub(query, limit, userEmail), // Pass user email to Sci-Hub
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
