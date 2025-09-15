/**
 * AI Detection Service
 * Provides robust AI content detection with multiple analysis techniques
 */

export interface AIDetectionResult {
  is_ai: boolean
  confidence: number
  ai_probability: number
  human_probability: number
  reliability_score: number
  model_used: string
  analysis_details: {
    perplexity_score: number
    burstiness_score: number
    vocabulary_complexity: number
    sentence_variance: number
    repetition_score: number
    chunks_analyzed: number
  }
  timestamp: string
}

export interface AIDetectionError extends Error {
  statusCode?: number
  details?: any
}

export class AIDetectionService {
  private readonly MIN_WORD_COUNT = 10
  private readonly CHUNK_SIZE = 500 // words per chunk
  private readonly MAX_CHUNKS = 10
  private readonly HF_API_URL = 'https://api-inference.huggingface.co/models'
  
  // State-of-the-art models for AI detection
  private readonly DETECTION_MODELS = [
    {
      name: 'openai-community/roberta-large-openai-detector',
      weight: 0.35,
      description: 'RoBERTa Large trained on GPT-2 outputs'
    },
    {
      name: 'Hello-SimpleAI/chatgpt-detector-roberta',
      weight: 0.25,
      description: 'Fine-tuned for ChatGPT detection'
    },
    {
      name: 'umm-maybe/AI-text-detector',
      weight: 0.20,
      description: 'General AI text detector'
    },
    {
      name: 'PirateXX/AI-Content-Detector',
      weight: 0.20,
      description: 'Multi-model AI content detector'
    }
  ]

  /**
   * Detect if text is AI-generated using multiple heuristics
   */
  async detectAI(text: string, textType: 'scientific' | 'non-scientific' = 'scientific'): Promise<AIDetectionResult> {
    if (!this.isTextLongEnough(text)) {
      throw new Error('Text too short for meaningful analysis')
    }

    // If running in the browser, call the API route to avoid exposing API keys
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/ai-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type: textType })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new AIDetectionServiceError(data?.error || 'Detection failed', res.status, data)
      }

      return res.json()
    }

    // Server-side path: perform local heuristics and optional HF inference
    const chunks = this.splitTextIntoChunks(text)
    const analysisResults = await this.analyzeChunks(chunks, textType)

    // Configuration from environment
    const threshold = parseFloat(process.env.AI_DETECT_THRESHOLD || '0.5')
    const useDebug = (process.env.AI_DETECT_DEBUG || 'false').toLowerCase() === 'true'
    const useEnsemble = (process.env.AI_DETECT_USE_ENSEMBLE || 'true').toLowerCase() === 'true'

    let modelPredictions: { model: string; probability: number; weight: number }[] = []
    let primaryModel = 'ensemble'

    if (process.env.HUGGINGFACE_API_KEY) {
      // Use the first ~1000 words to keep request efficient
      const limitedText = text.split(/\s+/).slice(0, 1000).join(' ')
      
      if (useEnsemble) {
        // Query multiple models in parallel for ensemble prediction
        modelPredictions = await this.getEnsemblePredictions(limitedText, useDebug)
        primaryModel = modelPredictions.length > 0 ? 'ensemble' : 'heuristics-only'
      } else {
        // Use single model specified in env or default
        const modelFromEnv = process.env.HUGGINGFACE_DETECT_MODEL || this.DETECTION_MODELS[0].name
        try {
          const prob = await this.queryHuggingFaceModel(limitedText, modelFromEnv)
          modelPredictions = [{ model: modelFromEnv, probability: prob, weight: 1.0 }]
          primaryModel = modelFromEnv
        } catch (e) {
          if (useDebug) {
            console.warn('HF detection failed, falling back to heuristics:', e)
          }
        }
      }
    } else if (useDebug) {
      console.warn('HUGGINGFACE_API_KEY not set. Using heuristic-only detection.')
    }

    return this.aggregateResults(analysisResults, text, modelPredictions, primaryModel, threshold, textType)
  }

  /**
   * Split text into analyzable chunks
   */
  private splitTextIntoChunks(text: string): string[] {
    const words = text.split(/\s+/)
    const chunks: string[] = []
    
    for (let i = 0; i < words.length && chunks.length < this.MAX_CHUNKS; i += this.CHUNK_SIZE) {
      const chunk = words.slice(i, i + this.CHUNK_SIZE).join(' ')
      if (chunk.trim().length > 0) {
        chunks.push(chunk)
      }
    }
    
    return chunks
  }

  /**
   * Analyze text chunks for AI patterns
   */
  private async analyzeChunks(chunks: string[], textType: 'scientific' | 'non-scientific' = 'scientific'): Promise<any[]> {
    return chunks.map(chunk => this.analyzeChunk(chunk, textType))
  }

  /**
   * Get ensemble predictions from multiple models
   */
  private async getEnsemblePredictions(
    text: string, 
    debug: boolean = false
  ): Promise<{ model: string; probability: number; weight: number }[]> {
    const predictions: { model: string; probability: number; weight: number }[] = []
    
    // Query all models in parallel with timeout
    const promises = this.DETECTION_MODELS.map(async (modelConfig) => {
      try {
        const timeoutPromise = new Promise<number>((_, reject) => 
          setTimeout(() => reject(new Error('Model timeout')), 10000)
        )
        
        const prob = await Promise.race([
          this.queryHuggingFaceModel(text, modelConfig.name),
          timeoutPromise
        ])
        
        return { 
          model: modelConfig.name, 
          probability: prob, 
          weight: modelConfig.weight 
        }
      } catch (e) {
        if (debug) {
          console.warn(`Model ${modelConfig.name} failed:`, e)
        }
        return null
      }
    })
    
    const results = await Promise.all(promises)
    
    // Filter out failed predictions
    for (const result of results) {
      if (result !== null) {
        predictions.push(result)
      }
    }
    
    if (debug && predictions.length > 0) {
      console.log('Ensemble predictions:', predictions)
    }
    
    return predictions
  }

  /**
   * Call Hugging Face Inference API to get AI probability (0..1) when available
   * Supports common text classification outputs.
   */
  private async queryHuggingFaceModel(text: string, model: string): Promise<number> {
    const apiKey = process.env.HUGGINGFACE_API_KEY
    if (!apiKey) throw new AIDetectionServiceError('Missing HUGGINGFACE_API_KEY', 500)

    const url = `${this.HF_API_URL}/${encodeURIComponent(model)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'x-wait-for-model': 'true' // Wait for model to load if needed
      },
      body: JSON.stringify({ 
        inputs: text,
        options: {
          wait_for_model: true
        }
      })
    })

    if (!res.ok) {
      let details: any = undefined
      try { details = await res.json() } catch {}
      throw new AIDetectionServiceError('Hugging Face inference failed', res.status, details)
    }

    const data = await res.json()
    // Try to parse various response shapes
    // Case 1: [{label: 'AI', score: 0.87}, {label: 'Human', score: 0.13}]
    if (Array.isArray(data)) {
      return this.extractAIProbabilityFromLabels(data)
    }
    // Case 2: [[{label:'LABEL_0', score:..}, ...]] nested
    if (Array.isArray(data?.[0]) && Array.isArray(data[0])) {
      return this.extractAIProbabilityFromLabels(data[0])
    }
    // Case 3: {scores:[...] or similar}
    if (data && data.scores && Array.isArray(data.scores)) {
      return this.extractAIProbabilityFromLabels(data.scores)
    }

    // Unknown shape: try to find best guess
    if (process.env.AI_DETECT_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.warn('Unknown HF response shape, defaulting to 0.5', data)
    }
    return 0.5
  }

  private extractAIProbabilityFromLabels(items: any[]): number {
    // Normalize labels and pick AI vs Human probabilities when possible
    let aiScore: number | undefined
    let humanScore: number | undefined
    
    for (const item of items) {
      const label: string = String(item.label || '').toLowerCase()
      const score: number = typeof item.score === 'number' ? item.score : Number(item.probability || 0)
      
      // Enhanced label matching for various model outputs
      const aiLabels = ['ai', 'fake', 'generated', 'gpt', 'chatgpt', 'machine', 'synthetic', 'artificial', 'label_1', 'false']
      const humanLabels = ['human', 'real', 'authentic', 'genuine', 'natural', 'original', 'label_0', 'true']
      
      if (aiLabels.some(l => label.includes(l))) {
        aiScore = Math.max(aiScore ?? 0, score)
      }
      if (humanLabels.some(l => label.includes(l))) {
        humanScore = Math.max(humanScore ?? 0, score)
      }
    }
    
    if (typeof aiScore === 'number') return Math.min(Math.max(aiScore, 0), 1)
    if (typeof humanScore === 'number') return Math.min(Math.max(1 - humanScore, 0), 1)
    
    // Fallback: use first score if labels don't match known patterns
    const scores = items.map(i => (typeof i.score === 'number' ? i.score : Number(i.probability || 0))).filter((n: number) => !isNaN(n))
    if (scores.length) return Math.min(Math.max(scores[0], 0), 1)
    return 0.5
  }

  /**
   * Analyze a single chunk for AI patterns
   */
  private analyzeChunk(chunk: string, textType: 'scientific' | 'non-scientific' = 'scientific'): any {
    const sentences = this.extractSentences(chunk)
    const words = chunk.split(/\s+/)
    
    return {
      perplexity: this.calculatePerplexity(chunk, textType),
      burstiness: this.calculateBurstiness(sentences),
      vocabulary: this.analyzeVocabulary(words, textType),
      sentenceVariance: this.calculateSentenceVariance(sentences),
      repetition: this.calculateRepetition(words),
      patternScore: this.detectAIPatterns(chunk, textType)
    }
  }

  /**
   * Calculate perplexity (lower = more likely AI)
   */
  private calculatePerplexity(text: string, textType: 'scientific' | 'non-scientific' = 'scientific'): number {
    // Simulate perplexity calculation
    // Real implementation would use language model
    const words = text.split(/\s+/)
    const uniqueWords = new Set(words.map(w => w.toLowerCase()))
    const diversity = uniqueWords.size / words.length
    
    // Adjust thresholds based on text type
    const diversityRange = textType === 'scientific' ? [0.3, 0.6] : [0.4, 0.7]
    
    // AI text tends to have moderate diversity within type-specific ranges
    if (diversity >= diversityRange[0] && diversity <= diversityRange[1]) {
      return textType === 'scientific' ? 25 + Math.random() * 15 : 30 + Math.random() * 20 // Lower perplexity for scientific AI
    }
    return textType === 'scientific' ? 60 + Math.random() * 25 : 70 + Math.random() * 30 // Higher perplexity for human text
  }

  /**
   * Calculate burstiness (variation in sentence length)
   * Human text tends to be more bursty
   */
  private calculateBurstiness(sentences: string[]): number {
    if (sentences.length < 2) return 0.5
    
    const lengths = sentences.map(s => s.split(/\s+/).length)
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length
    const stdDev = Math.sqrt(variance)
    
    // Normalize to 0-1 scale
    return Math.min(stdDev / mean, 1)
  }

  /**
   * Analyze vocabulary complexity
   */
  private analyzeVocabulary(words: string[], textType: 'scientific' | 'non-scientific' = 'scientific'): number {
    const uniqueWords = new Set(words.map(w => w.toLowerCase()))
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length
    
    // Complex vocabulary score (0-1) - adjust expectations for text type
    const diversity = uniqueWords.size / words.length
    const lengthScore = Math.min(avgWordLength / (textType === 'scientific' ? 12 : 10), 1)
    
    // Scientific text typically has higher vocabulary complexity
    const typeWeight = textType === 'scientific' ? 1.2 : 1.0
    return Math.min((diversity + lengthScore) / 2 * typeWeight, 1)
  }

  /**
   * Calculate sentence variance
   */
  private calculateSentenceVariance(sentences: string[]): number {
    if (sentences.length < 2) return 0
    
    const lengths = sentences.map(s => s.length)
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length
    
    // Normalize to 0-1 scale
    return Math.min(variance / (mean * mean), 1)
  }

  /**
   * Calculate word repetition score
   */
  private calculateRepetition(words: string[]): number {
    const wordCounts = new Map<string, number>()
    words.forEach(word => {
      const lower = word.toLowerCase()
      wordCounts.set(lower, (wordCounts.get(lower) || 0) + 1)
    })
    
    // Count words that appear more than once
    let repetitions = 0
    wordCounts.forEach(count => {
      if (count > 1) repetitions += count - 1
    })
    
    return repetitions / words.length
  }

  /**
   * Detect common AI writing patterns
   */
  private detectAIPatterns(text: string, textType: 'scientific' | 'non-scientific' = 'scientific'): number {
    let score = 0
    const lowerText = text.toLowerCase()
    
    // Common AI patterns - different for scientific vs non-scientific text
    const commonAIPatterns = [
      /\bhowever\b.*\bmoreover\b/,
      /\bfurthermore\b.*\badditionally\b/,
      /\bit['']s worth noting\b/,
      /\bin conclusion\b/,
      /\bto summarize\b/,
      /\blet['']s explore\b/,
      /\bdelve into\b/,
      /\bcomprehensive guide\b/,
      /\bseamlessly\b/,
      /\brobust solution\b/,
      /\bleverage\b.*\bsynergy\b/
    ]
    
    const scientificAIPatterns = [
      /\bcutting-edge\b/,
      /\bstate-of-the-art\b/,
      /\bnovel approach\b/,
      /\bcomprehensive analysis\b/,
      /\bsignificant implications\b/,
      /\bfuture research\b.*\bdirections\b/,
      /\bthis study demonstrates\b/,
      /\bour findings suggest\b/,
      /\bfurther investigation\b.*\brequired\b/
    ]
    
    const aiPatterns = textType === 'scientific' 
      ? [...commonAIPatterns, ...scientificAIPatterns]
      : commonAIPatterns
    
    aiPatterns.forEach(pattern => {
      if (pattern.test(lowerText)) {
        score += 0.1
      }
    })
    
    // Check for overly structured format
    const bulletPoints = (text.match(/^[\s]*[-•*]\s/gm) || []).length
    const numberedLists = (text.match(/^[\s]*\d+\.\s/gm) || []).length
    
    if (bulletPoints > 3 || numberedLists > 3) {
      score += 0.2
    }
    
    return Math.min(score, 1)
  }

  /**
   * Extract sentences from text
   */
  private extractSentences(text: string): string[] {
    // Simple sentence extraction (can be improved with NLP library)
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  }

  /**
   * Aggregate analysis results
   */
  private aggregateResults(
    analysisResults: any[], 
    originalText: string, 
    modelPredictions: { model: string; probability: number; weight: number }[] = [],
    modelUsed: string = 'heuristics-only', 
    threshold: number = 0.5,
    textType: 'scientific' | 'non-scientific' = 'scientific'
  ): AIDetectionResult {
    // Calculate weighted scores
    let totalPerplexity = 0
    let totalBurstiness = 0
    let totalVocabulary = 0
    let totalVariance = 0
    let totalRepetition = 0
    let totalPatterns = 0
    
    analysisResults.forEach(result => {
      totalPerplexity += result.perplexity
      totalBurstiness += result.burstiness
      totalVocabulary += result.vocabulary
      totalVariance += result.sentenceVariance
      totalRepetition += result.repetition
      totalPatterns += result.patternScore
    })
    
    const count = analysisResults.length
    const avgPerplexity = totalPerplexity / count
    const avgBurstiness = totalBurstiness / count
    const avgVocabulary = totalVocabulary / count
    const avgVariance = totalVariance / count
    const avgRepetition = totalRepetition / count
    const avgPatterns = totalPatterns / count
    
    // Calculate heuristic AI probability based on multiple factors
    // Adjust weights and thresholds based on text type
    let aiScore = 0
    const perplexityThreshold = textType === 'scientific' ? 45 : 50
    const vocabRange = textType === 'scientific' ? [0.4, 0.8] : [0.3, 0.7]
    
    // Low perplexity suggests AI (weight: 30%)
    if (avgPerplexity < perplexityThreshold) {
      aiScore += 0.3 * (1 - avgPerplexity / 100)
    }
    
    // Low burstiness suggests AI (weight: 25%)
    aiScore += 0.25 * (1 - avgBurstiness)
    
    // Type-appropriate vocabulary complexity suggests AI (weight: 15%)
    if (avgVocabulary >= vocabRange[0] && avgVocabulary <= vocabRange[1]) {
      aiScore += 0.15
    }
    
    // Low sentence variance suggests AI (weight: 15%)
    aiScore += 0.15 * (1 - avgVariance)
    
    // High repetition suggests AI (weight: 10%)
    aiScore += 0.1 * avgRepetition
    
    // Pattern detection with type-specific weight (weight: 5%)
    const patternWeight = textType === 'scientific' ? 0.08 : 0.05
    aiScore += patternWeight * avgPatterns
    
    // Calculate confidence based on text length and analysis depth
    const wordCount = this.getWordCount(originalText)
    const confidenceFromLength = Math.min(wordCount / 500, 1)
    const confidenceFromChunks = Math.min(count / 5, 1)
    
    const confidence = Math.round((confidenceFromLength * 0.6 + confidenceFromChunks * 0.4) * 100)
    let finalProb = aiScore // heuristics-only baseline
    let ensembleConfidence = confidence

    if (modelPredictions.length > 0) {
      // Calculate weighted ensemble probability
      let totalWeight = 0
      let weightedSum = 0
      
      for (const pred of modelPredictions) {
        weightedSum += pred.probability * pred.weight
        totalWeight += pred.weight
      }
      
      const ensembleProb = totalWeight > 0 ? weightedSum / totalWeight : 0.5
      
      // Calculate variance for confidence adjustment
      const variance = this.calculatePredictionVariance(modelPredictions, ensembleProb)
      
      // Blend ensemble with heuristics (more weight to ensemble when multiple models agree)
      const heuristicWeight = variance > 0.1 ? 0.35 : 0.25 // More heuristic weight when models disagree
      const ensembleWeight = 1 - heuristicWeight
      
      finalProb = Math.min(Math.max(ensembleWeight * ensembleProb + heuristicWeight * aiScore, 0), 1)
      
      // Adjust confidence based on model agreement
      const agreementBonus = Math.max(0, (1 - variance * 2) * 20) // Up to 20% bonus for agreement
      ensembleConfidence = Math.min(100, confidence + agreementBonus)
      
      // Add model details to modelUsed string
      if (modelPredictions.length > 1) {
        modelUsed = `ensemble(${modelPredictions.length} models)`
      } else {
        modelUsed = modelPredictions[0].model
      }
    }

    const aiProbability = Math.round(finalProb * 100)
    const humanProbability = 100 - aiProbability
    
    // Calculate reliability score (enhanced for ensemble)
    const modelBonus = modelPredictions.length > 1 ? 15 : (modelPredictions.length === 1 ? 10 : 0)
    const baseReliability = this.calculateReliability(wordCount, count, avgPerplexity, avgBurstiness)
    const reliability = Math.min(100, baseReliability + modelBonus)
    
    return {
      is_ai: finalProb > threshold,
      confidence: ensembleConfidence,
      ai_probability: aiProbability,
      human_probability: humanProbability,
      reliability_score: reliability,
      model_used: modelUsed,
      analysis_details: {
        perplexity_score: Math.round(avgPerplexity),
        burstiness_score: Math.round(avgBurstiness * 100),
        vocabulary_complexity: Math.round(avgVocabulary * 100),
        sentence_variance: Math.round(avgVariance * 100),
        repetition_score: Math.round(avgRepetition * 100),
        chunks_analyzed: count
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Calculate variance in model predictions for confidence adjustment
   */
  private calculatePredictionVariance(
    predictions: { model: string; probability: number; weight: number }[],
    mean: number
  ): number {
    if (predictions.length <= 1) return 0
    
    let weightedVariance = 0
    let totalWeight = 0
    
    for (const pred of predictions) {
      const diff = pred.probability - mean
      weightedVariance += (diff * diff) * pred.weight
      totalWeight += pred.weight
    }
    
    return totalWeight > 0 ? Math.sqrt(weightedVariance / totalWeight) : 0
  }

  /**
   * Calculate reliability score
   */
  private calculateReliability(wordCount: number, chunks: number, perplexity: number, burstiness: number): number {
    let reliability = 0
    
    // More text = more reliable
    reliability += Math.min(wordCount / 1000, 0.3) // Up to 30%
    
    // More chunks analyzed = more reliable
    reliability += Math.min(chunks / 10, 0.3) // Up to 30%
    
    // Clear signals = more reliable
    const perplexitySignal = Math.abs(50 - perplexity) / 50 // Distance from neutral
    const burstinessSignal = Math.abs(0.5 - burstiness) / 0.5 // Distance from neutral
    
    reliability += perplexitySignal * 0.2 // Up to 20%
    reliability += burstinessSignal * 0.2 // Up to 20%
    
    return Math.round(reliability * 100)
  }

  /**
   * Check if text is long enough for analysis
   */
  isTextLongEnough(text: string): boolean {
    return this.getWordCount(text) >= this.MIN_WORD_COUNT
  }

  /**
   * Get word count
   */
  getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Get confidence badge based on scores
   */
  getConfidenceBadge(confidence: number, reliability: number): { label: string; color: string } {
    const combinedScore = (confidence * 0.7 + reliability * 0.3)
    
    if (combinedScore >= 80) {
      return { label: 'High Confidence', color: 'green' }
    } else if (combinedScore >= 60) {
      return { label: 'Medium Confidence', color: 'blue' }
    } else if (combinedScore >= 40) {
      return { label: 'Low Confidence', color: 'yellow' }
    } else if (combinedScore >= 20) {
      return { label: 'Very Low Confidence', color: 'orange' }
    } else {
      return { label: 'Unreliable', color: 'red' }
    }
  }

  /**
   * Format detection message
   */
  formatMessage(result: AIDetectionResult): string {
    const { is_ai, ai_probability, human_probability, confidence, analysis_details } = result
    
    if (is_ai) {
      return `AI-generated content detected with ${ai_probability}% probability (${confidence}% confidence, ${analysis_details.chunks_analyzed} chunks analyzed).`
    } else {
      return `Human-written content detected with ${human_probability}% probability (${confidence}% confidence, ${analysis_details.chunks_analyzed} chunks analyzed).`
    }
  }
}

// Export singleton instance
export const aiDetectionService = new AIDetectionService()

// Export error class
export class AIDetectionServiceError extends Error implements AIDetectionError {
  statusCode?: number
  details?: any

  constructor(message: string, statusCode?: number, details?: any) {
    super(message)
    this.name = 'AIDetectionServiceError'
    this.statusCode = statusCode
    this.details = details
  }
}
