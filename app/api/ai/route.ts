import { type NextRequest, NextResponse } from "next/server"
import { AIProviderService, type AIProvider } from "@/lib/ai-providers"

export async function POST(request: NextRequest) {
  try {
    const { prompt, provider = "gemini", model, enableFallback = true } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    let response

    if (enableFallback) {
      // Try with fallback to other providers
      const fallbackProviders: AIProvider[] = [provider, "gemini", "groq", "aiml"]
      response = await AIProviderService.generateWithFallback(prompt, fallbackProviders)
    } else {
      // Use specific provider only
      response = await AIProviderService.generateResponse(prompt, provider as AIProvider, model)
    }

    return NextResponse.json({
      success: true,
      response: response.content,
      provider: response.provider,
      model: response.model,
      usage: response.usage,
    })
  } catch (error) {
    console.error("AI API Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate AI response",
        success: false,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const availableProviders = AIProviderService.getAvailableProviders()
    const providerInfo = availableProviders.map((provider) => ({
      provider,
      ...AIProviderService.getProviderInfo(provider),
    }))

    return NextResponse.json({
      availableProviders,
      providerInfo,
    })
  } catch (error) {
    console.error("Error getting provider info:", error)
    return NextResponse.json({ error: "Failed to get provider information" }, { status: 500 })
  }
}
