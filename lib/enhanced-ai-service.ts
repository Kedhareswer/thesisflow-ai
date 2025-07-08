import { createClient } from '@supabase/supabase-js'
import { AI_PROVIDERS, type AIProvider } from './ai-providers'

export interface GenerateTextOptions {
  prompt: string
  provider?: AIProvider
  model?: string
  maxTokens?: number
  temperature?: number
  userId?: string
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
}

export interface UserApiKey {
  provider: string
  decrypted_key?: string
  is_active: boolean
  test_status: string
}

class EnhancedAIService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'ai-research-platform-auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      }
    }
  )

  async loadUserApiKeys(): Promise<UserApiKey[]> {
    try {
      console.log("Enhanced AI Service: Loading user API keys...")
      
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession()
      
      if (sessionError) {
        console.error("Enhanced AI Service: Session error:", sessionError)
        return []
      }

      if (!session) {
        console.log("Enhanced AI Service: No active session found")
        return []
      }

      console.log("Enhanced AI Service: Found active session, making authenticated request")

      // Prepare headers with authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Add authorization header with access token
      if (session.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
        console.log("Enhanced AI Service: Added authorization header")
      }

      // Make authenticated request to get API keys with decrypted values
      const response = await fetch('/api/user-api-keys?include_keys=true', {
        method: 'GET',
        credentials: 'include',
        headers
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
        providers: data.apiKeys?.map((key: UserApiKey) => key.provider) || []
      })

      if (!data.success) {
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
        promptLength: options.prompt?.length
      })

      // Load user API keys
      const userApiKeys = await this.loadUserApiKeys()
      console.log("Enhanced AI Service: Loaded user API keys:", userApiKeys.map(k => ({ provider: k.provider, active: k.is_active, status: k.test_status })))

      // Find available providers
      const availableProviders = userApiKeys
        .filter(key => key.is_active && key.test_status === 'valid' && key.decrypted_key)
        .map(key => key.provider as AIProvider)

      console.log("Enhanced AI Service: Available providers:", availableProviders)

      if (availableProviders.length === 0) {
        return {
          success: false,
          error: "No valid API keys available. Please configure API keys in Settings."
        }
      }

      // Determine which provider to use
      let selectedProvider = options.provider
      if (!selectedProvider || !availableProviders.includes(selectedProvider)) {
        selectedProvider = availableProviders[0]
        console.log("Enhanced AI Service: Auto-selected provider:", selectedProvider)
      }

      // Get the API key for the selected provider
      const userApiKey = userApiKeys.find(key => 
        key.provider === selectedProvider && 
        key.is_active && 
        key.test_status === 'valid' &&
        key.decrypted_key
      )

      if (!userApiKey || !userApiKey.decrypted_key) {
        return {
          success: false,
          error: `No valid API key found for provider: ${selectedProvider}`
        }
      }

      console.log("Enhanced AI Service: Using provider:", selectedProvider)

      // Get provider configuration
      const providerConfig = AI_PROVIDERS[selectedProvider]
      if (!providerConfig) {
        return {
          success: false,
          error: `Unknown provider: ${selectedProvider}`
        }
      }

      // Determine model to use
      let selectedModel = options.model || providerConfig.models[0]
      console.log("Enhanced AI Service: Requested model:", options.model)
      console.log("Enhanced AI Service: Available models for provider:", providerConfig.models)
      
      // Validate model exists for provider
      if (options.model && !providerConfig.models.includes(options.model)) {
        console.warn(`Enhanced AI Service: Model ${options.model} not in available models for ${selectedProvider}, using default`)
        selectedModel = providerConfig.models[0]
        console.log("Enhanced AI Service: Using default model instead:", selectedModel)
      }
      
      console.log("Enhanced AI Service: Final selected model:", selectedModel)

      // Generate the response using the provider's API
      const result = await this.callProviderAPI(
        selectedProvider,
        userApiKey.decrypted_key,
        {
          ...options,
          model: selectedModel,
          provider: selectedProvider
        }
      )

      console.log("Enhanced AI Service: Generation result:", {
        success: result.success,
        contentLength: result.content?.length,
        error: result.error
      })

      return result

    } catch (error) {
      console.error("Enhanced AI Service: Error in generateText:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  private async callProviderAPI(
    provider: AIProvider,
    apiKey: string,
    options: GenerateTextOptions
  ): Promise<GenerateTextResult> {
    try {
      console.log(`Enhanced AI Service: Calling ${provider} API...`)
      console.log(`Enhanced AI Service: API Key length:`, apiKey.length)
      console.log(`Enhanced AI Service: API Key starts with:`, apiKey.substring(0, 10) + '...')

      const providerConfig = AI_PROVIDERS[provider]
      const maxTokens = Math.min(options.maxTokens || 1000, providerConfig.maxTokens)
      const temperature = Math.min(Math.max(options.temperature || 0.7, 0), 1)

      switch (provider) {
        case 'groq':
          return await this.callGroqAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)
        
        case 'openai':
          return await this.callOpenAIAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)
        
        case 'gemini':
          return await this.callGeminiAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)
        
        case 'aiml':
          return await this.callAIMLAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)
        
        case 'deepinfra':
          return await this.callDeepInfraAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)
        
        default:
          return {
            success: false,
            error: `Provider ${provider} is not yet implemented`
          }
      }
    } catch (error) {
      console.error(`Enhanced AI Service: Error calling ${provider} API:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to call ${provider} API`
      }
    }
  }

  private async callGroqAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<GenerateTextResult> {
    console.log("Enhanced AI Service: Calling Groq API with:", {
      model,
      maxTokens,
      temperature,
      promptLength: prompt.length
    })

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
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
      fullResponse: data
    })
    
    const content = data.choices?.[0]?.message?.content || ''
    
    if (!content) {
      console.error("Enhanced AI Service: Groq API returned no content!", data)
      throw new Error("Groq API returned no content")
    }
    
    return {
      success: true,
      content,
      provider: 'groq',
      model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      }
    }
  }

  private async callOpenAIAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<GenerateTextResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
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
      content: data.choices?.[0]?.message?.content || '',
      provider: 'openai',
      model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      }
    }
  }

  private async callAnthropicAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<GenerateTextResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
        body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }]
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    
    return {
      success: true,
      content: data.content?.[0]?.text || '',
      provider: 'openai', // Fallback since anthropic not in AIProvider type
      model,
      usage: {
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      }
    }
  }

  private async callGeminiAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<GenerateTextResult> {
    console.log("Enhanced AI Service: Calling Gemini API with:", {
      model,
      maxTokens,
      temperature,
      promptLength: prompt.length
    })

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        }
      }),
    })

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
      fullResponse: data
    })
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    if (!content) {
      console.error("Enhanced AI Service: Gemini API returned no content!", data)
      throw new Error("Gemini API returned no content")
    }
    
    return {
      success: true,
      content,
      provider: 'gemini',
      model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount,
        completionTokens: data.usageMetadata?.candidatesTokenCount,
        totalTokens: data.usageMetadata?.totalTokenCount,
      }
    }
  }

  private async callAIMLAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<GenerateTextResult> {
    console.log("Enhanced AI Service: Calling AIML API with:", {
      model,
      maxTokens,
      temperature,
      promptLength: prompt.length
    })

    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
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
      usage: data.usage
    })
    
    const content = data.choices?.[0]?.message?.content || ''
    
    if (!content) {
      console.error("Enhanced AI Service: AIML API returned no content!", data)
      throw new Error("AIML API returned no content")
    }
    
    return {
      success: true,
      content,
      provider: 'aiml',
      model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      }
    }
  }

  private async callDeepInfraAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<GenerateTextResult> {
    console.log("Enhanced AI Service: Calling DeepInfra API with:", {
      model,
      maxTokens,
      temperature,
      promptLength: prompt.length
    })

    const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    })

    console.log("Enhanced AI Service: DeepInfra API response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Enhanced AI Service: DeepInfra API error data:", errorData)
      throw new Error(`DeepInfra API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    console.log("Enhanced AI Service: DeepInfra API response data:", {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      firstChoiceContent: data.choices?.[0]?.message?.content?.substring(0, 100),
      usage: data.usage
    })
    
    const content = data.choices?.[0]?.message?.content || ''
    
    if (!content) {
      console.error("Enhanced AI Service: DeepInfra API returned no content!", data)
      throw new Error("DeepInfra API returned no content")
    }
    
    return {
      success: true,
      content,
      provider: 'deepinfra',
      model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      }
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
    }
  ): Promise<{ content: string }> {
    // Convert messages to simple prompt (for now, just use the last user message)
    const userMessage = messages.filter(m => m.role === 'user').pop()
    if (!userMessage) {
      throw new Error('No user message found')
    }

    const result = await this.generateText({
      prompt: userMessage.content,
      provider: options?.preferredProvider,
      model: options?.model,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate response')
    }

    return { content: result.content || '' }
  }

  // Research-specific methods with enhanced resilience
  async generateResearchIdeas(
    topic: string,
    context: string = "",
    count: number = 5
  ): Promise<{
    ideas: Array<{ title: string; description: string }>
    topic: string
    context: string
    count: number
    timestamp: string
  }> {
    // Implement chunked generation for better reliability
    const chunkSize = Math.min(count, 3) // Generate max 3 ideas at a time
    const chunks = Math.ceil(count / chunkSize)
    const allIdeas: Array<{ title: string; description: string }> = []

    console.log(`Enhanced AI Service: Generating ${count} ideas in ${chunks} chunks of ${chunkSize}`)

    for (let i = 0; i < chunks; i++) {
      const currentChunkSize = Math.min(chunkSize, count - allIdeas.length)
      const chunkIdeas = await this.generateResearchIdeasChunk(topic, context, currentChunkSize, i + 1)
      allIdeas.push(...chunkIdeas)
      
      // Add small delay between chunks to avoid overwhelming the API
      if (i < chunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return {
      ideas: allIdeas.slice(0, count), // Ensure we don't exceed requested count
      topic,
      context,
      count,
      timestamp: new Date().toISOString()
    }
  }

  private async generateResearchIdeasChunk(
    topic: string,
    context: string,
    count: number,
    chunkNumber: number
  ): Promise<Array<{ title: string; description: string }>> {
    // Optimized, concise prompt to reduce token usage
    const prompt = `Generate ${count} research ideas for "${topic}"${context ? `\nContext: ${context.substring(0, 200)}` : ''}

Format each idea as:
${count === 1 ? '1' : '1-' + count}. **[Title]**
[Brief description in 1-2 sentences]

Requirements: Novel, feasible, practical research directions.`

    console.log(`Enhanced AI Service: Generating chunk ${chunkNumber} with ${count} ideas`)
    console.log(`Enhanced AI Service: Prompt length: ${prompt.length} characters`)

    const result = await this.generateTextWithFallback({
      prompt,
      maxTokens: count * 200, // More conservative token limit
      temperature: 0.8 // Slightly lower for more focused ideas
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate research ideas')
    }

    const content = result.content || ''
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
      const description = match[2]?.trim().replace(/^Description:\s*/i, '')
      
      if (title) {
        ideas.push({
          title,
          description: description || title
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
          const title = parts[0]?.replace(/^\*\*|\*\*$/g, '').trim()
          const description = parts.slice(1).join('. ').trim()
          
          ideas.push({
            title: title || `Research Idea ${ideas.length + 1}`,
            description: description || title || line
          })
        }
      }
    }
    
    return ideas.slice(0, 10)
  }

  // Enhanced generateText with provider fallback and retry logic
  private async generateTextWithFallback(options: GenerateTextOptions): Promise<GenerateTextResult> {
    const maxRetries = 2
    const baseDelay = 1000 // 1 second

    // Get available providers in order of preference
    const userApiKeys = await this.loadUserApiKeys()
    const availableProviders = userApiKeys
      .filter(key => key.is_active && key.test_status === 'valid' && key.decrypted_key)
      .map(key => key.provider as AIProvider)

    if (availableProviders.length === 0) {
      return {
        success: false,
        error: "No valid API keys available. Please configure API keys in Settings."
      }
    }

    console.log(`Enhanced AI Service: Available providers: ${availableProviders.join(', ')}`)

    // Try each provider in order
    for (let providerIndex = 0; providerIndex < availableProviders.length; providerIndex++) {
      const provider = availableProviders[providerIndex]
      console.log(`Enhanced AI Service: Trying provider ${provider} (${providerIndex + 1}/${availableProviders.length})`)

      // Try each provider with retries for transient errors
      for (let retry = 0; retry <= maxRetries; retry++) {
        try {
          const result = await this.generateText({
            ...options,
            provider
          })

          if (result.success) {
            console.log(`Enhanced AI Service: Success with ${provider} on attempt ${retry + 1}`)
            return result
          } else {
            console.log(`Enhanced AI Service: Failed with ${provider}: ${result.error}`)
            break // Don't retry on non-transient errors
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.log(`Enhanced AI Service: Error with ${provider} (attempt ${retry + 1}): ${errorMessage}`)

          // Check if it's a transient error worth retrying
          const isTransientError = errorMessage.includes('503') || 
                                 errorMessage.includes('overloaded') || 
                                 errorMessage.includes('rate limit') ||
                                 errorMessage.includes('timeout')

          if (isTransientError && retry < maxRetries) {
            const delay = baseDelay * Math.pow(2, retry) // Exponential backoff
            console.log(`Enhanced AI Service: Retrying ${provider} in ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          } else {
            console.log(`Enhanced AI Service: Giving up on ${provider} after ${retry + 1} attempts`)
            break // Move to next provider
          }
        }
      }
    }

    return {
      success: false,
      error: `All AI providers failed. Please try again later or check your API keys.`
    }
  }

  // Simplified content summarization with chunking for large content
  async summarizeContent(
    content: string, 
    options: { 
      style?: 'academic' | 'executive' | 'bullet-points' | 'detailed'
      length?: 'brief' | 'medium' | 'comprehensive'
    } = {},
    provider?: AIProvider,
    model?: string
  ): Promise<{
    summary: string
    keyPoints: string[]
    readingTime: number
    sentiment?: 'positive' | 'neutral' | 'negative'
  }> {
    console.log("Enhanced AI Service: Starting summarizeContent...")
    console.log("Enhanced AI Service: Content length:", content.length)

    const { style = 'academic', length = 'medium' } = options
    
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
        maxTokens: length === 'comprehensive' ? 1000 : length === 'medium' ? 600 : 300,
        temperature: 0.3,
        provider
      })

      console.log("Enhanced AI Service: Generate text result:", {
        success: result.success,
        hasContent: !!result.content,
        contentLength: result.content?.length || 0,
        error: result.error
      })

      if (!result.success) {
        console.error("Enhanced AI Service: Generation failed:", result.error)
        throw new Error(result.error || 'Failed to summarize content')
      }

      if (!result.content) {
        console.error("Enhanced AI Service: No content returned")
        throw new Error('No content returned from AI service')
      }

      const parsedResult = this.parseSummaryResult(result.content, content)
      console.log("Enhanced AI Service: Parsed result:", {
        summaryLength: parsedResult.summary.length,
        keyPointsCount: parsedResult.keyPoints.length,
        readingTime: parsedResult.readingTime,
        sentiment: parsedResult.sentiment
      })

      return parsedResult

    } catch (error) {
      console.error("Enhanced AI Service: Summarization error:", error)
      throw error
    }
  }

  private parseSummaryResult(content: string, originalContent: string): {
    summary: string
    keyPoints: string[]
    readingTime: number
    sentiment?: 'positive' | 'neutral' | 'negative'
  } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line)
    
    let summary = ''
    let keyPoints: string[] = []
    let readingTime = 0
    let sentiment: 'positive' | 'neutral' | 'negative' | undefined

    for (const line of lines) {
      if (line.startsWith('SUMMARY:')) {
        summary = line.replace('SUMMARY:', '').trim()
      } else if (line.startsWith('KEY_POINTS:')) {
        const pointsStr = line.replace('KEY_POINTS:', '').trim()
        keyPoints = pointsStr.split('|').map(p => p.trim()).filter(p => p)
      } else if (line.startsWith('READING_TIME:')) {
        const timeStr = line.replace('READING_TIME:', '').trim()
        readingTime = parseInt(timeStr) || Math.ceil(originalContent.split(/\s+/).length / 200)
      } else if (line.startsWith('SENTIMENT:')) {
        const sentimentStr = line.replace('SENTIMENT:', '').trim().toLowerCase()
        if (['positive', 'neutral', 'negative'].includes(sentimentStr)) {
          sentiment = sentimentStr as 'positive' | 'neutral' | 'negative'
        }
      }
    }

    // Fallbacks
    if (!summary) {
      summary = content.split('\n').find(line => line.length > 50) || content.substring(0, 200)
    }
    if (keyPoints.length === 0) {
      keyPoints = ['Content analyzed', 'Key insights extracted', 'Summary generated']
    }
    if (!readingTime) {
      readingTime = Math.ceil(originalContent.split(/\s+/).length / 200)
    }

    return { 
      summary,
      keyPoints,
      readingTime,
      sentiment
    }
  }

  /**
   * Lightweight validation of an API key. For now, we only verify the format.
   * You can extend this method to hit a cheap provider endpoint for deeper checks.
   */
  async testApiKey(
    provider: string,
    apiKey: string
  ): Promise<{ valid: boolean; model?: string; error?: string }> {
    try {
      // Basic length sanity check
      if (!apiKey || apiKey.length < 10) {
        return { valid: false, error: 'API key too short' }
      }

      // Provider-specific regex patterns
      const regexMap: Record<string, RegExp> = {
        openai: /^sk-[A-Za-z0-9]{48,}$/,
        groq: /^gsk_[A-Za-z0-9]{50,}$/,
        gemini: /^AIza[A-Za-z0-9_\-]{35,}$/,
        anthropic: /^sk-ant-[A-Za-z0-9]{40,}$/,
        mistral: /^[A-Za-z0-9]{32,}$/,
        aiml: /.{10,}/,
        deepinfra: /.{10,}/
      }

      const pattern = regexMap[provider]
      if (pattern && !pattern.test(apiKey)) {
        return { valid: false, error: 'API key format looks invalid' }
      }

      // Mapping of default models per provider for UI feedback
      const defaultModelMap: Record<string, string> = {
        openai: 'gpt-4o',
        groq: 'llama-3.1-70b-versatile',
        gemini: 'gemini-1.5-pro',
        anthropic: 'claude-3-sonnet',
        mistral: 'mistral-small',
        aiml: 'claude-3-sonnet',
        deepinfra: 'Meta-Llama-3.1-70B-Instruct'
      }

      return { valid: true, model: defaultModelMap[provider] }
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

export const enhancedAIService = new EnhancedAIService()
