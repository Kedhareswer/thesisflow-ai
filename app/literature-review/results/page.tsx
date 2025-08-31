"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Sidebar from "../../ai-agents/components/Sidebar"
import { ChevronDown, ChevronUp, Plus, ArrowLeft } from "lucide-react"
import { useLiteratureSearch } from "@/hooks/use-literature-search"
import { supabase } from "@/integrations/supabase/client"

// Helpers to derive a topic/title from the user's query
function stripTrailingSuffix(text: string): string {
  return text.replace(/\s+(using\s+[^.]+)?(\s+and create\s+[^.]+)?\s*\.*\s*$/i, "")
}

function extractSubjectFromPrompt(prompt: string): string {
  const cleaned = stripTrailingSuffix(prompt)
  const preps = [" on ", " for ", " from ", " about ", " related to "]
  let idx = -1
  let found = ""
  for (const p of preps) {
    const i = cleaned.toLowerCase().lastIndexOf(p)
    if (i > idx) {
      idx = i
      found = p
    }
  }
  if (idx >= 0) {
    const after = cleaned.slice(idx + found.length)
    const nextUsing = after.toLowerCase().indexOf(" using ")
    const nextCreate = after.toLowerCase().indexOf(" and create ")
    const nextDot = after.indexOf(".")
    const stops = [nextUsing, nextCreate, nextDot].filter((n) => n >= 0)
    const stopAt = stops.length ? Math.min(...stops) : -1
    const subject = (stopAt >= 0 ? after.slice(0, stopAt) : after).trim()
    return subject || ""
  }
  return ""
}

function extractQuoted(text: string): string | null {
  const m = text.match(/["']([^"']{3,})["']/)
  return m ? m[1].trim() : null
}

export default function LiteratureReviewResults() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [collapsed, setCollapsed] = React.useState(false)
  const [stepsExpanded, setStepsExpanded] = React.useState(true)
  const [reportExpanded, setReportExpanded] = React.useState(false)
  const [userId, setUserId] = React.useState<string | undefined>(undefined)

  const query = searchParams.get("query") || ""
  const quality = searchParams.get("quality") || "standard"
  const sessionIdParam = searchParams.get("sessionId") || undefined

  const { results, isLoading, error, searchTime, source, cached, search, retry, rateLimitInfo, isRateLimited } = useLiteratureSearch({
    debounceMs: 1200,
    autoPreloadSession: true,
    userIdForSession: userId,
    sessionId: sessionIdParam,
    includeInPreload: 'results'
  })

  // Avoid duplicate requests in React Strict Mode remounts
  const hasSearchedRef = React.useRef(false)

  // Auto-retry state when rate-limited
  const [retryInSec, setRetryInSec] = React.useState<number | null>(null)
  const [queuedRetry, setQueuedRetry] = React.useState(false)

  const topicTitle = React.useMemo(() => {
    const raw = (query || "").trim()
    if (!raw) return "Literature Review Results"
    // Prefer a quoted phrase if present
    const quoted = extractQuoted(raw)
    if (quoted && quoted.length >= 3) return quoted

    // Remove common leading phrases
    const withoutLead = raw
      .replace(/^search\s+research\s+papers\s+on\s+/i, "")
      .replace(/^review\s+literature\s+on\s+/i, "")

    // Remove trailing suffixes/punctuation and stray quotes
    const noSuffix = stripTrailingSuffix(withoutLead).replace(/\.+\s*$/, "")
    const unquoted = noSuffix.replace(/^["']+|["']+$/g, "")

    // Try extracting subject after prepositions; fallback to cleaned text
    const subj = extractSubjectFromPrompt(unquoted)
    const candidate = (subj && (subj.includes(" ") || subj.length >= 10)) ? subj : unquoted
    const finalText = (candidate || raw).trim()
    return finalText || "Literature Review Results"
  }, [query])

  React.useEffect(() => {
    if (!query) return
    if (hasSearchedRef.current) return
    hasSearchedRef.current = true
    // Deep review/high-quality can map to larger limits
    const limit = quality === "deep-review" ? 30 : quality === "high-quality" ? 20 : 10
    search(query, limit)
  }, [query, quality, search])

  // Load authenticated userId for session authorization (client-side)
  React.useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      const id = data?.user?.id
      setUserId(id || undefined)
    }).catch(() => setUserId(undefined))
    return () => { mounted = false }
  }, [])

  // If rate limited, queue an automatic retry after reset time
  React.useEffect(() => {
    if (!error) { setQueuedRetry(false); setRetryInSec(null); return }
    const isRl = isRateLimited || /rate limit/i.test(error)
    if (!isRl) { setQueuedRetry(false); setRetryInSec(null); return }

    const resetTs = rateLimitInfo?.resetTime ? Date.parse(rateLimitInfo.resetTime) : Date.now() + 60_000
    let secs = Math.max(1, Math.ceil((resetTs - Date.now()) / 1000))
    setRetryInSec(secs)
    setQueuedRetry(true)

    const timer = setInterval(() => {
      secs -= 1
      if (secs <= 0) {
        clearInterval(timer)
        setQueuedRetry(false)
        setRetryInSec(null)
        retry()
      } else {
        setRetryInSec(secs)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [error, isRateLimited, rateLimitInfo?.resetTime, retry])

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
            </button>
            <div className="h-4 w-px bg-gray-300" />
            <h1 className="text-lg font-semibold text-gray-900">{topicTitle}</h1>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Research Steps */}
            <div className="rounded-lg border border-gray-200 bg-white">
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

            {/* Summary */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <button
                onClick={() => setReportExpanded(!reportExpanded)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <span className="font-medium text-gray-900">Summary</span>
                {reportExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {reportExpanded && (
                <div className="border-t border-gray-200 p-4">
                  {isLoading || queuedRetry ? (
                    <div className="space-y-2">
                      <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
                      <div className="h-3 w-full rounded bg-gray-200 animate-pulse" />
                      <div className="h-3 w-3/4 rounded bg-gray-200 animate-pulse" />
                      <div className="h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <h4 className="font-medium text-gray-900 mb-3">Overview</h4>
                      <p className="mb-4">{results.length} papers retrieved in {searchTime}ms. Top journals:</p>
                      <ul className="list-disc list-inside space-y-1 mb-4">
                        {journalsCount.map(([j, n]) => (
                          <li key={j}>{j} — {n}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error / rate-limit state */}
            {error && !queuedRetry && !(/rate limit/i.test(error)) && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="text-sm font-medium text-red-800 mb-1">Error</div>
                <div className="text-sm text-red-700">{error}</div>
                <div className="mt-3">
                  <button onClick={retry} className="rounded-md border border-red-200 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-100">
                    Retry
                  </button>
                </div>
              </div>
            )}

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
                    {isLoading || queuedRetry ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3">
                            <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse mb-2" />
                            <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <>
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
                      </>
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
