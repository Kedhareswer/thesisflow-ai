"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, FileText, Zap, CheckCircle } from "lucide-react"
import { useResearchSession } from "@/components/research-session-provider"
import { useToast } from "@/hooks/use-toast"

interface CitationSuggestion {
  paperId: string
  paper: any
  relevanceScore: number
  contextSnippet: string
  suggestedPosition: number
  reason: string
}

interface CitationSuggesterProps {
  selectedText: string
  onSuggestionsReady: (suggestions: CitationSuggestion[]) => void
  onInsertCitation: (paperIds: string[], position: number) => void
}

export function CitationSuggester({ selectedText, onSuggestionsReady, onInsertCitation }: CitationSuggesterProps) {
  const [suggestions, setSuggestions] = useState<CitationSuggestion[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { getSelectedPapers } = useResearchSession()
  const { toast } = useToast()

  // Simple TF-IDF based relevance scoring
  const calculateRelevance = (text: string, paper: any): number => {
    if (!text || !paper) return 0
    
    const textLower = text.toLowerCase()
    const paperText = [
      paper.title || '',
      paper.abstract || '',
      Array.isArray(paper.authors) ? paper.authors.map((a: any) => typeof a === 'string' ? a : a?.name || '').join(' ') : '',
      paper.journal?.title || paper.journal || '',
      ...(paper.keywords || [])
    ].join(' ').toLowerCase()

    // Extract key terms (simple approach)
    const textTerms: string[] = textLower.match(/\b\w{4,}\b/g) || []
    const paperTerms: string[] = paperText.match(/\b\w{4,}\b/g) || []
    
    // Calculate overlap score
    const commonTerms = textTerms.filter((term) => paperTerms.includes(term))
    const jaccard = commonTerms.length / (new Set([...textTerms, ...paperTerms]).size || 1)
    
    // Boost for title matches
    const titleBoost = paper.title && textLower.includes(paper.title.toLowerCase()) ? 0.3 : 0
    
    // Boost for author matches
    const authorBoost = Array.isArray(paper.authors) && paper.authors.some((a: any) => {
      const name = typeof a === 'string' ? a : a?.name || ''
      return textLower.includes(name.toLowerCase())
    }) ? 0.2 : 0

    return Math.min(1, jaccard + titleBoost + authorBoost)
  }

  const generateSuggestions = async () => {
    if (!selectedText.trim()) return
    
    setIsAnalyzing(true)
    try {
      const papers = getSelectedPapers()
      if (papers.length === 0) {
        toast({ title: "No papers available", description: "Add papers in Explorer first." })
        return
      }

      // Score papers by relevance to selected text
      const scored = papers.map(paper => ({
        paperId: String(paper.id),
        paper,
        relevanceScore: calculateRelevance(selectedText, paper),
        contextSnippet: selectedText.slice(0, 100) + (selectedText.length > 100 ? '...' : ''),
        suggestedPosition: selectedText.length, // Insert at end of selection
        reason: ''
      }))

      // Filter and sort by relevance
      const relevant = scored
        .filter(s => s.relevanceScore > 0.1) // Minimum threshold
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5) // Top 5 suggestions
        .map(s => ({
          ...s,
          reason: s.relevanceScore > 0.5 ? 'High relevance' : 
                  s.relevanceScore > 0.3 ? 'Medium relevance' : 'Low relevance'
        }))

      setSuggestions(relevant)
      onSuggestionsReady(relevant)
      
      if (relevant.length > 0) {
        toast({ 
          title: "Citations suggested", 
          description: `Found ${relevant.length} relevant paper(s) for your selection.` 
        })
      }
    } catch (error) {
      console.error('Citation suggestion failed:', error)
      toast({ 
        title: "Suggestion failed", 
        description: "Could not analyze selected text for citations.",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  useEffect(() => {
    if (selectedText.trim().length > 20) { // Only for substantial selections
      generateSuggestions()
    }
  }, [selectedText])

  const handleInsertSuggestion = (suggestion: CitationSuggestion) => {
    onInsertCitation([suggestion.paperId], suggestion.suggestedPosition)
    toast({ 
      title: "Citation inserted", 
      description: `Added citation for "${suggestion.paper.title?.slice(0, 50) || 'Untitled'}..."` 
    })
  }

  const handleInsertMultiple = () => {
    const topSuggestions = suggestions.slice(0, 3).filter(s => s.relevanceScore > 0.3)
    if (topSuggestions.length > 0) {
      onInsertCitation(
        topSuggestions.map(s => s.paperId), 
        topSuggestions[0].suggestedPosition
      )
      toast({ 
        title: "Multiple citations inserted", 
        description: `Added ${topSuggestions.length} citations.` 
      })
    }
  }

  if (!selectedText.trim() || suggestions.length === 0) {
    return null
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Citation Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground mb-2">
          For: "{selectedText.slice(0, 60)}{selectedText.length > 60 ? '...' : ''}"
        </div>
        
        {isAnalyzing ? (
          <div className="text-xs text-muted-foreground">Analyzing relevance...</div>
        ) : (
          <>
            <div className="space-y-1">
              {suggestions.map((suggestion, i) => (
                <div key={suggestion.paperId} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                  <div className="flex-1">
                    <div className="font-medium truncate">
                      {suggestion.paper.title?.slice(0, 40) || 'Untitled'}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Badge variant="outline" className="h-4 px-1 text-xs">
                        {Math.round(suggestion.relevanceScore * 100)}%
                      </Badge>
                      <span>{suggestion.reason}</span>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-2"
                    onClick={() => handleInsertSuggestion(suggestion)}
                  >
                    <CheckCircle className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {suggestions.filter(s => s.relevanceScore > 0.3).length > 1 && (
              <Button 
                size="sm" 
                className="w-full h-7 text-xs"
                onClick={handleInsertMultiple}
              >
                <Zap className="h-3 w-3 mr-1" />
                Insert Top {Math.min(3, suggestions.filter(s => s.relevanceScore > 0.3).length)}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default CitationSuggester
