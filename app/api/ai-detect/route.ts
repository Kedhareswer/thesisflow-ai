import { type NextRequest, NextResponse } from "next/server"

/**
 * API route for AI content detection
 * POST /api/ai-detect
 * Body: { text: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text } = body

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Simulate AI detection logic
    await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate network delay

    // Simple mock logic: longer text or text with common AI phrases might have higher AI probability
    const aiProbability = Math.min(100, Math.max(0, Math.floor(text.length / 500) * 5 + Math.random() * 20))
    const isAI = aiProbability > 50

    return NextResponse.json({
      is_ai: isAI,
      ai_probability: aiProbability,
      message: isAI ? "This text likely contains AI-generated content." : "This text appears to be human-written.",
    })
  } catch (error) {
    console.error("Error in AI detection API:", error)
    return NextResponse.json({ error: "Failed to perform AI detection" }, { status: 500 })
  }
}
