import { NextRequest, NextResponse } from 'next/server'
import { NovaAIService } from '@/lib/services/nova-ai.service'
import { getAuthUser } from '@/lib/auth-utils'
import { AIService } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, context, stream = false } = body

    if (!message || !context) {
      return NextResponse.json(
        { error: 'Message and context are required' },
        { status: 400 }
      )
    }

    // Check if GROQ API key is available
    const groqApiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
    if (!groqApiKey) {
      console.warn('Nova AI: GROQ_API_KEY not found, falling back to general AI service')
      
      // Fallback to general AI service
      const fullPrompt = `You are Nova, an advanced research assistant. You help users with research tasks, literature reviews, data analysis, and academic writing. 
      
Context: ${JSON.stringify(context, null, 2)}

Please provide helpful, accurate, and research-focused responses.

User: ${message}`

      try {
        const response = await AIService.generateText(fullPrompt, {
          model: 'gemini-pro',
          temperature: 0.7,
          maxTokens: 1000
        })

        return NextResponse.json({ 
          response: {
            content: response.content,
            confidence: 0.8,
            type: 'response',
            provider: response.provider,
            model: response.model
          }
        })
      } catch (aiError) {
        console.error('Fallback AI service error:', aiError)
        return NextResponse.json(
          { error: 'AI service is not available. Please check your configuration.' },
          { status: 503 }
        )
      }
    }

    const novaService = NovaAIService.getInstance()

    if (stream) {
      // Handle streaming response
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          novaService.processMessageStream(
            message,
            context,
            (chunk: string) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
            },
            (response) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ response })}\n\n`))
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
            },
            (error) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`))
              controller.close()
            }
          )
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Handle regular response
      const response = await novaService.processMessage(message, context)
      return NextResponse.json({ response })
    }
  } catch (error) {
    console.error('Nova chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Nova AI Chat API is running' })
}
