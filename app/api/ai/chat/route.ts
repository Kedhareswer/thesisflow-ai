import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { NovaAIService } from '@/lib/services/nova-ai.service'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth(request, "ai-chat")
    
    const { message, systemPrompt, temperature = 0.7, maxTokens = 1000 } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const novaService = NovaAIService.getInstance()

    // Create a basic context for Nova AI
    const context = {
      teamId: user.id || 'default',
      recentMessages: [],
      currentUser: {
        id: user.id || 'user',
        name: user.email || 'User',
        email: user.email || '',
        avatar: '',
        color: '#0055ff',
        status: 'online' as const
      },
      mentionedUsers: [],
      actionType: 'general' as const
    }

    // If systemPrompt is provided, prepend it to the message
    const fullMessage = systemPrompt 
      ? `${systemPrompt}\n\nUser: ${message}`
      : message

    // Generate AI response using Nova AI
    const response = await novaService.processMessage(fullMessage, context, {
      temperature,
      maxTokens
    })

    return NextResponse.json({
      success: true,
      content: response.content,
      provider: 'nova',
      model: 'qwen3-32b', // Match NovaAIService.processMessage() actual model
      suggestions: response.suggestions,
      actionItems: response.actionItems,
      type: response.type
    })

  } catch (error) {
    console.error('AI Chat API Error:', error)
    
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (error instanceof Error && error.message.includes('GROQ API key')) {
      return NextResponse.json({ 
        error: 'Nova AI not configured',
        details: 'Please configure GROQ_API_KEY environment variable'
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate AI response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
