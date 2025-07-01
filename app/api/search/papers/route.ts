import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")
    const type = searchParams.get("type") || "keyword"

    console.log("API: Received search request for:", query)

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Query parameter is required",
          suggestion: "Please provide a search query",
        },
        { status: 400 },
      )
    }

    try {
      // Use OpenAlex to search for papers
      const { fetchOpenAlexWorks } = await import("@/app/explorer/openalex")
      const papers = await fetchOpenAlexWorks(query.trim(), 15)

      console.log("API: Found papers from OpenAlex:", papers.length)

      // Transform to expected format and ensure quality
      const transformedPapers = papers
        .filter((paper) => paper.title && paper.title.trim() !== "")
        .map((paper) => ({
          id: paper.id,
          title: paper.title,
          authors: paper.authors || [],
          year: paper.publication_year,
          journal: paper.host_venue || "Unknown Journal",
          abstract: paper.abstract || "No abstract available",
          url: paper.url,
          doi: paper.doi,
          citations: 0,
          pdf_url: paper.doi ? `https://doi.org/${paper.doi}` : paper.url,
        }))
        .slice(0, 10)

      const responseData = {
        success: true,
        count: transformedPapers.length,
        source: "openalex",
        data: transformedPapers,
      }

      console.log(`API: Returning ${transformedPapers.length} search results`)
      return NextResponse.json(responseData)
    } catch (error) {
      console.error("API: Error searching OpenAlex:", error)

      return NextResponse.json(
        {
          success: false,
          error: "Failed to search papers",
          details: error instanceof Error ? error.message : String(error),
          suggestion: "Please try again with different search terms. Make sure your search terms are specific and relevant.",
          count: 0,
          source: "openalex",
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
  } catch (error) {
    console.error("API: Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
        suggestion: "Please try again later",
        count: 0,
        source: "openalex",
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
