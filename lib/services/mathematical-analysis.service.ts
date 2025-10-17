/**
 * Mathematical Analysis Service
 * Provides advanced mathematical and statistical analysis using Groq's compound model with Wolfram Alpha integration
 */

export interface MathematicalAnalysisOptions {
  input: string
  analysisType: 'calculation' | 'equation' | 'statistics' | 'graphing' | 'symbolic' | 'general'
  includeStepByStep?: boolean
  includeVisualization?: boolean
  userId?: string
}

export interface MathematicalAnalysisResult {
  success: boolean
  input: string
  result?: string
  steps?: string[]
  visualization?: string
  explanation?: string
  wolframResponse?: any
  error?: string
  metadata?: {
    analysisType: string
    processingTime: number
    toolsUsed: string[]
  }
}

export class MathematicalAnalysisService {
  private groqApiKey: string
  private mathematicalModel: string

  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY || ''
    this.mathematicalModel = process.env.MATHEMATICAL_ANALYSIS_MODEL || 'groq/compound'

    if (!this.groqApiKey) {
      console.warn('MathematicalAnalysisService: GROQ_API_KEY not found in environment variables')
    }
  }

  /**
   * Perform mathematical analysis using Groq's compound model with Wolfram Alpha
   */
  async analyze(options: MathematicalAnalysisOptions): Promise<MathematicalAnalysisResult> {
    const startTime = Date.now()

    if (!this.groqApiKey) {
      return {
        success: false,
        input: options.input,
        error: 'Groq API key not configured. Please set GROQ_API_KEY environment variable.',
        metadata: {
          analysisType: options.analysisType,
          processingTime: Date.now() - startTime,
          toolsUsed: []
        }
      }
    }

    try {
      const systemPrompt = this.buildSystemPrompt(options.analysisType)
      const userPrompt = this.buildUserPrompt(options)

      console.log('[Mathematical Analysis] Analyzing with model:', this.mathematicalModel)
      console.log('[Mathematical Analysis] Analysis type:', options.analysisType)

      // For Groq compound model with Wolfram Alpha integration
      // Note: This requires Groq's compound API with tool support
      const requestBody: any = {
        model: this.mathematicalModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 3000,
        temperature: 0.2, // Low temperature for mathematical precision
        top_p: 0.9
      }

      // Enable Wolfram Alpha and code interpreter tools if using compound model
      if (this.mathematicalModel.includes('compound')) {
        requestBody.compound_custom = {
          tools: {
            enabled_tools: ['wolfram_alpha', 'code_interpreter']
          }
        }
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqApiKey}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[Mathematical Analysis] Groq API error:', response.status, errorData)
        throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || 'No response generated'

      // Parse the response
      const parsedResult = this.parseAnalysisResponse(content, options)

      return {
        success: true,
        input: options.input,
        result: parsedResult.result,
        steps: parsedResult.steps,
        visualization: parsedResult.visualization,
        explanation: parsedResult.explanation,
        wolframResponse: data.choices?.[0]?.message?.tool_calls || undefined,
        metadata: {
          analysisType: options.analysisType,
          processingTime: Date.now() - startTime,
          toolsUsed: this.extractToolsUsed(data)
        }
      }
    } catch (error) {
      console.error('[Mathematical Analysis] Error:', error)
      return {
        success: false,
        input: options.input,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          analysisType: options.analysisType,
          processingTime: Date.now() - startTime,
          toolsUsed: []
        }
      }
    }
  }

  /**
   * Build system prompt based on analysis type
   */
  private buildSystemPrompt(analysisType: string): string {
    const basePrompt = [
      'You are a specialized mathematical analysis assistant powered by Wolfram Alpha and code execution capabilities.',
      'Your role is to provide accurate, step-by-step mathematical solutions and analysis.',
      '',
      '**Your Capabilities:**',
      '- Solve complex equations and mathematical problems',
      '- Perform statistical analysis and hypothesis testing',
      '- Calculate derivatives, integrals, limits, and series',
      '- Symbolic mathematics and algebraic manipulations',
      '- Generate graphs and visualizations',
      '- Numerical computations with high precision',
      '- Matrix operations and linear algebra',
      '',
      '**Guidelines:**',
      '- Use Wolfram Alpha for symbolic math, equations, and advanced calculations',
      '- Use code interpreter for numerical computations, statistics, and data analysis',
      '- Always show step-by-step solutions when requested',
      '- Provide clear explanations of mathematical concepts',
      '- Use LaTeX notation for mathematical expressions (e.g., $x^2 + 5x + 6 = 0$)',
      '- Include units in final answers when applicable',
      '- Verify results and check for edge cases',
      ''
    ].join('\n')

    const typeSpecificGuidance: Record<string, string> = {
      calculation: '**Current Task:** Perform precise numerical calculations. Show intermediate steps and final result with appropriate precision.',
      equation: '**Current Task:** Solve equations algebraically. Show all steps: simplification, isolation, and verification.',
      statistics: '**Current Task:** Perform statistical analysis. Include descriptive statistics, hypothesis tests, confidence intervals, and interpretation.',
      graphing: '**Current Task:** Create mathematical visualizations. Generate plots, graphs, or diagrams with proper labels and scale.',
      symbolic: '**Current Task:** Perform symbolic mathematics. Manipulate expressions algebraically without numerical evaluation.',
      general: '**Current Task:** Provide comprehensive mathematical analysis. Determine the best approach and apply appropriate techniques.'
    }

    return basePrompt + (typeSpecificGuidance[analysisType] || typeSpecificGuidance.general)
  }

  /**
   * Build user prompt with analysis instructions
   */
  private buildUserPrompt(options: MathematicalAnalysisOptions): string {
    const parts: string[] = []

    // Add the main input
    parts.push(`**Problem:** ${options.input}`)
    parts.push('')

    // Add specific instructions
    if (options.includeStepByStep) {
      parts.push('Please provide a detailed step-by-step solution.')
    }

    if (options.includeVisualization) {
      parts.push('Include visualizations or graphs if applicable.')
    }

    // Add format instructions
    parts.push('')
    parts.push('**Required Response Format:**')
    parts.push('1. RESULT: [Final answer with units]')
    if (options.includeStepByStep) {
      parts.push('2. STEPS: [Numbered list of solution steps]')
    }
    parts.push('3. EXPLANATION: [Clear explanation of the approach and reasoning]')
    if (options.includeVisualization) {
      parts.push('4. VISUALIZATION: [Description or code for graphs/plots]')
    }

    return parts.join('\n')
  }

  /**
   * Parse the AI response into structured result
   */
  private parseAnalysisResponse(content: string, options: MathematicalAnalysisOptions): {
    result: string
    steps?: string[]
    visualization?: string
    explanation?: string
  } {
    const lines = content.split('\n')
    let result = ''
    const steps: string[] = []
    let visualization = ''
    let explanation = ''

    let currentSection: 'none' | 'result' | 'steps' | 'explanation' | 'visualization' = 'none'

    for (const line of lines) {
      const trimmed = line.trim()

      // Detect section headers
      if (/^(RESULT|Result|Final Answer):/i.test(trimmed)) {
        currentSection = 'result'
        const match = trimmed.match(/^(?:RESULT|Result|Final Answer):\s*(.+)$/i)
        if (match) result += match[1] + '\n'
        continue
      } else if (/^(STEPS|Steps|Solution):/i.test(trimmed)) {
        currentSection = 'steps'
        continue
      } else if (/^(EXPLANATION|Explanation|Reasoning):/i.test(trimmed)) {
        currentSection = 'explanation'
        continue
      } else if (/^(VISUALIZATION|Visualization|Graph):/i.test(trimmed)) {
        currentSection = 'visualization'
        continue
      }

      // Add content to current section
      if (trimmed.length > 0) {
        switch (currentSection) {
          case 'result':
            result += line + '\n'
            break
          case 'steps':
            if (/^\d+\./.test(trimmed) || /^[-*]/.test(trimmed)) {
              steps.push(trimmed.replace(/^(?:\d+\.|-|\*)\s*/, ''))
            } else if (steps.length > 0) {
              steps[steps.length - 1] += ' ' + trimmed
            }
            break
          case 'explanation':
            explanation += line + '\n'
            break
          case 'visualization':
            visualization += line + '\n'
            break
          case 'none':
            // If no section detected yet, add to result
            if (!result) result += line + '\n'
            break
        }
      }
    }

    // Fallback: if no structured sections found, use entire content as result
    if (!result.trim() && !explanation.trim()) {
      result = content
    }

    return {
      result: result.trim() || 'Analysis complete',
      steps: steps.length > 0 ? steps : undefined,
      visualization: visualization.trim() || undefined,
      explanation: explanation.trim() || content.trim()
    }
  }

  /**
   * Extract tools used from API response
   */
  private extractToolsUsed(data: any): string[] {
    const tools: string[] = []

    if (data.choices?.[0]?.message?.tool_calls) {
      const toolCalls = data.choices[0].message.tool_calls
      if (Array.isArray(toolCalls)) {
        toolCalls.forEach((call: any) => {
          if (call.function?.name) {
            tools.push(call.function.name)
          }
        })
      }
    }

    return tools
  }

  /**
   * Quick calculation helper (for simple math without full analysis)
   */
  async calculate(expression: string): Promise<string> {
    const result = await this.analyze({
      input: expression,
      analysisType: 'calculation',
      includeStepByStep: false,
      includeVisualization: false
    })

    return result.success ? (result.result || '') : `Error: ${result.error}`
  }

  /**
   * Solve equation helper
   */
  async solveEquation(equation: string, showSteps = true): Promise<MathematicalAnalysisResult> {
    return this.analyze({
      input: equation,
      analysisType: 'equation',
      includeStepByStep: showSteps,
      includeVisualization: false
    })
  }

  /**
   * Statistical analysis helper
   */
  async analyzeStatistics(data: string | number[], description?: string): Promise<MathematicalAnalysisResult> {
    const input = Array.isArray(data)
      ? `Analyze this dataset: [${data.join(', ')}]${description ? '. ' + description : ''}`
      : data

    return this.analyze({
      input,
      analysisType: 'statistics',
      includeStepByStep: true,
      includeVisualization: true
    })
  }
}

// Export singleton instance
export const mathematicalAnalysisService = new MathematicalAnalysisService()
