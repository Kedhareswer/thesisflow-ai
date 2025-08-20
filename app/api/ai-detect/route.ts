import { NextResponse } from "next/server"
import { aiDetectionService, AIDetectionServiceError } from "@/lib/services/ai-detection.service"

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    // Validate input
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Invalid text provided", code: "INVALID_INPUT" },
        { status: 400 }
      )
    }

    // Check minimum text length
    if (!aiDetectionService.isTextLongEnough(text)) {
      return NextResponse.json(
        { 
          error: "Text too short for analysis",
          code: "TEXT_TOO_SHORT",
          minWords: 10,
          actualWords: aiDetectionService.getWordCount(text)
        },
        { status: 400 }
      )
    }

    // Check maximum text length (for performance)
    const wordCount = aiDetectionService.getWordCount(text)
    if (wordCount > 10000) {
      return NextResponse.json(
        { 
          error: "Text too long. Please provide text with less than 10,000 words.",
          code: "TEXT_TOO_LONG",
          maxWords: 10000,
          actualWords: wordCount
        },
        { status: 400 }
      )
    }

    // Perform AI detection with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const result = await Promise.race([
        aiDetectionService.detectAI(text),
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new AIDetectionServiceError('Detection timeout', 408))
          })
        })
      ])

      clearTimeout(timeoutId)

      // Add CORS headers for better compatibility
      const response = NextResponse.json(result)
      response.headers.set('X-AI-Detection-Version', '2.0.0')
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      
      return response
    } catch (detectionError) {
      clearTimeout(timeoutId)
      throw detectionError
    }
  } catch (error) {
    console.error("Error in AI detect API:", error)
    
    // Handle specific error types
    if (error instanceof AIDetectionServiceError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.statusCode === 408 ? 'TIMEOUT' : 'DETECTION_ERROR',
          details: error.details
        },
        { status: error.statusCode || 500 }
      )
    }
    
    // Generic error response
    return NextResponse.json(
      { 
        error: "Failed to analyze text",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    )
  }
}
