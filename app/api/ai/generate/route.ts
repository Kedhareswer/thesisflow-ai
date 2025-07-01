import { NextResponse } from "next/server"
import { getAuthUser, createSupabaseAdmin } from '@/lib/auth-utils'
import crypto from 'crypto'

// Using shared authentication utilities from lib/auth-utils.ts

// Simple decryption for API keys
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

// Get user API keys
async function getUserApiKeys(userId: string) {
  const supabaseAdmin = createSupabaseAdmin()
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured')
  }

  const { data: apiKeys, error } = await supabaseAdmin
    .from('user_api_keys')
    .select('provider, api_key_encrypted, is_active, test_status')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('test_status', 'valid')

  if (error) {
    console.error('Error fetching user API keys:', error)
    return {}
  }

  const decryptedKeys: Record<string, string> = {}
  apiKeys?.forEach((keyData: any) => {
    try {
      decryptedKeys[keyData.provider] = decrypt(keyData.api_key_encrypted)
    } catch (error) {
      console.error(`Failed to decrypt API key for ${keyData.provider}:`, error)
    }
  })

  return decryptedKeys
}

type Provider = {
  name: string
  envKey: string
  apiUrl: (model: string, apiKey?: string) => string
  headers: (apiKey: string) => Record<string, string>
  body: (prompt: string, model: string) => any
  extractContent: (data: any) => string
  defaultModel: string
}

const providers: Provider[] = [
  // OpenAI provider
  {
    name: "openai",
    envKey: "OPENAI_API_KEY",
    apiUrl: () => "https://api.openai.com/v1/chat/completions",
    headers: (apiKey) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    body: (prompt, model) => ({
      model: model || "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || "No content generated.",
    defaultModel: "gpt-3.5-turbo",
  },
  // Gemini provider
  {
    name: "gemini",
    envKey: "GEMINI_API_KEY",
    apiUrl: (model, apiKey) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    headers: () => ({
      "Content-Type": "application/json",
    }),
    body: (prompt) => ({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topK: 40,
        topP: 0.8,
      },
    }),
    extractContent: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text || "No content generated.",
    defaultModel: "gemini-2.0-flash",
  },
  // Groq provider
  {
    name: "groq",
    envKey: "GROQ_API_KEY",
    apiUrl: () => "https://api.groq.com/openai/v1/chat/completions",
    headers: (apiKey) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    body: (prompt, model) => ({
      model: model || "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || "No content generated.",
    defaultModel: "llama-3.3-70b-versatile",
  },
]

export async function POST(request: Request) {
  try {
    const { prompt, provider: requestedProvider, model: requestedModel } = await request.json()

    // Get authenticated user (but don't fail if not authenticated - fallback to env vars)
    let user
    try {
      user = await getAuthUser(request, "generate")
    } catch (authError) {
      console.log('No authenticated user, using environment variables')
      user = null
    }

    // Get user API keys if authenticated
    let userApiKeys: Record<string, string> = {}
    if (user) {
      try {
        userApiKeys = await getUserApiKeys(user.id)
      } catch (error) {
        console.error('Error loading user API keys:', error)
      }
    }

    // Find available provider in priority order
    const providerPriority = ['groq', 'openai', 'gemini']
    let selectedProvider: Provider | null = null
    let apiKey: string | null = null

    // If a specific provider is requested, try it first
    if (requestedProvider) {
      selectedProvider = providers.find(p => p.name === requestedProvider) || null
      if (selectedProvider) {
        apiKey = userApiKeys[selectedProvider.name] || process.env[selectedProvider.envKey] || null
      }
    }

    // If no specific provider or the requested one isn't available, find the best available
    if (!selectedProvider || !apiKey) {
      for (const providerName of providerPriority) {
        const provider = providers.find(p => p.name === providerName)
        if (provider) {
          const key = userApiKeys[provider.name] || process.env[provider.envKey] || null
          if (key) {
            selectedProvider = provider
            apiKey = key
            break
          }
        }
      }
    }

    if (!selectedProvider || !apiKey) {
      return NextResponse.json({ 
        error: "No AI providers are configured. Please add at least one API key to your environment variables." 
      }, { status: 500 })
    }

    const model = requestedModel || selectedProvider.defaultModel
    console.log(`Using AI provider: ${selectedProvider.name} with model: ${model}`)

    const apiUrl = selectedProvider.apiUrl(model, apiKey)
    const headers = selectedProvider.headers(apiKey)

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(selectedProvider.body(prompt, model)),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`${selectedProvider.name} API error:`, errorData)
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`)
    }

    const data = await response.json()
    const content = selectedProvider.extractContent(data)

    return NextResponse.json({
      content,
      model,
      provider: selectedProvider.name,
      usage: data.usage || data.usageMetadata || {},
    })
  } catch (error) {
    console.error("Error in AI generate API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate content" },
      { status: 500 },
    )
  }
}
