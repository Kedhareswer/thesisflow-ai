import { ResearchPlan, ResearchTask } from './planning.service'
import { LiteratureSearchService } from './literature-search.service'
// Note: UnifiedSearchService will be implemented later - using LiteratureSearchService for now

export interface TaskProgress {
  taskId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  message: string
  results?: any
  startTime?: Date
  endTime?: Date
  error?: string
}

export interface ExecutionProgress {
  planId: string
  currentTaskIndex: number
  totalTasks: number
  overallProgress: number
  taskProgresses: TaskProgress[]
  isComplete: boolean
  results: any[]
}

export type ExecutionCallback = (progress: ExecutionProgress) => void

export class ExecutingService {
  private literatureSearch: LiteratureSearchService
  private executionProgress: ExecutionProgress | null = null

  constructor() {
    this.literatureSearch = new LiteratureSearchService()
  }

  async executePlan(
    plan: ResearchPlan, 
    onProgress: ExecutionCallback
  ): Promise<ExecutionProgress> {
    
    // Initialize execution progress
    this.executionProgress = {
      planId: plan.id,
      currentTaskIndex: 0,
      totalTasks: plan.tasks.length,
      overallProgress: 0,
      taskProgresses: plan.tasks.map(task => ({
        taskId: task.id,
        status: 'pending',
        progress: 0,
        message: `Waiting to start: ${task.title}`
      })),
      isComplete: false,
      results: []
    }

    onProgress(this.executionProgress)

    // Execute tasks sequentially
    for (let i = 0; i < plan.tasks.length; i++) {
      const task = plan.tasks[i]
      
      // Check dependencies
      if (task.dependencies) {
        const dependencyResults = await this.waitForDependencies(task.dependencies)
        if (!dependencyResults.success) {
          this.markTaskFailed(task.id, 'Dependency tasks failed')
          continue
        }
      }

      // Execute the task
      await this.executeTask(task, i, onProgress)
    }

    // Mark execution as complete
    this.executionProgress.isComplete = true
    this.executionProgress.overallProgress = 100
    onProgress(this.executionProgress)

    return this.executionProgress
  }

  private async executeTask(
    task: ResearchTask, 
    taskIndex: number, 
    onProgress: ExecutionCallback
  ): Promise<void> {
    
    if (!this.executionProgress) return

    // Update current task
    this.executionProgress.currentTaskIndex = taskIndex
    this.updateTaskProgress(task.id, 'in_progress', 0, `Starting: ${task.title}`)
    onProgress(this.executionProgress)

    try {
      let result: any = null

      switch (task.type) {
        case 'search':
          result = await this.executeSearchTask(task, onProgress)
          break
        case 'analyze':
          result = await this.executeAnalysisTask(task, onProgress)
          break
        case 'synthesize':
          result = await this.executeSynthesisTask(task, onProgress)
          break
        case 'generate':
          result = await this.executeGenerationTask(task, onProgress)
          break
        default:
          throw new Error(`Unknown task type: ${task.type}`)
      }

      // Mark task as completed
      this.updateTaskProgress(task.id, 'completed', 100, `Completed: ${task.title}`, result)
      this.executionProgress.results.push(result)
      
      // Update overall progress
      this.executionProgress.overallProgress = Math.round(((taskIndex + 1) / this.executionProgress.totalTasks) * 100)
      onProgress(this.executionProgress)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.updateTaskProgress(task.id, 'failed', 0, `Failed: ${task.title}`, null, errorMessage)
      onProgress(this.executionProgress)
    }
  }

  private async executeSearchTask(task: ResearchTask, onProgress: ExecutionCallback): Promise<any> {
    if (!this.executionProgress) return null

    this.updateTaskProgress(task.id, 'in_progress', 25, 'Searching academic databases...')
    onProgress(this.executionProgress)

    let searchResults: any[] = []

    // Literature search using streamPapers method
    if (task.searchSources?.includes('OpenAlex') || task.searchSources?.includes('arXiv') || task.searchSources?.includes('CrossRef')) {
      const query = task.searchQuery || task.description
      const papers: any[] = []
      await this.literatureSearch.streamPapers(
        query,
        50,
        (paper) => papers.push(paper),
        (source, error) => console.warn(`Search error in ${source}:`, error)
      )
      searchResults = [...searchResults, ...papers]
    }

    this.updateTaskProgress(task.id, 'in_progress', 75, 'Processing search results...')
    onProgress(this.executionProgress)

    this.updateTaskProgress(task.id, 'in_progress', 75, 'Processing search results...')
    onProgress(this.executionProgress)

    // Deduplicate and rank results
    const processedResults = this.deduplicateResults(searchResults)
    const rankedResults = this.rankResults(processedResults, task.searchQuery || task.description)

    this.updateTaskProgress(task.id, 'in_progress', 90, 'Finalizing search results...')
    onProgress(this.executionProgress)

    return {
      taskId: task.id,
      type: 'search_results',
      query: task.searchQuery || task.description,
      totalResults: rankedResults.length,
      results: rankedResults.slice(0, 25), // Top 25 results
      sources: task.searchSources,
      timestamp: new Date().toISOString()
    }
  }

  private async executeAnalysisTask(task: ResearchTask, onProgress: ExecutionCallback): Promise<any> {
    if (!this.executionProgress) return null

    this.updateTaskProgress(task.id, 'in_progress', 25, 'Gathering data for analysis...')
    onProgress(this.executionProgress)

    // Get previous search results
    const searchResults = this.executionProgress.results.filter(r => r.type === 'search_results')
    const allPapers = searchResults.flatMap(r => r.results)

    this.updateTaskProgress(task.id, 'in_progress', 50, 'Performing analysis...')
    onProgress(this.executionProgress)

    let analysisResult: any = {}

    switch (task.analysisType) {
      case 'citation_analysis':
        analysisResult = await this.performCitationAnalysis(allPapers)
        break
      case 'trend_analysis':
        analysisResult = await this.performTrendAnalysis(allPapers)
        break
      case 'content_analysis':
        analysisResult = await this.performContentAnalysis(allPapers)
        break
      case 'comparative_analysis':
        analysisResult = await this.performComparativeAnalysis(allPapers)
        break
      default:
        analysisResult = await this.performGeneralAnalysis(allPapers)
    }

    this.updateTaskProgress(task.id, 'in_progress', 90, 'Finalizing analysis...')
    onProgress(this.executionProgress)

    return {
      taskId: task.id,
      type: 'analysis_results',
      analysisType: task.analysisType,
      ...analysisResult,
      timestamp: new Date().toISOString()
    }
  }

  private async executeSynthesisTask(task: ResearchTask, onProgress: ExecutionCallback): Promise<any> {
    if (!this.executionProgress) return null

    this.updateTaskProgress(task.id, 'in_progress', 25, 'Collecting all research data...')
    onProgress(this.executionProgress)

    // Gather all previous results
    const allResults = this.executionProgress.results
    const searchResults = allResults.filter(r => r.type === 'search_results')
    const analysisResults = allResults.filter(r => r.type === 'analysis_results')

    this.updateTaskProgress(task.id, 'in_progress', 50, 'Synthesizing findings...')
    onProgress(this.executionProgress)

    // Perform synthesis
    const synthesis = await this.synthesizeFindings(searchResults, analysisResults, task)

    this.updateTaskProgress(task.id, 'in_progress', 90, 'Generating comprehensive report...')
    onProgress(this.executionProgress)

    return {
      taskId: task.id,
      type: 'synthesis_results',
      ...synthesis,
      timestamp: new Date().toISOString()
    }
  }

  private async executeGenerationTask(task: ResearchTask, onProgress: ExecutionCallback): Promise<any> {
    if (!this.executionProgress) return null

    this.updateTaskProgress(task.id, 'in_progress', 25, 'Preparing content generation...')
    onProgress(this.executionProgress)

    const allResults = this.executionProgress.results
    const synthesisResults = allResults.filter(r => r.type === 'synthesis_results')

    this.updateTaskProgress(task.id, 'in_progress', 50, 'Generating content...')
    onProgress(this.executionProgress)

    let generationResult: any = {}

    switch (task.outputFormat) {
      case 'executive_summary':
        generationResult = await this.generateExecutiveSummary(synthesisResults)
        break
      case 'comprehensive_report':
        generationResult = await this.generateComprehensiveReport(allResults)
        break
      case 'visualizations':
        generationResult = await this.generateVisualizations(allResults)
        break
      default:
        generationResult = await this.generateGenericOutput(allResults, task)
    }

    this.updateTaskProgress(task.id, 'in_progress', 90, 'Finalizing generated content...')
    onProgress(this.executionProgress)

    return {
      taskId: task.id,
      type: 'generation_results',
      outputFormat: task.outputFormat,
      ...generationResult,
      timestamp: new Date().toISOString()
    }
  }

  private updateTaskProgress(
    taskId: string, 
    status: TaskProgress['status'], 
    progress: number, 
    message: string, 
    results?: any,
    error?: string
  ): void {
    if (!this.executionProgress) return

    const taskProgress = this.executionProgress.taskProgresses.find(tp => tp.taskId === taskId)
    if (taskProgress) {
      taskProgress.status = status
      taskProgress.progress = progress
      taskProgress.message = message
      if (results) taskProgress.results = results
      if (error) taskProgress.error = error
      if (status === 'in_progress' && !taskProgress.startTime) {
        taskProgress.startTime = new Date()
      }
      if (status === 'completed' || status === 'failed') {
        taskProgress.endTime = new Date()
      }
    }
  }

  private async waitForDependencies(dependencies: string[]): Promise<{ success: boolean }> {
    // Check if all dependency tasks are completed
    if (!this.executionProgress) return { success: false }

    const allCompleted = dependencies.every(depId => {
      const taskProgress = this.executionProgress!.taskProgresses.find(tp => tp.taskId === depId)
      return taskProgress?.status === 'completed'
    })

    return { success: allCompleted }
  }

  private markTaskFailed(taskId: string, reason: string): void {
    this.updateTaskProgress(taskId, 'failed', 0, `Failed: ${reason}`, null, reason)
  }

  // Analysis methods
  private async performCitationAnalysis(papers: any[]): Promise<any> {
    const citationCounts = papers.map(p => ({
      title: p.title,
      citations: p.citation_count || 0,
      year: p.publication_year,
      authors: p.authors?.slice(0, 3) || []
    })).sort((a, b) => b.citations - a.citations)

    return {
      topCitedPapers: citationCounts.slice(0, 10),
      averageCitations: citationCounts.reduce((sum, p) => sum + p.citations, 0) / papers.length,
      citationDistribution: this.calculateCitationDistribution(citationCounts),
      influentialAuthors: this.identifyInfluentialAuthors(papers)
    }
  }

  private async performTrendAnalysis(papers: any[]): Promise<any> {
    const yearlyDistribution = papers.reduce((acc, paper) => {
      const year = paper.publication_year || new Date().getFullYear()
      acc[year] = (acc[year] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const sortedYears = Object.keys(yearlyDistribution).map(Number).sort()
    const recentYears = sortedYears.slice(-5)
    const growthTrend = this.calculateGrowthTrend(recentYears, yearlyDistribution)

    return {
      yearlyDistribution,
      recentTrends: growthTrend,
      emergingTopics: this.identifyEmergingTopics(papers),
      researchGaps: this.identifyResearchGaps(papers)
    }
  }

  private async performContentAnalysis(papers: any[]): Promise<any> {
    const keywordFrequency = this.extractKeywords(papers)
    const methodologies = this.extractMethodologies(papers)
    const findings = this.extractKeyFindings(papers)

    return {
      keyTopics: Object.entries(keywordFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([keyword, count]) => ({ keyword, count })),
      commonMethodologies: methodologies,
      keyFindings: findings,
      contentSummary: this.generateContentSummary(papers)
    }
  }

  private async performComparativeAnalysis(papers: any[]): Promise<any> {
    const approaches = this.categorizeApproaches(papers)
    const comparison = this.compareApproaches(approaches)

    return {
      approachCategories: approaches,
      comparison: comparison,
      recommendations: this.generateRecommendations(comparison)
    }
  }

  private async performGeneralAnalysis(papers: any[]): Promise<any> {
    return {
      totalPapers: papers.length,
      timespan: this.calculateTimespan(papers),
      topAuthors: this.getTopAuthors(papers),
      keyInsights: this.extractGeneralInsights(papers)
    }
  }

  // Synthesis methods
  private async synthesizeFindings(searchResults: any[], analysisResults: any[], task: ResearchTask): Promise<any> {
    const totalPapers = searchResults.reduce((sum, sr) => sum + sr.totalResults, 0)
    const keyFindings = analysisResults.flatMap(ar => ar.keyFindings || [])
    const trends = analysisResults.find(ar => ar.analysisType === 'trend_analysis')
    const citations = analysisResults.find(ar => ar.analysisType === 'citation_analysis')

    return {
      comprehensiveReport: this.generateMultiPageReport(searchResults, analysisResults),
      executiveSummary: this.generateExecutiveSummary(analysisResults),
      keyFindings: keyFindings.slice(0, 10),
      recommendations: this.generateActionableRecommendations(analysisResults),
      totalPapersAnalyzed: totalPapers,
      researchQuality: this.assessResearchQuality(searchResults, analysisResults),
      futureDirections: this.identifyFutureDirections(trends, citations)
    }
  }

  // Generation methods
  private async generateComprehensiveReport(allResults: any[]): Promise<any> {
    const report = this.createDetailedReport(allResults)
    return {
      fullReport: report,
      sections: this.extractReportSections(report),
      wordCount: report.split(' ').length,
      readingTime: Math.ceil(report.split(' ').length / 200) // 200 words per minute
    }
  }

  private async generateExecutiveSummary(synthesisResults: any[]): Promise<any> {
    const summary = this.createExecutiveSummary(synthesisResults)
    return {
      summary: summary,
      keyPoints: this.extractKeyPoints(summary),
      recommendations: this.extractRecommendations(synthesisResults)
    }
  }

  private async generateVisualizations(allResults: any[]): Promise<any> {
    return {
      chartData: this.prepareChartData(allResults),
      visualizationSpecs: this.createVisualizationSpecs(allResults),
      interactiveElements: this.defineInteractiveElements(allResults)
    }
  }

  private async generateGenericOutput(allResults: any[], task: ResearchTask): Promise<any> {
    return {
      summary: `Generated output for ${task.title}`,
      content: this.createGenericContent(allResults, task),
      metadata: {
        taskType: task.type,
        outputFormat: task.outputFormat
      }
    }
  }

  // Helper methods
  private deduplicateResults(results: any[]): any[] {
    const seen = new Set()
    return results.filter(result => {
      const key = result.title?.toLowerCase() || result.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private rankResults(results: any[], query: string): any[] {
    return results.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, query)
      const scoreB = this.calculateRelevanceScore(b, query)
      return scoreB - scoreA
    })
  }

  private calculateRelevanceScore(result: any, query: string): number {
    const queryTerms = query.toLowerCase().split(' ')
    const title = result.title?.toLowerCase() || ''
    const abstract = result.abstract?.toLowerCase() || ''
    
    let score = 0
    queryTerms.forEach(term => {
      if (title.includes(term)) score += 3
      if (abstract.includes(term)) score += 1
    })
    
    // Boost for citation count
    score += Math.log(1 + (result.citation_count || 0)) * 0.5
    
    return score
  }

  // Placeholder implementations for complex analysis methods
  private calculateCitationDistribution(papers: any[]): any {
    return { distribution: 'placeholder' }
  }

  private identifyInfluentialAuthors(papers: any[]): any[] {
    return []
  }

  private calculateGrowthTrend(years: number[], distribution: Record<number, number>): any {
    return { trend: 'placeholder' }
  }

  private identifyEmergingTopics(papers: any[]): string[] {
    return []
  }

  private identifyResearchGaps(papers: any[]): string[] {
    return []
  }

  private extractKeywords(papers: any[]): Record<string, number> {
    return {}
  }

  private extractMethodologies(papers: any[]): string[] {
    return []
  }

  private extractKeyFindings(papers: any[]): string[] {
    return []
  }

  private generateContentSummary(papers: any[]): string {
    return 'Content summary placeholder'
  }

  private categorizeApproaches(papers: any[]): any {
    return {}
  }

  private compareApproaches(approaches: any): any {
    return {}
  }

  private generateRecommendations(comparison: any): string[] {
    return []
  }

  private calculateTimespan(papers: any[]): any {
    return {}
  }

  private getTopAuthors(papers: any[]): any[] {
    return []
  }

  private extractGeneralInsights(papers: any[]): string[] {
    return []
  }

  private generateMultiPageReport(searchResults: any[], analysisResults: any[]): string {
    return 'Multi-page report placeholder'
  }

  private generateActionableRecommendations(analysisResults: any[]): string[] {
    return []
  }

  private assessResearchQuality(searchResults: any[], analysisResults: any[]): any {
    return {}
  }

  private identifyFutureDirections(trends: any, citations: any): string[] {
    return []
  }

  private createDetailedReport(allResults: any[]): string {
    return 'Detailed report placeholder'
  }

  private extractReportSections(report: string): any[] {
    return []
  }

  private createExecutiveSummary(synthesisResults: any[]): string {
    return 'Executive summary placeholder'
  }

  private extractKeyPoints(summary: string): string[] {
    return []
  }

  private extractRecommendations(synthesisResults: any[]): string[] {
    return []
  }

  private prepareChartData(allResults: any[]): any {
    return {}
  }

  private createVisualizationSpecs(allResults: any[]): any {
    return {}
  }

  private defineInteractiveElements(allResults: any[]): any {
    return {}
  }

  private createGenericContent(allResults: any[], task: ResearchTask): string {
    return `Generated content for ${task.title}`
  }
}
