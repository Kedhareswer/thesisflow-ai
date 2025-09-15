export interface ResearchTask {
  id: string
  title: string
  description: string
  type: 'search' | 'analyze' | 'synthesize' | 'generate'
  priority: number
  estimatedTime: string
  dependencies?: string[]
  searchQuery?: string
  searchSources?: string[]
  analysisType?: string
  outputFormat?: string
}

export interface ResearchPlan {
  id: string
  title: string
  description: string
  estimatedTotalTime: string
  tasks: ResearchTask[]
  deliverables: string[]
  methodology: string
}

export class PlanningService {
  
  async generateResearchPlan(userQuery: string, selectedTools: string[]): Promise<ResearchPlan> {
    
    // Advanced planning logic based on query analysis
    const planType = this.analyzePlanType(userQuery)
    const scope = this.determineScope(userQuery)
    const deliverables = this.identifyDeliverables(userQuery)
    
    // Generate comprehensive task breakdown
    const tasks = this.generateTaskBreakdown(userQuery, selectedTools, planType, scope)
    
    return {
      id: `plan_${Date.now()}`,
      title: `Research Plan: ${this.extractMainTopic(userQuery)}`,
      description: `Comprehensive research and analysis plan for: "${userQuery}"`,
      estimatedTotalTime: this.calculateTotalTime(tasks),
      tasks,
      deliverables,
      methodology: this.selectMethodology(planType, scope)
    }
  }

  private analyzePlanType(query: string): 'literature_review' | 'market_research' | 'technical_analysis' | 'report_generation' | 'data_analysis' {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('literature') || lowerQuery.includes('papers') || lowerQuery.includes('research papers')) {
      return 'literature_review'
    }
    if (lowerQuery.includes('market') || lowerQuery.includes('industry') || lowerQuery.includes('competitive')) {
      return 'market_research'
    }
    if (lowerQuery.includes('technical') || lowerQuery.includes('implementation') || lowerQuery.includes('architecture')) {
      return 'technical_analysis'
    }
    if (lowerQuery.includes('report') || lowerQuery.includes('document') || lowerQuery.includes('summary')) {
      return 'report_generation'
    }
    if (lowerQuery.includes('data') || lowerQuery.includes('analysis') || lowerQuery.includes('statistics')) {
      return 'data_analysis'
    }
    
    return 'literature_review' // default
  }

  private determineScope(query: string): 'narrow' | 'medium' | 'comprehensive' {
    const wordCount = query.split(' ').length
    const complexityIndicators = ['comprehensive', 'detailed', 'extensive', 'thorough', 'in-depth', 'complete']
    
    if (wordCount > 15 || complexityIndicators.some(indicator => query.toLowerCase().includes(indicator))) {
      return 'comprehensive'
    }
    if (wordCount > 8) {
      return 'medium'
    }
    return 'narrow'
  }

  private identifyDeliverables(query: string): string[] {
    const deliverables: string[] = []
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('pdf') || lowerQuery.includes('report')) {
      deliverables.push('PDF Research Report')
    }
    if (lowerQuery.includes('presentation') || lowerQuery.includes('slides')) {
      deliverables.push('Presentation Slides')
    }
    if (lowerQuery.includes('summary') || lowerQuery.includes('executive')) {
      deliverables.push('Executive Summary')
    }
    if (lowerQuery.includes('visualization') || lowerQuery.includes('chart') || lowerQuery.includes('graph')) {
      deliverables.push('Data Visualizations')
    }
    if (lowerQuery.includes('citation') || lowerQuery.includes('bibliography')) {
      deliverables.push('Bibliography')
    }
    
    // Default deliverables
    if (deliverables.length === 0) {
      deliverables.push('Comprehensive Research Report', 'Key Findings Summary', 'Reference List')
    }
    
    return deliverables
  }

  private generateTaskBreakdown(query: string, tools: string[], planType: string, scope: string): ResearchTask[] {
    const tasks: ResearchTask[] = []
    let taskCounter = 1

    // Task 1: Initial Literature Search
    tasks.push({
      id: `task_${taskCounter++}`,
      title: 'Initial Literature Search',
      description: 'Conduct comprehensive search across academic databases',
      type: 'search',
      priority: 1,
      estimatedTime: '3-5 minutes',
      searchQuery: this.generateSearchQuery(query),
      searchSources: ['OpenAlex', 'arXiv', 'CrossRef', 'PubMed']
    })

    // Task 2: Web Research (if needed)
    if (tools.includes('google_search') || tools.includes('web_search')) {
      tasks.push({
        id: `task_${taskCounter++}`,
        title: 'Web Research & News Analysis',
        description: 'Search web sources and recent news for current developments',
        type: 'search',
        priority: 2,
        estimatedTime: '2-3 minutes',
        dependencies: [`task_${taskCounter - 2}`],
        searchSources: ['Google Scholar', 'Google News', 'DuckDuckGo', 'Tavily']
      })
    }

    // Task 3: Citation Network Analysis
    tasks.push({
      id: `task_${taskCounter++}`,
      title: 'Citation Network Analysis',
      description: 'Analyze citation patterns and identify key influential papers',
      type: 'analyze',
      priority: 3,
      estimatedTime: '2-4 minutes',
      dependencies: [`task_1`],
      analysisType: 'citation_analysis'
    })

    // Task 4: Trend Analysis
    tasks.push({
      id: `task_${taskCounter++}`,
      title: 'Research Trend Analysis',
      description: 'Identify emerging trends and research gaps',
      type: 'analyze',
      priority: 4,
      estimatedTime: '3-5 minutes',
      dependencies: [`task_1`, `task_${taskCounter - 2}`],
      analysisType: 'trend_analysis'
    })

    // Task 5: Deep Content Analysis
    tasks.push({
      id: `task_${taskCounter++}`,
      title: 'Deep Content Analysis',
      description: 'Extract key insights, methodologies, and findings from top papers',
      type: 'analyze',
      priority: 5,
      estimatedTime: '4-6 minutes',
      dependencies: [`task_${taskCounter - 2}`],
      analysisType: 'content_analysis'
    })

    // Task 6: Comparative Analysis
    if (scope === 'comprehensive') {
      tasks.push({
        id: `task_${taskCounter++}`,
        title: 'Comparative Analysis',
        description: 'Compare different approaches, methodologies, and findings',
        type: 'analyze',
        priority: 6,
        estimatedTime: '3-4 minutes',
        dependencies: [`task_${taskCounter - 2}`],
        analysisType: 'comparative_analysis'
      })
    }

    // Task 7: Synthesis & Report Generation
    tasks.push({
      id: `task_${taskCounter++}`,
      title: 'Research Synthesis',
      description: 'Synthesize all findings into coherent research narrative',
      type: 'synthesize',
      priority: 7,
      estimatedTime: '5-7 minutes',
      dependencies: tasks.map(t => t.id),
      outputFormat: 'comprehensive_report'
    })

    // Task 8: Executive Summary
    tasks.push({
      id: `task_${taskCounter++}`,
      title: 'Executive Summary Generation',
      description: 'Create concise executive summary with key findings',
      type: 'generate',
      priority: 8,
      estimatedTime: '2-3 minutes',
      dependencies: [`task_${taskCounter - 2}`],
      outputFormat: 'executive_summary'
    })

    // Task 9: Visualization Creation
    if (tools.includes('visualization') || query.toLowerCase().includes('visual')) {
      tasks.push({
        id: `task_${taskCounter++}`,
        title: 'Data Visualization Creation',
        description: 'Create charts, graphs, and visual representations of findings',
        type: 'generate',
        priority: 9,
        estimatedTime: '3-4 minutes',
        dependencies: [`task_${taskCounter - 3}`],
        outputFormat: 'visualizations'
      })
    }

    return tasks
  }

  private generateSearchQuery(userQuery: string): string {
    // Extract key terms and generate optimized search queries
    const keyTerms = userQuery
      .toLowerCase()
      .replace(/write a report on|create a|generate a|analyze|research/gi, '')
      .trim()
    
    return keyTerms
  }

  private extractMainTopic(query: string): string {
    // Extract the main topic from the query
    const cleaned = query
      .replace(/^(write a report on|create a|generate a|analyze|research)\s*/gi, '')
      .replace(/\s*(report|analysis|study).*$/gi, '')
      .trim()
    
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  private calculateTotalTime(tasks: ResearchTask[]): string {
    // Calculate estimated total time based on task times
    const totalMinutes = tasks.reduce((total, task) => {
      const timeRange = task.estimatedTime.match(/(\d+)-?(\d+)?/)
      if (timeRange) {
        const min = parseInt(timeRange[1])
        const max = timeRange[2] ? parseInt(timeRange[2]) : min
        return total + (min + max) / 2
      }
      return total + 5 // default
    }, 0)
    
    if (totalMinutes < 60) {
      return `${Math.round(totalMinutes)} minutes`
    } else {
      const hours = Math.floor(totalMinutes / 60)
      const minutes = Math.round(totalMinutes % 60)
      return `${hours}h ${minutes}m`
    }
  }

  private selectMethodology(planType: string, scope: string): string {
    const methodologies: Record<string, Record<string, string>> = {
      literature_review: {
        narrow: 'Targeted literature review with citation analysis',
        medium: 'Systematic literature review with trend analysis',
        comprehensive: 'Comprehensive systematic review with meta-analysis'
      },
      market_research: {
        narrow: 'Focused market analysis with competitive landscape',
        medium: 'Multi-source market research with trend analysis',
        comprehensive: 'Comprehensive market intelligence with predictive analysis'
      },
      technical_analysis: {
        narrow: 'Technical evaluation with implementation review',
        medium: 'Comprehensive technical analysis with comparative study',
        comprehensive: 'Full technical assessment with architecture analysis'
      },
      report_generation: {
        narrow: 'Structured report with key findings',
        medium: 'Comprehensive report with detailed analysis',
        comprehensive: 'Executive-level report with strategic recommendations'
      },
      data_analysis: {
        narrow: 'Statistical analysis with trend identification',
        medium: 'Multi-dimensional data analysis with visualization',
        comprehensive: 'Advanced analytics with predictive modeling'
      }
    }
    
    return methodologies[planType]?.[scope] || 'Comprehensive research methodology'
  }
}
