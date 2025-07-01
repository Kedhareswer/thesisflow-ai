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
    models: [
      "gemini-2.5-pro",
      "gemini-2.5-flash", 
      "gemini-2.5-flash-lite-preview",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b"
    ],
    maxTokens: 1048576, // 1M tokens for Gemini 2.5
    supportedFeatures: ["text", "chat", "summarization", "analysis", "multimodal", "vision", "long-context"],
  },
  aiml: {
    name: "AIML API",
    models: [
      "gpt-4.1",
      "gpt-4.1-mini", 
      "gpt-4o",
      "gpt-4o-mini",
      "claude-3.7-sonnet",
      "claude-3.5-sonnet",
      "gemini-2.5-pro-preview",
      "gemini-2.5-flash-preview",
      "deepseek-r1",
      "deepseek-v3"
    ],
    maxTokens: 200000, // GPT-4.1 supports up to 1M tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "code", "reasoning", "multimodal"],
  },
  groq: {
    name: "Groq",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama-4-scout-17b-16e-instruct",
      "llama-4-maverick-17b-128e-instruct", 
      "deepseek-r1-distill-qwen-32b",
      "qwen-qwq-32b",
      "gemma2-9b-it",
      "mistral-saba-24b"
    ],
    maxTokens: 128000, // Llama 3.3 supports 128k tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "fast-inference", "reasoning"],
  },
  deepinfra: {
    name: "DeepInfra",
    models: [
      "meta-llama/Llama-3.3-70B-Instruct",
      "meta-llama/Meta-Llama-3.1-70B-Instruct",
      "meta-llama/Meta-Llama-3.1-8B-Instruct",
      "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      "deepseek-ai/DeepSeek-R1",
      "deepseek-ai/DeepSeek-V3",
      "Qwen/Qwen3-32B",
      "microsoft/phi-4"
    ],
    maxTokens: 131072, // Llama 3.3 supports 128k tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "cost-effective", "function-calling"],
  },
  openai: {
    name: "OpenAI",
    models: [
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "o4-mini",
      "o3",
      "o3-mini", 
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-3.5-turbo"
    ],
    maxTokens: 1000000, // GPT-4.1 supports up to 1M tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "function-calling", "reasoning", "multimodal"],
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
