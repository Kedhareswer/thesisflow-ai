import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { enhancedAIService } from '@/lib/enhanced-ai-service'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication before processing
    await requireAuth(request, "generate-ideas")

    const { topic, context, count, researchLevel } = await request.json()

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    console.log('Idea generation request received:', { topic, context, count, researchLevel })

    const result = await enhancedAIService.generateResearchIdeas(
      topic,
      context || '',
      count || 5,
      researchLevel || 'masters'
    )

    return NextResponse.json({
      success: true,
      ideas: result.ideas,
      context: result.context,
      references: result.references
    })
  } catch (error) {
    console.error('Error in idea generation API:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate ideas',
        success: false
      },
      { status: 500 }
    )
  }
}
