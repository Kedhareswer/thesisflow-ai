"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { BookOpen, Download, Filter, ExternalLink, FileText, Eye, Calendar, Users, Quote, AlertCircle, Info, Save, Crown, Search, Clock, TrendingUp, Sparkles, Code, Brain, Microscope } from "lucide-react"
import { SearchInput } from "@/components/common/SearchInput"
import { SkeletonList } from "@/components/common/SkeletonCard"
import { useAsync } from "@/lib/hooks/useAsync"
import { useToast } from "@/hooks/use-toast"
import { EnhancedSearchService } from "../enhanced-search"
import { CitationExportService } from "@/lib/services/citation-export.service"
import type { ResearchPaper, SearchFilters } from "@/lib/types/common"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useResearchPapers, useResearchContext } from "@/components/research-session-provider"
import { supabase } from '@/integrations/supabase/client'
import { useUserPlan } from "@/hooks/use-user-plan"

interface EnhancedLiteratureSearchProps {
  className?: string
  initialQuery?: string
}

export function EnhancedLiteratureSearch({ className, initialQuery }: EnhancedLiteratureSearchProps) {
  const { toast } = useToast()
  const { papers: sessionPapers, selectedPapers: sessionSelectedPapers, selectPaper, addPapers } = useResearchPapers()
  const { hasContext, contextSummary } = useResearchContext()
  const { canUseFeature, incrementUsage, getUsageForFeature } = useUserPlan()

  const [showFilters, setShowFilters] = useState(false)
  const [selectedPapers, setSelectedPapers] = useState<Set<string>>(new Set(sessionSelectedPapers.map(p => p.id)))
  const [filters, setFilters] = useState<SearchFilters>({
    publication_year_min: 2020,
    publication_year_max: new Date().getFullYear(),
    sort_by: 'publication_date',
    sort_order: 'desc'
  })
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery || '')
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "convolutional neural network...",
    "transformer models in NLP",
    "reinforcement learning for rob...",
    "AI in drug discovery"
  ])
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Trending topics data
  const trendingTopics = [
    {
      icon: Sparkles,
      title: "Large Language Models",
      description: "Explore the latest in LLMs.",
      query: "large language models"
    },
    {
      icon: Brain,
      title: "Generative AI",
      description: "Creative applications of AI.",
      query: "generative AI"
    },
    {
      icon: Code,
      title: "Quantum Computing",
      description: "Next generation of computing.",
      query: "quantum computing"
    },
    {
      icon: Microscope,
      title: "AI Ethics",
      description: "Responsible AI development.",
      query: "AI ethics"
    },
    {
      icon: TrendingUp,
      title: "Graph Neural Networks",
      description: "Networks and connected data.",
      query: "graph neural networks"
    }
  ]

  // Initialize search state manually since we're using API endpoint
  const [paperSearch, setPaperSearch] = useState<{
    data: any,
    loading: boolean,
    error: string | null
  }>({
    data: null,
    loading: false,
    error: null
  })
  const filterOptions = EnhancedSearchService.getFilterOptions()

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return

    // Check if user can perform literature search
    if (!canUseFeature('literature_searches')) {
      toast({
        title: "Usage Limit Exceeded",
        description: "You've reached your monthly limit for literature searches. Please upgrade your plan to continue.",
        variant: "destructive",
      })
      return
    }

    setLastSearchQuery(query.trim())

    // Add to recent searches (max 4)
    setRecentSearches(prev => {
      const truncatedQuery = query.length > 30 ? query.substring(0, 27) + '...' : query
      const filtered = prev.filter(s => s !== truncatedQuery)
      return [truncatedQuery, ...filtered].slice(0, 4)
    })

    // Set loading state
    setPaperSearch(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Use API endpoint instead of direct service call to avoid CORS issues
      const searchParams = new URLSearchParams({
        query: query.trim(),
        limit: '20'
      })

      // Add filters to search params
      if (filters.publication_year_min) searchParams.set('year_min', filters.publication_year_min.toString())
      if (filters.publication_year_max) searchParams.set('year_max', filters.publication_year_max.toString())
      if (filters.min_citations) searchParams.set('min_citations', filters.min_citations.toString())
      if (filters.open_access !== undefined) searchParams.set('open_access', filters.open_access.toString())
      if (filters.venue_type && filters.venue_type.length > 0) searchParams.set('venue_type', filters.venue_type[0])
      if (filters.sort_by) searchParams.set('sort_by', filters.sort_by)
      if (filters.sort_order) searchParams.set('sort_order', filters.sort_order)
      if (filters.field_of_study && filters.field_of_study.length > 0) searchParams.set('field_of_study', filters.field_of_study.join(','))

      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      const authToken = session?.access_token
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // Add authorization header if we have a token
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }
      
      const response = await fetch(`/api/search/papers?${searchParams.toString()}`, {
        method: 'GET',
        headers
      })
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Transform the API response to match the expected format
      const searchResult = {
        papers: data.data || [],
        total: data.total || 0,
        sources: data.sources || [],
        search_time: data.search_time || 0,
        filters_applied: data.filters_applied || {}
      }

      // Update state with search results
      setPaperSearch(prev => ({ ...prev, data: searchResult, loading: false, error: null }))

      // Add papers to research session
      if (searchResult.papers.length > 0) {
        addPapers(searchResult.papers, query.trim(), filters)

        // Increment usage after successful search (include provider/model context)
        const providerCtx = Array.isArray(searchResult.sources) && searchResult.sources.length > 0
          ? searchResult.sources.join('+')
          : 'explorer'
        await incrementUsage('literature_searches', {
          provider: providerCtx,
          model: 'enhanced-search'
        })
        
        toast({
          title: "Search Complete",
          description: `Found ${searchResult.papers.length} papers from ${searchResult.sources.join(', ') || 'academic databases'} (${searchResult.search_time}ms)${data.fallback ? ' - using demo data' : ''}`,
        })
      } else {
        toast({
          title: "No Results",
          description: "No papers found for your search. Try different keywords or check your filters.",
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to search papers. Please try again."
      setPaperSearch(prev => ({ ...prev, loading: false, error: errorMessage }))
      
      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }, [canUseFeature, filters, toast, addPapers, incrementUsage])

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    
    // Auto-search with debounce when filters change (only if there's a query)
    if (lastSearchQuery.trim()) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        handleSearch(lastSearchQuery)
      }, 500) // 500ms debounce
    }
  }, [lastSearchQuery, handleSearch])

  const handlePaperSelect = (paperId: string, selected: boolean) => {
    const newSelected = new Set(selectedPapers)
    if (selected) {
      newSelected.add(paperId)
    } else {
      newSelected.delete(paperId)
    }
    setSelectedPapers(newSelected)
    
    // Update research session
    selectPaper(paperId, selected)
  }

  const handleSelectAll = () => {
    if (selectedPapers.size === papers.length) {
      setSelectedPapers(new Set())
    } else {
      setSelectedPapers(new Set(papers.map((p: ResearchPaper) => p.id)))
    }
  }

  const handleExport = async (format: 'bibtex' | 'apa' | 'mla' | 'chicago' | 'harvard' | 'json' | 'csv') => {
    const papersToExport = papers.filter((p: ResearchPaper) => selectedPapers.has(p.id))
    
    if (papersToExport.length === 0) {
      toast({
        title: "No Papers Selected",
        description: "Please select papers to export.",
        variant: "destructive",
      })
      return
    }

    try {
      const content = await CitationExportService.exportPapers(papersToExport, format)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `research_papers_${timestamp}.${format === 'bibtex' ? 'bib' : format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'txt'}`
      
      CitationExportService.downloadFile(content, filename, format)
      
      toast({
        title: "Export Complete",
        description: `Exported ${papersToExport.length} papers in ${format.toUpperCase()} format.`,
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export papers.",
        variant: "destructive",
      })
    }
  }

  const papers = paperSearch.data?.papers || []
  const totalPapers = paperSearch.data?.total || 0
  const searchTime = paperSearch.data?.search_time || 0
  const sources = paperSearch.data?.sources || []
  


  // Show hero section only when no search has been performed
  const showHero = !lastSearchQuery && papers.length === 0

  return (
    <div className={className}>
      {/* Upgrade Banner - Only show when user has hit limits */}
      {!canUseFeature('literature_searches') && (
        <div className="mb-6">
          <Card className="border-orange-200 bg-orange-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Crown className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-800">Upgrade to Pro</p>
                    <p className="text-xs text-orange-700">You've reached your monthly limit. Upgrade for unlimited searches.</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={() => window.location.href = '/settings'}
                >
                  Upgrade
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hero Section - Show before first search */}
      {showHero && (
        <div className="space-y-8 mb-8">
          {/* Main Hero */}
          <div className="text-center py-12 bg-gradient-to-b from-white to-gray-50 rounded-lg border border-gray-200">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Discover the Next Big Idea
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Your AI-powered portal to the world of research. Find papers, explore topics,
              <br />and accelerate your discoveries.
            </p>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto px-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search for papers, authors, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchQuery)
                    }
                  }}
                  className="w-full pl-12 pr-32 py-6 text-base border-2 border-gray-200 rounded-full focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="ghost"
                  size="sm"
                  className="absolute right-24 top-1/2 transform -translate-y-1/2"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Searches</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchQuery(search.replace('...', ''))
                      handleSearch(search.replace('...', ''))
                    }}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-sm transition-all text-left"
                  >
                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{search}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Topics */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trending Topics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {trendingTopics.map((topic, index) => {
                const Icon = topic.icon
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchQuery(topic.query)
                      handleSearch(topic.query)
                    }}
                    className="p-5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all text-left group"
                  >
                    <div className="mb-3">
                      <Icon className="h-8 w-8 text-gray-700 group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">{topic.title}</h3>
                    <p className="text-xs text-gray-600">{topic.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Research Context Status */}
      {hasContext && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Research Context:</strong> {contextSummary}
          </AlertDescription>
        </Alert>
      )}

      {/* Search Interface - Show after first search */}
      {!showHero && (
        <div className="mb-4 md:mb-6">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search for papers, authors, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch(searchQuery)
                      }
                    }}
                    className="pl-10 pr-4 border-gray-200"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowFilters(!showFilters)}
                    variant="outline"
                    size="default"
                    className="flex-1 sm:flex-none"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                  <div className="hidden md:flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <Select value="Relevance">
                      <SelectTrigger className="w-32 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Relevance">Relevance</SelectItem>
                        <SelectItem value="Date">Date</SelectItem>
                        <SelectItem value="Citations">Citations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Two-Column Layout for Results */}
      {!showHero && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 md:gap-6">
          {/* Left Sidebar - Filters */}
          <div className="space-y-4 lg:block hidden">
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Publication Year */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-900">Publication Year</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="From"
                        value={filters.publication_year_min}
                        onChange={(e) => handleFilterChange('publication_year_min', parseInt(e.target.value))}
                        className="h-8 text-sm"
                      />
                      <span className="text-gray-500">-</span>
                      <Input
                        type="number"
                        placeholder="To"
                        value={filters.publication_year_max}
                        onChange={(e) => handleFilterChange('publication_year_max', parseInt(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Author */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-900">Author</Label>
                  <Input
                    type="text"
                    placeholder="e.g., A. Vaswani"
                    className="h-8 text-sm"
                  />
                </div>

                {/* Journal / Conference */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-900">Journal / Conference</Label>
                  <Input
                    type="text"
                    placeholder="e.g., NeurIPS"
                    className="h-8 text-sm"
                  />
                </div>

                {/* Include */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-900">Include</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="peer-reviewed"
                      checked={filters.open_access || false}
                      onCheckedChange={(checked) => handleFilterChange('open_access', checked)}
                    />
                    <label htmlFor="peer-reviewed" className="text-sm text-gray-700">
                      Peer reviewed only
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Search Results */}
          <div className="space-y-4">
            {/* Results Header */}
            {papers.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-gray-600">
                  Showing {papers.length} of {totalPapers} results
                  {lastSearchQuery && (
                    <span className="ml-1">for <strong>"{lastSearchQuery}"</strong></span>
                  )}
                </div>
                {papers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-xs"
                    >
                      <span className="hidden sm:inline">{selectedPapers.size === papers.length ? 'Deselect All' : 'Select All'}</span>
                      <span className="sm:hidden">{selectedPapers.size === papers.length ? 'Deselect' : 'Select'}</span>
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={selectedPapers.size === 0} className="text-xs">
                          <Download className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Export</span> ({selectedPapers.size})
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Export Selected Papers</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <Button onClick={() => handleExport('bibtex')} variant="outline">
                            BibTeX (.bib)
                          </Button>
                          <Button onClick={() => handleExport('apa')} variant="outline">
                            APA Style
                          </Button>
                          <Button onClick={() => handleExport('mla')} variant="outline">
                            MLA Style
                          </Button>
                          <Button onClick={() => handleExport('chicago')} variant="outline">
                            Chicago Style
                          </Button>
                          <Button onClick={() => handleExport('harvard')} variant="outline">
                            Harvard Style
                          </Button>
                          <Button onClick={() => handleExport('json')} variant="outline">
                            JSON Data
                          </Button>
                          <Button onClick={() => handleExport('csv')} variant="outline">
                            CSV Spreadsheet
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            {paperSearch.loading && <SkeletonList count={3} />}

            {/* Paper Cards */}
            {papers.length > 0 && (
              <div className="relative space-y-4">
                {papers.map((paper: ResearchPaper, paperIndex: number) => (
                  <Card
                    key={paper.id}
                    className={`border-gray-200 hover:shadow-md transition-all duration-300 bg-white ${
                      paperIndex < 3 ? 'sticky' : ''
                    }`}
                    style={{
                      top: paperIndex < 3 ? `${paperIndex * 20}px` : undefined,
                      zIndex: paperIndex < 3 ? paperIndex + 1 : 1
                    }}
                  >
                    <CardContent className="p-4 md:p-6">
                      {/* Paper Title */}
                      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2 md:mb-3 leading-snug">
                        {paper.title}
                      </h3>

                      {/* Authors and Venue */}
                      <div className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3">
                        {paper.authors && paper.authors.length > 0 && (
                          <span>
                            {paper.authors.slice(0, 5).join(", ")}
                            {paper.authors.length > 5 ? ", ..." : ""}
                          </span>
                        )}
                        {paper.journal && (
                          <span className="ml-2">
                            <br />
                            {paper.journal} {paper.year}
                          </span>
                        )}
                      </div>

                      {/* Abstract */}
                      {paper.abstract && (
                        <p className="text-xs md:text-sm text-gray-700 mb-3 md:mb-4 leading-relaxed line-clamp-2 md:line-clamp-3">
                          {paper.abstract}
                        </p>
                      )}

                      {/* Meta Info */}
                      <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4 text-xs md:text-sm flex-wrap">
                        {paper.cited_by_count !== undefined && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <span className="font-medium">Citations: {paper.cited_by_count}</span>
                          </div>
                        )}
                        {paper.venue_type && (
                          <Badge variant="secondary" className="text-xs">
                            {paper.venue_type}
                          </Badge>
                        )}
                        {paper.open_access?.is_oa && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                            Open Access
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 md:gap-3 pt-2 md:pt-3 border-t border-gray-100 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-700 hover:text-primary text-xs"
                          onClick={() => handlePaperSelect(paper.id, !selectedPapers.has(paper.id))}
                        >
                          <Save className="h-3 md:h-4 w-3 md:w-4 mr-1" />
                          {selectedPapers.has(paper.id) ? 'Saved' : 'Save'}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-700 hover:text-primary text-xs">
                          <Quote className="h-3 md:h-4 w-3 md:w-4 mr-1" />
                          Cite
                        </Button>
                        {paper.pdf_url && (
                          <Button variant="ghost" size="sm" asChild className="text-gray-700 hover:text-primary text-xs">
                            <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-3 md:h-4 w-3 md:w-4 mr-1" />
                              PDF
                            </a>
                          </Button>
                        )}
                        {paper.url && (
                          <Button variant="ghost" size="sm" asChild className="text-gray-700 hover:text-primary ml-auto text-xs">
                            <a href={paper.url} target="_blank" rel="noopener noreferrer">
                              <span className="hidden sm:inline">View Paper</span>
                              <span className="sm:hidden">View</span>
                              <ExternalLink className="h-3 md:h-4 w-3 md:w-4 ml-1" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* No Results */}
            {papers.length === 0 && !paperSearch.loading && !paperSearch.error && lastSearchQuery && (
              <Card className="border-gray-200">
                <CardContent className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                  <p className="text-sm text-gray-600">
                    Try adjusting your search terms or filters
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {paperSearch.error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-red-600">{paperSearch.error}</p>
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {papers.length > 0 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-600">
                  Showing 1 to {Math.min(10, papers.length)} of {totalPapers} results
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
