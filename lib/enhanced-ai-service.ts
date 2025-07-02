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
    const prompt = `Generate ${count} innovative research ideas for "${topic}"${context ? `\nContext: ${context}` : ''}

Format:
1. **[Title]**
   [Approach] | [Impact] | [Methodology]

Requirements:
- Novel, feasible concepts
- Clear research approach
- Measurable outcomes
- Practical implementation

Each idea: title + 3 key aspects separated by "|"`

    const result = await this.generateText({
      prompt,
      maxTokens: 3000, // Increased for more detailed ideas
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
    
    // Parse optimized format: **Title** followed by Approach | Impact | Methodology
    const optimizedPattern = /\d+\.\s*\*\*([^*]+)\*\*\s*([^|\n]+)\s*\|\s*([^|\n]+)\s*\|\s*([^\n]+)/g
    let match
    
    while ((match = optimizedPattern.exec(content)) !== null) {
      const title = match[1]?.trim()
      const approach = match[2]?.trim()
      const impact = match[3]?.trim()
      const methodology = match[4]?.trim()
      
      if (title) {
        ideas.push({
          title,
          description: `${approach}. ${impact}. ${methodology}`
        })
      }
    }
    
    // Fallback: Standard numbered list parsing
    if (ideas.length === 0) {
      const standardPattern = /\d+\.\s*\*\*([^*]+)\*\*[:\s]*([^\n]+(?:\n(?!\d+\.)[^\n]*)*)?/g
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
    }
    
    // Final fallback: Extract any numbered items
    if (ideas.length === 0) {
      const fallbackPattern = /\d+\.\s*([^\n]+)/g
      while ((match = fallbackPattern.exec(content)) !== null && ideas.length < 5) {
        const line = match[1]?.trim()
        if (line && line.length > 10) {
          ideas.push({
            title: `Research Idea ${ideas.length + 1}`,
            description: line
          })
        }
      }
    }
    
    return ideas.slice(0, 10)
  }

  // Content summarization method
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
    console.log("Enhanced AI Service: Options:", options)
    console.log("Enhanced AI Service: Provider:", provider)
    console.log("Enhanced AI Service: Model:", model)

    const { style = 'academic', length = 'medium' } = options
    
    const prompt = `Summarize content | Style: ${style} | Length: ${length}

CONTENT:
${content.substring(0, 4000)}${content.length > 4000 ? '...[truncated]' : ''}

OUTPUT FORMAT:
SUMMARY: [${style} summary in ${length} detail]
KEY_POINTS: [point1] | [point2] | [point3]
READING_TIME: [minutes]
SENTIMENT: [positive/neutral/negative]

Requirements:
- ${style} writing style
- ${length} level of detail
- Extract 3-5 key points
- Estimate reading time (200 words/min)
- Assess overall sentiment`

    console.log("Enhanced AI Service: Generated prompt length:", prompt.length)

    try {
      const result = await this.generateText({
        prompt,
        provider,
        model,
        maxTokens: length === 'comprehensive' ? 2000 : length === 'medium' ? 1000 : 500,
        temperature: 0.3
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
}

export const enhancedAIService = new EnhancedAIService()
