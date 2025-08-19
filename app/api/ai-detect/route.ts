import { NextResponse } from "next/server"
import { InferenceClient } from "@huggingface/inference"
import { apiCache } from "@/lib/services/cache.service"
import { createHash } from "crypto"
import { z } from "zod"

// Request validation schema
const DetectionRequestSchema = z.object({
  text: z.string().min(1, "Text cannot be empty").max(100000, "Text too long"),
  model: z.string().optional(),
  threshold: z.number().min(0).max(1).optional()
})

// Response interfaces
interface DetectionResult {
  is_ai: boolean
  ai_probability: number
  human_probability: number
  confidence: 'low' | 'medium' | 'high'
  message: string
  model_used: string
  chunks_analyzed?: number
}

interface ChunkResult {
  ai_score: number
  human_score: number
}

// Configuration
const MAX_CHUNK_LENGTH = 500
const DEFAULT_MODEL = "roberta-base-openai-detector"
const DEFAULT_THRESHOLD = 0.5
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const REQUEST_TIMEOUT = 15000 // 15 seconds

export async function POST(req: Request) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  
  try {
    // Validate environment
    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json({ 
        error: "AI detection service not configured. Missing HUGGINGFACE_API_KEY." 
      }, { status: 503 })
    }

    // Parse and validate request
    const body = await req.json()
    const validation = DetectionRequestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid request", 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const { text, model, threshold } = validation.data
    const selectedModel = model || process.env.HUGGINGFACE_DETECT_MODEL || DEFAULT_MODEL
    const detectionThreshold = threshold || parseFloat(process.env.AI_DETECT_THRESHOLD || '0.5')

    // Generate cache key
    const cacheKey = createHash('sha256')
      .update(`${text}:${selectedModel}:${detectionThreshold}`)
      .digest('hex')

    // Check cache first
    const cached = apiCache.get<DetectionResult>(`ai-detect:${cacheKey}`)
    if (cached) {
      clearTimeout(timeoutId)
      return NextResponse.json(cached)
    }

    // Initialize Hugging Face client
    const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY)

    let result: DetectionResult

    if (text.length <= MAX_CHUNK_LENGTH) {
      // Short text - direct analysis
      result = await analyzeSingleChunk(hf, text, selectedModel, detectionThreshold)
    } else {
      // Long text - chunk and analyze
      result = await analyzeChunkedText(hf, text, selectedModel, detectionThreshold)
    }

    // Cache the result
    apiCache.set(`ai-detect:${cacheKey}`, result, CACHE_TTL)

    clearTimeout(timeoutId)
    return NextResponse.json(result)

  } catch (error: any) {
    clearTimeout(timeoutId)
    console.error("AI detection error:", error)

    if (controller.signal.aborted) {
      return NextResponse.json({ 
        error: "Request timeout. Please try with shorter text or try again later." 
      }, { status: 408 })
    }

    if (error?.message?.includes('rate limit') || error?.status === 429) {
      return NextResponse.json({ 
        error: "Service temporarily overloaded. Please try again in a few seconds." 
      }, { status: 429 })
    }

    if (error?.status === 503) {
      return NextResponse.json({ 
        error: "AI detection service temporarily unavailable. Please try again later." 
      }, { status: 503 })
    }

    return NextResponse.json({ 
      error: "AI detection failed. Please try again later.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

async function analyzeSingleChunk(
  hf: InferenceClient, 
  text: string, 
  model: string, 
  threshold: number
): Promise<DetectionResult> {
  const result = await hf.textClassification({
    model,
    inputs: text,
  })

  return processClassificationResult(result, model, threshold)
}

async function analyzeChunkedText(
  hf: InferenceClient, 
  text: string, 
  model: string, 
  threshold: number
): Promise<DetectionResult> {
  // Split text into chunks
  const chunks = chunkText(text, MAX_CHUNK_LENGTH)
  
  // Analyze all chunks in parallel with retry logic
  const chunkPromises = chunks.map(chunk => 
    retryWithBackoff(() => hf.textClassification({
      model,
      inputs: chunk,
    }), 3)
  )

  const chunkResults = await Promise.all(chunkPromises)
  
  // Aggregate results
  const aggregatedScores = chunkResults.reduce((acc, result) => {
    const processed = processClassificationResult(result, model, threshold)
    acc.ai_score += processed.ai_probability / 100
    acc.human_score += processed.human_probability / 100
    return acc
  }, { ai_score: 0, human_score: 0 })

  // Calculate averages
  const avgAiScore = (aggregatedScores.ai_score / chunks.length) * 100
  const avgHumanScore = (aggregatedScores.human_score / chunks.length) * 100
  
  const is_ai = avgAiScore / 100 >= threshold
  const confidence = getConfidenceLevel(Math.max(avgAiScore, avgHumanScore))

  return {
    is_ai,
    ai_probability: Math.round(avgAiScore * 100) / 100,
    human_probability: Math.round(avgHumanScore * 100) / 100,
    confidence,
    message: is_ai 
      ? `AI-generated content detected with ${avgAiScore.toFixed(1)}% confidence (${chunks.length} chunks analyzed).`
      : `Human-written content detected with ${avgHumanScore.toFixed(1)}% confidence (${chunks.length} chunks analyzed).`,
    model_used: model,
    chunks_analyzed: chunks.length
  }
}

function processClassificationResult(
  result: any, 
  model: string, 
  threshold: number
): DetectionResult {
  // Handle different model output formats
  let aiScore = 0
  let humanScore = 0

  if (Array.isArray(result)) {
    // Find AI and Human labels
    const aiLabel = result.find(r => 
      r.label?.toLowerCase().includes('ai') || 
      r.label?.toLowerCase().includes('gpt') ||
      r.label?.toLowerCase().includes('machine')
    )
    const humanLabel = result.find(r => 
      r.label?.toLowerCase().includes('human') ||
      r.label?.toLowerCase().includes('real')
    )

    aiScore = aiLabel?.score || 0
    humanScore = humanLabel?.score || (1 - aiScore)
  } else if (result?.score !== undefined) {
    // Single score format
    aiScore = result.score
    humanScore = 1 - aiScore
  }

  const ai_probability = Math.round(aiScore * 10000) / 100
  const human_probability = Math.round(humanScore * 10000) / 100
  const is_ai = aiScore >= threshold
  const confidence = getConfidenceLevel(Math.max(ai_probability, human_probability))

  return {
    is_ai,
    ai_probability,
    human_probability,
    confidence,
    message: is_ai 
      ? `AI-generated content detected with ${ai_probability}% confidence.`
      : `Human-written content detected with ${human_probability}% confidence.`,
    model_used: model
  }
}

function chunkText(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text]

  const chunks: string[] = []
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (currentChunk.length + trimmed.length <= maxLength) {
      currentChunk += (currentChunk ? '. ' : '') + trimmed
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.')
        currentChunk = trimmed
      } else {
        // Single sentence too long, split by words
        const words = trimmed.split(' ')
        let wordChunk = ''
        for (const word of words) {
          if (wordChunk.length + word.length <= maxLength) {
            wordChunk += (wordChunk ? ' ' : '') + word
          } else {
            if (wordChunk) chunks.push(wordChunk)
            wordChunk = word
          }
        }
        if (wordChunk) currentChunk = wordChunk
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + (currentChunk.endsWith('.') ? '' : '.'))
  }

  return chunks
}

function getConfidenceLevel(percentage: number): 'low' | 'medium' | 'high' {
  if (percentage >= 85) return 'high'
  if (percentage >= 65) return 'medium'
  return 'low'
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      if (attempt === maxRetries) break
      
      // Don't retry on client errors (4xx)
      if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
        throw error
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}
