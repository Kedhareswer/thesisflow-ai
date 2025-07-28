import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enhancedAIService } from '@/lib/enhanced-ai-service'

// Create admin client for secure server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Get user's API keys with fallback to environment
async function getUserApiKeys(userId: string, supabase: any): Promise<Map<string, string>> {
  const apiKeys = new Map<string, string>()
  
  try {
    // Get user's API keys (already in plain text)
    const { data: userKeys, error } = await supabase
      .from('user_api_keys')
      .select('provider, api_key')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('test_status', 'valid')

    if (!error && userKeys) {
      // Add user keys (no decryption needed)
      for (const keyData of userKeys) {
        apiKeys.set(keyData.provider, keyData.api_key)
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
  if (!apiKeys.has('anthropic') && process.env.ANTHROPIC_API_KEY) {
    apiKeys.set('anthropic', process.env.ANTHROPIC_API_KEY)
  }
  if (!apiKeys.has('mistral') && process.env.MISTRAL_API_KEY) {
    apiKeys.set('mistral', process.env.MISTRAL_API_KEY)
  }
  if (!apiKeys.has('aiml') && process.env.AIML_API_KEY) {
    apiKeys.set('aiml', process.env.AIML_API_KEY)
  }


  return apiKeys
}

async function generateWithAI(
  prompt: string,
  preferredProvider: string,
  userApiKeys: Map<string, string>
): Promise<string> {
  // Define provider priority order
  const providerOrder = ['openai', 'groq', 'gemini', 'anthropic', 'mistral', 'aiml']
  
  let providersToTry = []
  
  // If user has a preferred provider and key, try it first
  if (preferredProvider && userApiKeys.has(preferredProvider)) {
    providersToTry.push(preferredProvider)
  }
  
  // Add other available providers
  for (const provider of providerOrder) {
    if (provider !== preferredProvider && userApiKeys.has(provider)) {
      providersToTry.push(provider)
      }
    }
  
  if (providersToTry.length === 0) {
    throw new Error('No API keys available. Please configure API keys in Settings.')
}

  // Since we're using the enhanced AI service directly, we can use its generateText method
  // But we need to work around the fact that it loads keys internally
  // For now, let's use a simpler approach and make direct API calls
  
  // Try each provider in order
  for (const provider of providersToTry) {
    try {
      const apiKey = userApiKeys.get(provider)
      if (!apiKey) continue
      
      console.log(`Trying ${provider} for AI generation...`)
      
      // Make direct API call based on provider
      let result: string = ''
      
      if (provider === 'openai') {
        result = await callOpenAIAPI(apiKey, prompt)
      } else if (provider === 'groq') {
        result = await callGroqAPI(apiKey, prompt)
      } else if (provider === 'gemini') {
        result = await callGeminiAPI(apiKey, prompt)
      } else if (provider === 'anthropic') {
        result = await callAnthropicAPI(apiKey, prompt)
      } else if (provider === 'mistral') {
        result = await callMistralAPI(apiKey, prompt)
      } else if (provider === 'aiml') {
        result = await callAIMLAPI(apiKey, prompt)
      }
      
      if (result && result.trim()) {
        console.log(`Successfully generated text with ${provider}`)
        return result
      }
    } catch (error) {
      console.error(`Error with ${provider}:`, error)
      continue
    }
  }
  
  throw new Error('All AI providers failed to generate text')
}

async function callOpenAIAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callGroqAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      }
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callAnthropicAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3.5-sonnet',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

async function callMistralAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-small',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Mistral API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callAIMLAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
      method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
      body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`AIML API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const { prompt, provider: preferredProvider = 'openai' } = await request.json()
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required and must be a string' }, { status: 400 })
    }
    
    // Get auth token
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    // Get user's API keys
    const userApiKeys = await getUserApiKeys(user.id, supabaseAdmin)
    
    // Generate text with AI
    const generatedText = await generateWithAI(prompt, preferredProvider, userApiKeys)

    return NextResponse.json({
      success: true,
      result: generatedText,
      provider: preferredProvider
    })

  } catch (error) {
    console.error('AI User Generation Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const statusCode = errorMessage.includes('No API keys available') ? 400 : 500
    
    return NextResponse.json({
      error: errorMessage,
      success: false
    }, { status: statusCode })
  }
}
