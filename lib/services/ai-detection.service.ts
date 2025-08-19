/**
 * AI Detection Service
 * Provides client-side utilities for detecting AI-generated content
 */

export interface AIDetectionResult {
  is_ai: boolean
  ai_probability: number
  human_probability: number
  confidence: 'low' | 'medium' | 'high'
  message: string
  model_used: string
  chunks_analyzed?: number
}

export interface AIDetectionOptions {
  model?: string
  threshold?: number
}

export class AIDetectionService {
  private static instance: AIDetectionService
  private baseUrl: string

  private constructor() {
    this.baseUrl = '/api/ai-detect'
  }

  static getInstance(): AIDetectionService {
    if (!AIDetectionService.instance) {
      AIDetectionService.instance = new AIDetectionService()
    }
    return AIDetectionService.instance
  }

  /**
   * Detect if text is AI-generated
   */
  async detectAI(text: string, options: AIDetectionOptions = {}): Promise<AIDetectionResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty')
    }

    if (text.length > 100000) {
      throw new Error('Text is too long (max 100,000 characters)')
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          model: options.model,
          threshold: options.threshold
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new APIError(
          errorData.error || `Request failed with status ${response.status}`,
          response.status,
          errorData.details
        )
      }

      const result = await response.json()
      return result as AIDetectionResult
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network error. Please check your connection and try again.', 0)
      }

      throw new APIError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        0
      )
    }
  }

  /**
   * Get confidence badge text based on result
   */
  getConfidenceBadge(result: AIDetectionResult): {
    text: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    color: string
  } {
    const { is_ai, ai_probability, human_probability, confidence } = result

    if (is_ai) {
      const variant = confidence === 'high' ? 'destructive' : 
                    confidence === 'medium' ? 'secondary' : 'outline'
      const color = confidence === 'high' ? 'bg-red-100 text-red-800' :
                   confidence === 'medium' ? 'bg-orange-100 text-orange-800' :
                   'bg-yellow-100 text-yellow-800'

      return {
        text: `AI Generated (${ai_probability.toFixed(1)}%)`,
        variant,
        color
      }
    } else {
      const variant = confidence === 'high' ? 'default' : 
                    confidence === 'medium' ? 'secondary' : 'outline'
      const color = confidence === 'high' ? 'bg-green-100 text-green-800' :
                   confidence === 'medium' ? 'bg-blue-100 text-blue-800' :
                   'bg-gray-100 text-gray-800'

      return {
        text: `Human Written (${human_probability.toFixed(1)}%)`,
        variant,
        color
      }
    }
  }

  /**
   * Format detection result message for UI display
   */
  formatMessage(result: AIDetectionResult): string {
    const { message, chunks_analyzed, model_used } = result
    
    let formatted = message
    
    if (chunks_analyzed && chunks_analyzed > 1) {
      formatted += ` Analyzed ${chunks_analyzed} text segments.`
    }
    
    return formatted
  }

  /**
   * Check if text is long enough for meaningful detection
   */
  isTextLongEnough(text: string): boolean {
    const words = text.trim().split(/\s+/)
    return words.length >= 10 // At least 10 words for meaningful analysis
  }

  /**
   * Get word count for text
   */
  getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message)
    this.name = 'AIDetectionAPIError'
  }

  isRateLimited(): boolean {
    return this.status === 429
  }

  isServiceUnavailable(): boolean {
    return this.status === 503
  }

  isTimeout(): boolean {
    return this.status === 408
  }

  isConfigurationError(): boolean {
    return this.status === 503 && this.message.includes('not configured')
  }
}

// Export singleton instance
export const aiDetectionService = AIDetectionService.getInstance()
export default aiDetectionService
