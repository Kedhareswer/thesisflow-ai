import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Import AI providers and interfaces
interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AIResponse {
  content: string
  provider: string
  model: string
  usage?: {
    tokens: number
    cost?: number
  }
}

// Encryption settings
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-secret-key-here-123456'
const ALGORITHM = 'aes-256-cbc'

function decrypt(text: string): string {
  const textParts = text.split(':')
  const iv = Buffer.from(textParts.shift()!, 'hex')
  const encryptedText = textParts.join(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// AI Provider configurations
const AI_PROVIDERS = [
  {
    id: 'groq',
    name: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
    priority: 1,
    costPer1kTokens: 0.59
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    priority: 2,
    costPer1kTokens: 2.50
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    priority: 3,
    costPer1kTokens: 0.35
  },
  {
    id: 'aiml',
    name: 'AI/ML API',
    baseURL: 'https://api.aimlapi.com/v1',
    models: ['gpt-4o', 'claude-3-sonnet'],
    priority: 4,
    costPer1kTokens: 1.00
  },
  {
    id: 'deepinfra',
    name: 'DeepInfra',
    baseURL: 'https://api.deepinfra.com/v1/openai',
    models: ['Meta-Llama-3.1-70B-Instruct'],
    priority: 5,
    costPer1kTokens: 0.35
  }
]

// Get user's API keys with fallback to environment
async function getUserApiKeys(userId: string, supabase: any): Promise<Map<string, string>> {
  const apiKeys = new Map<string, string>()
  
  try {
    // Get user's encrypted API keys
    const { data: userKeys, error } = await supabase
      .from('user_api_keys')
      .select('provider, api_key_encrypted')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('test_status', 'valid')

    if (!error && userKeys) {
      // Decrypt user keys
      for (const keyData of userKeys) {
        try {
          const decryptedKey = decrypt(keyData.api_key_encrypted)
          apiKeys.set(keyData.provider, decryptedKey)
        } catch (decryptError) {
          console.error(`Failed to decrypt ${keyData.provider} key:`, decryptError)
        }
      }
    }
  } catch (error) {
    console.error('Error loading user API keys:', error)
  }

  // Add fallback environment keys
  if (!apiKeys.has('groq') && process.env.GROQ_API_KEY) {
    apiKeys.set('groq', process.env.GROQ_API_KEY)
  }
  if (!apiKeys.has('openai') && process.env.OPENAI_API_KEY) {
    apiKeys.set('openai', process.env.OPENAI_API_KEY)
  }
  if (!apiKeys.has('gemini') && process.env.GEMINI_API_KEY) {
    apiKeys.set('gemini', process.env.GEMINI_API_KEY)
  }
  if (!apiKeys.has('aiml') && process.env.AIML_API_KEY) {
    apiKeys.set('aiml', process.env.AIML_API_KEY)
  }
  if (!apiKeys.has('deepinfra') && process.env.DEEPINFRA_API_KEY) {
    apiKeys.set('deepinfra', process.env.DEEPINFRA_API_KEY)
  }

  return apiKeys
}

// Get best available provider
function getBestProvider(apiKeys: Map<string, string>) {
  const sortedProviders = AI_PROVIDERS.sort((a, b) => a.priority - b.priority)
  
  for (const provider of sortedProviders) {
    if (apiKeys.has(provider.id)) {
      return {
        provider,
        apiKey: apiKeys.get(provider.id)!,
        isUserKey: !isEnvironmentKey(provider.id, apiKeys.get(provider.id)!)
      }
    }
  }
  
  return null
}

// Check if key is from environment (for tracking purposes)
function isEnvironmentKey(provider: string, key: string): boolean {
  const envKeys = {
    groq: process.env.GROQ_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    aiml: process.env.AIML_API_KEY,
    deepinfra: process.env.DEEPINFRA_API_KEY
  }
  return envKeys[provider as keyof typeof envKeys] === key
}

// OpenAI-compatible API call
async function callOpenAICompatible(
  provider: any,
  apiKey: string,
  messages: AIMessage[],
  options: any = {}
): Promise<AIResponse> {
  const model = options.model || provider.models[0]
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
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
      cost: (data.usage.total_tokens / 1000) * provider.costPer1kTokens
    } : undefined
  }
}

// Gemini API call
async function callGemini(
  apiKey: string,
  messages: AIMessage[],
  options: any = {}
): Promise<AIResponse> {
  const model = options.model || 'gemini-2.0-flash'
  
  // Convert messages to Gemini format
  const contents = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

  const systemMessage = messages.find(msg => msg.role === 'system')
  const generationConfig: any = {
    temperature: options.temperature || 0.7,
    maxOutputTokens: options.maxTokens || 2000,
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
      cost: (data.usageMetadata.totalTokenCount / 1000) * 0.35
    } : undefined
  }
}

// Track usage
async function trackUsage(userId: string, provider: string, supabase: any, isUserKey: boolean) {
  if (isUserKey) {
    try {
      await supabase.rpc('increment_api_key_usage', {
        key_user_id: userId,
        key_provider: provider
      })
    } catch (error) {
      console.error('Error tracking usage:', error)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, options = {} } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    // Get user's API keys
    const apiKeys = await getUserApiKeys(user.id, supabase)
    
    if (apiKeys.size === 0) {
      return NextResponse.json({ 
        error: 'No AI providers available. Please configure API keys in Settings.' 
      }, { status: 400 })
    }

    // Get best provider
    const bestProvider = getBestProvider(apiKeys)
    
    if (!bestProvider) {
      return NextResponse.json({ 
        error: 'No available AI providers found' 
      }, { status: 500 })
    }

    const { provider, apiKey, isUserKey } = bestProvider

    // Make AI request
    let response: AIResponse
    if (provider.id === 'gemini') {
      response = await callGemini(apiKey, messages, options)
    } else {
      response = await callOpenAICompatible(provider, apiKey, messages, options)
    }

    // Track usage
    await trackUsage(user.id, provider.id, supabase, isUserKey)

    return NextResponse.json({
      response,
      meta: {
        provider: provider.name,
        model: response.model,
        isUserKey,
        usage: response.usage
      }
    })

  } catch (error) {
    console.error('AI Generation Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI request failed' },
      { status: 500 }
    )
  }
}
