"use client"

import React, { useEffect, useState } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { Search, Loader2, Check, BarChart3, Sun, Heart, Leaf, TrendingDown, ExternalLink, AlertTriangle, Zap } from "lucide-react"
import Link from "next/link"
import { useLiteratureSearch, type Paper } from "@/hooks/use-literature-search"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  const [qualityMode, setQualityMode] = useState<'Standard' | 'High Quality'>('Standard')
  const [timeLeft, setTimeLeft] = useState(6)

  // Real results via literature search. Use aggregateWindowMs to minimize API calls and avoid 429s.
  // With aggregateWindowMs > 0, the hook uses the fetch path (cache-first + aggregation) instead of SSE.
  const literature = useLiteratureSearch({ defaultLimit: 20, useSSE: true, aggregateWindowMs: 120000 })

  // AI-extracted topics from the returned papers
  const [topics, setTopics] = useState<string[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [topicsError, setTopicsError] = useState<string | null>(null)

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

  const searchProgress: SearchProgress[] = [
    { step: 'Finding relevant papers', status: 'completed' },
    { step: 'Finding topics in papers', status: 'completed' },
    { step: 'Finding topics from external sources', status: 'current' },
    { step: 'Extracting unique topics', status: 'pending' },
    { step: 'Preparing final results', status: 'pending' }
  ]

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
    setIsSearching(true)
    setSearchMode('results')
    
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
          if (uid) {
            literature.search(query, 20, uid)
          } else {
            literature.search(query, 20)
          }
        } catch {
          literature.search(query, 20)
        }
      })()
    } catch {
      // noop
    }
  }

  const handleSuggestionClick = (suggestion: TopicSuggestion) => {
    handleSearch(suggestion.text)
  }

  // When search results finish streaming or at least a handful loaded, compute topics via AI (best-effort)
  useEffect(() => {
    const papers = literature.results || []
    if (papers.length >= 6 && !topicsLoading && topics.length === 0) {
      ;(async () => {
        setTopicsLoading(true)
        setTopicsError(null)
        try {
          const titles = papers.slice(0, 30).map(p => `- ${p.title}`).join('\n')
          const abstracts = papers.slice(0, 12).map(p => `- ${p.abstract?.slice(0, 300) || ''}`).join('\n')
          const prompt = `You are an expert research analyst. Given the following paper titles and short abstracts, extract 10-15 concise research topics/themes. Respond ONLY as a JSON array of short strings.\n\nTITLES:\n${titles}\n\nABSTRACT SNIPPETS:\n${abstracts}\n\nReturn format example: ["Topic A", "Topic B", ...]`
          const { enhancedAIService } = await import("@/lib/enhanced-ai-service")
          const resp = await enhancedAIService.generateText({ prompt, temperature: 0.3, maxTokens: 600 })
          if (resp.success) {
            try {
              const arr = JSON.parse(resp.content || '[]') as string[]
              if (Array.isArray(arr) && arr.length) {
                setTopics(arr.slice(0, 15))
              }
            } catch {
              // Fallback: split by lines
              const raw = (resp.content || '').split('\n').map(s => s.replace(/^[-•]\s*/, '').trim()).filter(Boolean)
              setTopics(raw.slice(0, 15))
            }
          } else {
            setTopicsError(resp.error || 'Failed to extract topics')
          }
        } catch (e) {
          setTopicsError('AI extraction unavailable. Configure an AI provider in Settings to enable topic extraction.')
        } finally {
          setTopicsLoading(false)
        }
      })()
    }
  }, [literature.results, topicsLoading, topics.length])

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
                    onClick={() => setQualityMode('High Quality')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      qualityMode === 'High Quality' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    High Quality
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
            <div className="max-w-2xl">
              <p className="text-gray-700 mb-2">
                Getting topics and sources for '{searchQuery}'.
              </p>
              <div className="text-sm text-gray-600 mb-6 flex items-center gap-2">
                { (isSearching || literature.isLoading) && <Loader2 className="w-4 h-4 animate-spin" /> }
                { literature.isLoading ? 'Searching…' : `Done${literature.results.length ? ` • ${literature.results.length} results` : ''}` }
              </div>

              {/* Progress Steps */}
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
            </div>
            
            {/* Results Section */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Sources</h3>
                <div className="flex items-center gap-2">
                  <Link href={`/explorer?deep=1&query=${encodeURIComponent(searchQuery)}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <Zap className="w-4 h-4" /> Deep Research in Explorer
                  </Link>
                </div>
              </div>
              {literature.error && (
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
              {literature.results.length === 0 && !literature.isLoading ? (
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
              )}
            </div>

            {/* Extracted Topics */}
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Extracted Topics</h3>
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
                onKeyPress={(e) => e.key === 'Enter' && searchQuery.trim() && handleSearch(searchQuery)}
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
