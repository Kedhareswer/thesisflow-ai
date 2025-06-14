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
    // Parse domain-specific terms to enhance search relevance
    const domainSpecificFilters = parseSpecializedQuery(query)
    
    // Clean and encode the query while preserving important terms
    const cleanQuery = query
      .trim()
      .replace(/[^\w\s\-]/g, " ") // Keep hyphens for domain-specific terms like "machine-learning"
      .replace(/\s+/g, " ")
    const encodedQuery = encodeURIComponent(cleanQuery)

    console.log("[OpenAlex] Original query:", query)
    console.log("[OpenAlex] Cleaned query:", cleanQuery)
    
    // Add domain-specific filters when applicable
    let additionalFilters = ""
    if (domainSpecificFilters) {
      additionalFilters = domainSpecificFilters
      console.log("[OpenAlex] Using domain-specific filters:", domainSpecificFilters)
    }
    
    // Build OpenAlex API URL with proper filters
    // Use a combination of search and concept/title filters for better relevance
    const apiUrl = `https://api.openalex.org/works?search=${encodedQuery}${additionalFilters}&filter=publication_year:>2010,has_abstract:true&sort=relevance_score:desc&per_page=${limit}&mailto=research@example.com`

    console.log("[OpenAlex] Fetching from URL:", apiUrl)

    // Add CORS proxy for client-side requests
    // Use a CORS proxy for client-side requests
    // const corsProxyUrl = 'https://corsproxy.io/?'
    // const finalUrl = typeof window !== 'undefined' ? corsProxyUrl + encodeURIComponent(apiUrl) : apiUrl
    
    // For debugging, let's try direct requests first
    const finalUrl = apiUrl
    console.log("Final URL with CORS handling:", finalUrl)

    const response = await fetch(finalUrl, {
      headers: {
        "User-Agent": "ResearchHub/1.0 (mailto:research@example.com)",
        Accept: "application/json",
      },
      // Adding no-cors mode might help with CORS issues but limits response usage
      // mode: 'no-cors'
    })

    if (!response.ok) {
      console.error(`OpenAlex API error: Status ${response.status} ${response.statusText}`)
      throw new Error(`OpenAlex API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log("OpenAlex response status:", response.status)
    console.log("OpenAlex response metadata:", data.meta || 'No metadata')
    console.log("OpenAlex results count:", data.results?.length || 0)

    if (!data.results || !Array.isArray(data.results)) {
      console.warn("No results found in OpenAlex response")
      return []  
    }

    return data.results.map((work: any) => ({
      id: work.id || "",
      title: work.title || "Untitled",
      authors: work.authorships?.slice(0, 5).map((auth: any) => auth.author?.display_name || "Unknown Author") || [],
      publication_year: work.publication_year || new Date().getFullYear(),
      host_venue: work.primary_location?.source?.display_name || "Unknown Journal",
      abstract: work.abstract_inverted_index
        ? reconstructAbstract(work.abstract_inverted_index)
        : "No abstract available",
      url: work.primary_location?.landing_page_url || work.id || "",
      doi: work.doi || "",
    }))
  } catch (error) {
    console.error("Error fetching from OpenAlex:", error)
    throw error
  }
}

function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  try {
    const words: string[] = []
    const maxPosition = Math.max(...Object.values(invertedIndex).flat())

    // Initialize array with empty strings
    for (let i = 0; i <= maxPosition; i++) {
      words[i] = ""
    }

    // Fill in the words at their positions
    Object.entries(invertedIndex).forEach(([word, positions]) => {
      positions.forEach((pos) => {
        if (pos <= maxPosition) {
          words[pos] = word
        }
      })
    })

    // Join words and clean up
    const abstract = words.filter((word) => word).join(" ")
    return abstract.length > 500 ? abstract.substring(0, 500) + "..." : abstract
  } catch (error) {
    console.error("Error reconstructing abstract:", error)
    return "Abstract reconstruction failed"
  }
}
