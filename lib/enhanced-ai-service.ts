import { supabase } from '@/integrations/supabase/client'

// Types for AI service
export interface AIProvider {
  id: string
  name: string
  baseURL: string
  models: string[]
  priority: number
  requiresAuth: boolean
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  provider: string
  model: string
  usage?: {
    tokens: number
    cost?: number
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
  context: string
  references?: string[]
}

// AI Providers configuration
export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4-0125-preview', 'gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
    priority: 1,
    requiresAuth: true
  },
  {
    id: 'groq',
    name: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b', 'gemma2-9b-it'],
    priority: 2,
    requiresAuth: true
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-1.5-pro', 'gemini-1.5-pro-latest', 'gemini-1.5-pro-vision'],
    priority: 3,
    requiresAuth: true
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    priority: 4,
    requiresAuth: true
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    baseURL: 'https://api.mistral.ai/v1',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
    priority: 5,
    requiresAuth: true
  }
]

class EnhancedAIService {
  private userApiKeys: Map<string, string> = new Map()
  private fallbackKeys: Map<string, string> = new Map()
  private initialized: boolean = false

  constructor() {
    // Load fallback keys from environment
    this.fallbackKeys.set('openai', process.env.NEXT_PUBLIC_OPENAI_API_KEY || '')
    this.fallbackKeys.set('groq', process.env.NEXT_PUBLIC_GROQ_API_KEY || '')
    this.fallbackKeys.set('gemini', process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')
    this.fallbackKeys.set('anthropic', process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '')
    this.fallbackKeys.set('mistral', process.env.NEXT_PUBLIC_MISTRAL_API_KEY || '')
  }

  // Load user API keys from database
  async loadUserApiKeys(forceReload: boolean = false): Promise<void> {
    if (this.initialized && !forceReload) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('No authenticated user found')
        return
      }

      const response = await fetch('/api/user-api-keys?include_keys=true', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load API keys: ${response.statusText}`)
      }

      const data = await response.json()
      const apiKeys = data.apiKeys || []
      
      this.userApiKeys.clear()
      apiKeys.forEach((keyData: any) => {
        if (keyData.is_active && keyData.test_status === 'valid' && keyData.api_key) {
          this.userApiKeys.set(keyData.provider, keyData.api_key)
        }
      })

      this.initialized = true
      console.log(`API keys loaded successfully: ${this.userApiKeys.size} providers configured`)
    } catch (error) {
      console.error('Error loading user API keys:', error)
      throw error
    }
  }

  // Get available API key for provider (user key takes priority)
  private async getApiKey(provider: string): Promise<string | null> {
    if (!this.initialized) {
      await this.loadUserApiKeys()
    }
    return this.userApiKeys.get(provider) || this.fallbackKeys.get(provider) || null
  }

  // Get best available provider
  private async getBestProvider(): Promise<{ provider: AIProvider; apiKey: string } | null> {
    await this.loadUserApiKeys()
    
    const sortedProviders = [...AI_PROVIDERS].sort((a, b) => a.priority - b.priority)
    
    for (const provider of sortedProviders) {
      const apiKey = await this.getApiKey(provider.id)
      if (apiKey) {
        return { provider, apiKey }
      }
    }
    
    return null
  }

  // Make API call to OpenAI-compatible endpoint
  private async callOpenAICompatible(
    provider: AIProvider,
    apiKey: string,
    messages: AIMessage[],
    options: { model?: string; temperature?: number; maxTokens?: number } = {}
  ): Promise<AIResponse> {
    const model = options.model || provider.models[0]
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (provider.id === 'openai' || provider.id === 'groq') {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const body = {
      model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      stream: false
    }

    const response = await fetch(`${provider.baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`${provider.name} API error: ${error}`)
    }

    const data = await response.json()
    
    return {
      content: data.choices[0]?.message?.content || '',
      provider: provider.name,
      model,
      usage: data.usage ? {
        tokens: data.usage.total_tokens,
        cost: this.calculateCost(provider.id, model, data.usage.total_tokens)
      } : undefined
    }
  }

  // Make API call to Gemini
  private async callGemini(
    apiKey: string,
    messages: AIMessage[],
    options: { model?: string; temperature?: number } = {}
  ): Promise<AIResponse> {
    const model = options.model || 'gemini-1.5-pro'
    
    // Convert messages to Gemini format
    const contents = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))

    // Add system message as instruction if present
    const systemMessage = messages.find(msg => msg.role === 'system')
    const generationConfig: any = {
      temperature: options.temperature || 0.7,
      maxOutputTokens: 2000,
    }

    if (systemMessage) {
      generationConfig.systemInstruction = {
        role: 'system',
        parts: [{ text: systemMessage.content }]
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${error}`)
    }

    const data = await response.json()
    
    return {
      content: data.candidates[0]?.content?.parts[0]?.text || '',
      provider: 'Google Gemini',
      model,
      usage: data.usageMetadata ? {
        tokens: data.usageMetadata.totalTokenCount,
        cost: this.calculateCost('gemini', model, data.usageMetadata.totalTokenCount)
      } : undefined
    }
  }

  // Calculate approximate cost
  private calculateCost(provider: string, model: string, tokens: number): number {
    const rates: Record<string, Record<string, number>> = {
      'openai': {
        'gpt-4': 0.00003,
        'gpt-4-turbo': 0.00001,
        'gpt-3.5-turbo': 0.000002
      },
      'groq': {
        'llama-3.1-70b-versatile': 0.00000059,
        'mixtral-8x7b-32768': 0.00000024,
        'gemma-7b-it': 0.00000010
      },
      'gemini': {
        'gemini-1.5-pro': 0.000007,
        'gemini-1.5-flash': 0.00000035
      }
    }

    const providerRates = rates[provider]
    const rate = providerRates?.[model] || 0
    return tokens * rate
  }

  // Main chat completion method
  async chatCompletion(
    messages: AIMessage[],
    options: { 
      model?: string
      temperature?: number
      maxTokens?: number
      preferredProvider?: string 
    } = {}
  ): Promise<AIResponse> {
    const bestProvider = await this.getBestProvider()
    
    if (!bestProvider) {
      throw new Error('No AI providers available. Please configure API keys in settings.')
    }

    const { provider, apiKey } = bestProvider

    try {
      if (provider.id === 'gemini') {
        return await this.callGemini(apiKey, messages, options)
      } else {
        return await this.callOpenAICompatible(provider, apiKey, messages, options)
      }
    } catch (error) {
      console.error(`AI API Error (${provider.name}):`, error)
      throw error
    }
  }

  // Research assistance
  async generateResearchIdeas(topic: string, context?: string): Promise<ResearchResult> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a research assistant. Generate innovative, practical research ideas with detailed methodology and impact analysis. Return only valid JSON.'
      },
      {
        role: 'user',
        content: `Generate 3-5 research ideas for the topic: "${topic}"${context ? ` in the context of: ${context}` : ''}
        
        Return a JSON object with this structure:
        {
          "ideas": [
            {
              "title": "Research idea title",
              "description": "Brief description",
              "research_question": "Main research question",
              "methodology": "Proposed methodology",
              "impact": "Potential impact and applications", 
              "challenges": "Anticipated challenges"
            }
          ],
          "context": "Brief analysis of the research landscape",
          "references": ["Suggested reference areas"]
        }`
      }
    ]

    const response = await this.chatCompletion(messages)
    
    try {
      return JSON.parse(response.content)
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        ideas: [{
          title: `Research on ${topic}`,
          description: response.content,
          research_question: `How can we advance understanding of ${topic}?`,
          methodology: 'Mixed methods approach with literature review and empirical analysis',
          impact: 'Potential to contribute to academic knowledge and practical applications',
          challenges: 'Data availability and methodological constraints'
        }],
        context: `Research in ${topic} is an active field with many opportunities for contribution.`
      }
    }
  }

  // Content summarization
  async summarizeContent(
    content: string, 
    options: { 
      style?: 'academic' | 'executive' | 'bullet-points' | 'detailed'
      length?: 'brief' | 'medium' | 'comprehensive'
    } = {}
  ): Promise<{
    summary: string
    keyPoints: string[]
    readingTime: number
    sentiment?: 'positive' | 'neutral' | 'negative'
  }> {
    const { style = 'academic', length = 'medium' } = options
    
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are an expert content summarizer. Create ${style} summaries that are ${length} in length. Return only valid JSON.`
      },
      {
        role: 'user',
        content: `Analyze and summarize this content:

"${content}"

Return a JSON object with this structure:
{
  "summary": "${style} summary in ${length} detail",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "readingTime": estimated_reading_time_in_minutes,
  "sentiment": "positive|neutral|negative"
}`
      }
    ]

    const response = await this.chatCompletion(messages)
    
    try {
      return JSON.parse(response.content)
    } catch (error) {
      // Fallback
      const wordCount = content.split(/\s+/).length
      return {
        summary: response.content,
        keyPoints: ['Content analysis completed', 'Key insights extracted', 'Summary generated'],
        readingTime: Math.ceil(wordCount / 200),
        sentiment: 'neutral'
      }
    }
  }

  // Writing assistance
  async improveWriting(
    text: string,
    task: 'grammar' | 'clarity' | 'academic' | 'creative' | 'professional'
  ): Promise<{
    improvedText: string
    suggestions: Array<{
      type: string
      original: string
      improved: string
      reason: string
    }>
    metrics: {
      readability: number
      sentiment: string
      wordCount: number
    }
  }> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a professional writing assistant. Improve text for ${task} purposes. Return only valid JSON.`
      },
      {
        role: 'user',
        content: `Improve this text for ${task}:

"${text}"

Return a JSON object with this structure:
{
  "improvedText": "The improved version of the text",
  "suggestions": [
    {
      "type": "grammar|style|clarity|structure",
      "original": "original phrase",
      "improved": "improved phrase", 
      "reason": "explanation of improvement"
    }
  ],
  "metrics": {
    "readability": score_out_of_100,
    "sentiment": "positive|neutral|negative",
    "wordCount": number_of_words
  }
}`
      }
    ]

    const response = await this.chatCompletion(messages)
    
    try {
      return JSON.parse(response.content)
    } catch (error) {
      // Fallback
      return {
        improvedText: response.content,
        suggestions: [{
          type: 'improvement',
          original: text.substring(0, 50) + '...',
          improved: response.content.substring(0, 50) + '...',
          reason: 'AI-assisted improvement applied'
        }],
        metrics: {
          readability: 75,
          sentiment: 'neutral',
          wordCount: text.split(/\s+/).length
    }
  }
    }
  }

  // Test API key
  async testApiKey(provider: string, apiKey: string): Promise<{ valid: boolean; error?: string; model?: string }> {
    try {
      const providerConfig = AI_PROVIDERS.find(p => p.id === provider)
      if (!providerConfig) {
        return { valid: false, error: 'Unknown provider' }
      }

      const testMessages: AIMessage[] = [
        { role: 'user', content: 'Hello! Please respond with just the word "SUCCESS" if you can read this.' }
      ]

      if (provider === 'gemini') {
        const response = await this.callGemini(apiKey, testMessages)
        return { 
          valid: response.content.toLowerCase().includes('success'),
          model: response.model
        }
      } else {
        const response = await this.callOpenAICompatible(providerConfig, apiKey, testMessages)
        return { 
          valid: response.content.toLowerCase().includes('success'),
          model: response.model
        }
      }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
  }
}

// Export singleton instance
export const enhancedAIService = new EnhancedAIService()
export default enhancedAIService
