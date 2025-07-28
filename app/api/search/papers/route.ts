import { NextResponse } from "next/server"
import { EnhancedSearchService } from "@/app/explorer/enhanced-search"
import type { SearchFilters } from "@/lib/types/common"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")
    const type = searchParams.get("type") || "keyword"

    console.log("API: Received enhanced search request for:", query)

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Query parameter is required",
          suggestion: "Please provide a search query",
        },
        { status: 400 },
      )
    }

    // Parse filters from query parameters
    const filters: SearchFilters = {}
    
    const yearMin = searchParams.get("year_min")
    const yearMax = searchParams.get("year_max")
    const minCitations = searchParams.get("min_citations")
    const openAccess = searchParams.get("open_access")
    const venueType = searchParams.get("venue_type")
    const sortBy = searchParams.get("sort_by")
    const sortOrder = searchParams.get("sort_order")
    const fieldOfStudy = searchParams.get("field_of_study")

    if (yearMin) filters.publication_year_min = parseInt(yearMin)
    if (yearMax) filters.publication_year_max = parseInt(yearMax)
    if (minCitations) filters.min_citations = parseInt(minCitations)
    if (openAccess) filters.open_access = openAccess === 'true'
    if (venueType) filters.venue_type = [venueType]
    if (sortBy) filters.sort_by = sortBy as any
    if (sortOrder) filters.sort_order = sortOrder as any
    if (fieldOfStudy) filters.field_of_study = fieldOfStudy.split(',')

    const limit = parseInt(searchParams.get("limit") || "20")

    try {
      console.log("API: Using Enhanced Search Service with filters:", filters)
      
      // Use the enhanced search service
      const searchResult = await EnhancedSearchService.searchPapers(query.trim(), filters, limit)

      console.log(`API: Enhanced search returned ${searchResult.papers.length} papers from ${searchResult.sources.join(', ')} in ${searchResult.search_time}ms`)

      // Only return results if we have real papers from actual sources
      if (searchResult.papers.length === 0) {
        return NextResponse.json({
          success: false,
          error: "No papers found from available sources",
          suggestion: "Try different keywords or check if search services are available",
          count: 0,
          total: 0,
          sources: [],
          search_time: searchResult.search_time,
          filters_applied: searchResult.filters_applied,
          data: []
        })
      }

      const responseData = {
        success: true,
        count: searchResult.papers.length,
        total: searchResult.total,
        sources: searchResult.sources,
        search_time: searchResult.search_time,
        filters_applied: searchResult.filters_applied,
        data: searchResult.papers
      }

      return NextResponse.json(responseData)
    } catch (searchError) {
      console.error("API: Enhanced search failed:", searchError)
      
      return NextResponse.json({
        success: false,
        error: "Search service unavailable",
        suggestion: "Please try again later or check your internet connection",
        count: 0,
        total: 0,
        sources: [],
        search_time: 0,
        filters_applied: {},
        data: []
      }, { status: 503 })
    }
  } catch (error) {
    console.error("API: Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
        suggestion: "Please try again later",
        count: 0,
        total: 0,
        sources: [],
        search_time: 0,
        filters_applied: {},
        data: []
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      },
    )
  }
}
