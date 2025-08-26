import { AIProvider } from '@/lib/ai-providers'

export interface TaskStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  priority: 'high' | 'medium' | 'low'
  dependencies?: string[]
  tools?: string[]
  apiCalls?: string[]
  estimatedDuration?: string
  result?: any
  error?: string
  startedAt?: Date
  completedAt?: Date
}

export interface PlanValidation {
  isValid: boolean
  issues: string[]
  suggestions: string[]
}

export interface TaskPlan {
  id: string
  title: string
  description: string
  steps: TaskStep[]
  estimatedDuration: string
  createdAt: Date
  validation?: PlanValidation
}

export interface PlannerOptions {
  provider?: AIProvider
  model?: string
  maxSteps?: number
  autoValidate?: boolean
}

// All possible combinations mapping
export const TASK_COMBINATIONS = {
  wants: {
    search_papers: "Search research papers on",
    write_report: "Write a report on",
    review_literature: "Review literature on",
    analyse_data: "Analyse data on",
    find_grants: "Find grants for",
    extract_data: "Extract data from",
    review_writing: "Review my writing about",
    search_patents: "Search patents related to"
  },
  uses: {
    deep_review: "Deep Review",
    arxiv: "arXiv",
    pubmed: "PubMed",
    google_scholar: "Google Scholar",
    grants_gov: "Grants.gov",
    clinical_trials: "ClinicalTrials",
    python_library: "Python library",
    google_patents: "Google Patents"
  },
  makes: {
    website: "a Website",
    latex_manuscript: "a LaTeX manuscript",
    data_visualisation: "a Data visualisation",
    ppt_presentation: "a PPT presentation",
    latex_poster: "a LaTeX poster",
    word_document: "a Word document",
    pdf_report: "a PDF report",
    interactive_app: "an Interactive app"
  }
}

export class TaskPlannerService {
  private static instance: TaskPlannerService

  static getInstance(): TaskPlannerService {
    if (!TaskPlannerService.instance) {
      TaskPlannerService.instance = new TaskPlannerService()
    }
    return TaskPlannerService.instance
  }

  /**
   * Generate a comprehensive plan based on the task requirements
   */
  async generatePlan(
    want: string,
    use: string[],
    make: string[],
    subject: string,
    prompt: string,
    options: PlannerOptions = {}
  ): Promise<TaskPlan> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Analyze the task complexity
    const steps = await this.createTaskSteps(want, use, make, subject, prompt, options)
    
    // Validate the plan
    const validation = await this.validatePlan(steps, want, use, make)
    
    // Refine if needed
    const refinedSteps = validation.isValid ? steps : await this.refinePlan(steps, validation)
    
    return {
      id: planId,
      title: this.generatePlanTitle(want, subject),
      description: prompt,
      steps: refinedSteps,
      validation,
      createdAt: new Date(),
      estimatedDuration: this.calculateTotalTime(refinedSteps) + 's'
    }
  }

  /**
   * Create task steps based on requirements
   */
  private async createTaskSteps(
    want: string,
    use: string[],
    make: string[],
    subject: string,
    prompt: string,
    options: PlannerOptions
  ): Promise<TaskStep[]> {
    const steps: TaskStep[] = []
    let stepId = 1

    // Step 1: Initial Research/Data Gathering
    if (['search_papers', 'review_literature', 'find_grants', 'search_patents'].includes(want)) {
      // Add research steps for 'use' selections
      use.forEach(useId => {
        const useLabel = (TASK_COMBINATIONS.uses as Record<string, string>)[useId] || useId
        steps.push({
          id: `research-${useId}`,
          title: `Research ${useLabel}`,
          description: `Gather information about ${useLabel} for ${subject}`,
          status: 'pending',
          priority: 'high',
          dependencies: [],
          estimatedDuration: '2-3 min',
          apiCalls: ['/api/ai/deep-search']
        })
      })

      // Add aggregation step
      steps.push({
        id: `step_${stepId++}`,
        title: 'Aggregate and deduplicate results',
        description: 'Combine results from multiple sources, remove duplicates, and rank by relevance',
        status: 'pending',
        priority: 'high',
        dependencies: steps.filter(s => s.apiCalls && s.apiCalls.length > 0).map(s => s.id),
        apiCalls: ['/api/ai/process'],
        estimatedDuration: '3-5s'
      })
    }

    // Step 2: Content Analysis/Processing
    if (['write_report', 'review_literature', 'analyse_data', 'review_writing'].includes(want)) {
      steps.push({
        id: `step_${stepId++}`,
        title: `Analyze content for ${subject}`,
        description: `Process gathered information to extract key insights, patterns, and findings`,
        status: 'pending',
        priority: 'high',
        dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : [],
        apiCalls: ['/api/ai/analyze'],
        estimatedDuration: '10-15s'
      })

      // Add specific analysis based on want
      if (want === 'analyse_data') {
        steps.push({
          id: `step_${stepId++}`,
          title: 'Perform statistical analysis',
          description: 'Apply statistical methods to identify trends, correlations, and significant findings',
          status: 'pending',
          priority: 'high',
          dependencies: [steps[steps.length - 1].id],
          tools: ['python_library'],
          apiCalls: ['/api/ai/statistics'],
          estimatedDuration: '8-12s'
        })
      }

      if (want === 'review_writing') {
        steps.push({
          id: `step_${stepId++}`,
          title: 'Check writing quality and coherence',
          description: 'Analyze grammar, style, structure, and academic rigor',
          status: 'pending',
          priority: 'high',
          dependencies: [steps[steps.length - 1].id],
          apiCalls: ['/api/ai/review'],
          estimatedDuration: '5-8s'
        })
      }
    }

    // Step 3: Content Generation
    if (want === 'write_report' || want === 'extract_data' || make.length > 0) {
      steps.push({
        id: `step_${stepId++}`,
        title: 'Generate structured content',
        description: `Create comprehensive ${want === 'write_report' ? 'report' : 'output'} based on analysis`,
        status: 'pending',
        priority: 'high',
        dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : [],
        apiCalls: ['/api/ai/generate'],
        estimatedDuration: '15-20s'
      })

      // Add extraction step if needed
      if (want === 'extract_data') {
        steps.push({
          id: `step_${stepId++}`,
          title: 'Extract and structure data',
          description: 'Parse and organize data into structured format (JSON, CSV, etc.)',
          status: 'pending',
          priority: 'high',
          dependencies: [steps[steps.length - 1].id],
          apiCalls: ['/api/ai/extract'],
          estimatedDuration: '5-8s'
        })
      }
    }

    // Add primary action step for 'want' selection
    if (want) {
      const wantLabel = (TASK_COMBINATIONS.wants as Record<string, string>)[want] || want
      steps.push({
        id: `action-${want}`,
        title: `Execute ${wantLabel}`,
        description: `Perform ${wantLabel} for ${subject}`,
        status: 'pending',
        priority: 'high',
        dependencies: steps.filter(s => s.apiCalls && s.apiCalls.length > 0).map(s => s.id),
        estimatedDuration: '4-6 min',
        apiCalls: [want === 'search_papers' ? '/api/ai/deep-search' : '/api/ai/generate']
      })
    }

    // Step 4: Output Creation (for make options)
    for (const makeItem of make) {
      const prevStepId = steps.length > 0 ? steps[steps.length - 1].id : null
      
      switch (makeItem) {
        case 'website':
        case 'interactive_app':
          steps.push({
            id: `step_${stepId++}`,
            title: `Design ${(TASK_COMBINATIONS.makes as Record<string, string>)[makeItem] || makeItem} interface`,
            description: 'Create user interface design and component structure',
            status: 'pending',
            priority: 'high',
            dependencies: prevStepId ? [prevStepId] : [],
            apiCalls: ['/api/ai/design'],
            estimatedDuration: '10-15s'
          })
          steps.push({
            id: `step_${stepId++}`,
            title: `Generate ${makeItem === 'website' ? 'HTML/CSS/JS' : 'React components'}`,
            description: 'Create functional code for the application',
            status: 'pending',
            priority: 'high',
            dependencies: [steps[steps.length - 1].id],
            apiCalls: ['/api/ai/code'],
            estimatedDuration: '20-30s'
          })
          break

        case 'data_visualisation':
          steps.push({
            id: `step_${stepId++}`,
            title: 'Prepare data for visualization',
            description: 'Transform and format data for chart libraries',
            status: 'pending',
            priority: 'high',
            dependencies: prevStepId ? [prevStepId] : [],
            apiCalls: ['/api/ai/transform'],
            estimatedDuration: '5-8s'
          })
          steps.push({
            id: `step_${stepId++}`,
            title: 'Generate interactive charts',
            description: 'Create D3.js or Chart.js visualizations',
            status: 'pending',
            priority: 'high',
            dependencies: [steps[steps.length - 1].id],
            apiCalls: ['/api/ai/visualize'],
            estimatedDuration: '10-15s'
          })
          break

        case 'latex_manuscript':
        case 'latex_poster':
          steps.push({
            id: `step_${stepId++}`,
            title: `Generate LaTeX ${makeItem === 'latex_manuscript' ? 'manuscript' : 'poster'}`,
            description: 'Create properly formatted LaTeX document with citations',
            status: 'pending',
            priority: 'high',
            dependencies: prevStepId ? [prevStepId] : [],
            apiCalls: ['/api/ai/latex'],
            estimatedDuration: '15-20s'
          })
          steps.push({
            id: `step_${stepId++}`,
            title: 'Compile to PDF',
            description: 'Process LaTeX source to generate PDF output',
            status: 'pending',
            priority: 'medium',
            dependencies: [steps[steps.length - 1].id],
            apiCalls: ['/api/latex/compile'],
            estimatedDuration: '5-10s'
          })
          break

        case 'ppt_presentation':
          steps.push({
            id: `step_${stepId++}`,
            title: 'Create presentation outline',
            description: 'Structure content into slides with key points',
            status: 'pending',
            priority: 'high',
            dependencies: prevStepId ? [prevStepId] : [],
            apiCalls: ['/api/ai/outline'],
            estimatedDuration: '8-12s'
          })
          steps.push({
            id: `step_${stepId++}`,
            title: 'Generate PowerPoint slides',
            description: 'Create PPTX file with formatted slides and visuals',
            status: 'pending',
            priority: 'high',
            dependencies: [steps[steps.length - 1].id],
            apiCalls: ['/api/ai/pptx'],
            estimatedDuration: '15-20s'
          })
          break

        case 'word_document':
          steps.push({
            id: `step_${stepId++}`,
            title: 'Generate Word document',
            description: 'Create formatted DOCX with proper styling and structure',
            status: 'pending',
            priority: 'high',
            dependencies: prevStepId ? [prevStepId] : [],
            apiCalls: ['/api/ai/docx'],
            estimatedDuration: '10-15s'
          })
          break

        case 'pdf_report':
          steps.push({
            id: `step_${stepId++}`,
            title: 'Generate PDF report',
            description: 'Create professional PDF with charts, tables, and formatted text',
            status: 'pending',
            priority: 'high',
            dependencies: prevStepId ? [prevStepId] : [],
            apiCalls: ['/api/ai/pdf'],
            estimatedDuration: '10-15s'
          })
          break
      }
    }

    // Step 5: Quality Check & Finalization
    steps.push({
      id: `step_${stepId++}`,
      title: 'Quality assurance and validation',
      description: 'Verify output completeness, accuracy, and formatting',
      status: 'pending',
      priority: 'medium',
      dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : [],
      apiCalls: ['/api/ai/validate'],
      estimatedDuration: '3-5s'
    })

    // Step 6: Final delivery
    steps.push({
      id: `step_${stepId++}`,
      title: 'Package and deliver results',
      description: 'Prepare final output for user consumption',
      status: 'pending',
      priority: 'low',
      dependencies: [steps[steps.length - 1].id],
      estimatedDuration: '2-3s'
    })

    return steps
  }

  /**
   * Validate the generated plan
   */
  public async validatePlan(
    steps: TaskStep[], 
    want: string, 
    use: string[], 
    make: string[]
  ): Promise<PlanValidation> {
    const issues: string[] = []
    const suggestions: string[] = []

    // Check for dependency cycles
    const hasCycle = this.checkDependencyCycles(steps)
    if (hasCycle) {
      issues.push('Circular dependencies detected in task steps')
    }

    // Check for missing required tools
    if (use.includes('deep_review') && !steps.some(s => s.apiCalls?.includes('/api/deep-search'))) {
      issues.push('Deep Review selected but no deep search step included')
      suggestions.push('Add deep search API call to research phase')
    }

    // Check for appropriate API endpoints
    for (const step of steps) {
      if (step.apiCalls) {
        for (const api of step.apiCalls) {
          if (!this.isValidApiEndpoint(api)) {
            issues.push(`Invalid API endpoint: ${api}`)
            suggestions.push(`Verify endpoint ${api} exists and is accessible`)
          }
        }
      }
    }

    // Check make outputs have generation steps
    for (const makeItem of make) {
      const hasGenerationStep = steps.some(s => 
        s.title.toLowerCase().includes(makeItem) || 
        s.description.toLowerCase().includes(makeItem)
      )
      if (!hasGenerationStep) {
        issues.push(`No generation step found for ${(TASK_COMBINATIONS.makes as Record<string, string>)[makeItem] || makeItem}`)
        suggestions.push(`Add generation step for ${makeItem}`)
      }
    }

    // Check total estimated time
    const totalTime = this.calculateTotalTime(steps)
    if (totalTime > 180) { // More than 3 minutes
      suggestions.push('Consider breaking down into smaller sub-tasks for better user experience')
    }

    return Promise.resolve({
      isValid: issues.length === 0,
      issues,
      suggestions
    })
  }

  /**
   * Refine plan based on validation issues
   */
  public async refinePlan(steps: TaskStep[], validation: PlanValidation): Promise<TaskStep[]> {
    const refinedSteps = [...steps]
    const issues = validation.issues
    
    // Add missing steps based on issues
    for (const issue of issues) {
      if (issue.includes('Deep Review')) {
        // Add deep search step at the beginning
        refinedSteps.unshift({
          id: `step_ref_${Date.now()}`,
          title: 'Execute Deep Search',
          description: 'Comprehensive search across multiple academic sources',
          status: 'pending',
          priority: 'high',
          apiCalls: ['/api/deep-search'],
          estimatedDuration: '10-15s'
        })
      }
      
      // Fix other issues as needed
    }

    // Update dependencies after refinement
    return this.updateDependencies(refinedSteps)
  }

  /**
   * Helper methods
   */
  private generatePlanTitle(want: string, subject: string): string {
    const wantLabel = (TASK_COMBINATIONS.wants as Record<string, string>)[want] || want
    return `${wantLabel} ${subject}`
  }

  private checkDependencyCycles(steps: TaskStep[]): boolean {
    // Simple cycle detection using DFS
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (stepId: string): boolean => {
      visited.add(stepId)
      recursionStack.add(stepId)

      const step = steps.find(s => s.id === stepId)
      if (step?.dependencies) {
        for (const dep of step.dependencies) {
          if (!visited.has(dep)) {
            if (hasCycle(dep)) return true
          } else if (recursionStack.has(dep)) {
            return true
          }
        }
      }

      recursionStack.delete(stepId)
      return false
    }

    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (hasCycle(step.id)) return true
      }
    }

    return false
  }

  private isValidApiEndpoint(endpoint: string): boolean {
    // List of valid API endpoints in the system
    const validEndpoints = [
      '/api/ai/generate',
      '/api/ai/analyze',
      '/api/ai/process',
      '/api/ai/statistics',
      '/api/ai/review',
      '/api/ai/extract',
      '/api/ai/design',
      '/api/ai/code',
      '/api/ai/transform',
      '/api/ai/visualize',
      '/api/ai/latex',
      '/api/ai/outline',
      '/api/ai/pptx',
      '/api/ai/docx',
      '/api/ai/pdf',
      '/api/ai/validate',
      '/api/deep-search',
      '/api/arxiv/search',
      '/api/pubmed/search',
      '/api/google_scholar/search',
      '/api/grants_gov/search',
      '/api/clinical_trials/search',
      '/api/python_library/search',
      '/api/google_patents/search',
      '/api/latex/compile',
      '/api/literature-search'
    ]
    
    return validEndpoints.includes(endpoint)
  }

  private calculateTotalTime(steps: TaskStep[]): number {
    return steps.reduce((total, step) => {
      const timeRange = step.estimatedDuration || '0-0s'
      const match = timeRange.match(/(\d+)-(\d+)/)
      if (match) {
        const avg = (parseInt(match[1]) + parseInt(match[2])) / 2
        return total + avg
      }
      return total
    }, 0)
  }

  private updateDependencies(steps: TaskStep[]): TaskStep[] {
    // Ensure dependencies reference valid step IDs
    const validIds = new Set(steps.map(s => s.id))
    
    return steps.map(step => ({
      ...step,
      dependencies: step.dependencies?.filter(d => validIds.has(d))
    }))
  }

  /**
   * Execute a single step in the plan
   */
  async executeStep(step: TaskStep, context: any): Promise<TaskStep> {
    const updatedStep = { ...step }
    updatedStep.status = 'in_progress'
    updatedStep.startedAt = new Date()

    try {
      // Execute based on the API calls defined
      if (step.apiCalls && step.apiCalls.length > 0) {
        const results = []
        
        for (const apiCall of step.apiCalls) {
          const result = await this.callAPI(apiCall, context)
          results.push(result)
        }
        
        updatedStep.result = results.length === 1 ? results[0] : results
      }

      updatedStep.status = 'completed'
      updatedStep.completedAt = new Date()
    } catch (error: any) {
      updatedStep.status = 'failed'
      updatedStep.error = error.message
      updatedStep.completedAt = new Date()
    }

    return updatedStep
  }

  /**
   * Make actual API calls
   */
  private async callAPI(endpoint: string, context: any): Promise<any> {
    // This would be replaced with actual API calls
    // For now, returning mock data based on endpoint
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Add auth token if available
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      const session = await supabase.auth.getSession()
      if (session.data.session?.access_token) {
        headers['Authorization'] = `Bearer ${session.data.session.access_token}`
      }
    } catch {}

    // Route to appropriate API based on endpoint
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(context)
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }

    return response.json()
  }
}

export default TaskPlannerService.getInstance()
