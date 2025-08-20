import { toast } from '@/hooks/use-toast'

export interface AIDetectionResult {
  is_ai: boolean
  confidence: number
  fake_probability?: number
  real_probability?: number
  model_used?: string
  chunks_analyzed?: number
  error?: string
  models_results?: ModelResult[]
  reliability_score?: number
  detection_method?: 'single' | 'ensemble' | 'fallback'
  text_statistics?: TextStatistics
}

export interface ModelResult {
  model: string
  confidence: number
  is_ai: boolean
  fake_probability: number
  real_probability: number
  weight: number
  response_time?: number
}

export interface TextStatistics {
  total_words: number
  avg_sentence_length: number
  vocabulary_diversity: number
  perplexity_score?: number
  burstiness_score?: number
}

export class AIDetectionError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message)
    this.name = 'AIDetectionError'
  }
}

interface DetectionModel {
  name: string
  endpoint: string
  weight: number
  minConfidence: number
  enabled: boolean
  fallbackPriority: number
}

class AIDetectionService {
  private static instance: AIDetectionService
  private cache: Map<string, { result: AIDetectionResult; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
  private readonly MIN_TEXT_LENGTH = 50 // Minimum 50 characters
  private readonly CHUNK_SIZE = 512 // Characters per chunk with overlap
  private readonly CHUNK_OVERLAP = 128 // Overlap between chunks
  private readonly API_TIMEOUT = 30000 // 30 seconds
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 1000 // 1 second
  
  // REAL Hugging Face detection models 
  private readonly DETECTION_MODELS: DetectionModel[] = [
    {
      name: 'RoBERTa Base OpenAI Detector',
      endpoint: 'openai-community/roberta-base-openai-detector',
      weight: 0.30,
      minConfidence: 0.5,
      enabled: true,
      fallbackPriority: 1
    },
    {
      name: 'RoBERTa Large OpenAI Detector', 
      endpoint: 'openai-community/roberta-large-openai-detector',
      weight: 0.35,
      minConfidence: 0.5,
      enabled: true,
      fallbackPriority: 2
    },
    {
      name: 'AI Text Detector',
      endpoint: 'umm-maybe/AI-text-detector',
      weight: 0.20,
      minConfidence: 0.4,
      enabled: true,
      fallbackPriority: 4
    },
    {
      name: 'ChatGPT Detector RoBERTa',
      endpoint: 'Hello-SimpleAI/chatgpt-detector-roberta',
      weight: 0.15,
      minConfidence: 0.5,
      enabled: true,
      fallbackPriority: 3
    }
  ]

  public static getInstance(): AIDetectionService {
    if (!AIDetectionService.instance) {
      AIDetectionService.instance = new AIDetectionService()
    }
    return AIDetectionService.instance
  }

  private constructor() {}

  /**
   * Advanced text chunking with overlap for better context preservation
   */
  private createChunksWithOverlap(text: string): string[] {
    const chunks: string[] = []
    const cleanText = text.trim()
    
    if (cleanText.length <= this.CHUNK_SIZE) {
      return [cleanText]
    }
    
    let position = 0
    while (position < cleanText.length) {
      const chunkEnd = Math.min(position + this.CHUNK_SIZE, cleanText.length)
      let chunk = cleanText.slice(position, chunkEnd)
      
      // Try to break at sentence boundaries
      if (chunkEnd < cleanText.length) {
        const lastPeriod = chunk.lastIndexOf('.')
        const lastQuestion = chunk.lastIndexOf('?')
        const lastExclamation = chunk.lastIndexOf('!')
        const lastBreak = Math.max(lastPeriod, lastQuestion, lastExclamation)
        
        if (lastBreak > this.CHUNK_SIZE * 0.7) {
          chunk = chunk.slice(0, lastBreak + 1)
        }
      }
      
      chunks.push(chunk.trim())
      position += chunk.length - this.CHUNK_OVERLAP
      
      // Ensure we don't create tiny final chunks
      if (cleanText.length - position < this.MIN_TEXT_LENGTH) {
        // Append remaining text to last chunk
        if (chunks.length > 0) {
          chunks[chunks.length - 1] += ' ' + cleanText.slice(position).trim()
        }
        break
      }
    }
    
    return chunks
  }

  /**
   * Calculate text statistics for additional analysis
   */
  private calculateTextStatistics(text: string): TextStatistics {
    const words = text.split(/\s+/).filter(w => w.length > 0)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    // Calculate vocabulary diversity (unique words / total words)
    const uniqueWords = new Set(words.map(w => w.toLowerCase()))
    const vocabularyDiversity = uniqueWords.size / words.length
    
    // Calculate average sentence length
    const avgSentenceLength = sentences.length > 0 
      ? words.length / sentences.length 
      : 0
    
    // Calculate perplexity-like score (simplified)
    const wordFrequencies = new Map<string, number>()
    words.forEach(word => {
      const lower = word.toLowerCase()
      wordFrequencies.set(lower, (wordFrequencies.get(lower) || 0) + 1)
    })
    
    // Burstiness score (variance in word frequencies)
    const frequencies = Array.from(wordFrequencies.values())
    const meanFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length
    const variance = frequencies.reduce((sum, f) => sum + Math.pow(f - meanFreq, 2), 0) / frequencies.length
    const burstinessScore = Math.sqrt(variance) / meanFreq
    
    return {
      total_words: words.length,
      avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
      vocabulary_diversity: Math.round(vocabularyDiversity * 1000) / 1000,
      perplexity_score: Math.round((1 / vocabularyDiversity) * 100) / 100,
      burstiness_score: Math.round(burstinessScore * 100) / 100
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (retries <= 0) throw error
      
      // Exponential backoff
      const delay = this.RETRY_DELAY * Math.pow(2, this.MAX_RETRIES - retries)
      await new Promise(resolve => setTimeout(resolve, delay))
      return this.retryWithBackoff(fn, retries - 1)
    }
  }

  /**
   * Calibrate confidence scores based on model characteristics and text statistics
   */
  private calibrateConfidence(
    rawConfidence: number, 
    modelName: string,
    textStats?: TextStatistics
  ): number {
    let calibrated = rawConfidence
    
    // Model-specific calibration curves
    if (modelName.includes('roberta-large')) {
      // This model tends to be overconfident
      calibrated = Math.pow(rawConfidence, 1.15)
    } else if (modelName.includes('roberta-base')) {
      // Slight adjustment for base model
      calibrated = Math.pow(rawConfidence, 1.08)
    } else if (modelName.includes('AI-text-detector')) {
      // This model needs stronger calibration
      calibrated = Math.pow(rawConfidence, 1.25)
    }
    
    // Adjust based on text statistics if available
    if (textStats) {
      // High vocabulary diversity suggests human writing
      if (textStats.vocabulary_diversity > 0.7) {
        calibrated *= 0.9
      }
      // Very low burstiness might indicate AI
      if (textStats.burstiness_score && textStats.burstiness_score < 0.5) {
        calibrated *= 1.1
      }
    }
    
    // Apply smoothing to avoid extreme values
    if (calibrated > 0.98) calibrated = 0.98
    if (calibrated < 0.02) calibrated = 0.02
    
    return calibrated
  }

  /**
   * Calculate reliability score based on model agreement and response times
   */
  private calculateReliabilityScore(results: ModelResult[]): number {
    if (results.length === 0) return 0
    if (results.length === 1) return 0.5 // Single model has lower reliability
    
    // Calculate standard deviation of predictions
    const mean = results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    const variance = results.reduce((sum, r) => sum + Math.pow(r.confidence - mean, 2), 0) / results.length
    const stdDev = Math.sqrt(variance)
    
    // Lower standard deviation means higher agreement/reliability
    const agreementScore = Math.max(0, 1 - stdDev * 2)
    
    // Factor in the number of models
    const modelCountBonus = Math.min(0.3, results.length * 0.1)
    
    // Factor in response times (faster responses might be more reliable)
    const avgResponseTime = results.reduce((sum, r) => sum + (r.response_time || 0), 0) / results.length
    const speedBonus = avgResponseTime < 5000 ? 0.1 : 0
    
    return Math.min(1, agreementScore + modelCountBonus + speedBonus)
  }

  public async detectAI(text: string): Promise<AIDetectionResult> {
    if (!this.isTextLongEnough(text)) {
      throw new AIDetectionError('Text is too short for meaningful detection', 400)
    }

    const cacheKey = this.getCacheKey(text)
    const cachedResult = this.getCachedResult(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    // Calculate text statistics
    const textStats = this.calculateTextStatistics(text)

    try {
      // Try ensemble detection first
      const ensembleResult = await this.performEnsembleDetection(text, textStats)
      if (ensembleResult) {
        ensembleResult.text_statistics = textStats
        this.cacheResult(cacheKey, ensembleResult)
        return ensembleResult
      }

      // Fallback to single model detection
      const fallbackResult = await this.performSingleModelDetection(text, textStats)
      fallbackResult.text_statistics = textStats
      this.cacheResult(cacheKey, fallbackResult)
      return fallbackResult
    } catch (error) {
      if (error instanceof AIDetectionError) {
        throw error
      }
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new AIDetectionError('Detection request timed out', 408)
        }
        throw new AIDetectionError(`Detection failed: ${error.message}`, 500)
      }
      throw new AIDetectionError('An unexpected error occurred', 500)
    }
  }

  /**
   * Perform ensemble detection using multiple models
   */
  private async performEnsembleDetection(
    text: string, 
    textStats: TextStatistics
  ): Promise<AIDetectionResult | null> {
    const enabledModels = this.DETECTION_MODELS.filter(m => m.enabled)
    if (enabledModels.length < 2) return null

    const chunks = this.createChunksWithOverlap(text)
    const modelResults: ModelResult[] = []

    // Run detection with each model in parallel
    const detectionPromises = enabledModels.map(async (model) => {
      const startTime = Date.now()
      try {
        const result = await this.retryWithBackoff(async () => {
          const response = await fetch('/api/ai-detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text,
              model: model.endpoint,
              useChunking: chunks.length > 1,
              chunks: chunks.length > 1 ? chunks : undefined
            }),
            signal: AbortSignal.timeout(this.API_TIMEOUT),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: 'Unknown error'}))
            throw new Error(errorData.error || `Failed with status ${response.status}`)
          }

          return response.json()
        })

        const responseTime = Date.now() - startTime
        const calibratedConfidence = this.calibrateConfidence(
          result.confidence || 0,
          model.name,
          textStats
        )

        const modelResult: ModelResult = {
          model: model.name,
          confidence: calibratedConfidence,
          is_ai: result.is_ai,
          fake_probability: result.fake_probability || 0,
          real_probability: result.real_probability || 0,
          weight: model.weight,
          response_time: responseTime
        }
        return modelResult
      } catch (error) {
        console.warn(`Model ${model.name} failed:`, error)
        return null
      }
    })

    const results = await Promise.all(detectionPromises)
    const successfulResults: ModelResult[] = results.filter((r): r is ModelResult => r !== null)

    if (successfulResults.length === 0) return null

    // Calculate weighted average with normalization
    const totalWeight = successfulResults.reduce((sum, r) => sum + r.weight, 0)
    const weightedConfidence = successfulResults.reduce(
      (sum, r) => sum + r.confidence * r.weight,
      0
    ) / totalWeight

    const weightedFakeProb = successfulResults.reduce(
      (sum, r) => sum + r.fake_probability * r.weight,
      0
    ) / totalWeight

    const weightedRealProb = successfulResults.reduce(
      (sum, r) => sum + r.real_probability * r.weight,
      0
    ) / totalWeight

    // Determine consensus with weighted voting
    const aiVotes = successfulResults.filter(r => r.is_ai).reduce((sum, r) => sum + r.weight, 0)
    const isAI = aiVotes > totalWeight / 2

    const reliabilityScore = this.calculateReliabilityScore(successfulResults)

    return {
      is_ai: isAI,
      confidence: Math.round(weightedConfidence * 100) / 100,
      fake_probability: Math.round(weightedFakeProb * 100) / 100,
      real_probability: Math.round(weightedRealProb * 100) / 100,
      model_used: `Ensemble (${successfulResults.length}/${enabledModels.length} models)`,
      chunks_analyzed: chunks.length,
      models_results: successfulResults,
      reliability_score: Math.round(reliabilityScore * 100) / 100,
      detection_method: 'ensemble'
    }
  }

  /**
   * Fallback to single model detection with priority
   */
  private async performSingleModelDetection(
    text: string,
    textStats: TextStatistics
  ): Promise<AIDetectionResult> {
    const sortedModels = [...this.DETECTION_MODELS]
      .filter(m => m.enabled)
      .sort((a, b) => a.fallbackPriority - b.fallbackPriority)

    for (const model of sortedModels) {
      try {
        const startTime = Date.now()
        const response = await this.retryWithBackoff(async () => {
          const res = await fetch('/api/ai-detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text,
              model: model.endpoint 
            }),
            signal: AbortSignal.timeout(this.API_TIMEOUT),
          })

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({error: 'Unknown error'}))
            throw new Error(errorData.error || `Failed with status ${res.status}`)
          }

          return res.json()
        })

        const responseTime = Date.now() - startTime
        const calibratedConfidence = this.calibrateConfidence(
          response.confidence || 0,
          model.name,
          textStats
        )

        return {
          ...response,
          confidence: calibratedConfidence,
          model_used: model.name,
          detection_method: 'fallback',
          reliability_score: 0.6, // Lower reliability for single model
          models_results: [{
            model: model.name,
            confidence: calibratedConfidence,
            is_ai: response.is_ai,
            fake_probability: response.fake_probability || 0,
            real_probability: response.real_probability || 0,
            weight: 1,
            response_time: responseTime
          }]
        }
      } catch (error) {
        console.warn(`Fallback model ${model.name} failed:`, error)
        continue
      }
    }

    throw new AIDetectionError('All detection models failed', 503)
  }

  public isTextLongEnough(text: string): boolean {
    return text.trim().length >= this.MIN_TEXT_LENGTH
  }

  public getWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length
  }

  private getCacheKey(text: string): string {
    // Create a hash of the text for cache key
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i]
      hash = hash & hash
    }
    return `ai-detect-${hash}`
  }

  private getCachedResult(key: string): AIDetectionResult | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION
    if (isExpired) {
      this.cache.delete(key)
      return null
    }
    
    return cached.result
  }

  private cacheResult(key: string, result: AIDetectionResult): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    })
    
    // Clean up old cache entries
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      entries.slice(0, 50).forEach(([key]) => this.cache.delete(key))
    }
  }

  public getConfidenceBadge(confidence: number, reliabilityScore?: number): {
    label: string
    color: 'green' | 'yellow' | 'orange' | 'red' | 'blue'
    description?: string
  } {
    // Factor in reliability if available
    const effectiveConfidence = reliabilityScore 
      ? confidence * (0.7 + reliabilityScore * 0.3)
      : confidence

    if (effectiveConfidence >= 0.85) {
      return { 
        label: 'Very High Confidence', 
        color: 'red',
        description: 'Strong evidence of AI generation'
      }
    } else if (effectiveConfidence >= 0.7) {
      return { 
        label: 'High Confidence', 
        color: 'orange',
        description: 'Likely AI-generated content'
      }
    } else if (effectiveConfidence >= 0.5) {
      return { 
        label: 'Medium Confidence', 
        color: 'yellow',
        description: 'Possible AI involvement'
      }
    } else if (effectiveConfidence >= 0.3) {
      return { 
        label: 'Low Confidence', 
        color: 'blue',
        description: 'Unlikely to be AI-generated'
      }
    } else {
      return { 
        label: 'Very Low Confidence', 
        color: 'green',
        description: 'Appears to be human-written'
      }
    }
  }

  public formatMessage(result: AIDetectionResult): string {
    if (result.error) {
      return `Detection error: ${result.error}`
    }

    const percentage = Math.round((result.confidence || 0) * 100)
    const badge = this.getConfidenceBadge(result.confidence || 0, result.reliability_score)
    const reliability = result.reliability_score 
      ? ` (${Math.round(result.reliability_score * 100)}% reliability)`
      : ''
    
    if (result.is_ai) {
      return `AI-generated content detected with ${percentage}% confidence${reliability} - ${badge.label}`
    } else {
      return `Human-written content detected with ${percentage}% confidence${reliability} - ${badge.label}`
    }
  }

  /**
   * Get detailed analysis breakdown
   */
  public getDetailedAnalysis(result: AIDetectionResult): string[] {
    const details: string[] = []
    
    if (result.detection_method === 'ensemble' && result.models_results) {
      details.push(`🔍 Detection Method: Ensemble Analysis (${result.models_results.length} models)`)
      details.push(`📊 Overall Reliability: ${Math.round((result.reliability_score || 0) * 100)}%`)
      
      result.models_results.forEach(model => {
        const confidence = Math.round(model.confidence * 100)
        const verdict = model.is_ai ? '🤖 AI' : '👤 Human'
        const time = model.response_time ? ` (${model.response_time}ms)` : ''
        details.push(`  • ${model.model}: ${verdict} (${confidence}% confidence)${time}`)
      })
    } else if (result.detection_method === 'fallback') {
      details.push('🔍 Detection Method: Single Model (Fallback)')
      details.push('⚠️ Note: Cross-validation unavailable')
    }
    
    if (result.text_statistics) {
      details.push('')
      details.push('📝 Text Analysis:')
      details.push(`  • Total Words: ${result.text_statistics.total_words}`)
      details.push(`  • Avg Sentence Length: ${result.text_statistics.avg_sentence_length} words`)
      details.push(`  • Vocabulary Diversity: ${(result.text_statistics.vocabulary_diversity * 100).toFixed(1)}%`)
      if (result.text_statistics.perplexity_score) {
        details.push(`  • Perplexity Score: ${result.text_statistics.perplexity_score}`)
      }
      if (result.text_statistics.burstiness_score) {
        details.push(`  • Burstiness Score: ${result.text_statistics.burstiness_score}`)
      }
    }
    
    if (result.chunks_analyzed && result.chunks_analyzed > 1) {
      details.push(`📄 Text Segments Analyzed: ${result.chunks_analyzed}`)
    }
    
    return details
  }
}

export const aiDetectionService = AIDetectionService.getInstance()
