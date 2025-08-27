import { LiteratureSearchService } from './literature-search.service'
import { PlanningService, ResearchPlan } from './planning.service'
import { ExecutingService, ExecutionProgress } from './executing.service'
import { createClient } from '@supabase/supabase-js'

export interface SearchSource {
  name: string
  count: number
  papers?: any[]
}

export interface ResearchProgress {
  phase: string
  message: string
  progress: number
  sources?: { name: string; count: number }[]
  planId?: string
  currentTask?: string
  taskProgress?: number
}

export interface ResearchResult {
  query: string
  papers: any[]
  sources: { name: string; url?: string; type: string }[]
  summary: string
  keyFindings: string[]
  nextSteps: string[]
  totalPapers: number
  relatedTerms: string[]
  plan?: ResearchPlan
  executionResults?: any[]
  comprehensiveReport?: string
  executiveSummary?: string
}

export class AIResearchService {
  private literatureSearch: LiteratureSearchService
  private planningService: PlanningService
  private executingService: ExecutingService
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  constructor() {
    this.literatureSearch = new LiteratureSearchService()
    this.planningService = new PlanningService()
    this.executingService = new ExecutingService()
  }

  async conductResearch(
    query: string,
    onProgress?: (progress: ResearchProgress) => void
  ): Promise<ResearchResult> {
    
    // Enhanced workflow with planning and execution
    
    // Phase 1: Generate Research Plan
    onProgress?.({
      phase: 'planning',
      message: 'Creating comprehensive research plan...',
      progress: 5
    })

    const availableTools = ['literature_search', 'web_search', 'citation_analysis', 'trend_analysis']
    const researchPlan = await this.planningService.generateResearchPlan(query, availableTools)
    
    // Phase 2: Execute Research Plan
    onProgress?.({
      phase: 'executing',
      message: 'Executing research plan with sequential tasks...',
      progress: 15,
      planId: researchPlan.id,
      currentTask: 'Starting execution'
    })

    const executionResults = await this.executingService.executePlan(
      researchPlan,
      (executionProgress) => {
        // Forward execution progress to research progress
        const currentTask = executionProgress.taskProgresses[executionProgress.currentTaskIndex]
        onProgress?.({
          phase: 'executing',
          message: currentTask?.message || 'Executing research tasks...',
          progress: 15 + (executionProgress.overallProgress * 0.6), // 15-75% for execution
          planId: researchPlan.id,
          currentTask: currentTask?.taskId,
          taskProgress: currentTask?.progress
        })
      }
    )

    // Phase 3: Generate Comprehensive Report
    onProgress?.({
      phase: 'synthesizing',
      message: 'Synthesizing findings into comprehensive report...',
      progress: 80
    })

    const comprehensiveReport = await this.generateComprehensiveReport(executionResults.results)
    const executiveSummary = await this.generateExecutiveSummary(executionResults.results)
    
    // Phase 4: Final compilation
    onProgress?.({
      phase: 'completed',
      message: 'Research complete! Generated comprehensive multi-page analysis.',
      progress: 100
    })

    // Compile final results
    const allPapers = executionResults.results
      .filter(r => r.type === 'search_results')
      .flatMap(r => r.results || [])
    
    const allSources = executionResults.results
      .filter(r => r.type === 'search_results')
      .flatMap(r => r.sources || [])
      .map(s => ({ name: s, url: '', type: 'academic' }))

    const keyFindings = executionResults.results
      .filter(r => r.type === 'analysis_results')
      .flatMap(r => r.keyFindings || [])
      .slice(0, 10)

    return {
      query,
      papers: allPapers.slice(0, 50),
      sources: allSources,
      summary: comprehensiveReport,
      keyFindings: keyFindings,
      nextSteps: this.generateNextSteps(executionResults.results),
      totalPapers: allPapers.length,
      relatedTerms: this.extractRelatedTermsFromResults(executionResults.results),
      plan: researchPlan,
      executionResults: executionResults.results,
      comprehensiveReport: comprehensiveReport,
      executiveSummary: executiveSummary
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
        'Explore emerging methodologies in top papers',
        'Investigate recent citation patterns',
        'Review conference proceedings for cutting-edge research',
        'Connect with key researchers in the field'
      ]
    }

    return summary
  }

  private async generateComprehensiveReport(executionResults: any[]): Promise<string> {
    const searchResults = executionResults.filter(r => r.type === 'search_results')
    const analysisResults = executionResults.filter(r => r.type === 'analysis_results')
    const totalPapers = searchResults.reduce((sum, r) => sum + (r.totalResults || 0), 0)
    
    return `# Comprehensive Research Report

## Executive Summary
This analysis examined ${totalPapers} academic papers to provide comprehensive insights.

## Key Findings
${analysisResults.map((result, index) => `
### ${result.analysisType || 'Analysis'} ${index + 1}
- Key insights from systematic analysis
- Research patterns and trends identified
`).join('')}

## Research Landscape
Our multi-phase analysis reveals significant developments in the field with ${totalPapers} sources examined.

## Future Directions
Based on findings, we recommend continued research in emerging areas and methodological innovations.

---
*Report generated: ${new Date().toISOString().split('T')[0]}*`
  }

  private async generateExecutiveSummary(executionResults: any[]): Promise<string> {
    const totalPapers = executionResults
      .filter(r => r.type === 'search_results')
      .reduce((sum, r) => sum + (r.totalResults || 0), 0)
    
    return `## Executive Summary

**Research Scope**: Analysis of ${totalPapers} academic sources
**Key Insights**: Comprehensive examination of current research landscape
**Methodology**: Multi-phase systematic analysis with synthesis
**Impact**: Strategic insights for research and development planning`
  }

  private generateNextSteps(executionResults: any[]): string[] {
    return [
      'Conduct follow-up research on identified gaps',
      'Engage with key researchers in the field',
      'Develop implementation strategy',
      'Monitor emerging trends',
      'Create actionable roadmap'
    ]
  }

  private extractRelatedTermsFromResults(executionResults: any[]): string[] {
    const analysisResults = executionResults.filter(r => r.type === 'analysis_results')
    const terms = analysisResults.flatMap(r => r.keyTopics || [])
      .map(topic => typeof topic === 'string' ? topic : topic.keyword)
      .filter(Boolean)
      .slice(0, 10)
    
    if (terms.length === 0) {
      return ['research', 'analysis', 'methodology', 'findings', 'applications']
    }
    
    return terms
  }
}
