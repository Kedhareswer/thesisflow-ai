import { AIProviderDetector } from "./ai-provider-detector"

// AI Provider Types
export type AIProvider = "gemini" | "aiml" | "groq" | "deepinfra" | "openai"

export interface AIProviderConfig {
  name: string
  models: string[]
  maxTokens: number
  supportedFeatures: string[]
}

export interface AIResponse {
  content: string
  provider: AIProvider
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// Provider configurations
export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  gemini: {
    name: "Google Gemini",
    models: ["gemini-2.0-flash", "gemini-1.5-pro"],
    maxTokens: 8192,
    supportedFeatures: ["text", "chat", "summarization", "analysis"],
  },
  aiml: {
    name: "AIML API",
    models: ["gpt-4o", "gpt-4o-mini", "claude-3-sonnet"],
    maxTokens: 4096,
    supportedFeatures: ["text", "chat", "summarization", "analysis", "code"],
  },
  groq: {
    name: "Groq",
    models: ["llama-3.1-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"],
    maxTokens: 32768,
    supportedFeatures: ["text", "chat", "summarization", "analysis", "fast-inference"],
  },
  deepinfra: {
    name: "DeepInfra",
    models: [
      "meta-llama/Meta-Llama-3.1-70B-Instruct",
      "microsoft/WizardLM-2-8x22B",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
    ],
    maxTokens: 4096,
    supportedFeatures: ["text", "chat", "summarization", "analysis", "cost-effective"],
  },
  openai: {
    name: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
    maxTokens: 4096,
    supportedFeatures: ["text", "chat", "summarization", "analysis", "function-calling"],
  },
}

// Client-side service that uses API routes instead of direct API calls
export class AIProviderService {
  static async generateResponse(prompt: string, provider?: AIProvider, model?: string): Promise<AIResponse> {
    // If no provider specified, use the best available one
    if (!provider) {
      provider = AIProviderDetector.getBestProvider()
      if (!provider) {
        throw new Error("No AI providers are configured. Please add at least one API key to your environment variables.")
      }
    }
    try {
      // Use our secure API route instead of direct API calls
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          provider,
          model: model || AI_PROVIDERS[provider].models[0],
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error with ${provider}:`, error)
      throw error
    }
  }

  static async generateWithFallback(
    prompt: string,
    preferredProviders?: AIProvider[],
  ): Promise<AIResponse> {
    // If no preferred providers specified, use all available ones in priority order
    if (!preferredProviders) {
      preferredProviders = AIProviderDetector.getFallbackProviders()
      if (preferredProviders.length === 0) {
        throw new Error("No AI providers are configured. Please add at least one API key to your environment variables.")
      }
    }
    // Use our secure API route for fallback logic
    const response = await fetch("/api/ai/generate-with-fallback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        preferredProviders,
      }),
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    return await response.json()
  }

  static getAvailableProviders(): AIProvider[] {
    // Return only providers that actually have API keys configured
    return AIProviderDetector.getFallbackProviders()
  }

  static getProviderInfo(provider: AIProvider): AIProviderConfig {
    return AI_PROVIDERS[provider]
  }
}
