interface OpenAlexWork {
  id: string
  title: string
  authors: string[]
  publication_year: number
  host_venue: string
  abstract: string
  url: string
  doi: string
}

/**
 * Parse domain-specific queries to enhance search relevance for specialized fields
 * This improves results especially for multi-domain searches like "Deep Learning in combat"
 */
function parseSpecializedQuery(query: string): string {
  // Convert to lowercase for easier matching
  const lowerQuery = query.toLowerCase();
  
  // Domain-specific term mappings for better results
  const militaryTerms = ['combat', 'military', 'warfare', 'defense', 'weapon', 'tactical', 'army', 'navy', 'air force'];
  const aiTerms = ['deep learning', 'machine learning', 'ai', 'artificial intelligence', 'neural network', 'computer vision'];
  const medicalTerms = ['medicine', 'healthcare', 'clinical', 'patient', 'diagnosis', 'treatment'];
  
  // Check for cross-domain queries (e.g., AI in military contexts)
  let additionalFilters = '';
  
  // Check for military+AI combination (high specificity needed)
  const hasMilitaryTerm = militaryTerms.some(term => lowerQuery.includes(term));
  const hasAiTerm = aiTerms.some(term => lowerQuery.includes(term));
  const hasMedicalTerm = medicalTerms.some(term => lowerQuery.includes(term));
  
  // Build specialized filters
  if (hasMilitaryTerm) {
    // For military queries, add concepts filters for defense/military
    additionalFilters += '&filter=concepts.id:https://openalex.org/C41008148|https://openalex.org/C115973379';
  }
  
  if (hasAiTerm) {
    // For AI queries, add computer science/AI concept filters
    additionalFilters += '&filter=concepts.id:https://openalex.org/C41008148|https://openalex.org/C154945302|https://openalex.org/C119857082';
  }
  
  if (hasMedicalTerm) {
    // For medical queries, add medical concept filters
    additionalFilters += '&filter=concepts.id:https://openalex.org/C71924100|https://openalex.org/C185592680';
  }
  
  return additionalFilters;
}

export async function fetchOpenAlexWorks(query: string, limit = 10): Promise<OpenAlexWork[]> {
  try {
    console.log("[OpenAlex] Attempting to search OpenAlex API for:", query)
    
    // Try OpenAlex API
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${limit}`
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "ResearchHub/1.0 (research@example.com)"
      }
    })

    if (response.ok) {
      const data = await response.json()
      if (data.results && Array.isArray(data.results)) {
        const papers = data.results.slice(0, limit).map((work: any) => ({
          id: work.id || "",
          title: work.title || work.display_name || "Untitled",
          authors: work.authorships?.slice(0, 5).map((auth: any) => auth.author?.display_name || "Unknown Author") || [],
          publication_year: work.publication_year || new Date().getFullYear(),
          host_venue: work.primary_location?.source?.display_name || "Unknown Journal",
          abstract: work.abstract_inverted_index
            ? reconstructAbstract(work.abstract_inverted_index)
            : "No abstract available",
          url: work.primary_location?.landing_page_url || work.id || "",
          doi: work.doi?.replace('https://doi.org/', '') || "",
        }))
        
        console.log(`[OpenAlex] Found ${papers.length} real papers`)
        return papers
      }
    }
    
    console.log("[OpenAlex] API call failed, returning empty results")
    return []
  } catch (error) {
    console.error("[OpenAlex] Search error:", error)
    return []
  }
}



function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  try {
    if (!invertedIndex || Object.keys(invertedIndex).length === 0) {
      return "No abstract available"
    }
    
    const words: string[] = []
    const maxPosition = Math.max(...Object.values(invertedIndex).flat())

    // Initialize array with empty strings
    for (let i = 0; i <= maxPosition; i++) {
      words[i] = ""
    }

    // Fill in the words at their positions
    Object.entries(invertedIndex).forEach(([word, positions]) => {
      positions.forEach((pos) => {
        if (pos <= maxPosition && pos >= 0) {
          words[pos] = word
        }
      })
    })

    // Join words and clean up
    const abstract = words.filter((word) => word).join(" ")
    return abstract.length > 500 ? abstract.substring(0, 500) + "..." : abstract || "No abstract available"
  } catch (error) {
    console.error("Error reconstructing abstract:", error)
    return "Abstract reconstruction failed"
  }
}

/**
 * Test function to check OpenAlex API status
 */
export async function testOpenAlexAPI(): Promise<boolean> {
  try {
    const response = await fetch("https://api.openalex.org/works?per_page=1")
    console.log("OpenAlex API test status:", response.status)
    return response.ok
  } catch (error) {
    console.error("OpenAlex API test failed:", error)
    return false
  }
}

/**
 * Enhanced search with additional filters for specific use cases
 */
export async function fetchOpenAlexWorksWithFilters(
  query: string, 
  filters: {
    yearMin?: number
    yearMax?: number
    openAccess?: boolean
    venueType?: string
  } = {},
  limit = 10
): Promise<OpenAlexWork[]> {
  try {
    // For now, fall back to basic search until we resolve the filter issues
    console.log("[OpenAlex] Using basic search for filtered request")
    return await fetchOpenAlexWorks(query, limit)
  } catch (error) {
    console.error("Error in enhanced OpenAlex search:", error)
    // Return empty array instead of throwing
    return []
  }
}
