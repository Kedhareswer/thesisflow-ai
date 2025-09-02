import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { AIService } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth(request, "ai-chat")
    
    const { message, model = 'gemini-pro', systemPrompt, temperature = 0.7, maxTokens = 1000 } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Build the prompt with system message if provided
    let fullPrompt = message
    if (systemPrompt) {
      fullPrompt = `${systemPrompt}\n\nUser: ${message}`
    }

    // Generate AI response
    const response = await AIService.generateText(fullPrompt, {
      model,
      temperature,
      maxTokens
    })

    return NextResponse.json({
      success: true,
      content: response.content,
      provider: response.provider,
      model: response.model
    })

  } catch (error) {
    console.error('AI Chat API Error:', error)
    
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate AI response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
