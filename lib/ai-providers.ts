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
      "gemini-2.5-flash", // Best price-performance, default
      "gemini-2.5-flash-lite", // Cost-optimized
      "gemini-2.5-pro", // State-of-the-art thinking model
      "gemini-2.0-flash", // Next-gen features
      "gemini-2.0-flash-lite", // Cost-efficient 2.0
      "gemini-1.5-flash", // Fast and versatile
      "gemini-1.5-flash-8b", // Small model
      "gemini-1.5-pro" // Mid-size multimodal
    ],
    maxTokens: 1048576, // 1M tokens for Gemini 2.5
    supportedFeatures: ["text", "chat", "summarization", "analysis", "multimodal", "vision", "long-context", "thinking"],
  },
  aiml: {
    name: "AIML API",
    models: [
      "gpt-4o-mini", // Cost-effective default
      "gpt-4o", // OpenAI flagship
      "o3-mini", // Reasoning model
      "openai/o3-2025-04-16", // Latest o3
      "openai/gpt-4.1-2025-04-14", // GPT-4.1
      "openai/gpt-4.1-mini-2025-04-14", // GPT-4.1 mini
      "deepseek-chat", // DeepSeek V3
      "deepseek/deepseek-r1", // DeepSeek reasoning
      "claude-3-5-sonnet-20241022", // Claude 3.5 Sonnet
      "claude-3-5-haiku-20241022", // Claude 3.5 Haiku
      "anthropic/claude-opus-4.1", // Claude 4.1 Opus
      "anthropic/claude-sonnet-4", // Claude 4 Sonnet
      "gemini-2.5-flash", // Gemini 2.5 Flash
      "gemini-2.5-pro", // Gemini 2.5 Pro
      "meta-llama/Llama-3.3-70B-Instruct-Turbo", // Llama 3.3 70B
      "qwen-max-2025-01-25" // Qwen Max latest
    ],
    maxTokens: 1000000, // GPT-4.1 supports up to 1M tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "code", "reasoning", "multimodal"],
  },
  groq: {
    name: "Groq",
    models: [
      "llama-3.1-8b-instant", // Production default
      "llama-3.3-70b-versatile", // Production large
      "meta-llama/llama-guard-4-12b", // Safety model
      "openai/gpt-oss-120b", // GPT OSS 120B
      "openai/gpt-oss-20b", // GPT OSS 20B
      "whisper-large-v3", // Audio transcription
      "whisper-large-v3-turbo" // Fast audio transcription
    ],
    maxTokens: 128000, // Llama 3.3 supports 128k tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "fast-inference", "reasoning", "audio"],
  },
  openai: {
    name: "OpenAI",
    models: [
      "gpt-4o-mini", // Cost-optimized default
      "gpt-4o", // Flagship multimodal
      "o3-mini", // Reasoning model
      "o3", // Advanced reasoning
      "gpt-4-turbo", // Previous generation
      "gpt-3.5-turbo" // Legacy cost-effective
    ],
    maxTokens: 200000, // o3 supports up to 200k tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "function-calling", "reasoning", "multimodal"],
  },
  anthropic: {
    name: "Anthropic",
    models: [
      "claude-3.5-haiku", // Fast and cost-effective default
      "claude-3.5-sonnet", // High-performance
      "claude-3.7-sonnet", // Extended thinking capable
      "claude-sonnet-4", // Claude 4 Sonnet
      "claude-opus-4", // Claude 4 Opus
      "claude-opus-4.1", // Most capable model
      "claude-3-opus" // Previous flagship
    ],
    maxTokens: 200000, // Claude models support up to 200k tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "reasoning", "long-context", "thinking"],
  },
  mistral: {
    name: "Mistral AI",
    models: [
      "mistral-small-2407", // Cost-effective default
      "mistral-medium-2508", // Mid-tier performance
      "mistral-large-2411", // Flagship model
      "codestral-2508", // Code-specialized
      "pixtral-large-2411", // Vision model
      "ministral-3b-2410", // Ultra-compact
      "ministral-8b-2410", // Compact model
      "mistral-nemo" // Open model
    ],
    maxTokens: 128000, // Mistral Large supports up to 128k tokens
    supportedFeatures: ["text", "chat", "summarization", "analysis", "fast-inference", "code", "vision"],
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

      // Listen for named events emitted by the server
      eventSource.addEventListener('init', (event: any) => {
        try {
          const data = JSON.parse(event.data)
          callbacks.onProgress?.({ message: 'Connected, starting generation...' })
        } catch (_) {}
      })

      eventSource.addEventListener('token', (event: any) => {
        try {
          const data = JSON.parse(event.data)
          callbacks.onToken?.(data.content)
        } catch (error) {
          console.error('Error parsing token event:', error)
        }
      })

      eventSource.addEventListener('progress', (event: any) => {
        try {
          const data = JSON.parse(event.data)
          callbacks.onProgress?.(data)
        } catch (error) {
          console.error('Error parsing progress event:', error)
        }
      })

      eventSource.addEventListener('done', (event: any) => {
        try {
          const data = JSON.parse(event.data)
          streamComplete = true
          callbacks.onDone?.({
            totalTokens: data.totalTokens,
            processingTime: data.processingTime
          })
        } catch (_) {}
        eventSource.close()
      })

      // Server may emit an 'error' event with details; treat it as terminal
      eventSource.addEventListener('error', (event: any) => {
        try {
          const data = JSON.parse((event as any).data || '{}')
          if (data?.error) {
            callbacks.onError?.(data.error)
          } else {
            callbacks.onError?.('Streaming error occurred')
          }
        } catch (_) {
          callbacks.onError?.('Streaming error occurred')
        }
        streamComplete = true
        eventSource.close()
      })

      // Optional: handle heartbeat pings to avoid console noise
      eventSource.addEventListener('ping', (_event: any) => {
        // No-op; heartbeat to keep the connection alive
      })

      // Fallback: handle untyped messages where server doesn't set event: <type>
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

      eventSource.onopen = () => {
        // Connection established
      }

      eventSource.onerror = (error) => {
        if (!streamComplete) {
          console.error('SSE connection error:', error)
          callbacks.onError?.('Connection to AI service lost')
        }
        eventSource.close()
      }

      // Return streaming controller with abort functionality
      const controller: StreamingController = {
        abort: () => {
          streamComplete = true
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
