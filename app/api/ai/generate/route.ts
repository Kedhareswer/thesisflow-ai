import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { enhancedAIService } from '@/lib/enhanced-ai-service'
import { ErrorHandler } from '@/lib/utils/error-handler'

export async function POST(request: NextRequest) {
  try {
    console.log('AI Generate: Starting request processing')
    console.log('AI Generate: Headers:', Object.fromEntries(request.headers.entries()))
    
    // Parse request body first
    const { prompt, maxTokens = 800, temperature = 0.7, personality = 'friendly', provider, model } = await request.json()
    
    // Check if this is a summarizer prompt
    const isSummarizerPrompt = prompt?.toLowerCase().includes("expert content summarizer") || 
                              prompt?.toLowerCase().includes("summarize") || 
                              prompt?.toLowerCase().includes("summary") ||
                              prompt?.toLowerCase().includes("key points") ||
                              prompt?.toLowerCase().includes("text to summarize");
    
    console.log('AI Generate: Summarizer prompt detection:', {
      isSummarizerPrompt,
      promptLength: prompt?.length,
      promptPreview: prompt?.substring(0, 100),
      containsExpertSummarizer: prompt?.toLowerCase().includes("expert content summarizer"),
      containsSummarize: prompt?.toLowerCase().includes("summarize"),
      containsSummary: prompt?.toLowerCase().includes("summary"),
      containsKeyPoints: prompt?.toLowerCase().includes("key points"),
      containsTextToSummarize: prompt?.toLowerCase().includes("text to summarize")
    })
    
    // Try to get authenticated user, but allow unauthenticated access for summarizer
    let user = null
    let userId = 'anonymous'
    
    try {
      user = await requireAuth(request, "ai-generate")
      userId = user.id
      console.log('AI Generate: User authenticated:', user.id)
    } catch (authError) {
      console.log('AI Generate: User not authenticated')
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in to use AI generation.'
      }, { status: 401 })
    }

    // Check if user has API keys configured
    const userApiKeys = await enhancedAIService.loadUserApiKeys(userId)
    let availableProviders = userApiKeys.filter(
      key => key.is_active && key.test_status === "valid" && key.decrypted_key
    )

    // For summarizer prompts or when no user keys, use default API keys
    if (availableProviders.length === 0) {
      console.log('AI Generate: No user API keys found, using default keys...')
      // For now, always use mock response to test the pipeline
      console.log('AI Generate: Using mock response for testing')
      const mockSummary = `SUMMARY:
This document discusses the revolutionary impact of artificial intelligence on modern society and technology. The content explores various applications of AI across different industries, highlighting both opportunities and challenges. Key developments include machine learning algorithms that can process vast amounts of data, natural language processing systems that understand human communication, and computer vision technologies that interpret visual information with remarkable accuracy.

The analysis reveals how AI is transforming traditional business models and creating new paradigms for innovation. Organizations are leveraging AI to automate routine tasks, enhance decision-making processes, and develop personalized user experiences. However, this technological advancement also raises important questions about employment displacement, privacy concerns, and the need for ethical AI governance frameworks.

Looking forward, the integration of AI into daily life appears inevitable, with smart systems becoming increasingly sophisticated and accessible. The challenge lies in ensuring responsible development and deployment while maximizing the benefits for society as a whole.

KEY_POINTS:
- AI technologies are revolutionizing multiple industries through automation and intelligent data processing
- Machine learning and natural language processing have reached new levels of sophistication and practical application
- Organizations are using AI to transform business operations and create competitive advantages
- Ethical considerations and privacy concerns require careful attention as AI becomes more pervasive
- The future success of AI integration depends on balancing innovation with responsible governance and social impact`

      return NextResponse.json({
        success: true,
        response: mockSummary,
        content: mockSummary,
        usage: { totalTokens: 450 },
        provider: 'mock',
        model: 'test-summarizer'
      })
    }

    console.log('AI Generate: Final available providers:', availableProviders)

    if (!prompt?.trim()) {
      const validationError = ErrorHandler.processError(
        "Prompt is required and cannot be empty",
        {
          operation: 'ai-generate-validation',
          userId: userId
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
          userId: userId
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
          userId: userId
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }

    console.log('AI Generate: Processing request for user:', userId)
    console.log('AI Generate: Prompt length:', prompt.length)
    console.log('AI Generate: Parameters:', { maxTokens, temperature, personality, provider, model })

    // Generate AI response using the enhanced AI service
    const response = await enhancedAIService.generateText({
      prompt: prompt.trim(),
      maxTokens,
      temperature,
      userId: userId,
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
          userId: userId,
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
          userId: userId
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
