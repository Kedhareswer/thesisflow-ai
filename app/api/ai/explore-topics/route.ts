import { NextRequest, NextResponse } from 'next/server'
import { enhancedAIService } from '@/lib/enhanced-ai-service'

export async function POST(request: NextRequest) {
  try {
    const { prompt, maxTokens, temperature } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    console.log('Topic exploration request received:', { prompt, maxTokens, temperature })

    const result = await enhancedAIService.generateText({
      prompt,
      maxTokens: maxTokens || 1800,
      temperature: temperature || 0.7,
    })

    if (!result.success) {
      console.error('Topic exploration failed:', result.error)
      return NextResponse.json(
        { error: result.error || 'Failed to explore topic' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      usage: result.usage
    })
  } catch (error) {
    console.error('Error in topic exploration API:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to explore topic',
        success: false
      },
      { status: 500 }
    )
  }
}
