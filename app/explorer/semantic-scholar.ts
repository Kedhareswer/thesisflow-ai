// Semantic Scholar API integration for enhanced paper metadata and citations
// API Documentation: https://api.semanticscholar.org/

interface SemanticScholarPaper {
  paperId: string
  title: string
  abstract?: string
  venue?: string
  year?: number
  authors: Array<{
    authorId?: string
    name: string
  }>
  citationCount: number
  referenceCount: number
  influentialCitationCount: number
  isOpenAccess: boolean
  openAccessPdf?: {
    url: string
    status: string
  }
  fieldsOfStudy?: string[]
  s2FieldsOfStudy?: Array<{
    category: string
    source: string
  }>
  publicationTypes?: string[]
  publicationDate?: string
  journal?: {
    name: string
    pages?: string
    volume?: string
  }
  externalIds?: {
    DOI?: string
    ArXiv?: string
    MAG?: string
    PubMed?: string
  }
  url?: string
  tldr?: {
    model: string
    text: string
  }
}

interface SemanticScholarSearchResponse {
  total: number
  offset: number
  next?: number
  data: SemanticScholarPaper[]
}

const SEMANTIC_SCHOLAR_BASE_URL = 'https://api.semanticscholar.org/graph/v1'

/**
 * Enhanced paper search with citation data from Semantic Scholar
 */
export async function searchSemanticScholar(
  query: string, 
  limit = 20,
  fields: string[] = [
    'paperId', 'title', 'abstract', 'venue', 'year', 'authors',
    'citationCount', 'referenceCount', 'influentialCitationCount',
    'isOpenAccess', 'openAccessPdf', 'fieldsOfStudy', 's2FieldsOfStudy',
    'publicationTypes', 'publicationDate', 'journal', 'externalIds', 'url', 'tldr'
  ]
): Promise<SemanticScholarPaper[]> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const fieldsParam = fields.join(',')
    const url = `${SEMANTIC_SCHOLAR_BASE_URL}/paper/search?query=${encodedQuery}&limit=${limit}&fields=${fieldsParam}`

    console.log('[SemanticScholar] Searching with URL:', url)

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ResearchHub/1.0 (research@example.com)'
      }
    })

    if (!response.ok) {
      console.error(`Semantic Scholar API error: ${response.status} ${response.statusText}`)
      throw new Error(`Semantic Scholar API error: ${response.status}`)
    }

    const data: SemanticScholarSearchResponse = await response.json()
    console.log(`[SemanticScholar] Found ${data.data?.length || 0} papers`)
    
    return data.data || []
  } catch (error) {
    console.error('Error searching Semantic Scholar:', error)
    return []
  }
}

/**
 * Get enhanced citation data for a specific paper by DOI or title
 */
export async function getCitationData(identifier: string, type: 'doi' | 'title' = 'doi'): Promise<SemanticScholarPaper | null> {
  try {
    let url: string
    const fields = 'paperId,title,citationCount,referenceCount,influentialCitationCount,isOpenAccess,openAccessPdf,fieldsOfStudy,publicationDate,journal,externalIds,tldr'
    
    if (type === 'doi') {
      url = `${SEMANTIC_SCHOLAR_BASE_URL}/paper/DOI:${identifier}?fields=${fields}`
    } else {
      // Search by title and get the first result
      const searchResults = await searchSemanticScholar(identifier, 1)
      if (searchResults.length === 0) return null
      return searchResults[0]
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ResearchHub/1.0 (research@example.com)'
      }
    })

    if (!response.ok) {
      console.error(`Semantic Scholar citation lookup error: ${response.status}`)
      return null
    }

    const data: SemanticScholarPaper = await response.json()
    return data
  } catch (error) {
    console.error('Error getting citation data:', error)
    return null
  }
}

/**
 * Get recommendations based on a paper
 */
export async function getRecommendations(paperId: string, limit = 10): Promise<SemanticScholarPaper[]> {
  try {
    const fields = 'paperId,title,abstract,venue,year,authors,citationCount,isOpenAccess,fieldsOfStudy'
    const url = `${SEMANTIC_SCHOLAR_BASE_URL}/paper/${paperId}/recommendations?limit=${limit}&fields=${fields}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ResearchHub/1.0 (research@example.com)'
      }
    })

    if (!response.ok) {
      console.error(`Semantic Scholar recommendations error: ${response.status}`)
      return []
    }

    const data = await response.json()
    return data.recommendedPapers || []
  } catch (error) {
    console.error('Error getting recommendations:', error)
    return []
  }
}

/**
 * Transform Semantic Scholar paper to our ResearchPaper format
 */
export function transformSemanticScholarPaper(paper: SemanticScholarPaper): any {
  return {
    id: paper.paperId,
    title: paper.title,
    authors: paper.authors?.map(author => author.name) || [],
    abstract: paper.abstract || "No abstract available",
    year: paper.year || new Date().getFullYear(),
    journal: paper.venue || paper.journal?.name || "Unknown Journal",
    url: paper.url || (paper.externalIds?.DOI ? `https://doi.org/${paper.externalIds.DOI}` : ''),
    doi: paper.externalIds?.DOI || '',
    pdf_url: paper.openAccessPdf?.url || '',
    venue: paper.venue,
    venue_type: determineVenueType(paper),
    publication_date: paper.publicationDate,
    cited_by_count: paper.citationCount || 0,
    reference_count: paper.referenceCount || 0,
    open_access: {
      is_oa: paper.isOpenAccess || false,
      oa_url: paper.openAccessPdf?.url,
      any_repository_has_fulltext: !!paper.openAccessPdf
    },
    field_of_study: paper.fieldsOfStudy || [],
    tldr: paper.tldr?.text,
    source: 'semantic_scholar' as const,
    type: paper.publicationTypes?.[0] || 'article'
  }
}

function determineVenueType(paper: SemanticScholarPaper): 'journal' | 'conference' | 'book' | 'repository' | 'other' {
  const venue = paper.venue?.toLowerCase() || ''
  const types = paper.publicationTypes?.map(t => t.toLowerCase()) || []
  
  if (types.includes('conference') || venue.includes('conference') || venue.includes('proceedings')) {
    return 'conference'
  }
  if (types.includes('journal') || venue.includes('journal')) {
    return 'journal'
  }
  if (types.includes('book') || venue.includes('book')) {
    return 'book'
  }
  if (venue.includes('arxiv') || venue.includes('preprint')) {
    return 'repository'
  }
  
  return 'other'
} 