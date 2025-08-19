import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"

// Request validation schema
const detectRequestSchema = z.object({
  text: z.string().min(50, "Text must be at least 50 characters"),
  model: z.string().optional(),
  useChunking: z.boolean().optional(),
  chunks: z.array(z.string()).optional()
})

// Cache for detection results
const detectionCache = new Map<string, { result: any; timestamp: number }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Hugging Face model configurations - REAL production models only
const MODELS = {
  'openai-community/roberta-base-openai-detector': {
    name: 'RoBERTa Base OpenAI Detector',
    threshold: 0.5,
    verified: true
  },
  'openai-community/roberta-large-openai-detector': {
    name: 'RoBERTa Large OpenAI Detector', 
    threshold: 0.5,
    verified: true
  },
  'umm-maybe/AI-text-detector': {
    name: 'AI Text Detector',
    threshold: 0.4,
    verified: true
  },
  'Hello-SimpleAI/chatgpt-detector-roberta': {
    name: 'ChatGPT Detector RoBERTa',
    threshold: 0.5,
    verified: true
  }
}

// Generate cache key
function getCacheKey(text: string, model?: string): string {
  const hash = crypto.createHash('sha256')
  hash.update(text + (model || 'default'))
  return hash.digest('hex')
}

// Check and clean cache
function checkCache(key: string): any | null {
  const cached = detectionCache.get(key)
  if (!cached) return null
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    detectionCache.delete(key)
    return null
  }
  
  return cached.result
}

// Clean old cache entries
function cleanCache() {
  if (detectionCache.size > 100) {
    const entries = Array.from(detectionCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    entries.slice(0, 50).forEach(([key]) => detectionCache.delete(key))
  }
}

// Call Hugging Face API
async function callHuggingFaceAPI(text: string, modelEndpoint: string) {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY not configured')
  }

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${modelEndpoint}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: {
          wait_for_model: true,
          use_cache: false
        }
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    }
  )

  if (!response.ok) {
    const error = await response.text()
    if (response.status === 503) {
      throw new Error('Model is loading, please try again in a few seconds')
    }
    if (response.status === 429) {
      throw new Error('Rate limit exceeded, please try again later')
    }
    throw new Error(`Hugging Face API error: ${error}`)
  }

  return response.json()
}

// Process detection for a single chunk
async function detectChunk(text: string, modelEndpoint: string) {
  try {
    const result = await callHuggingFaceAPI(text, modelEndpoint)
    
    // Handle different response formats from real Hugging Face models
    if (Array.isArray(result) && result.length > 0) {
      const scores = result[0]
      if (Array.isArray(scores)) {
        // Format: [[{label, score}]] - Real Hugging Face classification format
        const fakeScore = scores.find((s: any) => 
          s.label?.toLowerCase().includes('fake') || 
          s.label?.toLowerCase().includes('ai') ||
          s.label?.toLowerCase().includes('generated') ||
          s.label?.toLowerCase().includes('machine') ||
          s.label === 'LABEL_1'
        )?.score || 0
        
        const realScore = scores.find((s: any) => 
          s.label?.toLowerCase().includes('real') || 
          s.label?.toLowerCase().includes('human') ||
          s.label?.toLowerCase().includes('authentic') ||
          s.label?.toLowerCase().includes('written') ||
          s.label === 'LABEL_0'
        )?.score || 0
        
        // Ensure we have valid scores
        if (fakeScore === 0 && realScore === 0) {
          throw new Error(`No valid classification scores found in model response for ${modelEndpoint}`)
        }
        
        return {
          fake_probability: fakeScore,
          real_probability: realScore,
          is_ai: fakeScore > realScore
        }
      }
    }
    
    // Handle single object response format
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      if (result.label && result.score !== undefined) {
        const isAI = result.label?.toLowerCase().includes('fake') || 
                     result.label?.toLowerCase().includes('ai') ||
                     result.label?.toLowerCase().includes('generated') ||
                     result.label === 'LABEL_1'
        
        return {
          fake_probability: isAI ? result.score : 1 - result.score,
          real_probability: isAI ? 1 - result.score : result.score,
          is_ai: isAI
        }
      }
    }
    
    // Fallback for unexpected format - throw error instead of fake response
    console.error('Unexpected API response format:', result)
    throw new Error(`Invalid response format from Hugging Face model ${modelEndpoint}`)
  } catch (error) {
    console.error('Chunk detection error:', error)
    throw error
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Validate request
    const validationResult = detectRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { text, model, useChunking, chunks } = validationResult.data
    const modelEndpoint = model || process.env.HUGGINGFACE_DETECT_MODEL || 'openai-community/roberta-base-openai-detector'
    const threshold = parseFloat(process.env.AI_DETECT_THRESHOLD || '0.5')

    // Check cache
    const cacheKey = getCacheKey(text, modelEndpoint)
    const cachedResult = checkCache(cacheKey)
    if (cachedResult) {
      return NextResponse.json({
        ...cachedResult,
        cached: true
      })
    }

    // Check if API key exists
    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json(
        { error: 'AI detection service not configured. Please set HUGGINGFACE_API_KEY.' },
        { status: 503 }
      )
    }

    let result
    
    if (useChunking && chunks && chunks.length > 1) {
      // Process multiple chunks
      const chunkResults = await Promise.all(
        chunks.map(chunk => detectChunk(chunk, modelEndpoint))
      )
      
      // Aggregate results
      const avgFakeProb = chunkResults.reduce((sum, r) => sum + r.fake_probability, 0) / chunkResults.length
      const avgRealProb = chunkResults.reduce((sum, r) => sum + r.real_probability, 0) / chunkResults.length
      const aiChunks = chunkResults.filter(r => r.is_ai).length
      
      result = {
        is_ai: aiChunks > chunks.length / 2,
        confidence: Math.max(avgFakeProb, avgRealProb),
        fake_probability: avgFakeProb,
        real_probability: avgRealProb,
        model_used: MODELS[modelEndpoint as keyof typeof MODELS]?.name || modelEndpoint,
        chunks_analyzed: chunks.length,
        ai_chunks: aiChunks,
        threshold_used: threshold
      }
    } else {
      // Process single text
      const detection = await detectChunk(text, modelEndpoint)
      
      result = {
        is_ai: detection.is_ai,
        confidence: Math.max(detection.fake_probability, detection.real_probability),
        fake_probability: detection.fake_probability,
        real_probability: detection.real_probability,
        model_used: MODELS[modelEndpoint as keyof typeof MODELS]?.name || modelEndpoint,
        chunks_analyzed: 1,
        threshold_used: threshold
      }
    }

    // Apply threshold
    if (result.is_ai && result.fake_probability < threshold) {
      result.is_ai = false
    } else if (!result.is_ai && result.real_probability < threshold) {
      result.is_ai = true
    }

    // Cache result
    detectionCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    })
    cleanCache()

    return NextResponse.json(result)

  } catch (error) {
    console.error('AI Detection API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    if (error instanceof Error) {
      if (error.message.includes('HUGGINGFACE_API_KEY')) {
        return NextResponse.json(
          { error: 'AI detection service not configured' },
          { status: 503 }
        )
      }
      
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: error.message },
          { status: 429 }
        )
      }
      
      if (error.message.includes('Model is loading')) {
        return NextResponse.json(
          { error: error.message },
          { status: 503 }
        )
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
