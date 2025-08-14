import { type NextRequest, NextResponse } from "next/server"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import type { AIProvider } from "@/lib/ai-providers"

export async function POST(request: NextRequest) {
  try {
    const { prompt, providers = ["gemini", "groq", "aiml"] } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Simple comparison implementation using generateText
    const results: Record<string, any> = {}
    for (const provider of providers) {
      try {
        const response = await enhancedAIService.generateText({
          prompt,
          provider: provider as AIProvider
        })
        
        if (response.success) {
          results[provider] = {
            content: response.content,
            provider: response.provider,
            model: response.model,
            usage: response.usage
          }
        } else {
          results[provider] = {
            error: response.error || 'Failed to get response'
          }
        }
      } catch (error) {
        results[provider] = {
          error: error instanceof Error ? error.message : 'Failed to get response'
        }
      }
    }

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
