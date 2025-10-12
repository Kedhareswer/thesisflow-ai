import { AIProvider } from "./ai-providers"

export interface ProviderAvailability {
  provider: AIProvider
  available: boolean
  envKey: string
  priority: number
}

export class AIProviderDetector {
  /**
   * Check which AI providers have valid API keys configured
   * This runs server-side and checks actual environment variables
   */
  static getAvailableProviders(): ProviderAvailability[] {
    const providers: ProviderAvailability[] = [
      {
        provider: "groq",
        available: !!(process.env.GROQ_API_KEY?.trim() || process.env.NOVA_API_KEY?.trim()),
        envKey: "GROQ_API_KEY or NOVA_API_KEY",
        priority: 1, // Fast and reliable (Nova alias supported)
      },
      {
        provider: "openai",
        available: !!process.env.OPENAI_API_KEY?.trim(),
        envKey: "OPENAI_API_KEY", 
        priority: 2, // High quality but more expensive
      },
      {
        provider: "gemini",
        available: !!(process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim()),
        envKey: "GEMINI_API_KEY",
        priority: 3, // Good quality and free tier
      },
      {
        provider: "anthropic",
        available: !!process.env.ANTHROPIC_API_KEY?.trim(),
        envKey: "ANTHROPIC_API_KEY",
        priority: 4, // High quality reasoning
      },
      {
        provider: "mistral",
        available: !!process.env.MISTRAL_API_KEY?.trim(),
        envKey: "MISTRAL_API_KEY",
        priority: 5, // Good performance
      },
      {
        provider: "aiml",
        available: !!process.env.AIML_API_KEY?.trim(),
        envKey: "AIML_API_KEY",
        priority: 6, // Good alternative
      },
      
    ]

    return providers.filter(p => p.available).sort((a, b) => a.priority - b.priority)
  }

  /**
   * Get the best available provider (highest priority)
   */
  static getBestProvider(): AIProvider | undefined {
    const available = this.getAvailableProviders()
    return available.length > 0 ? available[0].provider : undefined
  }

  /**
   * Get fallback provider list in priority order
   */
  static getFallbackProviders(): AIProvider[] {
    return this.getAvailableProviders().map(p => p.provider)
  }

  /**
   * Check if a specific provider is available
   */
  static isProviderAvailable(provider: AIProvider): boolean {
    const available = this.getAvailableProviders()
    return available.some(p => p.provider === provider)
  }

  /**
   * Get debug information about provider availability
   */
  static getProviderStatus(): Record<AIProvider, { available: boolean; envKey: string }> {
    const allProviders = [
      { provider: "groq" as AIProvider, envKey: "GROQ_API_KEY" },
      { provider: "openai" as AIProvider, envKey: "OPENAI_API_KEY" },
      { provider: "gemini" as AIProvider, envKey: "GEMINI_API_KEY" },
      { provider: "anthropic" as AIProvider, envKey: "ANTHROPIC_API_KEY" },
      { provider: "mistral" as AIProvider, envKey: "MISTRAL_API_KEY" },
      { provider: "aiml" as AIProvider, envKey: "AIML_API_KEY" },
    ]

    const status: Record<string, { available: boolean; envKey: string }> = {}
    
    for (const provider of allProviders) {
      status[provider.provider] = {
        available: this.isProviderAvailable(provider.provider),
        envKey: provider.envKey,
      }
    }

    return status as Record<AIProvider, { available: boolean; envKey: string }>
  }

  /**
   * Client-side detection (for UI components)
   * Simplified for single-provider architecture (Groq/Nova AI only)
   */
  static async getClientAvailableProviders(): Promise<AIProvider[]> {
    // ThesisFlow-AI uses only Groq (Nova AI) provider
    // Always return 'groq' as the only provider
    return ['groq']
  }
}
