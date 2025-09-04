import { AIProviderDetector } from "./ai-provider-detector"

// AI Provider Types
export type AIProvider = "gemini" | "aiml" | "groq" | "openai" | "anthropic" | "mistral"

export interface AIProviderConfig {
  name: string
  models: string[]
  maxTokens: number
  supportedFeatures: string[]
}

export interface AIResponse {
  response: string
  provider: AIProvider
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface StreamingCallbacks {
  onToken?: (token: string) => void
  onProgress?: (progress: { message?: string; percentage?: number }) => void
  onError?: (error: string) => void
  onDone?: (metadata: { totalTokens: number; processingTime: number }) => void
}

export interface StreamingController {
  abort: () => void
}

// Provider configurations
export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  gemini: {
    name: "Google Gemini",
    models: [
      "gemini-1.5-flash", // Free model - default
      "gemini-1.5-flash-8b", // Free model
      "gemini-2.0-flash", // Free model
      "gemini-2.5-flash", // Free model
      "gemini-2.5-flash-lite-preview", // Free model
      "gemini-1.5-pro", // Paid model
      "gemini-2.5-pro" // Paid model
    ],
    maxTokens: 1048576, // 1M tokens for Gemini 2.5
    supportedFeatures: ["text", "chat", "summarization", "analysis", "multimodal", "vision", "long-context"],
  },
  aiml: {
    name: "AIML API",
    models: [
      "gpt-4o-mini", // Free/cheaper model - default
      "gpt-4.1-mini", // Free/cheaper model
      "gemini-2.5-flash-preview", // Free model
      "deepseek-r1", // Free model
      "deepseek-v3", // Free model
      "gpt-4o", // Paid model
      "gpt-4.1", // Paid model
      "claude-3.5-sonnet", // Paid model
      "claude-3.7-sonnet", // Paid model
      "gemini-2.5-pro-preview" // Paid model
    ],
    maxTokens: 200000, // GPT-4.1 supports up to 1M tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "code", "reasoning", "multimodal"],
  },
  groq: {
    name: "Groq",
    models: [
      "llama-3.1-8b-instant", // Free model - default
      "gemma2-9b-it", // Free model
      "deepseek-r1-distill-qwen-32b", // Free model
      "qwen-qwq-32b", // Free model
      "llama-3.3-70b-versatile", // Free model
      "mistral-saba-24b", // Free model
      "llama-4-scout-17b-16e-instruct", // Potentially paid
      "llama-4-maverick-17b-128e-instruct" // Potentially paid
    ],
    maxTokens: 128000, // Llama 3.3 supports 128k tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "fast-inference", "reasoning"],
  },
  openai: {
    name: "OpenAI",
    models: [
      "gpt-4o-mini", // Cheaper model - default
      "gpt-3.5-turbo", // Cheaper model
      "gpt-4.1-mini", // Cheaper model
      "gpt-4.1-nano", // Cheaper model
      "o3-mini", // Cheaper reasoning model
      "o4-mini", // Cheaper model
      "gpt-4o", // Paid model
      "gpt-4-turbo", // Paid model
      "gpt-4.1", // Paid model
      "o3" // Expensive reasoning model
    ],
    maxTokens: 1000000, // GPT-4.1 supports up to 1M tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "function-calling", "reasoning", "multimodal"],
  },
  anthropic: {
    name: "Anthropic",
    models: [
      "claude-3.5-haiku", // Cheaper model - default
      "claude-3-haiku", // Cheaper model
      "claude-2.0", // Cheaper model
      "claude-2.1", // Cheaper model
      "claude-3-sonnet", // Mid-tier model
      "claude-3.5-sonnet", // Expensive model
      "claude-3-opus" // Most expensive model
    ],
    maxTokens: 200000, // Claude 3.5 supports up to 200k tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "reasoning", "long-context"],
  },
  mistral: {
    name: "Mistral AI",
    models: [
      "mistral-small-latest", // Cheaper model - default
      "mistral-small", // Cheaper model
      "mistral-medium-latest", // Mid-tier model
      "mistral-medium", // Mid-tier model
      "mistral-large-latest", // Expensive model
      "mistral-large" // Expensive model
    ],
    maxTokens: 32768, // Mistral supports up to 32k tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "fast-inference"],
  },
}

// Client-side service that uses API routes instead of direct API calls
export class AIProviderService {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    try {
      // Try to get auth token from Supabase client
      const { supabase } = await import('@/integrations/supabase/client')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    } catch (error) {
      console.warn('Could not get auth token:', error)
    }

    return headers
  }

  static async generateResponse(
    prompt: string,
    provider: AIProvider,
    model: string,
    options: {
      temperature?: number
      maxTokens?: number
      systemPrompt?: string
    } = {}
  ): Promise<AIResponse> {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          provider,
          model,
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 1000,
          systemPrompt: options.systemPrompt,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`API request failed: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred')
      }

      return {
        response: data.content,
        provider: data.provider,
        model: data.model,
        usage: data.usage
      }
    } catch (error) {
      console.error('Error generating AI response:', error)
      throw error
    }
  }

  static async streamChat(
    message: string,
    provider: AIProvider,
    model: string,
    callbacks: StreamingCallbacks,
    options: {
      temperature?: number
      maxTokens?: number
      systemPrompt?: string
    } = {}
  ): Promise<StreamingController> {
    try {
      // Get auth token for SSE (EventSource can't set custom headers)
      let authToken = ''
      try {
        const { supabase } = await import('@/integrations/supabase/client')
        const { data: { session } } = await supabase.auth.getSession()
        authToken = session?.access_token || ''
      } catch (error) {
        console.warn('Could not get auth token for streaming:', error)
      }

      // Build URL with query parameters
      const params = new URLSearchParams({
        message,
        provider,
        model,
        temperature: (options.temperature || 0.7).toString(),
        maxTokens: (options.maxTokens || 2000).toString(),
      })

      if (options.systemPrompt) {
        params.set('systemPrompt', options.systemPrompt)
      }

      if (authToken) {
        params.set('access_token', authToken)
      }

      const url = `/api/ai/chat/stream?${params.toString()}`

      // Create EventSource for SSE
      const eventSource = new EventSource(url)
      let streamComplete = false

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'init':
              callbacks.onProgress?.({ message: 'Connected, starting generation...' })
              break
            case 'token':
              callbacks.onToken?.(data.content)
              break
            case 'progress':
              callbacks.onProgress?.(data)
              break
            case 'done':
              streamComplete = true
              callbacks.onDone?.({
                totalTokens: data.totalTokens,
                processingTime: data.processingTime
              })
              eventSource.close()
              break
            case 'error':
              callbacks.onError?.(data.error)
              eventSource.close()
              break
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error)
          callbacks.onError?.('Failed to parse streaming response')
        }
      }

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error)
        if (!streamComplete) {
          callbacks.onError?.('Connection to AI service lost')
        }
        eventSource.close()
      }

      // Return streaming controller with abort functionality
      const controller: StreamingController = {
        abort: () => {
          eventSource.close()
          callbacks.onError?.('Stream aborted by user')
        }
      }

      return controller

    } catch (error) {
      console.error('Error starting streaming chat:', error)
      callbacks.onError?.(error instanceof Error ? error.message : 'Unknown streaming error')
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
