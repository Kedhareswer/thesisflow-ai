import { NextRequest, NextResponse } from 'next/server'
import { PlagiarismDetectorService } from '@/lib/services/plagiarism-detector.service'
import { supabase } from '@/integrations/supabase/client'

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, options = {} } = body
    
    // Get user session for caching
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 }
      )
    }

    if (text.length < 50) {
      return NextResponse.json(
        { error: "Text must be at least 50 characters for accurate plagiarism detection" },
        { status: 400 }
      )
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: "Text exceeds maximum length of 50,000 characters" },
        { status: 400 }
      )
    }

    // Configure detection options
    const detectionOptions = {
      checkExternal: options.checkExternal !== false, // Default true
      useSemanticAnalysis: options.useSemanticAnalysis === true && !!process.env.OPENAI_API_KEY,
      userId,
      documentId: options.documentId
    }
    
    // Run enhanced plagiarism detection
    const detector = new PlagiarismDetectorService()
    const result = await detector.detectPlagiarism(text, detectionOptions)

    return NextResponse.json({
      detected: result.is_plagiarized,
      percentage: result.overall_similarity,
      confidence_score: result.confidence_score,
      matches: result.matches,
      suspicious_sections: result.suspicious_sections,
      external_sources: result.external_sources,
      semantic_analysis: result.semantic_analysis,
      fingerprint: result.fingerprint,
      analysis_details: result.analysis_details,
      sources_checked: result.sources_checked,
      check_id: result.check_id,
      details: {
        total_words: result.analysis_details.total_words,
        unique_phrases: result.analysis_details.unique_phrases,
        algorithms_used: result.analysis_details.algorithms_used
      },
      timestamp: result.timestamp
    })
  } catch (error) {
    console.error("Plagiarism detection error:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to check for plagiarism",
        detected: false,
        percentage: 0,
        details: "An error occurred during plagiarism detection"
      },
      { status: 500 }
    )
  }
}
