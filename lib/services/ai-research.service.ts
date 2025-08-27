import { LiteratureSearchService } from './literature-search.service'
import { createClient } from '@supabase/supabase-js'

interface SearchSource {
  name: string
  count: number
  papers?: any[]
}

interface ResearchProgress {
  phase: string
  message: string
  progress: number
  sources?: SearchSource[]
}

interface ResearchResult {
  query: string
  papers: any[]
  sources: SearchSource[]
  summary: string
  keyFindings: string[]
  nextSteps: string[]
  totalPapers: number
}

export class AIResearchService {
  private literatureSearch: LiteratureSearchService
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  constructor() {
    this.literatureSearch = new LiteratureSearchService(this.supabase)
  }

  async conductResearch(
    query: string,
    onProgress?: (progress: ResearchProgress) => void
  ): Promise<ResearchResult> {
    
    // Phase 1: Initial Literature Search
    onProgress?.({
      phase: 'searching',
      message: 'Searching academic databases...',
      progress: 10
    })

    const searchResults = await this.performLiteratureSearch(query)
    
    onProgress?.({
      phase: 'searching',
      message: 'Found initial papers, expanding search...',
      progress: 25,
      sources: searchResults.sources
    })

    // Phase 2: Expand search with related terms
    const expandedResults = await this.expandSearch(query, searchResults)
    
    onProgress?.({
      phase: 'analyzing',
      message: 'Analyzing paper quality and relevance...',
      progress: 50,
      sources: expandedResults.sources
    })

    // Phase 3: Quality analysis and filtering
    const filteredPapers = await this.filterAndRankPapers(expandedResults.papers)
    
    onProgress?.({
      phase: 'analyzing',
      message: 'Extracting key insights from top papers...',
      progress: 70
    })

    // Phase 4: Content analysis and insight extraction
    const insights = await this.extractInsights(filteredPapers, query)
    
    onProgress?.({
      phase: 'synthesizing',
      message: 'Synthesizing findings and generating report...',
      progress: 90
    })

    // Phase 5: Generate comprehensive summary
    const summary = await this.generateSummary(query, insights, filteredPapers)
    
    onProgress?.({
      phase: 'completed',
      message: 'Research complete! Generated comprehensive analysis.',
      progress: 100
    })

    return {
      query,
      papers: filteredPapers,
      sources: expandedResults.sources,
      summary: summary.text,
      keyFindings: summary.keyFindings,
      nextSteps: summary.nextSteps,
      totalPapers: filteredPapers.length
    }
  }

  private async performLiteratureSearch(query: string) {
    try {
      const results = await this.literatureSearch.searchPapers(query, 50)
      
      return {
        papers: results.papers || [],
        sources: [
          { name: 'OpenAlex', count: results.papers?.filter((p: any) => p.source === 'openalex').length || 0 },
          { name: 'arXiv', count: results.papers?.filter((p: any) => p.source === 'arxiv').length || 0 },
          { name: 'CrossRef', count: results.papers?.filter((p: any) => p.source === 'crossref').length || 0 }
        ]
      }
    } catch (error) {
      console.error('Literature search failed:', error)
      return { papers: [], sources: [] }
    }
  }

  private async expandSearch(originalQuery: string, initialResults: any) {
    // Generate related search terms from initial results
    const relatedTerms = this.extractRelatedTerms(initialResults.papers, originalQuery)
    const allPapers = [...initialResults.papers]
    const sources = [...initialResults.sources]

    // Search with related terms
    for (const term of relatedTerms.slice(0, 3)) {
      try {
        const additionalResults = await this.literatureSearch.searchPapers(term, 20)
        if (additionalResults.papers) {
          allPapers.push(...additionalResults.papers)
          
          // Update source counts
          sources.forEach(source => {
            const additionalCount = additionalResults.papers?.filter((p: any) => 
              p.source === source.name.toLowerCase().replace(' ', '')
            ).length || 0
            source.count += additionalCount
          })
        }
      } catch (error) {
        console.error(`Failed to search for term: ${term}`, error)
      }
    }

    return { papers: allPapers, sources }
  }

  private extractRelatedTerms(papers: any[], originalQuery: string): string[] {
    // Simple related term extraction from abstracts and titles
    const terms = new Set<string>()
    const queryWords = originalQuery.toLowerCase().split(' ')
    
    papers.forEach(paper => {
      const text = `${paper.title || ''} ${paper.abstract || ''}`.toLowerCase()
      
      // Extract potential related terms (simple approach)
      const words = text.split(/\W+/)
      words.forEach((word: string) => {
        if (word.length > 4 && !queryWords.includes(word)) {
          terms.add(word)
        }
      })
    })
    
    // Return most relevant terms (you could improve this with TF-IDF or ML)
    return Array.from(terms).slice(0, 5)
  }

  private async filterAndRankPapers(papers: any[]) {
    // Remove duplicates and rank by relevance
    const uniquePapers = papers.filter((paper, index, self) => 
      index === self.findIndex(p => p.title === paper.title || p.doi === paper.doi)
    )

    // Simple ranking based on citations and recency
    return uniquePapers
      .sort((a, b) => {
        const scoreA = (a.citations || 0) + (new Date(a.year).getFullYear() - 2020) * 10
        const scoreB = (b.citations || 0) + (new Date(b.year).getFullYear() - 2020) * 10
        return scoreB - scoreA
      })
      .slice(0, 50) // Keep top 50 papers
  }

  private async extractInsights(papers: any[], query: string) {
    // Analyze abstracts and extract key themes
    const abstracts = papers.map(p => p.abstract).filter(Boolean)
    
    // Simple keyword extraction (in production, you'd use NLP/ML)
    const keywords = new Map<string, number>()
    const trends = new Map<string, number>()
    
    abstracts.forEach(abstract => {
      const words = abstract.toLowerCase().split(/\W+/)
      words.forEach((word: string) => {
        if (word.length > 4) {
          keywords.set(word, (keywords.get(word) || 0) + 1)
        }
      })
    })

    return {
      topKeywords: Array.from(keywords.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10),
      papers: papers.slice(0, 20) // Top papers for analysis
    }
  }

  private async generateSummary(query: string, insights: any, papers: any[]) {
    const topPapers = papers.slice(0, 10)
    const recentPapers = papers.filter(p => parseInt(p.year) >= 2020).length
    const totalCitations = papers.reduce((sum, p) => sum + (p.citations || 0), 0)
    
    // Generate dynamic summary based on actual data
    const summary = {
      text: `# Research Analysis: ${query}

## Overview
I've conducted a comprehensive analysis of your research topic by searching multiple academic databases and analyzing ${papers.length} relevant papers.

## Key Statistics
- **Total Papers Analyzed**: ${papers.length}
- **Recent Papers (2020+)**: ${recentPapers}
- **Total Citations**: ${totalCitations.toLocaleString()}
- **Average Citations per Paper**: ${Math.round(totalCitations / papers.length)}

## Top Research Areas
${insights.topKeywords.slice(0, 5).map(([keyword, count]: [string, number]) => 
  `- **${keyword}**: Mentioned in ${count} papers`
).join('\n')}

## Most Influential Papers
${topPapers.slice(0, 5).map((paper, i) => 
  `${i + 1}. **${paper.title}** (${paper.year}) - ${paper.citations || 0} citations`
).join('\n')}

## Research Trends
Based on the analysis, the field shows strong activity in:
${insights.topKeywords.slice(0, 3).map(([keyword]: [string, number]) => `- ${keyword}`).join('\n')}

The data indicates ${recentPapers > papers.length * 0.5 ? 'active and growing' : 'established'} research interest with ${
  totalCitations > 1000 ? 'high impact' : 'moderate impact'
} in the academic community.`,
      
      keyFindings: [
        `Analyzed ${papers.length} papers from multiple databases`,
        `${recentPapers} recent publications indicate ${recentPapers > papers.length * 0.5 ? 'growing' : 'stable'} research activity`,
        `Top research themes: ${insights.topKeywords.slice(0, 3).map(([k]: [string, number]) => k).join(', ')}`,
        `Average citation impact: ${Math.round(totalCitations / papers.length)} citations per paper`
      ],
      
      nextSteps: [
        'Generate a detailed literature review document',
        'Create citation network visualizations',
        'Export findings to PDF/Word format',
        'Analyze specific subtopics in greater depth',
        'Track emerging trends and recent developments'
      ]
    }

    return summary
  }
}
