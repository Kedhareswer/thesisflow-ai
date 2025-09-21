import { GenerateTextOptions, GenerateTextResult } from '../enhanced-ai-service'
import { runGuardrails, GuardrailResult } from './guardrails.service'

export interface PlannerGenerateOptions extends Omit<GenerateTextOptions, 'provider'> {
  // Force OpenRouter usage for planner
  model?: string
  enableGuardrails?: boolean
  maxPlanSize?: number
  requiredFields?: string[]
}

export interface PlannerGenerateResult extends GenerateTextResult {
  guardrails?: GuardrailResult
  modelStrengths?: string[]
  modelLimitations?: string[]
}

export interface ModelCapabilities {
  strengths: string[]
  limitations: string[]
  bestUseCases: string[]
  performance: {
    speed: 'fast' | 'medium' | 'slow'
    quality: 'high' | 'medium' | 'low'
    reasoning: 'excellent' | 'good' | 'fair'
  }
}

// OpenRouter free model capabilities analysis
export const OPENROUTER_MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  "z-ai/glm-4.5-air:free": {
    strengths: ["Multilingual support", "Fast inference", "Good reasoning", "Code generation"],
    limitations: ["Limited context window", "May struggle with very complex tasks"],
    bestUseCases: ["Quick planning", "Code-related tasks", "Multilingual content"],
    performance: { speed: 'fast', quality: 'medium', reasoning: 'good' }
  },
  "agentica-org/deepcoder-14b-preview:free": {
    strengths: ["Code understanding", "Technical analysis", "Problem decomposition"],
    limitations: ["Smaller model size", "May lack domain knowledge"],
    bestUseCases: ["Technical planning", "Code architecture", "System design"],
    performance: { speed: 'fast', quality: 'medium', reasoning: 'good' }
  },
  "nousresearch/deephermes-3-llama-3-8b-preview:free": {
    strengths: ["Instruction following", "Balanced performance", "Good reasoning"],
    limitations: ["8B parameter limit", "May need more context for complex tasks"],
    bestUseCases: ["General planning", "Task breakdown", "Structured thinking"],
    performance: { speed: 'fast', quality: 'medium', reasoning: 'good' }
  },
  "nvidia/nemotron-nano-9b-v2:free": {
    strengths: ["Efficient inference", "Good for structured tasks", "NVIDIA optimization"],
    limitations: ["Smaller model", "Limited creative capabilities"],
    bestUseCases: ["Structured planning", "Data analysis", "Technical documentation"],
    performance: { speed: 'fast', quality: 'medium', reasoning: 'fair' }
  },
  "deepseek/deepseek-chat-v3.1:free": {
    strengths: ["Strong reasoning", "Good at complex analysis", "Detailed responses"],
    limitations: ["May be verbose", "Slower inference"],
    bestUseCases: ["Complex planning", "Research tasks", "Detailed analysis"],
    performance: { speed: 'medium', quality: 'high', reasoning: 'excellent' }
  },
  "openai/gpt-oss-120b:free": {
    strengths: ["Large parameter count", "Comprehensive knowledge", "Strong reasoning"],
    limitations: ["Slower inference", "Higher resource usage"],
    bestUseCases: ["Comprehensive planning", "Complex problem solving", "Strategic thinking"],
    performance: { speed: 'slow', quality: 'high', reasoning: 'excellent' }
  }
}

export class PlannerAIService {
  private aiService: any
  private aiServiceInitialized: Promise<void>

  constructor() {
    this.aiServiceInitialized = this.initializeAIService()
  }

  private async initializeAIService() {
    const { enhancedAIService } = await import('../enhanced-ai-service')
    this.aiService = enhancedAIService
  }

  private async ensureAIServiceReady() {
    await this.aiServiceInitialized
    if (!this.aiService) {
      throw new Error('AI service failed to initialize')
    }
  }

  /**
   * Get model capabilities for strategic model selection
   */
  getModelCapabilities(model: string): ModelCapabilities {
    return OPENROUTER_MODEL_CAPABILITIES[model] || {
      strengths: ["General purpose"],
      limitations: ["Unknown capabilities"],
      bestUseCases: ["General tasks"],
      performance: { speed: 'medium', quality: 'medium', reasoning: 'fair' }
    }
  }

  /**
   * Select optimal model based on task requirements
   */
  selectOptimalModel(taskType: 'planning' | 'analysis' | 'code' | 'research' | 'creative'): string {
    switch (taskType) {
      case 'planning':
        return "nousresearch/deephermes-3-llama-3-8b-preview:free" // Good instruction following
      case 'analysis':
        return "deepseek/deepseek-chat-v3.1:free" // Strong reasoning
      case 'code':
        return "agentica-org/deepcoder-14b-preview:free" // Code specialized
      case 'research':
        return "openai/gpt-oss-120b:free" // Comprehensive knowledge
      case 'creative':
        return "z-ai/glm-4.5-air:free" // Fast and creative
      default:
        return "nousresearch/deephermes-3-llama-3-8b-preview:free" // Balanced default
    }
  }

  /**
   * Generate text using OpenRouter exclusively with optional guardrails
   */
  async generatePlannerText(options: PlannerGenerateOptions): Promise<PlannerGenerateResult> {
    await this.ensureAIServiceReady()

    // Select model if not specified
    const model = options.model || this.selectOptimalModel('planning')
    const capabilities = this.getModelCapabilities(model)

    // Force OpenRouter provider
    const generateOptions: GenerateTextOptions = {
      ...options,
      provider: 'openrouter',
      model
    }

    try {
      const result = await this.aiService.generateText(generateOptions)

      if (!result.success) {
        return {
          ...result,
          modelStrengths: capabilities.strengths,
          modelLimitations: capabilities.limitations
        }
      }

      // Apply guardrails if enabled
      let guardrails: GuardrailResult | undefined
      if (options.enableGuardrails && result.content) {
        guardrails = await this.applyPlannerGuardrails(result.content, options)
      }

      return {
        ...result,
        guardrails,
        modelStrengths: capabilities.strengths,
        modelLimitations: capabilities.limitations
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        modelStrengths: capabilities.strengths,
        modelLimitations: capabilities.limitations
      }
    }
  }

  /**
   * Apply planner-specific guardrails
   */
  private async applyPlannerGuardrails(
    content: string, 
    options: PlannerGenerateOptions
  ): Promise<GuardrailResult> {
    const issues: string[] = []

    // Plan size validation
    if (options.maxPlanSize) {
      try {
        const planData = JSON.parse(content)
        if (planData.tasks && Array.isArray(planData.tasks)) {
          if (planData.tasks.length > options.maxPlanSize) {
            issues.push(`Plan contains ${planData.tasks.length} tasks, exceeding limit of ${options.maxPlanSize}`)
          }
        }
      } catch {
        // Not JSON, check word count instead
        const words = content.split(/\s+/).length
        if (words > (options.maxPlanSize * 100)) { // Rough estimate: 100 words per task
          issues.push(`Plan content is too large (${words} words)`)
        }
      }
    }

    // Required fields validation
    if (options.requiredFields && options.requiredFields.length > 0) {
      for (const field of options.requiredFields) {
        if (!content.toLowerCase().includes(field.toLowerCase())) {
          issues.push(`Missing required field: ${field}`)
        }
      }
    }

    // Use existing guardrails for text quality
    const textGuardrails = await runGuardrails(content, [], 2000, 20)
    issues.push(...textGuardrails.issues)

    return {
      ok: issues.length === 0,
      issues
    }
  }

  /**
   * Generate plan with automatic model selection and guardrails
   */
  async generatePlan(
    prompt: string,
    taskType: 'planning' | 'analysis' | 'code' | 'research' | 'creative' = 'planning',
    userId?: string,
    options: {
      maxTokens?: number
      temperature?: number
      enableGuardrails?: boolean
      maxPlanSize?: number
      requiredFields?: string[]
    } = {}
  ): Promise<PlannerGenerateResult> {
    const model = this.selectOptimalModel(taskType)
    
    return this.generatePlannerText({
      prompt,
      model,
      userId,
      maxTokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      enableGuardrails: options.enableGuardrails ?? true,
      maxPlanSize: options.maxPlanSize || 20,
      requiredFields: options.requiredFields || ['title', 'description', 'tasks']
    })
  }

  /**
   * Compare models for learning purposes
   */
  async compareModels(
    prompt: string,
    models: string[],
    userId?: string
  ): Promise<Record<string, PlannerGenerateResult>> {
    const results: Record<string, PlannerGenerateResult> = {}

    for (const model of models) {
      try {
        const result = await this.generatePlannerText({
          prompt,
          model,
          userId,
          maxTokens: 1000,
          temperature: 0.7,
          enableGuardrails: false // Skip guardrails for comparison
        })
        results[model] = result
      } catch (error) {
        results[model] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          modelStrengths: this.getModelCapabilities(model).strengths,
          modelLimitations: this.getModelCapabilities(model).limitations
        }
      }
    }

    return results
  }
}

export const plannerAIService = new PlannerAIService()
