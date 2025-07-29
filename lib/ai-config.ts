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
   */
  static async getAvailableProviders(): Promise<AIProvider[]> {
    if (this.cachedProviders !== null) {
              return this.cachedProviders
    }

    try {
      const response = await fetch('/api/ai/providers')
      if (response.ok) {
        const data = await response.json()
        const providers = data.availableProviders || []
        this.cachedProviders = providers
        this.cachedBestProvider = data.bestProvider || undefined
        return providers
      }
    } catch (error) {
      console.error('Error fetching AI providers:', error)
    }

    // Ensure we return an empty array and cache it to avoid repeated API calls
    this.cachedProviders = []
    return []
  }

  /**
   * Get the best available provider
   */
  static async getBestProvider(): Promise<AIProvider | undefined> {
    if (this.cachedBestProvider !== undefined) {
      return this.cachedBestProvider
    }

    const providers = await this.getAvailableProviders()
    return providers.length > 0 ? providers[0] : undefined
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
      groq: "Groq (Fast)",
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
   */
  static async getProviderStatus(): Promise<{
    available: AIProvider[]
    unavailable: AIProvider[]
    totalConfigured: number
    message: string
  }> {
    const allProviders: AIProvider[] = ["groq", "openai", "gemini", "anthropic", "mistral", "aiml"]
    const available = await this.getAvailableProviders()
    const unavailable = allProviders.filter(p => !available.includes(p))

    let message = ""
    if (available.length === 0) {
      message = "No AI providers configured. Please add API keys to your environment variables."
    } else if (available.length === 1) {
      message = `Using ${this.getProviderDisplayName(available[0])} as your AI provider.`
    } else {
      message = `${available.length} AI providers available with automatic fallback.`
    }

    return {
      available,
      unavailable,
      totalConfigured: available.length,
      message
    }
  }
}
