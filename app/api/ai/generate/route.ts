import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { enhancedAIService } from '@/lib/enhanced-ai-service'

export async function POST(request: NextRequest) {
  try {
    console.log('AI Generate: Starting request processing')
    console.log('AI Generate: Headers:', Object.fromEntries(request.headers.entries()))
    
    const user = await requireAuth(request, "ai-generate")
    
    console.log('AI Generate: User authenticated:', user.id)
    
    const { prompt, maxTokens = 800, temperature = 0.7, personality = 'friendly' } = await request.json()

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    // Validate parameters
    if (maxTokens < 50 || maxTokens > 2000) {
      return NextResponse.json(
        { error: "maxTokens must be between 50 and 2000" },
        { status: 400 }
      )
    }

    if (temperature < 0 || temperature > 2) {
      return NextResponse.json(
        { error: "temperature must be between 0 and 2" },
        { status: 400 }
      )
    }

    console.log('AI Generate: Processing request for user:', user.id)
    console.log('AI Generate: Prompt length:', prompt.length)
    console.log('AI Generate: Parameters:', { maxTokens, temperature, personality })

    // Generate AI response using the enhanced AI service
    const response = await enhancedAIService.generateText({
      prompt: prompt.trim(),
      maxTokens,
      temperature,
      userId: user.id
    })

    console.log('AI Generate: Response received:', {
      success: response.success,
      hasContent: !!response.content,
      contentLength: response.content?.length || 0,
      error: response.error
    })

    if (!response.success) {
      console.error('AI generation failed:', response.error)
      return NextResponse.json(
        { error: response.error || "Failed to generate AI response" },
        { status: 500 }
      )
    }

    if (!response.content) {
      console.error('AI generation returned empty content')
      return NextResponse.json(
        { error: "Generated response is empty" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      response: response.content,
      usage: response.usage
    })

  } catch (error) {
    console.error("AI generate error:", error)
    
    // If it's an authentication error, return a helpful message
    if (error instanceof Error && error.message.includes('Authentication required')) {
      return NextResponse.json(
        { error: "Authentication required. Please log in and try again." },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
