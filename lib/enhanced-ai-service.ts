import { createClient } from "@supabase/supabase-js"
import { AI_PROVIDERS, type AIProvider } from "./ai-providers"

export interface GenerateTextOptions {
  prompt: string
  provider?: AIProvider
  model?: string
  maxTokens?: number
  temperature?: number
  userId?: string
}

export interface GenerateTextStreamOptions extends GenerateTextOptions {
  onToken?: (token: string) => void
  onProgress?: (progress: { message?: string; percentage?: number }) => void
  onError?: (error: string) => void
  abortSignal?: AbortSignal
}

export interface GenerateTextResult {
  success: boolean
  content?: string
  error?: string
  provider?: AIProvider
  model?: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  fallbackInfo?: {
    providersAttempted: number
    totalRetries: number
    finalProvider?: AIProvider
    errors?: string
  }
}

export interface ResearchResult {
  ideas: Array<{ 
    title: string
    description: string
    research_question?: string
    methodology?: string
    impact?: string
    challenges?: string
  }>
  topic: string
  context: string
  count: number
  timestamp: string
}

export interface UserApiKey {
  provider: string
  decrypted_key?: string
  is_active: boolean
  test_status: string
}

class EnhancedAIService {
  /**
   * Test whether a given API key is valid for the selected provider by making a
   * lightweight completion request. Returns a model name if successful.
   */
  async testApiKey(
    provider: string,
    apiKey: string,
  ): Promise<{ valid: boolean; error?: string; model?: string }> {
    try {
      if (!AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS]) {
        return { valid: false, error: `Unsupported provider: ${provider}` }
      }
      const providerConfig = AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS]
      const model = providerConfig.models[0]

      // Use a tiny prompt that costs almost nothing
      const result = await this.callProviderAPI(provider as any, apiKey, {
        prompt: "ping",
        model,
        maxTokens: 1,
        temperature: 0,
      } as any)

      if (result.success) {
        return { valid: true, model: result.model || model }
      }
      return { valid: false, error: result.error }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return { valid: false, error: errorMsg }
    }
  }
  private supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      storageKey: "ai-research-platform-auth",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  })

  async loadUserApiKeys(userId?: string): Promise<UserApiKey[]> {
    // Helper to read default keys from env (server-only, gated by ALLOW_ANONYMOUS_AI)
    const readDefaultKeys = (): UserApiKey[] => {
      // Never expose provider keys on the client
      if (typeof window !== "undefined") {
        return []
      }
      // Require explicit opt-in for anonymous usage
      if (process.env.ALLOW_ANONYMOUS_AI !== "true") {
        return []
      }
      const keys: UserApiKey[] = []
      const groq = process.env.GROQ_API_KEY
      const openai = process.env.OPENAI_API_KEY
      const anthropic = process.env.ANTHROPIC_API_KEY
      const gemini = process.env.GEMINI_API_KEY

      if (groq) keys.push({ provider: "groq", decrypted_key: groq, is_active: true, test_status: "valid" })
      if (openai) keys.push({ provider: "openai", decrypted_key: openai, is_active: true, test_status: "valid" })
      if (anthropic) keys.push({ provider: "anthropic", decrypted_key: anthropic, is_active: true, test_status: "valid" })
      if (gemini) keys.push({ provider: "gemini", decrypted_key: gemini, is_active: true, test_status: "valid" })
      return keys
    }

    // Handle explicit anonymous users only
    if (userId === 'anonymous') {
      console.log("Enhanced AI Service: Loading default API keys for anonymous user")
      return readDefaultKeys()
    }

    // If userId is provided, use admin client (server-side)
    if (userId && userId !== 'anonymous') {
      try {
        console.log("Enhanced AI Service: [SERVER] Loading user API keys for userId:", userId)
        const { createSupabaseAdmin } = await import("@/lib/auth-utils")
        const supabaseAdmin = createSupabaseAdmin()
        if (!supabaseAdmin) {
          console.error("Enhanced AI Service: Supabase admin client not configured")
          return []
        }
        const { data: apiKeys, error } = await supabaseAdmin
          .from("user_api_keys")
          .select("provider, decrypted_key:api_key, is_active, test_status")
          .eq("user_id", userId)
          .eq("is_active", true)
          .eq("test_status", "valid")
        if (error) {
          console.error("Enhanced AI Service: Error fetching user API keys (server):", error)
          return []
        }
        return apiKeys || []
      } catch (error) {
        console.error("Enhanced AI Service: Exception loading user API keys (server):", error)
        return []
      }
    }
    try {
      console.log("Enhanced AI Service: [CLIENT] Loading user API keys...")

      // Get current session for authentication
      const {
        data: { session },
        error: sessionError,
      } = await this.supabase.auth.getSession()

      if (sessionError) {
        console.error("Enhanced AI Service: Session error:", sessionError)
        return []
      }

      if (!session) {
        console.log("Enhanced AI Service: No active session found; skipping env fallback to preserve plan limits")
        return []
      }

      console.log("Enhanced AI Service: Found active session, making authenticated request")

      // Prepare headers with authentication
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      // Add authorization header with access token
      if (session.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`
        console.log("Enhanced AI Service: Added authorization header")
      }

      // Make authenticated request to get API keys with decrypted values
      const response = await fetch("/api/user-api-keys?include_keys=true", {
        method: "GET",
        credentials: "include",
        headers,
      })

      console.log("Enhanced AI Service: API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Enhanced AI Service: API request failed:", response.status, errorText)
        return []
      }

      const data = await response.json()
      console.log("Enhanced AI Service: API keys loaded:", {
        success: data.success,
        keyCount: data.apiKeys?.length || 0,
        providers: data.apiKeys?.map((key: UserApiKey) => key.provider) || [],
      })

      if (data.success === false) {
        console.error("Enhanced AI Service: API returned error:", data.error)
        return []
      }

      return data.apiKeys || []
    } catch (error) {
      console.error("Enhanced AI Service: Error loading user API keys:", error)
      return []
    }
  }

  async generateText(options: GenerateTextOptions): Promise<GenerateTextResult> {
    try {
      console.log("Enhanced AI Service: Starting text generation...")
      console.log("Enhanced AI Service: Options:", {
        provider: options.provider,
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        promptLength: options.prompt?.length,
        userId: options.userId,
      })

      // If no specific provider is requested, use fallback mechanism
      if (!options.provider) {
        console.log("Enhanced AI Service: No specific provider requested, using fallback mechanism")
        return await this.generateTextWithFallback(options)
      }

      // Load user API keys (pass userId for server-side)
      const userApiKeys = await this.loadUserApiKeys(options.userId)
      console.log(
        "Enhanced AI Service: Loaded user API keys:",
        userApiKeys.map((k) => ({ provider: k.provider, active: k.is_active, status: k.test_status })),
      )

      // Find available providers
      const availableProviders = userApiKeys
        .filter((key) => key.is_active && key.test_status === "valid" && key.decrypted_key)
        .map((key) => key.provider as AIProvider)

      console.log("Enhanced AI Service: Available providers:", availableProviders)

      if (availableProviders.length === 0) {
        return {
          success: false,
          error: "No valid API keys available. Please configure API keys in Settings.",
        }
      }

      // Check if requested provider is available
      if (!availableProviders.includes(options.provider)) {
        console.log(`Enhanced AI Service: Requested provider ${options.provider} not available, using fallback`)
        return await this.generateTextWithFallback(options)
      }

      // Get the API key for the selected provider
      const userApiKey = userApiKeys.find(
        (key) => key.provider === options.provider && key.is_active && key.test_status === "valid" && key.decrypted_key,
      )

      if (!userApiKey || !userApiKey.decrypted_key) {
        console.log(`Enhanced AI Service: No valid API key for ${options.provider}, using fallback`)
        return await this.generateTextWithFallback(options)
      }

      console.log("Enhanced AI Service: Using requested provider:", options.provider)

      // Get provider configuration
      const providerConfig = AI_PROVIDERS[options.provider]
      if (!providerConfig) {
        return {
          success: false,
          error: `Unknown provider: ${options.provider}`,
        }
      }

      // Determine model to use
      let selectedModel = options.model || providerConfig.models[0]
      console.log("Enhanced AI Service: Requested model:", options.model)
      console.log("Enhanced AI Service: Available models for provider:", providerConfig.models)

      // Validate model exists for provider
      if (options.model && !providerConfig.models.includes(options.model)) {
        console.warn(
          `Enhanced AI Service: Model ${options.model} not in available models for ${options.provider}, using default`,
        )
        selectedModel = providerConfig.models[0]
        console.log("Enhanced AI Service: Using default model instead:", selectedModel)
      }

      console.log("Enhanced AI Service: Final selected model:", selectedModel)

      // Try the specific provider with retry logic for transient errors
      const maxRetries = 2
      const baseDelay = 1000

      for (let retry = 0; retry <= maxRetries; retry++) {
        try {
          // Generate the response using the provider's API
          const result = await this.callProviderAPI(options.provider, userApiKey.decrypted_key, {
            ...options,
            model: selectedModel,
            provider: options.provider,
          })

          console.log("Enhanced AI Service: Generation result:", {
            success: result.success,
            contentLength: result.content?.length,
            error: result.error,
          })

          if (result.success) {
            return result
          }

          // If the specific provider failed and it's not a transient error, try fallback
          if (!this.isTransientError(result.error || "")) {
            console.log("Enhanced AI Service: Non-transient error, trying fallback")
            return await this.generateTextWithFallback(options)
          }

          // For transient errors, retry if we have attempts left
          if (retry < maxRetries) {
            const delay = baseDelay * Math.pow(2, retry)
            console.log(`Enhanced AI Service: Retrying ${options.provider} in ${delay}ms...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }

          // Max retries reached, try fallback
          console.log("Enhanced AI Service: Max retries reached, trying fallback")
          return await this.generateTextWithFallback(options)

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.log(`Enhanced AI Service: Exception with ${options.provider} (attempt ${retry + 1}): ${errorMessage}`)

          // For permanent errors, immediately try fallback
          if (this.isPermanentError(errorMessage)) {
            console.log("Enhanced AI Service: Permanent error, trying fallback")
            return await this.generateTextWithFallback(options)
          }

          // For transient errors, retry if we have attempts left
          if (this.isTransientError(errorMessage) && retry < maxRetries) {
            const delay = baseDelay * Math.pow(2, retry)
            console.log(`Enhanced AI Service: Retrying ${options.provider} in ${delay}ms...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }

          // Max retries reached or non-transient error, try fallback
          console.log("Enhanced AI Service: Trying fallback after error")
          return await this.generateTextWithFallback(options)
        }
      }

      // This should never be reached, but just in case
      return await this.generateTextWithFallback(options)

    } catch (error) {
      console.error("Enhanced AI Service: Error in generateText:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  private async callProviderAPI(
    provider: AIProvider,
    apiKey: string,
    options: GenerateTextOptions,
  ): Promise<GenerateTextResult> {
    try {
      console.log(`Enhanced AI Service: Calling ${provider} API...`)
      console.log(`Enhanced AI Service: API Key length:`, apiKey.length)
      console.log(`Enhanced AI Service: API Key starts with:`, apiKey.substring(0, 10) + "...")

      const providerConfig = AI_PROVIDERS[provider]
      const maxTokens = Math.min(options.maxTokens || 1000, providerConfig.maxTokens)
      const temperature = Math.min(Math.max(options.temperature || 0.7, 0), 1)

      switch (provider) {
        case "groq":
          return await this.callGroqAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)

        case "openai":
          return await this.callOpenAIAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)

        case "gemini":
          return await this.callGeminiAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)

        case "anthropic":
          return await this.callAnthropicAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)

        case "mistral":
          return await this.callMistralAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)

        case "aiml":
          return await this.callAIMLAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)

        default:
          return {
            success: false,
            error: `Provider ${provider} is not yet implemented`,
          }
      }
    } catch (error) {
      console.error(`Enhanced AI Service: Error calling ${provider} API:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to call ${provider} API`,
      }
    }
  }

  private async callGroqAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number,
  ): Promise<GenerateTextResult> {
    console.log("Enhanced AI Service: Calling Groq API with:", {
      model,
      maxTokens,
      temperature,
      promptLength: prompt.length,
    })

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    })

    console.log("Enhanced AI Service: Groq API response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Enhanced AI Service: Groq API error data:", errorData)
      throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    console.log("Enhanced AI Service: Groq API response data:", {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      firstChoiceContent: data.choices?.[0]?.message?.content?.substring(0, 100),
      usage: data.usage,
      fullResponse: data,
    })

    const content = data.choices?.[0]?.message?.content || ""

    if (!content) {
      console.error("Enhanced AI Service: Groq API returned no content!", data)
      throw new Error("Groq API returned no content")
    }

    return {
      success: true,
      content,
      provider: "groq",
      model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
    }
  }

  private async callOpenAIAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number,
  ): Promise<GenerateTextResult> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()

    return {
      success: true,
      content: data.choices?.[0]?.message?.content || "",
      provider: "openai",
      model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
    }
  }

  private async callAnthropicAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number,
  ): Promise<GenerateTextResult> {
    console.log("Enhanced AI Service: Calling Anthropic API...")

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-3.5-sonnet",
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Enhanced AI Service: Anthropic API error data:", errorData)
      throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    console.log("Enhanced AI Service: Anthropic API response data:", {
      hasContent: !!data.content,
      contentLength: data.content?.length,
      firstContent: data.content?.[0]?.text?.substring(0, 100),
      usage: data.usage,
    })

    const content = data.content?.[0]?.text || ""

    if (!content) {
      console.error("Enhanced AI Service: Anthropic API returned no content!", data)
      throw new Error("Anthropic API returned no content")
    }

    return {
      success: true,
      content,
      provider: "anthropic",
      model,
      usage: {
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    }
  }

  private async callMistralAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number,
  ): Promise<GenerateTextResult> {
    console.log("Enhanced AI Service: Calling Mistral API...")

    // Map UI model names to actual Mistral API model names
    const modelMapping: Record<string, string> = {
      "mistral-small-2407": "mistral-small-latest",
      "mistral-medium-2508": "mistral-medium-latest", 
      "mistral-large-2411": "mistral-large-latest",
      "codestral-2508": "codestral-latest",
      "pixtral-large-2411": "pixtral-large-latest",
      "ministral-3b-2410": "ministral-3b-latest",
      "ministral-8b-2410": "ministral-8b-latest",
      "mistral-nemo": "open-mistral-nemo"
    }

    const actualModel = modelMapping[model] || model || "mistral-small-latest"
    console.log(`Enhanced AI Service: Using Mistral model: ${actualModel} (mapped from ${model})`)

    // Ensure reasonable limits for Mistral API
    const clampedMaxTokens = Math.min(maxTokens, 32768) // Mistral has lower token limits
    const clampedTemperature = Math.max(0.0, Math.min(1.0, temperature)) // Ensure valid range

    const requestBody = {
      model: actualModel,
      max_tokens: clampedMaxTokens,
      temperature: clampedTemperature,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }

    console.log("Enhanced AI Service: Mistral request body:", {
      model: requestBody.model,
      max_tokens: requestBody.max_tokens,
      temperature: requestBody.temperature,
      messageLength: prompt.length
    })

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      let errorData: any = {}
      
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      
      console.error("Enhanced AI Service: Mistral API error:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
        model: actualModel,
        originalModel: model
      })
      
      // Provide more specific error messages for common issues
      let errorMessage = `Mistral API error: ${response.status} - ${response.statusText}`
      
      if (response.status === 400) {
        if (errorData.message?.includes('model')) {
          errorMessage = `Mistral model '${actualModel}' not supported or invalid`
        } else if (errorData.message?.includes('token')) {
          errorMessage = `Mistral API token limit exceeded (requested: ${clampedMaxTokens})`
        } else {
          errorMessage = `Mistral API bad request: ${errorData.message || 'Invalid parameters'}`
        }
      } else if (response.status === 401) {
        errorMessage = "Mistral API authentication failed - check API key"
      } else if (response.status === 429) {
        errorMessage = "Mistral API rate limit exceeded - try again later"
      } else if (response.status >= 500) {
        errorMessage = "Mistral API server error - service temporarily unavailable"
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    console.log("Enhanced AI Service: Mistral API response data:", {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      firstChoiceContent: data.choices?.[0]?.message?.content?.substring(0, 100),
      usage: data.usage,
    })

    const content = data.choices?.[0]?.message?.content || ""

    if (!content) {
      console.error("Enhanced AI Service: Mistral API returned no content!", data)
      throw new Error("Mistral API returned no content")
    }

    return {
      success: true,
      content,
      provider: "mistral",
      model: actualModel,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
    }
  }

  private async callGeminiAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number,
  ): Promise<GenerateTextResult> {
    console.log("Enhanced AI Service: Calling Gemini API with:", {
      model,
      maxTokens,
      temperature,
      promptLength: prompt.length,
    })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
          },
        }),
      },
    )

    console.log("Enhanced AI Service: Gemini API response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Enhanced AI Service: Gemini API error data:", errorData)
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    console.log("Enhanced AI Service: Gemini API response data:", {
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length,
      firstCandidateContent: data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100),
      fullResponse: data,
    })

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

    if (!content) {
      console.error("Enhanced AI Service: Gemini API returned no content!", data)
      throw new Error("Gemini API returned no content")
    }

    return {
      success: true,
      content,
      provider: "gemini",
      model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount,
        completionTokens: data.usageMetadata?.candidatesTokenCount,
        totalTokens: data.usageMetadata?.totalTokenCount,
      },
    }
  }

  private async callAIMLAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number,
  ): Promise<GenerateTextResult> {
    console.log("Enhanced AI Service: Calling AIML API with:", {
      model,
      maxTokens,
      temperature,
      promptLength: prompt.length,
    })

    const response = await fetch("https://api.aimlapi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    })

    console.log("Enhanced AI Service: AIML API response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Enhanced AI Service: AIML API error data:", errorData)
      throw new Error(`AIML API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    console.log("Enhanced AI Service: AIML API response data:", {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      firstChoiceContent: data.choices?.[0]?.message?.content?.substring(0, 100),
      usage: data.usage,
    })

    const content = data.choices?.[0]?.message?.content || ""

    if (!content) {
      console.error("Enhanced AI Service: AIML API returned no content!", data)
      throw new Error("AIML API returned no content")
    }

    return {
      success: true,
      content,
      provider: "aiml",
      model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
    }
  }

  // Backward compatibility method for components that expect chatCompletion
  async chatCompletion(
    messages: { role: string; content: string }[],
    options?: {
      temperature?: number
      maxTokens?: number
      preferredProvider?: AIProvider
      model?: string
    },
  ): Promise<{ content: string }> {
    // Convert messages to simple prompt (for now, just use the last user message)
    const userMessage = messages.filter((m) => m.role === "user").pop()
    if (!userMessage) {
      throw new Error("No user message found")
    }

    const result = await this.generateText({
      prompt: userMessage.content,
      provider: options?.preferredProvider,
      model: options?.model,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    })

    if (!result.success) {
      throw new Error(result.error || "Failed to generate response")
    }

    return { content: result.content || "" }
  }

  // Research-specific methods with enhanced resilience
  async generateResearchIdeas(
    topic: string,
    context = "",
    count = 5,
    provider?: AIProvider,
    model?: string,
  ): Promise<ResearchResult> {
    // Implement chunked generation for better reliability
    const chunkSize = Math.min(count, 3) // Generate max 3 ideas at a time
    const chunks = Math.ceil(count / chunkSize)
    const allIdeas: Array<{ title: string; description: string }> = []

    console.log(`Enhanced AI Service: Generating ${count} ideas in ${chunks} chunks of ${chunkSize}`)

    for (let i = 0; i < chunks; i++) {
      const currentChunkSize = Math.min(chunkSize, count - allIdeas.length)
      const chunkIdeas = await this.generateResearchIdeasChunk(topic, context, currentChunkSize, i + 1, provider, model)
      allIdeas.push(...chunkIdeas)

      // Add small delay between chunks to avoid overwhelming the API
      if (i < chunks - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    return {
      ideas: allIdeas.slice(0, count), // Ensure we don't exceed requested count
      topic,
      context,
      count,
      timestamp: new Date().toISOString(),
    }
  }

  private async generateResearchIdeasChunk(
    topic: string,
    context: string,
    count: number,
    chunkNumber: number,
    provider?: AIProvider,
    model?: string,
  ): Promise<Array<{ title: string; description: string }>> {
    // Optimized, concise prompt to reduce token usage
    const prompt = `Generate ${count} research ideas for "${topic}"${context ? `\nContext: ${context.substring(0, 200)}` : ""}

Format each idea as:
${count === 1 ? "1" : "1-" + count}. **[Title]**
[Brief description in 1-2 sentences]

Requirements: Novel, feasible, practical research directions.`

    console.log(`Enhanced AI Service: Generating chunk ${chunkNumber} with ${count} ideas`)
    console.log(`Enhanced AI Service: Prompt length: ${prompt.length} characters`)

    const result = await this.generateText({
      prompt,
      provider,
      model,
      maxTokens: count * 200, // More conservative token limit
      temperature: 0.8, // Slightly lower for more focused ideas
    })

    if (!result.success) {
      throw new Error(result.error || "Failed to generate research ideas")
    }

    const content = result.content || ""
    const ideas = this.parseResearchIdeas(content)

    console.log(`Enhanced AI Service: Chunk ${chunkNumber} generated ${ideas.length} ideas`)
    return ideas
  }

  private parseResearchIdeas(content: string): Array<{ title: string; description: string }> {
    const ideas: Array<{ title: string; description: string }> = []

    // Parse standard numbered list with bold titles
    const standardPattern = /\d+\.\s*\*\*([^*]+)\*\*[:\s]*([^\n]+(?:\n(?!\d+\.|\*\*)[^\n]*)*)?/g
    let match

    while ((match = standardPattern.exec(content)) !== null) {
      const title = match[1]?.trim()
      const description = match[2]?.trim().replace(/^Description:\s*/i, "")

      if (title) {
        ideas.push({
          title,
          description: description || title,
        })
      }
    }

    // Fallback: Extract any numbered items
    if (ideas.length === 0) {
      const fallbackPattern = /\d+\.\s*([^\n]+)/g
      while ((match = fallbackPattern.exec(content)) !== null && ideas.length < 10) {
        const line = match[1]?.trim()
        if (line && line.length > 10) {
          // Try to split title and description
          const parts = line.split(/[:.]\s/)
          const title = parts[0]?.replace(/^\*\*|\*\*$/g, "").trim()
          const description = parts.slice(1).join(". ").trim()

          ideas.push({
            title: title || `Research Idea ${ideas.length + 1}`,
            description: description || title || line,
          })
        }
      }
    }

    return ideas.slice(0, 10)
  }

  // Enhanced generateText with comprehensive provider fallback and retry logic
  async generateTextWithFallback(options: GenerateTextOptions): Promise<GenerateTextResult> {
    const maxRetries = 3
    const baseDelay = 1000 // 1 second
    const maxDelay = 30000 // 30 seconds max delay

    // Get available providers in order of preference
    const userApiKeys = await this.loadUserApiKeys(options.userId)
    let availableProviders = userApiKeys
      .filter((key) => key.is_active && key.test_status === "valid" && key.decrypted_key)
      .map((key) => key.provider as AIProvider)

    if (availableProviders.length === 0) {
      return {
        success: false,
        error: "No valid API keys available. Please configure API keys in Settings.",
      }
    }

    // If user has a preferred provider, try it first
    if (options.provider && availableProviders.includes(options.provider)) {
      // Move the preferred provider to the front of the list
      availableProviders = [
        options.provider,
        ...availableProviders.filter(p => p !== options.provider)
      ]
      console.log(`Enhanced AI Service: Prioritizing user's preferred provider: ${options.provider}`)
    }

    console.log(`Enhanced AI Service: Provider order for fallback: ${availableProviders.join(", ")}`)

    const errors: Array<{ provider: AIProvider; error: string; attempts: number }> = []

    // Try each provider in order
    for (let providerIndex = 0; providerIndex < availableProviders.length; providerIndex++) {
      const provider = availableProviders[providerIndex]
      console.log(
        `Enhanced AI Service: Trying provider ${provider} (${providerIndex + 1}/${availableProviders.length})`,
      )

      // Try each provider with retries for transient errors
      for (let retry = 0; retry <= maxRetries; retry++) {
        try {
          // Get the API key for this provider
          const userApiKey = userApiKeys.find(
            (key) => key.provider === provider && key.is_active && key.test_status === "valid" && key.decrypted_key,
          )

          if (!userApiKey || !userApiKey.decrypted_key) {
            console.log(`Enhanced AI Service: No valid API key for ${provider}, skipping`)
            errors.push({ provider, error: "No valid API key", attempts: retry + 1 })
            break // Move to next provider
          }

          // Get provider configuration
          const providerConfig = AI_PROVIDERS[provider]
          if (!providerConfig) {
            console.log(`Enhanced AI Service: Unknown provider ${provider}, skipping`)
            errors.push({ provider, error: "Unknown provider", attempts: retry + 1 })
            break // Move to next provider
          }

          // Determine model to use
          const selectedModel = options.model && providerConfig.models.includes(options.model) 
            ? options.model 
            : providerConfig.models[0]

          console.log(`Enhanced AI Service: Using ${provider} with model ${selectedModel}`)

          // Call the provider API directly
          const result = await this.callProviderAPI(provider, userApiKey.decrypted_key, {
            ...options,
            model: selectedModel,
            provider,
          })

          if (result.success) {
            console.log(`Enhanced AI Service: Success with ${provider} on attempt ${retry + 1}`)
            return {
              ...result,
              fallbackInfo: {
                providersAttempted: providerIndex + 1,
                totalRetries: errors.reduce((sum, e) => sum + e.attempts, 0) + retry,
                finalProvider: provider
              }
            }
          } else {
            console.log(`Enhanced AI Service: Failed with ${provider}: ${result.error}`)
            
            // Check if this is a permanent error that shouldn't be retried
            const isPermanentError = this.isPermanentError(result.error || "")
            if (isPermanentError) {
              errors.push({ provider, error: result.error || "Unknown error", attempts: retry + 1 })
              break // Move to next provider immediately
            }
            
            // For non-permanent errors, continue to retry logic below
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.log(`Enhanced AI Service: Exception with ${provider} (attempt ${retry + 1}): ${errorMessage}`)

          // Check if it's a transient error worth retrying
          const isTransientError = this.isTransientError(errorMessage)
          const isPermanentError = this.isPermanentError(errorMessage)

          if (isPermanentError) {
            console.log(`Enhanced AI Service: Permanent error with ${provider}, moving to next provider`)
            errors.push({ provider, error: errorMessage, attempts: retry + 1 })
            break // Move to next provider
          }

          if (isTransientError && retry < maxRetries) {
            const delay = Math.min(baseDelay * Math.pow(2, retry), maxDelay) // Exponential backoff with cap
            console.log(`Enhanced AI Service: Retrying ${provider} in ${delay}ms... (attempt ${retry + 2}/${maxRetries + 1})`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          } else {
            console.log(`Enhanced AI Service: Giving up on ${provider} after ${retry + 1} attempts`)
            errors.push({ provider, error: errorMessage, attempts: retry + 1 })
            break // Move to next provider
          }
        }
      }
    }

    // All providers failed, return comprehensive error information
    const totalAttempts = errors.reduce((sum, e) => sum + e.attempts, 0)
    const errorSummary = errors.map(e => `${e.provider}: ${e.error} (${e.attempts} attempts)`).join("; ")
    
    console.error(`Enhanced AI Service: All ${availableProviders.length} providers failed after ${totalAttempts} total attempts`)
    
    return {
      success: false,
      error: `All AI providers failed after ${totalAttempts} attempts. ${this.generateFallbackGuidance(errors)}`,
      fallbackInfo: {
        providersAttempted: availableProviders.length,
        totalRetries: totalAttempts,
        errors: errorSummary
      }
    }
  }

  /**
   * Determine if an error is transient and worth retrying
   */
  private isTransientError(errorMessage: string): boolean {
    const transientPatterns = [
      "503", "502", "500", // Server errors
      "overloaded", "busy", "temporarily unavailable",
      "rate limit", "too many requests", "429",
      "timeout", "connection", "network",
      "internal error", "service unavailable",
      "try again", "temporary"
    ]
    
    const errorLower = errorMessage.toLowerCase()
    return transientPatterns.some(pattern => errorLower.includes(pattern))
  }

  /**
   * Determine if an error is permanent and shouldn't be retried
   */
  private isPermanentError(errorMessage: string): boolean {
    const permanentPatterns = [
      "api key", "unauthorized", "401", "403", "invalid key",
      "quota exceeded", "billing", "payment",
      "model not found", "invalid model", "404",
      "content policy", "safety", "blocked",
      "invalid request", "bad request", "400"
    ]
    
    const errorLower = errorMessage.toLowerCase()
    return permanentPatterns.some(pattern => errorLower.includes(pattern))
  }

  /**
   * Generate helpful guidance based on the types of errors encountered
   */
  private generateFallbackGuidance(errors: Array<{ provider: AIProvider; error: string; attempts: number }>): string {
    const hasAuthErrors = errors.some(e => this.isPermanentError(e.error) && e.error.toLowerCase().includes("api key"))
    const hasQuotaErrors = errors.some(e => e.error.toLowerCase().includes("quota") || e.error.toLowerCase().includes("limit"))
    const hasTransientErrors = errors.some(e => this.isTransientError(e.error))
    
    const guidance = []
    
    if (hasAuthErrors) {
      guidance.push("Check your API keys in Settings")
    }
    
    if (hasQuotaErrors) {
      guidance.push("Some providers have reached their usage limits")
    }
    
    if (hasTransientErrors) {
      guidance.push("Try again in a few minutes")
    }
    
    if (guidance.length === 0) {
      guidance.push("Please check your API keys and try again")
    }
    
    return guidance.join(". ")
  }

  // Simplified content summarization with chunking for large content
  async summarizeContent(
    content: string,
    options: {
      style?: "academic" | "executive" | "bullet-points" | "detailed"
      length?: "brief" | "medium" | "comprehensive"
    } = {},
    provider?: AIProvider,
    model?: string,
  ): Promise<{
    summary: string
    keyPoints: string[]
    readingTime: number
    sentiment?: "positive" | "neutral" | "negative"
  }> {
    console.log("Enhanced AI Service: Starting summarizeContent...")
    console.log("Enhanced AI Service: Content length:", content.length)

    const { style = "academic", length = "medium" } = options

    // Chunk large content to avoid overwhelming the API
    const maxContentLength = 3000 // Conservative limit
    let processedContent = content

    if (content.length > maxContentLength) {
      console.log("Enhanced AI Service: Content too long, chunking...")
      // Take beginning and end of content for context
      const beginningChunk = content.substring(0, maxContentLength / 2)
      const endChunk = content.substring(content.length - maxContentLength / 2)
      processedContent = beginningChunk + "\n\n[... content truncated ...]\n\n" + endChunk
    }

    const prompt = `Summarize in ${style} style (${length} detail):

${processedContent}

Output:
SUMMARY: [clear, concise summary]
KEY_POINTS: [point1]|[point2]|[point3]|[point4]|[point5]
READING_TIME: [reading minutes]
SENTIMENT: [positive/neutral/negative]`

    console.log("Enhanced AI Service: Generated prompt length:", prompt.length)

    try {
      const result = await this.generateTextWithFallback({
        prompt,
        maxTokens: length === "comprehensive" ? 1000 : length === "medium" ? 600 : 300,
        temperature: 0.3,
        provider,
      })

      console.log("Enhanced AI Service: Generate text result:", {
        success: result.success,
        hasContent: !!result.content,
        contentLength: result.content?.length || 0,
        error: result.error,
      })

      if (!result.success) {
        console.error("Enhanced AI Service: Generation failed:", result.error)
        throw new Error(result.error || "Failed to summarize content")
      }

      if (!result.content) {
        console.error("Enhanced AI Service: No content returned")
        throw new Error("No content returned from AI service")
      }

      const parsedResult = this.parseSummaryResult(result.content, content)
      console.log("Enhanced AI Service: Parsed result:", {
        summaryLength: parsedResult.summary.length,
        keyPointsCount: parsedResult.keyPoints.length,
        readingTime: parsedResult.readingTime,
        sentiment: parsedResult.sentiment,
      })

      return parsedResult
    } catch (error) {
      console.error("Enhanced AI Service: Summarization error:", error)
      throw error
    }
  }

  private parseSummaryResult(
    content: string,
    originalContent: string,
  ): {
    summary: string
    keyPoints: string[]
    readingTime: number
    sentiment?: "positive" | "neutral" | "negative"
  } {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line)

    let summary = ""
    let keyPoints: string[] = []
    let readingTime = 0
    let sentiment: "positive" | "neutral" | "negative" | undefined

    for (const line of lines) {
      if (line.startsWith("SUMMARY:")) {
        summary = line.replace("SUMMARY:", "").trim()
      } else if (line.startsWith("KEY_POINTS:")) {
        const pointsStr = line.replace("KEY_POINTS:", "").trim()
        keyPoints = pointsStr
          .split("|")
          .map((p) => p.trim())
          .filter((p) => p)
      } else if (line.startsWith("READING_TIME:")) {
        const timeStr = line.replace("READING_TIME:", "").trim()
        readingTime = Number.parseInt(timeStr) || Math.ceil(originalContent.split(/\s+/).length / 200)
      } else if (line.startsWith("SENTIMENT:")) {
        const sentimentStr = line.replace("SENTIMENT:", "").trim().toLowerCase()
        if (["positive", "neutral", "negative"].includes(sentimentStr)) {
          sentiment = sentimentStr as "positive" | "neutral" | "negative"
        }
      }
    }

    // Fallbacks
    if (!summary) {
      summary = content.split("\n").find((line) => line.length > 50) || content.substring(0, 200)
    }
    if (keyPoints.length === 0) {
      keyPoints = ["Content analyzed", "Key insights extracted", "Summary generated"]
    }
    if (!readingTime) {
      readingTime = Math.ceil(originalContent.split(/\s+/).length / 200)
    }

    return {
      summary,
      keyPoints,
      readingTime,
      sentiment,
    }
  }
 
  /**
   * Simulate streaming by chunking a full provider response.
   * Returns true on success or if aborted (to prevent fallback from engaging after client disconnects).
   */
  private async callProviderStreamingAPI(
    provider: AIProvider,
    apiKey: string,
    options: GenerateTextStreamOptions & { provider: AIProvider; model: string },
  ): Promise<boolean> {
    try {
      const result = await this.callProviderAPI(provider, apiKey, {
        prompt: options.prompt,
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      })

      if (!result.success || !result.content) {
        if (!options.abortSignal?.aborted) {
          options.onError?.(result.error || "Failed to generate content")
        }
        return false
      }

      const text = result.content
      const total = text.length
      let emitted = 0

      while (emitted < total) {
        if (options.abortSignal?.aborted) {
          options.onProgress?.({
            message: "Streaming aborted by client.",
            percentage: Math.round((emitted / Math.max(total, 1)) * 100),
          })
          return true
        }

        const token = text.charAt(emitted)
        if (token) {
          options.onToken?.(token)
        }
        emitted += 1

        if (emitted % 12 === 0 || emitted === total) {
          options.onProgress?.({ percentage: Math.round((emitted / Math.max(total, 1)) * 100) })
        }

        await new Promise((resolve) => setTimeout(resolve, 20))
      }

      options.onProgress?.({ message: "Streaming complete", percentage: 100 })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!options.abortSignal?.aborted) {
        options.onError?.(message || "Streaming failed")
      }
      return false
    }
  }

  /**
   * Generate text with streaming support
   */
  async generateTextStream(options: GenerateTextStreamOptions): Promise<void> {
    try {
      console.log("Enhanced AI Service: Starting streaming text generation...")

      // Load user API keys
      const userApiKeys = await this.loadUserApiKeys(options.userId)
      let availableProviders = userApiKeys
        .filter((key) => key.is_active && key.test_status === "valid" && key.decrypted_key)
        .map((key) => key.provider as AIProvider)

      if (availableProviders.length === 0) {
        options.onError?.("No valid API keys available. Please configure API keys in Settings.")
        return
      }

      // Reorder providers to honor preferred provider first
      if (options.provider && availableProviders.includes(options.provider)) {
        availableProviders = [
          options.provider,
          ...availableProviders.filter((p) => p !== options.provider),
        ]
      }

      const errors: Array<{ provider: AIProvider; error: string }> = []

      for (const provider of availableProviders) {
        if (options.abortSignal?.aborted) {
          console.log("Enhanced AI Service: Streaming aborted before starting provider", provider)
          return
        }

        options.onProgress?.({ message: `Connecting to ${provider}...` })

        // Get API key for this provider
        const userApiKey = userApiKeys.find(
          (key) => key.provider === provider && key.is_active && key.test_status === "valid" && key.decrypted_key,
        )

        if (!userApiKey?.decrypted_key) {
          errors.push({ provider, error: "No valid API key" })
          continue
        }

        const providerConfig = AI_PROVIDERS[provider]
        if (!providerConfig) {
          errors.push({ provider, error: "Unknown provider" })
          continue
        }

        const selectedModel = options.model && providerConfig.models.includes(options.model)
          ? options.model
          : providerConfig.models[0]

        console.log(`Enhanced AI Service: Streaming with ${provider} using model ${selectedModel}`)

        const ok = await this.callProviderStreamingAPI(provider, userApiKey.decrypted_key, {
          ...options,
          model: selectedModel,
          provider,
        })

        if (ok) {
          // Successful streaming; exit
          return
        }

        // If failed, record and try next provider
        errors.push({ provider, error: "Streaming failed" })
        options.onProgress?.({ message: `Falling back from ${provider}...` })
      }

      // If we reached here, all providers failed
      options.onError?.("All AI providers failed for streaming.")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      options.onError?.(message || "Streaming failed")
    }
  }

}

export const enhancedAIService = new EnhancedAIService()
