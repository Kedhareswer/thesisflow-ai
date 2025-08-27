"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Sidebar from "../../ai-agents/components/Sidebar"
import { ChevronDown, ChevronUp, Plus, ArrowLeft } from "lucide-react"
import { useLiteratureSearch } from "@/hooks/use-literature-search"

export default function LiteratureReviewResults() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [collapsed, setCollapsed] = React.useState(false)
  const [stepsExpanded, setStepsExpanded] = React.useState(true)
  const [reportExpanded, setReportExpanded] = React.useState(false)

  const query = searchParams.get("query") || ""
  const quality = searchParams.get("quality") || "standard"

  const { results, isLoading, error, searchTime, source, cached, search } = useLiteratureSearch()

  React.useEffect(() => {
    if (query) {
      // Deep review/high-quality can map to larger limits
      const limit = quality === "deep-review" ? 30 : quality === "high-quality" ? 20 : 10
      search(query, limit)
    }
  }, [query, quality, search])

  const journalsCount = React.useMemo(() => {
    const map: Record<string, number> = {}
    results.forEach(p => {
      if (p.journal) map[p.journal] = (map[p.journal] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [results])

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header with Back Button */}
        <div className="border-b border-gray-200 bg-white p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/literature-review")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Search</span>
            </button>
            <div className="h-4 w-px bg-gray-300" />
            <h1 className="text-lg font-semibold text-gray-900">Literature Review Results</h1>
          </div>
        </div>

        <div className="flex flex-1">
          {/* Left Panel - Activity / Status */}
          <div className="w-1/2 border-r border-gray-200 bg-white p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="text-sm font-medium text-blue-800 mb-1">Search</div>
                <div className="text-sm text-blue-700">Query: "{query}"</div>
                <div className="text-xs text-blue-600 mt-2">Mode: {quality.replace('-', ' ')}</div>
              </div>

              {isLoading && (
                <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
                  <div className="text-sm font-medium text-orange-800 mb-1">Fetching results…</div>
                  <div className="text-sm text-orange-700">Contacting data sources (OpenAlex, arXiv, CrossRef)</div>
                </div>
              )}

              {!isLoading && !error && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <div className="text-sm font-medium text-green-800 mb-1">Completed</div>
                  <div className="text-sm text-green-700">Found {results.length} papers in {searchTime}ms • Source: {source}{cached ? " (cached)" : ""}</div>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <div className="text-sm font-medium text-red-800 mb-1">Error</div>
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Data */}
          <div className="w-1/2 p-4 overflow-y-auto">
            {/* Research Steps */}
            <div className="mb-4 rounded-lg border border-gray-200 bg-white">
              <button
                onClick={() => setStepsExpanded(!stepsExpanded)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <span className="font-medium text-gray-900">Research Steps</span>
                {stepsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {stepsExpanded && (
                <div className="border-t border-gray-200 p-4">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Formulate query and choose mode</li>
                    <li>Parallel search across sources</li>
                    <li>Deduplicate and rank results</li>
                    <li>Review papers and extract insights</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Report */}
            <div className="mb-4 rounded-lg border border-gray-200 bg-white">
              <button
                onClick={() => setReportExpanded(!reportExpanded)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <span className="font-medium text-gray-900">Summary</span>
                {reportExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {reportExpanded && (
                <div className="border-t border-gray-200 p-4">
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <h4 className="font-medium text-gray-900 mb-3">Overview</h4>
                    <p className="mb-4">{results.length} papers retrieved in {searchTime}ms. Top journals:</p>
                    <ul className="list-disc list-inside space-y-1 mb-4">
                      {journalsCount.map(([j, n]) => (
                        <li key={j}>{j} — {n}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Literature Table */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Literature Review</h3>
                  <button className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
                    <Plus className="h-3 w-3" />
                    Add More Columns
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Papers</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.map((paper) => (
                      <tr key={paper.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            <a href={paper.url} target="_blank" rel="noreferrer" className="hover:underline">{paper.title}</a>
                          </div>
                          <div className="text-xs text-gray-500">{paper.authors.join(", ")} • {paper.journal} • {paper.year}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-600">Source: {paper.source}{paper.doi ? ` • DOI: ${paper.doi}` : ''} • Citations: {paper.citations}</div>
                        </td>
                      </tr>
                    ))}
                    {!isLoading && results.length === 0 && !error && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-gray-500" colSpan={2}>No results</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
