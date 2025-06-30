import { type NextRequest, NextResponse } from "next/server"
import { AIProviderService, type AIProvider } from "@/lib/ai-providers"
import { AIProviderDetector } from "@/lib/ai-provider-detector"

export async function POST(request: NextRequest) {
  try {
    const { prompt, provider, model, enableFallback = true } = await request.json()
    
    // If no provider specified, use the best available one
    const selectedProvider = provider || AIProviderDetector.getBestProvider()
    
    if (!selectedProvider) {
      return NextResponse.json(
        { 
          error: "No AI providers are configured. Please add at least one API key to your environment variables.",
          success: false 
        }, 
        { status: 500 }
      )
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    let response

    if (enableFallback) {
      // Try with fallback to other providers (automatically uses only available ones)
      response = await AIProviderService.generateWithFallback(prompt)
    } else {
      // Use specific provider only
      response = await AIProviderService.generateResponse(prompt, selectedProvider as AIProvider, model)
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
