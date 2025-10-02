"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { Search, Loader2, Check, BarChart3, Sun, Heart, Leaf, TrendingDown, ExternalLink, AlertTriangle, Zap } from "lucide-react"
import Link from "next/link"
import { useLiteratureSearch, type Paper } from "@/hooks/use-literature-search"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { upsertSession, computeMetrics } from "@/lib/services/topics-session.store"
import { useTopicsFind } from "@/hooks/use-topics-find"

interface TopicSuggestion {
  id: string
  text: string
  icon: React.ComponentType<any>
  bgColor: string
  textColor: string
}

interface SearchProgress {
  step: string
  status: 'completed' | 'current' | 'pending'
}

export default function FindTopicsPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchMode, setSearchMode] = useState<'search' | 'results'>('search')
  const [qualityMode, setQualityMode] = useState<'Standard' | 'Enhanced'>('Standard')
  const [timeLeft, setTimeLeft] = useState(6)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null)

  // Ref to persist createdAt across effect runs (only updates for new sessions)
  const sessionCreatedAtRef = useRef<number | null>(null)

  // Auth session for authenticated API calls (required by token middleware)
  const { session } = useSupabaseAuth()

  // Real results via literature search. Use aggregateWindowMs to minimize API calls and avoid 429s.
  // With aggregateWindowMs > 0, the hook uses the fetch path (cache-first + aggregation) instead of SSE.
  const literature = useLiteratureSearch({ defaultLimit: 20, useSSE: true, aggregateWindowMs: 120000 })

  // AI-extracted topics from the returned papers
  const [topics, setTopics] = useState<string[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [topicsError, setTopicsError] = useState<string | null>(null)

  // Scholarly Report (exclusive to Topics page)
  const [report, setReport] = useState<string>('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const reportAbortRef = useRef<AbortController | null>(null)
  const reportTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reportTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [reportStartAt, setReportStartAt] = useState<number | null>(null)
  const [reportElapsedSec, setReportElapsedSec] = useState(0)

  // Streaming pipeline for sources/insights (SSE)
  const topicsFind = useTopicsFind()

  // Derived research metrics for right-rail (fallback when streaming metrics unavailable)
  const fallbackMetrics = useMemo(() => computeMetrics(searchQuery, literature.results || []), [searchQuery, literature.results])
  const liveMetrics = topicsFind.metrics ?? fallbackMetrics

  const isLive = (topicsFind.items?.length || 0) > 0
  const liveItemsFiltered = useMemo(() => {
    if (!isLive) return [] as Array<{ title: string; url: string; snippet?: string; source: string; year?: number | string }>
    if (!activeClusterId) return topicsFind.items
    const c = topicsFind.clusters?.find((cc) => cc.id === activeClusterId)
    if (!c) return topicsFind.items
    return c.indices.map((i) => topicsFind.items[i]).filter(Boolean)
  }, [isLive, topicsFind.items, topicsFind.clusters, activeClusterId])

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = Math.floor(sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const topicSuggestions: TopicSuggestion[] = [
    {
      id: '1',
      text: 'Benchmarks for evaluation of large language models',
      icon: BarChart3,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      id: '2', 
      text: 'Efficient materials for solar panels',
      icon: Sun,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      id: '3',
      text: 'Effective interventions for treating depression', 
      icon: Heart,
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      id: '4',
      text: 'Renewable energy trends for the next decade',
      icon: Leaf,
      bgColor: 'bg-green-50', 
      textColor: 'text-green-600'
    },
    {
      id: '5',
      text: 'Main causes of economic recessions',
      icon: TrendingDown,
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600'
    }
  ]

  const searchProgress: SearchProgress[] = useMemo(() => {
    const steps: SearchProgress[] = []
    // Step 1 & 2: completed as soon as the flow starts (UX consistency)
    steps.push({ step: 'Finding relevant papers', status: 'completed' })
    steps.push({ step: 'Finding topics in papers', status: 'completed' })

    // Step 3: depends on literature loading state
    if (literature.isLoading) {
      steps.push({ step: 'Finding topics from external sources', status: 'current' })
    } else {
      steps.push({ step: 'Finding topics from external sources', status: 'completed' })
    }

    // Step 4: topics extraction
    if (topicsLoading) {
      steps.push({ step: 'Extracting unique topics', status: 'current' })
    } else if (topics.length > 0) {
      steps.push({ step: 'Extracting unique topics', status: 'completed' })
    } else {
      steps.push({ step: 'Extracting unique topics', status: literature.isLoading ? 'pending' : 'current' })
    }

    // Step 5: report generation
    if (reportLoading) {
      steps.push({ step: 'Preparing final results', status: 'current' })
    } else if (report) {
      steps.push({ step: 'Preparing final results', status: 'completed' })
    } else {
      steps.push({ step: 'Preparing final results', status: 'pending' })
    }

    return steps
  }, [literature.isLoading, topicsLoading, topics.length, reportLoading, report])

  const [retryInSec, setRetryInSec] = useState<number | null>(null)

  // Track rate-limit reset countdown
  useEffect(() => {
    if (!literature.rateLimitInfo?.resetTime) {
      setRetryInSec(null)
      return
    }
    const update = () => {
      const diff = Math.ceil((new Date(literature.rateLimitInfo!.resetTime).getTime() - Date.now()) / 1000)
      setRetryInSec(diff > 0 ? diff : 0)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [literature.rateLimitInfo?.resetTime])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    // Prevent spamming the same query while it is still loading or within cooldown
    if (literature.isLoading || (literature.currentQuery && literature.currentQuery.toLowerCase() === query.trim().toLowerCase())) {
      return
    }
    // Reset derived sections for new query
    setTopics([])
    setTopicsError(null)
    // Reset report state and timer/stream on new search
    setReport('')
    setReportError(null)
    setReportLoading(false)
    setReportStartAt(null)
    setReportElapsedSec(0)
    if (reportTimerRef.current) {
      clearInterval(reportTimerRef.current)
      reportTimerRef.current = null
    }
    if (reportTimeoutRef.current) {
      clearTimeout(reportTimeoutRef.current)
      reportTimeoutRef.current = null
    }
    if (reportAbortRef.current) {
      try { reportAbortRef.current.abort() } catch {}
      reportAbortRef.current = null
    }
    // New local session id for persistence
    try {
      const newId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : String(Date.now())
      setSessionId(newId)
      // Reset createdAt ref for new session
      sessionCreatedAtRef.current = Date.now()
    } catch { 
      setSessionId(String(Date.now()))
      sessionCreatedAtRef.current = Date.now()
    }

    setIsSearching(true)
    setSearchMode('results')
    // Start streaming pipeline (parallel to literature search)
    try { topicsFind.reset() } catch {}
    try {
      const limitStart = qualityMode === 'Standard' ? 10 : 20
      topicsFind.start({ q: query, limit: limitStart, quality: qualityMode })
    } catch {}
    
    // Simulate countdown
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setIsSearching(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Kick off real search; include userId when available so limit applies to the user rather than IP
    try {
      literature.clearResults()
      ;(async () => {
        try {
          const { supabase } = await import("@/integrations/supabase/client")
          const { data } = await supabase.auth.getUser()
          const uid = data?.user?.id
          const limit = qualityMode === 'Standard' ? 10 : 20
          if (uid) {
            literature.search(query, limit, uid)
          } else {
            literature.search(query, limit)
          }
        } catch {
          const limit = qualityMode === 'Standard' ? 10 : 20
          literature.search(query, limit)
        }
      })()
    } catch {
      // noop
    }
  }

  const handleSuggestionClick = (suggestion: TopicSuggestion) => {
    handleSearch(suggestion.text)
  }

  // When results are available, compute topics via AI (best-effort)
  useEffect(() => {
    const papers = literature.results || []
    if (papers.length >= 6 && !topicsLoading && topics.length === 0 && (topicsFind.topics?.length || 0) === 0) {
      // Create AbortController for request cancellation and timeout
      const controller = new AbortController()
      let timeoutId: NodeJS.Timeout | null = null
      
      ;(async () => {
        setTopicsLoading(true)
        setTopicsError(null)
        
        try {
          // Set 30s timeout
          timeoutId = setTimeout(() => {
            controller.abort()
          }, 30000)
          
          const raw = papers.slice(0, 30)
          const mini = raw.map(p => ({ title: p.title, abstract: p.abstract }))
          const limitCount = mini.length
          const resp = await fetch(`/api/topics/extract?quality=${encodeURIComponent(qualityMode)}&limit=${limitCount}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ papers: mini }),
            signal: controller.signal,
          })
          
          // Clear timeout on successful response
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          
          const data = await resp.json().catch(() => ({} as any))
          if (!resp.ok || !data?.success) {
            throw new Error(data?.error || 'Failed to extract topics')
          }
          const arr: string[] = Array.isArray(data.topics) ? data.topics : []
          
          // Only update state if not aborted
          if (!controller.signal.aborted) {
            setTopics(arr.slice(0, 15))
          }
        } catch (e: any) {
          // Handle AbortError separately (silent failure)
          if (e.name === 'AbortError') {
            // Request was aborted, don't update error state
            return
          }
          
          // Only update error state if not aborted
          if (!controller.signal.aborted) {
            setTopicsError('AI extraction unavailable. Configure an AI provider in Settings to enable topic extraction.')
          }
        } finally {
          // Clear timeout and only update loading state if not aborted
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          if (!controller.signal.aborted) {
            setTopicsLoading(false)
          }
        }
      })()
      
      // Cleanup function
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        controller.abort()
      }
    }
  }, [literature.results, topicsLoading, topics.length, qualityMode, session?.access_token])

  // Sync topics from streaming insights when available
  useEffect(() => {
    if ((topicsFind.topics?.length || 0) > 0) {
      setTopics((topicsFind.topics || []).slice(0, 15))
      setTopicsError(null)
    }
  }, [topicsFind.topics])

  // Persist session snapshot whenever major parts change
  useEffect(() => {
    if (!sessionId || !searchQuery) return
    const results = literature.results || []
    if (results.length === 0) return
    
    // Ensure we have a createdAt timestamp (set when session starts)
    if (sessionCreatedAtRef.current === null) {
      sessionCreatedAtRef.current = Date.now()
    }
    
    upsertSession({
      id: sessionId,
      query: searchQuery,
      createdAt: sessionCreatedAtRef.current,
      quality: qualityMode,
      results,
      topics,
      metrics: liveMetrics,
    })
  }, [sessionId, searchQuery, literature.results, topics, qualityMode, liveMetrics])

  // Manual streaming report generation (SSE over fetch)
  const generateReport = useCallback(async () => {
    try {
      const papers = literature.results || []
      if (papers.length === 0) {
        setReportError('Run a search first to fetch sources.')
        return
      }
      setReport('')
      setReportError(null)
      setReportLoading(true)
      const started = Date.now()
      setReportStartAt(started)
      setReportElapsedSec(0)
      if (reportTimerRef.current) clearInterval(reportTimerRef.current)
      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current)
      reportTimerRef.current = setInterval(() => {
        setReportElapsedSec(Math.floor((Date.now() - started) / 1000))
      }, 1000)
      const controller = new AbortController()
      reportAbortRef.current = controller
      // Overall client-side timeout: 4 minutes
      reportTimeoutRef.current = setTimeout(() => {
        try { controller.abort() } catch {}
      }, 240000)
      const sourceCount = Math.min(20, Math.max(8, papers.length))
      const resp = await fetch(`/api/topics/report/stream?quality=${encodeURIComponent(qualityMode)}&limit=${sourceCount}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ query: searchQuery, papers, quality: qualityMode }),
        signal: controller.signal,
      })

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => '')
        throw new Error(errText || 'Failed to start streaming')
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let done = false
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        if (readerDone) break
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        // Parse SSE events separated by double newlines
        let sepIndex
        while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex)
          buffer = buffer.slice(sepIndex + 2)
          // Each event has lines like: event: <type>\n data: <json>
          const lines = rawEvent.split('\n')
          let eventType = 'message'
          let dataLines: string[] = []
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim()
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trim())
            }
          }
          const dataStr = dataLines.join('\n')
          let payload: any = null
          try { payload = dataStr ? JSON.parse(dataStr) : null } catch {}

          if (eventType === 'token' && payload?.content) {
            setReport(prev => prev + String(payload.content))
          } else if (eventType === 'error') {
            const msg = payload?.error || 'Streaming error'
            throw new Error(msg)
          } else if (eventType === 'done') {
            done = true
            break
          }
        }
      }
    } catch (e) {
      const err = e as any
      let message = 'Failed to generate report'
      if (err?.name === 'AbortError' || /aborted/i.test(String(err?.message))) {
        message = 'Report generation timed out after 4 minutes. Please try again.'
      } else if (err instanceof Error) {
        message = err.message
      }
      setReportError(message)
    } finally {
      setReportLoading(false)
      if (reportTimerRef.current) {
        clearInterval(reportTimerRef.current)
        reportTimerRef.current = null
      }
      if (reportTimeoutRef.current) {
        clearTimeout(reportTimeoutRef.current)
        reportTimeoutRef.current = null
      }
    }
  }, [literature.results, qualityMode, searchQuery])

  useEffect(() => {
    return () => {
      if (reportTimerRef.current) clearInterval(reportTimerRef.current)
      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current)
      if (reportAbortRef.current) reportAbortRef.current.abort()
    }
  }, [])

  // Manual-only report: no auto-generation

  if (searchMode === 'results') {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        
        <div className="flex-1">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Topics</span>
                <span>/</span>
                <span className="text-gray-900">{searchQuery}</span>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/topics/library" className="text-sm text-blue-600 hover:underline">Library</Link>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setQualityMode('Standard')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      qualityMode === 'Standard' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setQualityMode('Enhanced')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      qualityMode === 'Enhanced' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Enhanced
                  </button>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <span>🌐</span>
                  <span>en</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 max-w-2xl">
                <p className="text-gray-700 mb-2">
                  Getting topics and sources for '{searchQuery}'.
                </p>
                <div className="text-sm text-gray-600 mb-6 flex items-center gap-2">
                  { (isSearching || literature.isLoading) && <Loader2 className="w-4 h-4 animate-spin" /> }
                  { literature.isLoading ? 'Searching…' : `Done${literature.results.length ? ` • ${literature.results.length} results` : ''}` }
                </div>

                {/* Progress Steps - hide when report is finished */}
                {(!report || reportLoading) && (
                  <div className="space-y-3">
                    {searchProgress.map((step, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        {step.status === 'completed' && (
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {step.status === 'current' && (
                          <div className="w-5 h-5 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          </div>
                        )}
                        {step.status === 'pending' && (
                          <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                        )}
                        <span className={`text-sm ${
                          step.status === 'completed' ? 'text-gray-900' : 
                          step.status === 'current' ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {step.step}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right rail: Research Metrics & Key Insights */}
              <aside className="lg:col-span-1">
                <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
                  <div className="font-semibold text-gray-900 mb-2">Research Metrics</div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center justify-between"><span>Relevance</span><span>{Math.round(liveMetrics.relevance * 100)}%</span></div>
                    <div className="flex items-center justify-between"><span>Source Diversity</span><span>{Math.round(liveMetrics.diversity * 100)}%</span></div>
                    <div className="flex items-center justify-between"><span>Coverage</span><span>{Math.round(liveMetrics.coverage * 100)}%</span></div>
                    <div className="flex items-center justify-between"><span>Sources</span><span>{liveMetrics.sources}</span></div>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="font-semibold text-gray-900 mb-2">Key Insights</div>
                  {topics.length === 0 ? (
                    <div className="text-sm text-gray-500">Insights will appear after analysis.</div>
                  ) : (
                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                      {topics.slice(0, 5).map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>
            </div>
            
            {/* Insights & Next Actions - replaces Generated/Extracted Topics header */}
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Insights & Next Actions</h3>
              {/* Helpful Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="font-medium text-gray-800 mb-2">Key Insights</div>
                  {topics.length === 0 ? (
                    <div className="text-sm text-gray-500">Insights will appear after sources are analyzed.</div>
                  ) : (
                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                      {topics.slice(0, 6).map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="font-medium text-gray-800 mb-2">Next Actions</div>
                  <ul className="text-sm text-blue-700 space-y-2">
                    <li>
                      <Link href={`/explorer?deep=1&query=${encodeURIComponent(searchQuery)}`} className="hover:underline flex items-center gap-1">
                        <Zap className="w-4 h-4" /> Deep Research in Explorer
                      </Link>
                    </li>
                    <li>
                      <Link href={`/planner`} className="hover:underline">Create a project plan from these insights</Link>
                    </li>
                    <li>
                      <button onClick={generateReport} className="text-blue-700 hover:underline">Generate a long-form report</button>
                    </li>
                  </ul>
                </div>
              </div>
              {/* Topic chips (kept for quick scanning) */}
              {topicsLoading && <div className="text-sm text-gray-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Analyzing sources…</div>}
              {topicsError && <div className="text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {topicsError}</div>}
              {!topicsLoading && topics.length === 0 && (
                <div className="text-sm text-gray-500">Topics will appear here once sources are analyzed.</div>
              )}
              {topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {topics.map((t, i) => (
                    <span key={i} className="px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-sm">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Report - streaming with manual trigger */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Report</h3>
                <div className="flex items-center gap-3 text-sm">
                  {reportStartAt && (
                    <span className="text-gray-600">⏱ {formatDuration(reportElapsedSec)}</span>
                  )}
                  {!reportLoading && (
                    <button onClick={generateReport} className="px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50">Generate Report</button>
                  )}
                </div>
              </div>
              {reportLoading && (
                <div className="text-sm text-gray-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generating report…</div>
              )}
              {reportError && (
                <div className="text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {reportError}</div>
              )}
              {report && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <MarkdownRenderer content={report} className="prose max-w-none" enableMermaid={false} />
                </div>
              )}
            </div>

            {/* Topic Clusters (Live) */}
            {topicsFind.clusters && topicsFind.clusters.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Topic Clusters</h3>
                  <div className="text-xs text-gray-500">live</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveClusterId(null)}
                    className={`px-3 py-1 rounded-full border text-sm ${
                      activeClusterId === null ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    All
                  </button>
                  {topicsFind.clusters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveClusterId(c.id)}
                      className={`px-3 py-1 rounded-full border text-sm ${
                        activeClusterId === c.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 bg-white text-gray-700'
                      }`}
                      title={`${c.size} sources`}
                    >
                      {c.label} <span className="text-gray-400">({c.size})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sources - moved to bottom */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Sources</h3>
                <div className="flex items-center gap-2">
                  <Link href={`/explorer?deep=1&query=${encodeURIComponent(searchQuery)}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <Zap className="w-4 h-4" /> Deep Research in Explorer
                  </Link>
                </div>
              </div>
              {literature.error && !isLive && (
                <div className="flex items-center gap-2 text-red-600 text-sm mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  {literature.error}
                  {literature.isRateLimited && (
                    <>
                      <span className="text-gray-500">{retryInSec !== null ? `(retry in ${retryInSec}s)` : ''}</span>
                      <button
                        className="ml-2 text-blue-600 hover:underline disabled:text-gray-400"
                        onClick={() => literature.retry()}
                        disabled={retryInSec !== null && retryInSec > 0}
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>
              )}
              {isLive ? (
                liveItemsFiltered.length === 0 && !topicsFind.isLoading ? (
                  <div className="text-gray-500 text-sm">No live sources yet.</div>
                ) : (
                  <div className="grid gap-4">
                    {liveItemsFiltered.map((p, idx) => (
                      <Card key={`${p.url}-${idx}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 flex items-start gap-2">
                              {p.title}
                              <ExternalLink className="w-4 h-4 mt-1 text-gray-400" />
                            </a>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-sm text-gray-600">
                          {p.snippet && <p className="line-clamp-3 mb-2">{p.snippet}</p>}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {p.year && <span>{p.year}</span>}
                            {p.source && <span className="uppercase">{p.source}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              ) : (
                literature.results.length === 0 && !literature.isLoading ? (
                  <div className="text-gray-500 text-sm">No sources found. Try another query.</div>
                ) : (
                  <div className="grid gap-4">
                    {literature.results.map((p: Paper) => (
                      <Card key={`${p.id}-${p.url}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 flex items-start gap-2">
                              {p.title}
                              <ExternalLink className="w-4 h-4 mt-1 text-gray-400" />
                            </a>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-sm text-gray-600">
                          {p.abstract && <p className="line-clamp-3 mb-2">{p.abstract}</p>}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {p.journal && <span>{p.journal}</span>}
                            {p.year && <span>{p.year}</span>}
                            {p.authors?.length ? <span>{p.authors.slice(0,3).join(', ')}{p.authors.length>3?' et al.':''}</span> : null}
                            {p.source && <span className="uppercase">{p.source}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              )}
            </div>
            {/* duplicate sections removed */}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex-1">
        {/* Main Content */}
        <div className="px-6 py-16">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Find Topics
            </h1>
            <p className="text-gray-600 text-lg">
              Go deeper within research papers to extract insightful topics.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    searchQuery.trim() && handleSearch(searchQuery)
                  }
                }}
                placeholder="Search for topics across research papers."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              />
              <button 
                onClick={() => searchQuery.trim() && handleSearch(searchQuery)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Suggestions */}
          <div className="max-w-4xl mx-auto">
            <p className="text-gray-600 mb-6 text-center">
              Try asking or searching for:
            </p>
            
            <div className="flex flex-wrap gap-3 justify-center">
              {topicSuggestions.map((suggestion) => {
                const IconComponent = suggestion.icon
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300 transition-colors ${suggestion.bgColor}`}
                  >
                    <IconComponent className={`w-4 h-4 ${suggestion.textColor}`} />
                    <span className="text-sm text-gray-700">{suggestion.text}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
