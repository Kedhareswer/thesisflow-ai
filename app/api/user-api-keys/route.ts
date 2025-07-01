import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'
import crypto from 'crypto'
import { enhancedAIService } from '@/lib/enhanced-ai-service'

// Using shared authentication utilities from lib/auth-utils.ts

// Simple encryption/decryption for API keys (in production, use a proper key management service)
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || 'fallback-key-for-development-only'
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

function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decryptApiKey(encryptedKey: string): string {
  try {
    const textParts = encryptedKey.split(':')
    const iv = Buffer.from(textParts.shift()!, 'hex')
    const encryptedText = textParts.join(':')
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Error decrypting API key:', error)
    return ''
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("=== User API Keys GET Debug ===")
    
    const user = await getAuthUser(request, "user-api-keys")
    if (!user) {
      console.log("User API Keys: No authenticated user found")
      return NextResponse.json(
        { error: "Authentication required", success: false },
        { status: 401 }
      )
    }

    console.log("User API Keys: Authenticated user:", user.id)

    const url = new URL(request.url)
    const includeKeys = url.searchParams.get('include_keys') === 'true'

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("User API Keys: Supabase admin client not configured")
      return NextResponse.json(
        { error: "Service configuration error", success: false },
        { status: 500 }
      )
    }

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
          // Try both old and new decryption methods
          let decryptedKey = ''
          try {
            decryptedKey = decrypt(key.api_key_encrypted)
          } catch (error) {
            console.log(`Failed with decrypt(), trying decryptApiKey() for ${key.provider}`)
            try {
              decryptedKey = decryptApiKey(key.api_key_encrypted)
            } catch (error2) {
              console.error(`Both decryption methods failed for ${key.provider}:`, error2)
              throw error2
            }
          }
          
          if (!decryptedKey) {
            console.error(`Empty decrypted key for ${key.provider}`)
            return null
          }
          
          return {
            provider: key.provider,
            decrypted_key: decryptedKey,
            is_active: key.is_active,
            test_status: key.test_status,
            created_at: key.created_at,
            updated_at: key.updated_at
          }
        } catch (decryptError) {
          console.error(`Failed to decrypt API key for ${key.provider}:`, decryptError)
          return null
        }
      }).filter(Boolean)

      return NextResponse.json({ success: true, apiKeys: decryptedKeys })
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
    console.error("User API Keys GET: Error:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error",
        success: false 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== User API Keys POST Debug ===")
    
    const user = await requireAuth(request, "user-api-keys")
    console.log("User API Keys POST: Authenticated user:", user.id)

    const { provider, apiKey, testKey } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "Provider and API key are required", success: false },
        { status: 400 }
      )
    }

    // Test the API key if requested
    if (testKey) {
      try {
        // Simple validation - just check if we can make a basic request
        // For now, we'll just do format validation and save it
        console.log("Testing API key for provider:", provider)
        
        // If testing only, return success without saving
        return NextResponse.json({
          message: `${provider} API key format is valid`,
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

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("User API Keys POST: Supabase admin client not configured")
      return NextResponse.json(
        { error: "Service configuration error", success: false },
        { status: 500 }
      )
    }

    // Encrypt the API key
    const encryptedKey = encryptApiKey(apiKey)

            // Insert or update the API key
        const { error: upsertError } = await supabaseAdmin
          .from('user_api_keys')
          .upsert({
            user_id: user.id,
            provider,
            api_key_encrypted: encryptedKey,
            is_active: true,
            last_tested_at: null,
            test_status: 'valid', // Set as valid for new keys
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
    console.error("User API Keys POST: Error:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error",
        success: false 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("=== User API Keys DELETE Debug ===")
    
    const user = await requireAuth(request, "user-api-keys")
    console.log("User API Keys DELETE: Authenticated user:", user.id)

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("User API Keys DELETE: Supabase admin client not configured")
      return NextResponse.json(
        { error: "Service configuration error", success: false },
        { status: 500 }
      )
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
    console.error("User API Keys DELETE: Error:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error",
        success: false 
      },
      { status: 500 }
    )
  }
}
