import { NextRequest, NextResponse } from 'next/server'
import { textHumanizerService } from '@/lib/services/text-humanizer.service'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      )
    }

    if (text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Text must be at least 10 characters long' },
        { status: 400 }
      )
    }

    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'Text must not exceed 10,000 characters' },
        { status: 400 }
      )
    }

    // Humanize the text using the comprehensive service
    const result = await textHumanizerService.humanizeText(text)

    return NextResponse.json({
      humanized_text: result.humanized_text,
      original_text: result.original_text,
      changes_made: result.changes_made,
      readability_score: result.readability_score,
      naturalness_score: result.naturalness_score,
      timestamp: result.timestamp
    })
  } catch (error) {
    console.error('Error in humanize API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to humanize text',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
