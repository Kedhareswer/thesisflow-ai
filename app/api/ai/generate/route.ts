import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { enhancedAIService } from '@/lib/enhanced-ai-service'
import { ErrorHandler } from '@/lib/utils/error-handler'

export async function POST(request: NextRequest) {
  try {
    console.log('AI Generate: Starting request processing')
    console.log('AI Generate: Headers:', Object.fromEntries(request.headers.entries()))
    
    const user = await requireAuth(request, "ai-generate")
    
    console.log('AI Generate: User authenticated:', user.id)
    
    const { prompt, maxTokens = 800, temperature = 0.7, personality = 'friendly', provider, model } = await request.json()

    if (!prompt?.trim()) {
      const validationError = ErrorHandler.processError(
        "Prompt is required and cannot be empty",
        {
          operation: 'ai-generate-validation',
          userId: user.id
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }

    // Validate parameters
    if (maxTokens < 50 || maxTokens > 2000) {
      const validationError = ErrorHandler.processError(
        "maxTokens must be between 50 and 2000",
        {
          operation: 'ai-generate-validation',
          userId: user.id
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }

    if (temperature < 0 || temperature > 2) {
      const validationError = ErrorHandler.processError(
        "temperature must be between 0 and 2",
        {
          operation: 'ai-generate-validation',
          userId: user.id
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }

    console.log('AI Generate: Processing request for user:', user.id)
    console.log('AI Generate: Prompt length:', prompt.length)
    console.log('AI Generate: Parameters:', { maxTokens, temperature, personality, provider, model })

    // Generate AI response using the enhanced AI service
    const response = await enhancedAIService.generateText({
      prompt: prompt.trim(),
      maxTokens,
      temperature,
      userId: user.id,
      provider,
      model
    })

    console.log('AI Generate: Response received:', {
      success: response.success,
      hasContent: !!response.content,
      contentLength: response.content?.length || 0,
      error: response.error,
      provider: response.provider
    })

    if (!response.success) {
      console.error('AI generation failed:', response.error)
      const aiError = ErrorHandler.processError(
        response.error || "Failed to generate AI response",
        {
          operation: 'ai-generate',
          provider: response.provider || provider,
          userId: user.id,
          contentLength: prompt.length
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(aiError),
        { status: 500 }
      )
    }

    if (!response.content) {
      console.error('AI generation returned empty content')
      const emptyError = ErrorHandler.processError(
        "Generated response is empty",
        {
          operation: 'ai-generate',
          provider: response.provider || provider,
          userId: user.id
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(emptyError),
        { status: 500 }
      )
    }

    // Return both 'response' and 'content' fields for backward compatibility
    return NextResponse.json({
      success: true,
      response: response.content,
      content: response.content, // Backward compatibility
      usage: response.usage,
      provider: response.provider,
      model: response.model
    })

  } catch (error) {
    console.error("AI generate error:", error)
    
    // Use ErrorHandler for all errors
    const processedError = ErrorHandler.processError(error, {
      operation: 'ai-generate',
      userId: 'unknown'
    })
    
    // Determine appropriate status code
    let statusCode = 500
    if (processedError.errorType === 'authentication') {
      statusCode = 401
    } else if (processedError.errorType === 'validation') {
      statusCode = 400
    } else if (processedError.errorType === 'rate_limit') {
      statusCode = 429
    }
    
    return NextResponse.json(
      ErrorHandler.formatErrorResponse(processedError),
      { status: statusCode }
    )
  }
}
