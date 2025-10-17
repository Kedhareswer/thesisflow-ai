/**
 * Simple AI Configuration Utility
 * Provides easy access to dynamically detected AI providers
 */

import type { AIProvider } from "./ai-providers"

export class AIConfig {
  private static cachedProviders: AIProvider[] | null = null
  private static cachedBestProvider: AIProvider | undefined = undefined

  /**
   * Get available providers (cached for performance)
   * Simplified for single-provider architecture (Groq/Nova AI only)
   */
  static async getAvailableProviders(): Promise<AIProvider[]> {
    if (this.cachedProviders !== null) {
              return this.cachedProviders
    }

    // ThesisFlow-AI uses only Groq (Nova AI) provider
    // Always return 'groq' as the only provider
    this.cachedProviders = ['groq']
    this.cachedBestProvider = 'groq'
    return ['groq']
  }

  /**
   * Get the best available provider
   * Simplified for single-provider architecture (Groq/Nova AI only)
   */
  static async getBestProvider(): Promise<AIProvider | undefined> {
    // ThesisFlow-AI uses only Groq (Nova AI) provider
    return 'groq'
  }

  /**
   * Check if a specific provider is available
   */
  static async isProviderAvailable(provider: AIProvider): Promise<boolean> {
    const providers = await this.getAvailableProviders()
    return providers.includes(provider)
  }

  /**
   * Clear cache (useful when providers change)
   */
  static clearCache(): void {
    this.cachedProviders = null
    this.cachedBestProvider = undefined
  }

  /**
   * Get provider display name
   */
  static getProviderDisplayName(provider: AIProvider): string {
    const names: Record<AIProvider, string> = {
      groq: "Nova AI (Groq)",
      openai: "OpenAI (GPT)",
      gemini: "Google Gemini",
      anthropic: "Anthropic (Claude)",
      mistral: "Mistral AI",
      aiml: "AIML API"
    }
    return names[provider] || provider
  }

  /**
   * Get provider status with helpful messages
   * Simplified for single-provider architecture (Groq/Nova AI only)
   */
  static async getProviderStatus(): Promise<{
    available: AIProvider[]
    unavailable: AIProvider[]
    totalConfigured: number
    message: string
  }> {
    // ThesisFlow-AI uses only Groq (Nova AI) provider
    const available: AIProvider[] = ['groq']
    const allProviders: AIProvider[] = ["groq", "openai", "gemini", "anthropic", "mistral", "aiml"]
    const unavailable = allProviders.filter(p => !available.includes(p))

    return {
      available,
      unavailable,
      totalConfigured: available.length,
      message: "Using Nova AI (Groq) as your AI provider."
    }
  }
}
