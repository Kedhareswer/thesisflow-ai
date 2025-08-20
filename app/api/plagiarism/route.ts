import { NextRequest, NextResponse } from "next/server"
import { plagiarismDetector } from "@/lib/services/plagiarism-detector.service"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

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

    // Perform plagiarism detection
    const result = await plagiarismDetector.detectPlagiarism(text)

    return NextResponse.json({
      detected: result.is_plagiarized,
      percentage: result.overall_similarity,
      matches: result.matches,
      suspicious_sections: result.suspicious_sections,
      fingerprint: result.fingerprint,
      analysis_details: result.analysis_details,
      sources_checked: result.sources_checked,
      timestamp: result.timestamp,
      details: result.is_plagiarized 
        ? `Found ${result.matches.length} potential matches with ${result.overall_similarity}% similarity`
        : `No plagiarism detected. Text appears to be original.`
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
