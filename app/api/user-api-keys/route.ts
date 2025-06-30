import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Simple encryption/decryption for API keys (in production, use a proper key management service)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-secret-key-here-123456'
const ALGORITHM = 'aes-256-cbc'

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(text: string): string {
  const textParts = text.split(':')
  const iv = Buffer.from(textParts.shift()!, 'hex')
  const encryptedText = textParts.join(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Validate API key format for different providers
function validateApiKey(provider: string, apiKey: string): boolean {
  const patterns = {
    openai: /^sk-[a-zA-Z0-9]{48,}$/,
    groq: /^gsk_[a-zA-Z0-9]{52}$/,
    gemini: /^[a-zA-Z0-9_-]{39}$/,
    aiml: /^[a-zA-Z0-9_-]{32,}$/,
    deepinfra: /^[a-zA-Z0-9_-]{20,}$/,
  }
  
  const pattern = patterns[provider as keyof typeof patterns]
  return pattern ? pattern.test(apiKey) : apiKey.length > 10
}

// Test API key validity by making a simple request
async function testApiKey(provider: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'openai':
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        return { valid: openaiResponse.status === 200 }
        
      case 'groq':
        const groqResponse = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        return { valid: groqResponse.status === 200 }
        
      case 'gemini':
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
        return { valid: geminiResponse.status === 200 }
        
      default:
        return { valid: true } // Skip validation for unknown providers
    }
  } catch (error) {
    return { valid: false, error: 'Network error during validation' }
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's API keys (without decrypting for list view)
    const { data: apiKeys, error } = await supabase
      .from('user_api_keys')
      .select('id, provider, is_active, last_tested_at, test_status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ apiKeys: apiKeys || [] })
  } catch (error) {
    console.error('API keys GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, apiKey, testKey = false } = body

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 })
    }

    // Validate API key format
    if (!validateApiKey(provider, apiKey)) {
      return NextResponse.json({ 
        error: `Invalid API key format for ${provider}. Please check your key and try again.` 
      }, { status: 400 })
    }

    // Test API key if requested
    let testResult: { valid: boolean; error?: string } = { valid: true }
    if (testKey) {
      testResult = await testApiKey(provider, apiKey)
      if (!testResult.valid) {
        return NextResponse.json({ 
          error: `API key validation failed: ${testResult.error || 'Invalid key'}` 
        }, { status: 400 })
      }
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey)

    // Insert or update the API key
    const { error: upsertError } = await supabase
      .from('user_api_keys')
      .upsert({
        user_id: user.id,
        provider,
        api_key_encrypted: encryptedKey,
        is_active: true,
        last_tested_at: testKey ? new Date().toISOString() : null,
        test_status: testKey ? (testResult.valid ? 'valid' : 'invalid') : 'untested',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider'
      })

    if (upsertError) {
      console.error('Error saving API key:', upsertError)
      return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `${provider} API key saved successfully${testKey ? ' and validated' : ''}` 
    })
  } catch (error) {
    console.error('API keys POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (error) {
      console.error('Error deleting API key:', error)
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `${provider} API key deleted successfully` })
  } catch (error) {
    console.error('API keys DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 