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
      const selectedModel = options.model || providerConfig.models[0]
      console.log("Enhanced AI Service: Using model:", selectedModel)

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

      const providerConfig = AI_PROVIDERS[provider]
      const maxTokens = Math.min(options.maxTokens || 1000, providerConfig.maxTokens)
      const temperature = Math.min(Math.max(options.temperature || 0.7, 0), 1)

      switch (provider) {
        case 'groq':
          return await this.callGroqAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)
        
        case 'openai':
          return await this.callOpenAIAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)
        
        // Anthropic not currently in AI_PROVIDERS, skip for now
        // case 'anthropic':
        //   return await this.callAnthropicAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)
        
        case 'gemini':
          return await this.callGeminiAPI(apiKey, options.prompt, options.model!, maxTokens, temperature)
        
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    
    return {
      success: true,
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      provider: 'gemini',
      model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount,
        completionTokens: data.usageMetadata?.candidatesTokenCount,
        totalTokens: data.usageMetadata?.totalTokenCount,
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

  // Research-specific methods
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
    const prompt = `Generate ${count} innovative and feasible research ideas for the topic: "${topic}"

${context ? `Additional context: ${context}` : ''}

Please provide creative, specific, and actionable research ideas that could lead to meaningful contributions in this field. For each idea, provide:
1. A clear, concise title
2. A detailed description explaining the research approach, potential impact, and feasibility

Format your response as a numbered list where each idea follows this structure:
1. **Title**: [Clear research title]
   Description: [2-3 sentences explaining the research approach, methodology, and expected outcomes]

Focus on originality, practical feasibility, and potential for significant impact in the field.`

    const result = await this.generateText({
      prompt,
      maxTokens: 2000,
      temperature: 0.9
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate research ideas')
    }

    // Parse the response to extract ideas
    const content = result.content || ''
    const ideas = this.parseResearchIdeas(content)

    return {
      ideas,
      topic,
      context,
      count,
      timestamp: new Date().toISOString()
    }
  }

  private parseResearchIdeas(content: string): Array<{ title: string; description: string }> {
    const ideas: Array<{ title: string; description: string }> = []
    
    // Split content by numbered items
    const lines = content.split('\n')
    let currentIdea: { title: string; description: string } | null = null
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Check if this is a new numbered idea
      const numberMatch = trimmedLine.match(/^\d+\.\s*\*\*(.*?)\*\*/)
      if (numberMatch) {
        // Save previous idea if exists
        if (currentIdea) {
          ideas.push(currentIdea)
        }
        
        // Start new idea
        currentIdea = {
          title: numberMatch[1].trim(),
          description: ''
        }
        
        // Check if description is on the same line
        const descMatch = trimmedLine.match(/Description:\s*(.+)/)
        if (descMatch) {
          currentIdea.description = descMatch[1].trim()
        }
      } else if (currentIdea) {
        // Add to current idea's description
        const descMatch = trimmedLine.match(/Description:\s*(.+)/)
        if (descMatch) {
          currentIdea.description = descMatch[1].trim()
        } else if (trimmedLine && !trimmedLine.startsWith('**')) {
          // Add continuation of description
          if (currentIdea.description) {
            currentIdea.description += ' ' + trimmedLine
          } else {
            currentIdea.description = trimmedLine
          }
        }
      }
    }
    
    // Add the last idea
    if (currentIdea) {
      ideas.push(currentIdea)
    }
    
    // If parsing failed, create fallback ideas from the content
    if (ideas.length === 0) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
      for (let i = 0; i < Math.min(5, sentences.length); i++) {
        ideas.push({
          title: `Research Idea ${i + 1}`,
          description: sentences[i].trim()
        })
      }
    }
    
    return ideas
  }
}

export const enhancedAIService = new EnhancedAIService()
