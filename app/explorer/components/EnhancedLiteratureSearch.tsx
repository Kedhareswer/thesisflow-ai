"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { BookOpen, Download, Filter, ExternalLink, FileText, Eye, Calendar, Users, Quote } from "lucide-react"
import { SearchInput } from "@/components/common/SearchInput"
import { SkeletonList } from "@/components/common/SkeletonCard"
import { useAsync } from "@/lib/hooks/useAsync"
import { useToast } from "@/hooks/use-toast"
import { EnhancedSearchService } from "../enhanced-search"
import { CitationExportService } from "@/lib/services/citation-export.service"
import type { ResearchPaper, SearchFilters } from "@/lib/types/common"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface EnhancedLiteratureSearchProps {
  className?: string
}

export function EnhancedLiteratureSearch({ className }: EnhancedLiteratureSearchProps) {
  const { toast } = useToast()
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPapers, setSelectedPapers] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<SearchFilters>({
    publication_year_min: 2010,
    publication_year_max: new Date().getFullYear(),
    sort_by: "relevance",
    sort_order: "desc",
  })

  const paperSearch = useAsync<any>(EnhancedSearchService.searchPapers)
  const filterOptions = EnhancedSearchService.getFilterOptions()

  const handleSearch = async (query: string) => {
    if (!query.trim()) return

    try {
      await paperSearch.execute(query, filters, 20)
      toast({
        title: "Search Complete",
        description: `Found papers from ${paperSearch.data?.sources?.join(", ") || "academic databases"} in ${paperSearch.data?.search_time || 0}ms`,
      })
    } catch (error) {
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search papers. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handlePaperSelect = (paperId: string, selected: boolean) => {
    const newSelected = new Set(selectedPapers)
    if (selected) {
      newSelected.add(paperId)
    } else {
      newSelected.delete(paperId)
    }
    setSelectedPapers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedPapers.size === papers.length) {
      setSelectedPapers(new Set())
    } else {
      setSelectedPapers(new Set(papers.map((p) => p.id)))
    }
  }

  const handleExport = async (format: "bibtex" | "apa" | "mla" | "chicago" | "harvard" | "json" | "csv") => {
    const papersToExport = papers.filter((p) => selectedPapers.has(p.id))

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
      const timestamp = new Date().toISOString().split("T")[0]
      const filename = `research_papers_${timestamp}.${format === "bibtex" ? "bib" : format === "json" ? "json" : format === "csv" ? "csv" : "txt"}`

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Enhanced Literature Search
          </CardTitle>
          <CardDescription>Advanced search with citation data, filtering, and export capabilities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchInput
            placeholder="Search for papers, authors, or keywords..."
            onSearch={handleSearch}
            className="w-full"
            showButton={true}
            buttonText="Search Literature"
          />

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>

            {papers.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedPapers.size === papers.length ? "Deselect All" : "Select All"}
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
                      <Button onClick={() => handleExport("bibtex")} variant="outline">
                        BibTeX (.bib)
                      </Button>
                      <Button onClick={() => handleExport("apa")} variant="outline">
                        APA Style
                      </Button>
                      <Button onClick={() => handleExport("mla")} variant="outline">
                        MLA Style
                      </Button>
                      <Button onClick={() => handleExport("chicago")} variant="outline">
                        Chicago Style
                      </Button>
                      <Button onClick={() => handleExport("harvard")} variant="outline">
                        Harvard Style
                      </Button>
                      <Button onClick={() => handleExport("json")} variant="outline">
                        JSON Data
                      </Button>
                      <Button onClick={() => handleExport("csv")} variant="outline">
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
                      value={[
                        filters.publication_year_min || 2010,
                        filters.publication_year_max || new Date().getFullYear(),
                      ]}
                      onValueChange={([min, max]) => {
                        handleFilterChange("publication_year_min", min)
                        handleFilterChange("publication_year_max", max)
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
                    value={filters.venue_type?.[0] ?? "all"}
                    onValueChange={(value) => handleFilterChange("venue_type", value === "all" ? [] : [value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any venue type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {filterOptions.venue_types.map((option) => (
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
                    value={filters.sort_by || "relevance"}
                    onValueChange={(value) => handleFilterChange("sort_by", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.sort_options.map((option) => (
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
                    onValueChange={([value]) => handleFilterChange("min_citations", value)}
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
                    onCheckedChange={(checked) => handleFilterChange("open_access", checked)}
                  />
                  <Label htmlFor="open-access">Open Access Only</Label>
                </div>
              </div>
            </Card>
          )}
        </CardContent>
      </Card>

      {paperSearch.loading && <SkeletonList count={3} />}

      {papers.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              Found {totalPapers} papers from {sources.join(", ")} ({searchTime}ms)
            </span>
          </div>

          {papers.map((paper: ResearchPaper) => (
            <Card key={paper.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedPapers.has(paper.id)}
                    onCheckedChange={(checked) => handlePaperSelect(paper.id, checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight mb-2">{paper.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      {paper.authors && paper.authors.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>
                            {paper.authors.slice(0, 3).join(", ")}
                            {paper.authors.length > 3 ? " et al." : ""}
                          </span>
                        </div>
                      )}
                      {paper.year && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{paper.year}</span>
                        </div>
                      )}
                      {paper.cited_by_count !== undefined && (
                        <div className="flex items-center gap-1">
                          <Quote className="h-3 w-3" />
                          <span>{paper.cited_by_count} citations</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
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
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {paper.tldr && (
                  <div className="bg-blue-50 p-3 rounded-md mb-3">
                    <p className="text-sm text-blue-800 font-medium">TL;DR:</p>
                    <p className="text-sm text-blue-700">{paper.tldr}</p>
                  </div>
                )}

                {paper.abstract && <p className="text-sm text-gray-700 mb-4 line-clamp-3">{paper.abstract}</p>}

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
              </CardContent>
            </Card>
          ))}
        </div>
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
