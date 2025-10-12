import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { ErrorHandler } from '@/lib/utils/error-handler'

// Server-side Nova AI functionality using hardcoded Groq API
async function generateWithNovaAI(prompt: string, maxTokens = 800, temperature = 0.7): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY
  
  if (!groqApiKey) {
    throw new Error('Groq API key not configured. Please set GROQ_API_KEY environment variable.')
  }
  
  const systemPrompt = [
    'You are Nova, a specialized research collaboration assistant for academic teams and research hubs.',
    'You assist with AI writing, content generation, and academic tasks.',
    'Provide high-quality, well-structured responses appropriate for academic and research contexts.',
    'Maintain a professional, scholarly tone while being helpful and clear.',
  ].join('\n')

  try {
    console.log('[AI Generate] Making request to Groq API...')
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: Math.min(maxTokens, 4000),
        temperature: Math.max(0.1, Math.min(temperature, 1.0)),
        top_p: 0.9,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Groq API error:', response.status, errorData)
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || 'No response generated'
    console.log('[AI Generate] Success! Generated', content.length, 'characters')
    return content
  } catch (error) {
    console.error('Nova AI generation failed:', error)
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('AI Generate: Starting request processing')
    
    // Parse request body first
    const { prompt, maxTokens = 800, temperature = 0.7, personality = 'friendly', provider, model } = await request.json()
    
    // Try to get authenticated user
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

    // Check if Groq API key is configured
    const groqApiKey = process.env.GROQ_API_KEY
    console.log('[AI Generate] Groq API Key configured:', !!groqApiKey)
    if (!groqApiKey) {
      console.error('[AI Generate] No Groq API key found')
      return NextResponse.json({
        success: false,
        error: 'Nova AI not configured. Please set GROQ_API_KEY environment variable.'
      }, { status: 500 })
    }
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

    // Use Nova AI for generation
    try {
      const content = await generateWithNovaAI(prompt, maxTokens, temperature)
      
      return NextResponse.json({
        success: true,
        response: content,
        content: content,
        usage: { totalTokens: Math.ceil(content.length / 4) }, // Rough token estimate
        provider: 'nova-ai',
        model: 'llama-3.3-70b-versatile'
      })
    } catch (error: any) {
      console.error('AI Generate: Nova AI failed:', error)
      const errorHandler = ErrorHandler.processError(
        error.message || 'AI generation failed',
        {
          operation: 'ai-generate-nova',
          userId: userId
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(errorHandler),
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('AI Generate: Error processing request:', error)
    const errorHandler = ErrorHandler.processError(
      error.message || 'Failed to process AI generation request',
      {
        operation: 'ai-generate-error',
        userId: 'unknown'
      }
    )
    return NextResponse.json(
      ErrorHandler.formatErrorResponse(errorHandler),
      { status: 500 }
    )
  }
}
