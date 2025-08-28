"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Sidebar from "../ai-agents/components/Sidebar"
import { ChevronDown, MoreHorizontal } from "lucide-react"

type QualityLevel = "standard" | "high-quality" | "deep-review"

interface SearchResult {
  id: string
  query: string
  timestamp: Date
  paperCount: number
  qualityLevel: QualityLevel
  status: "completed" | "processing"
}

// Mock data for demonstration
const mockSearches: SearchResult[] = [
  {
    id: "1",
    query: "overview of climate change impact on biodiversity",
    timestamp: new Date("2025-08-27T16:01:00"),
    paperCount: 719,
    qualityLevel: "deep-review",
    status: "completed"
  }
]

export default function LiteratureReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [collapsed, setCollapsed] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [selectedQuality, setSelectedQuality] = React.useState<QualityLevel>("deep-review")
  const [searches] = React.useState<SearchResult[]>(mockSearches)

  // Prefill from URL params without auto-starting
  React.useEffect(() => {
    const pf = searchParams.get("prefill") || searchParams.get("q") || searchParams.get("query")
    const ql = searchParams.get("quality") as QualityLevel | null
    if (pf) setQuery(pf)
    if (ql && (ql === "standard" || ql === "high-quality" || ql === "deep-review")) {
      setSelectedQuality(ql)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSearch = () => {
    if (!query.trim()) return
    const params = new URLSearchParams({
      query: query.trim(),
      quality: selectedQuality
    })
    router.push(`/literature-review/results?${params.toString()}`)
  }

  const handleSearchClick = (search: SearchResult) => {
    const params = new URLSearchParams({
      query: search.query,
      quality: search.qualityLevel
    })
    router.push(`/literature-review/results?${params.toString()}`)
  }

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }
    return date.toLocaleDateString('en-US', options)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Main Content */}
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Literature Review</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">English (en)</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Search Interface */}
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your search query"
                className="w-full resize-none rounded-md border border-gray-200 p-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                rows={4}
              />
            </div>

            {/* Quality Level Buttons */}
            <div className="mb-4 flex gap-2">
              {[
                { id: "standard" as const, label: "Standard" },
                { id: "high-quality" as const, label: "High Quality" },
                { id: "deep-review" as const, label: "Deep Review" }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedQuality(option.id)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    selectedQuality === option.id
                      ? "bg-orange-100 text-orange-700 border border-orange-200"
                      : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSearch}
                disabled={!query.trim()}
                className="flex items-center justify-center rounded-md bg-orange-500 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search History */}
          {searches.length > 0 && (
            <div>
              <h2 className="mb-4 text-sm font-medium text-gray-900">My Searches ({searches.length}):</h2>
              <div className="space-y-3">
                {searches.map((search) => (
                  <div
                    key={search.id}
                    onClick={() => handleSearchClick(search)}
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="mb-2">
                      <div className="text-sm font-medium text-gray-900">
                        Today: {formatDate(search.timestamp)}
                      </div>
                    </div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 text-xs text-gray-500">
                          {formatTime(search.timestamp)}
                        </div>
                        <div className="mb-2 text-sm text-gray-900">
                          {search.query}
                        </div>
                        <div className="text-xs text-gray-600">
                          {search.paperCount} papers . {search.qualityLevel === "deep-review" ? "Deep Review" : search.qualityLevel === "high-quality" ? "High Quality" : "Standard"}
                        </div>
                      </div>
                      <button className="ml-4 rounded-md p-1 text-gray-400 hover:bg-gray-50">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
