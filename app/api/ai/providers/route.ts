import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { enhancedAIService } from '@/lib/enhanced-ai-service'
import { AI_PROVIDERS, type AIProvider } from '@/lib/ai-providers'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, "ai-providers")
    
    // Get user's available providers
    const userApiKeys = await enhancedAIService.loadUserApiKeys(user.id)
    const availableProviders = userApiKeys
      .filter((key) => key.is_active && key.test_status === "valid" && key.decrypted_key)
      .map((key) => ({
        provider: key.provider as AIProvider,
        name: AI_PROVIDERS[key.provider as AIProvider]?.name || key.provider,
        models: AI_PROVIDERS[key.provider as AIProvider]?.models || [],
        maxTokens: AI_PROVIDERS[key.provider as AIProvider]?.maxTokens || 4000,
        supportedFeatures: AI_PROVIDERS[key.provider as AIProvider]?.supportedFeatures || []
      }))

    return NextResponse.json({
      success: true,
      availableProviders: availableProviders.map(p => p.provider), // Return just the provider names for compatibility
      providers: availableProviders, // Keep full provider info for other uses
      totalProviders: availableProviders.length
    })

  } catch (error) {
    console.error("AI providers error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get AI providers"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, "ai-providers-test")
    
    const { provider, model, testPrompt = "Hello, please respond with 'Test successful'" } = await request.json()

    if (!provider) {
      return NextResponse.json(
        { success: false, error: "Provider is required" },
        { status: 400 }
      )
    }

    // Test the specific provider
    const result = await enhancedAIService.generateText({
      prompt: testPrompt,
      provider: provider as AIProvider,
      model,
      maxTokens: 50,
      temperature: 0.1,
      userId: user.id
    })

    return NextResponse.json({
      success: result.success,
      provider: result.provider,
      model: result.model,
      content: result.content,
      error: result.error,
      usage: result.usage,
      fallbackInfo: result.fallbackInfo
    })

  } catch (error) {
    console.error("AI provider test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to test AI provider"
      },
      { status: 500 }
    )
  }
}