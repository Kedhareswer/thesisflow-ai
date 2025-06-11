import { type NextRequest, NextResponse } from "next/server"
import { EnhancedAIService } from "@/lib/enhanced-ai-service"
import type { AIProvider } from "@/lib/ai-providers"

export async function POST(request: NextRequest) {
  try {
    const { prompt, providers = ["gemini", "groq", "aiml"] } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const results = await EnhancedAIService.compareProviderResponses(prompt, providers as AIProvider[])

    return NextResponse.json({
      success: true,
      results,
      comparison: {
        totalProviders: Object.keys(results).length,
        successfulProviders: Object.keys(results).filter((p) => results[p as AIProvider]).length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("AI Comparison Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to compare AI responses",
        success: false,
      },
      { status: 500 },
    )
  }
}
