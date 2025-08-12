"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen } from "lucide-react"
import { SearchInput } from "@/components/common/SearchInput"
import { SkeletonList } from "@/components/common/SkeletonCard"
import { useAsync } from "@/lib/hooks/useAsync"
import { useToast } from "@/hooks/use-toast"

// Enhanced research service for paper search
class PaperSearchService {
  static async searchPapers(query: string, searchType = "keyword"): Promise<any> {
    try {
      // Use the existing OpenAlex integration
      const response = await fetch(`/api/search/papers?query=${encodeURIComponent(query)}&type=${searchType}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        console.error("Search papers API returned an error:", response.status, response.statusText)
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Unexpected content type:", contentType, "Response body:", text)
        throw new Error("Unexpected response from search papers API: Not valid JSON")
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error searching papers:", error)
      throw new Error("Failed to search academic papers. Please try again.")
    }
  }
}

interface LiteratureSearchProps {
  className?: string
}

export function LiteratureSearch({ className }: LiteratureSearchProps) {
  const { toast } = useToast()
  const [searchType, setSearchType] = useState("keyword")
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const paperSearch = useAsync<any>(PaperSearchService.searchPapers)

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const handlePaperSearch = useCallback((query: string) => {
    if (!query.trim()) return

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new debounce timeout
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        await paperSearch.execute(query, searchType)
      } catch (error) {
        toast({
          title: "Search Failed",
          description: error instanceof Error ? error.message : "Failed to search papers. Please try again.",
          variant: "destructive",
        })
      }
    }, 500) // 500ms debounce
  }, [searchType, paperSearch.execute])

  const searchData = paperSearch.data as any
  const papers = searchData?.data?.data || searchData?.papers || []

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Literature Search
          </CardTitle>
          <CardDescription>Find relevant research papers and articles on your topic of interest.</CardDescription>
        </CardHeader>
        <CardContent>
          <SearchInput
            placeholder="Search for papers, authors, or keywords..."
            onSearch={handlePaperSearch}
            className="w-full"
            showButton={true}
            buttonText="Search Literature"
          />
        </CardContent>
      </Card>

      {paperSearch.loading && <SkeletonList count={3} />}

      {papers.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="text-sm text-gray-600 mb-4">
            Found {searchData?.count || papers.length} papers
          </div>
          {papers.map((paper: any, index: number) => (
            <Card key={paper.id || index}>
              <CardHeader>
                <CardTitle className="text-lg leading-tight">{paper.title || "Untitled Paper"}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
                  {paper.authors && paper.authors.length > 0 && (
                    <span>
                      {paper.authors.slice(0, 3).join(", ")}
                      {paper.authors.length > 3 ? " et al." : ""}
                    </span>
                  )}
                  {paper.year && (
                    <>
                      <span>•</span>
                      <span>{paper.year}</span>
                    </>
                  )}
                  {paper.journal && (
                    <>
                      <span>•</span>
                      <span className="italic">{paper.journal}</span>
                    </>
                  )}
                  {paper.citations !== undefined && (
                    <>
                      <span>•</span>
                      <span>{paper.citations} citations</span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paper.abstract && (
                  <p className="text-sm text-gray-700 mb-3 line-clamp-3">{paper.abstract}</p>
                )}
                <div className="flex gap-2">
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      View Paper
                    </a>
                  )}
                  {paper.pdf_url && paper.pdf_url !== paper.url && (
                    <a
                      href={paper.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {paperSearch.error && (
        <Card className="border-red-200 mt-6">
          <CardContent className="pt-6">
            <p className="text-red-600">{paperSearch.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
