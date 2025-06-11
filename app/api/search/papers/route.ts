import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")
    const type = searchParams.get("type") || "keyword"

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    const apiKey = process.env.NEXT_PUBLIC_SEMANTIC_SCHOLAR_API_KEY || ""

    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10&fields=title,authors,abstract,year,url,citationCount,journal`,
      {
        headers: {
          "x-api-key": apiKey,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status}`)
    }

    const data = await response.json()
    const results = data.data.map((paper: any) => ({
      id: paper.paperId,
      title: paper.title,
      authors: paper.authors.map((author: any) => author.name),
      abstract: paper.abstract,
      year: paper.year,
      url: paper.url,
      citations: paper.citationCount,
      journal: paper.journal?.name,
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error in search papers API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search papers" },
      { status: 500 },
    )
  }
}
