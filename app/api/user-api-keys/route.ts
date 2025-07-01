import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'
import crypto from 'crypto'
import { enhancedAIService } from '@/lib/enhanced-ai-service'

// Using shared authentication utilities from lib/auth-utils.ts
const supabaseAdmin = createSupabaseAdmin()

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
    groq: /^gsk_[a-zA-Z0-9]{50,}$/,
    gemini: /^AIza[a-zA-Z0-9_-]{35,}$/,
    anthropic: /^sk-ant-[a-zA-Z0-9]{40,}$/,
    mistral: /^[a-zA-Z0-9]{32,}$/,
  }
  
  const pattern = patterns[provider as keyof typeof patterns]
  return pattern ? pattern.test(apiKey) : apiKey.length > 10
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    // Get authenticated user
    let user
    try {
      user = await requireAuth(request, "user-api-keys")
    } catch (authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeKeys = searchParams.get('include_keys') === 'true'

    if (includeKeys) {
      // Get user's API keys WITH decryption for AI service use
      const { data: apiKeys, error } = await supabaseAdmin
        .from('user_api_keys')
        .select('id, provider, api_key_encrypted, is_active, last_tested_at, test_status, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('test_status', 'valid')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching API keys:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      // Decrypt the API keys for internal use
      const decryptedKeys = (apiKeys || []).map((key: any) => {
        try {
          return {
            ...key,
            api_key: decrypt(key.api_key_encrypted)
          }
        } catch (decryptError) {
          console.error(`Failed to decrypt API key for ${key.provider}:`, decryptError)
          return null
        }
      }).filter(Boolean)

      return NextResponse.json({ apiKeys: decryptedKeys })
    } else {
    // Get user's API keys (without decrypting for list view)
    const { data: apiKeys, error } = await supabaseAdmin
      .from('user_api_keys')
      .select('id, provider, is_active, last_tested_at, test_status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ apiKeys: apiKeys || [] })
    }
  } catch (error) {
    console.error('API keys GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    // Get authenticated user
    let user
    try {
      user = await requireAuth(request, "user-api-keys")
    } catch (authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { provider, apiKey, testKey } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 }
      )
    }

    // Test the API key if requested
    if (testKey) {
      try {
        const testResult = await enhancedAIService.testApiKey(provider, apiKey)
        
        if (!testResult.valid) {
          return NextResponse.json(
            { error: testResult.error || 'API key validation failed' },
            { status: 400 }
          )
        }

        // If testing only, return success without saving
        return NextResponse.json({
          message: `${provider} API key is valid`,
          model: testResult.model,
          provider
        })
      } catch (error) {
        return NextResponse.json(
          { error: `API key test failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        )
      }
    }

    // Validate API key format
    if (!validateApiKey(provider, apiKey)) {
      return NextResponse.json({ 
        error: `Invalid API key format for ${provider}. Please check your key and try again.` 
      }, { status: 400 })
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey)

    // Insert or update the API key
    const { error: upsertError } = await supabaseAdmin
      .from('user_api_keys')
      .upsert({
        user_id: user.id,
        provider,
        api_key_encrypted: encryptedKey,
        is_active: true,
        last_tested_at: null,
        test_status: 'untested',
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
      message: `${provider} API key saved successfully` 
    })
  } catch (error) {
    console.error('API keys POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    // Get authenticated user
    let user
    try {
      user = await requireAuth(request, "user-api-keys")
    } catch (authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
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
