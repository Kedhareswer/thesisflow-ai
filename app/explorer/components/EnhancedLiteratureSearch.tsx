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
import { BookOpen, Download, Filter, ExternalLink, FileText, Eye, Calendar, Users, Quote, AlertCircle, Info, Save, Crown } from "lucide-react"
import { SearchInput } from "@/components/common/SearchInput"
import { SkeletonList } from "@/components/common/SkeletonCard"
import { useAsync } from "@/lib/hooks/useAsync"
import { useToast } from "@/hooks/use-toast"
import { EnhancedSearchService } from "../enhanced-search"
import { CitationExportService } from "@/lib/services/citation-export.service"
import type { ResearchPaper, SearchFilters } from "@/lib/types/common"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useResearchPapers, useResearchContext } from "@/components/research-session-provider"
import { createClient } from '@supabase/supabase-js'
import { useUserPlan } from "@/hooks/use-user-plan"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
    publication_year_min: 2010,
    publication_year_max: new Date().getFullYear(),
    sort_by: 'relevance',
    sort_order: 'desc'
  })
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('')
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
        
        // Increment usage after successful search
        await incrementUsage('literature_searches')
        
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
  


  return (
    <div className={className}>
      {/* Upgrade Banner - Only show when user has hit limits */}
      {!canUseFeature('literature_searches') && (
        <div className="mb-4">
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
      
      {/* Research Context Status */}
      {hasContext && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Research Context:</strong> {contextSummary}
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Enhanced Literature Search
          </CardTitle>
          <CardDescription>
            Advanced search with citation data, filtering, and export capabilities. Papers are automatically saved to your research session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchInput
            placeholder="Search for papers, authors, or keywords..."
            onSearch={handleSearch}
            className="w-full"
            showButton={true}
            buttonText="Search Literature"
            initialValue={initialQuery}
          />

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            
            {papers.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedPapers.size === papers.length ? 'Deselect All' : 'Select All'}
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={selectedPapers.size === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      Export ({selectedPapers.size})
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
              </>
            )}
          </div>

          {showFilters && (
            <Card className="p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Publication Year Range</Label>
                  <div className="px-2">
                    <Slider
                      value={[filters.publication_year_min || 2010, filters.publication_year_max || new Date().getFullYear()]}
                      onValueChange={([min, max]) => {
                        handleFilterChange('publication_year_min', min)
                        handleFilterChange('publication_year_max', max)
                      }}
                      min={1990}
                      max={new Date().getFullYear()}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{filters.publication_year_min}</span>
                      <span>{filters.publication_year_max}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Venue Type</Label>
                  <Select
                    value={filters.venue_type?.[0] || 'all'}
                    onValueChange={(value) => handleFilterChange('venue_type', value === 'all' ? [] : [value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any venue type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {filterOptions.venue_types.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select
                    value={filters.sort_by || 'relevance'}
                    onValueChange={(value) => handleFilterChange('sort_by', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.sort_options.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Minimum Citations</Label>
                  <Slider
                    value={[filters.min_citations || 0]}
                    onValueChange={([value]) => handleFilterChange('min_citations', value)}
                    min={0}
                    max={1000}
                    step={10}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">{filters.min_citations || 0}+ citations</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="open-access"
                    checked={filters.open_access || false}
                    onCheckedChange={(checked) => handleFilterChange('open_access', checked)}
                  />
                  <Label htmlFor="open-access">Open Access Only</Label>
                </div>
              </div>
            </Card>
          )}
        </CardContent>
      </Card>

      {paperSearch.loading && <SkeletonList count={3} />}

      {/* Show status alerts */}
      {papers.length > 0 && sources.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Found {totalPapers} papers from {sources.join(', ')} in {searchTime}ms. 
            Citation data enhanced where available.
          </AlertDescription>
        </Alert>
      )}

      {papers.length === 0 && !paperSearch.loading && !paperSearch.error && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No papers found from available sources. Try different keywords or check if search services are available.
          </AlertDescription>
        </Alert>
      )}

      {papers.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="w-12 p-4 text-left">
                      <Checkbox
                        checked={selectedPapers.size === papers.length && papers.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4 text-left font-medium text-gray-900">Paper Name & Date</th>
                    <th className="p-4 text-left font-medium text-gray-900">Metadata</th>
                    <th className="p-4 text-left font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {papers.map((paper: ResearchPaper) => (
                    <tr key={paper.id} className="border-b hover:bg-gray-50 transition-colors">
                      {/* Select Column */}
                      <td className="p-4">
                        <Checkbox
                          checked={selectedPapers.has(paper.id)}
                          onCheckedChange={(checked) => handlePaperSelect(paper.id, checked as boolean)}
                        />
                      </td>
                      
                      {/* Paper Name & Date Column */}
                      <td className="p-4">
                        <div className="space-y-2">
                          <h3 className="font-medium text-gray-900 leading-tight line-clamp-2">
                            {paper.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {paper.authors && paper.authors.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>
                                  {paper.authors.slice(0, 2).join(", ")}
                                  {paper.authors.length > 2 ? " et al." : ""}
                                </span>
                              </div>
                            )}
                            {paper.year && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{paper.year}</span>
                              </div>
                            )}
                          </div>
                          {paper.tldr && (
                            <div className="bg-blue-50 p-2 rounded text-xs">
                              <span className="font-medium text-blue-800">TL;DR:</span>
                              <span className="text-blue-700 ml-1">{paper.tldr}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Metadata Column */}
                      <td className="p-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {paper.venue_type && (
                              <Badge variant="secondary" className="text-xs">
                                {paper.venue_type}
                              </Badge>
                            )}
                            {paper.open_access?.is_oa && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                Open Access
                              </Badge>
                            )}
                            {paper.source && (
                              <Badge variant="outline" className="text-xs">
                                {paper.source}
                              </Badge>
                            )}
                            {paper.id?.includes('mock-') && (
                              <Badge variant="outline" className="text-xs text-orange-600">
                                Demo Data
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            {paper.cited_by_count !== undefined && (
                              <div className="flex items-center gap-1">
                                <Quote className="h-3 w-3" />
                                <span>{paper.cited_by_count} citations</span>
                              </div>
                            )}
                            {paper.journal && (
                              <div className="text-xs text-gray-500">
                                {paper.journal}
                              </div>
                            )}
                          </div>
                          
                          {paper.abstract && (
                            <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                              {paper.abstract}
                            </p>
                          )}
                        </div>
                      </td>
                      
                      {/* Actions Column */}
                      <td className="p-4">
                        <div className="flex gap-2 flex-wrap">
                          {paper.url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={paper.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View Paper
                              </a>
                            </Button>
                          )}
                          {paper.pdf_url && paper.pdf_url !== paper.url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-3 w-3 mr-1" />
                                PDF
                              </a>
                            </Button>
                          )}
                          {paper.doi && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-3 w-3 mr-1" />
                                DOI
                              </a>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {paperSearch.error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">{paperSearch.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
