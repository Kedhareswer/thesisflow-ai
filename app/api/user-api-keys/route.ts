import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { enhancedAIService } from '@/lib/enhanced-ai-service'

// Get auth token from request headers or cookies
async function getAuthUser(request: NextRequest) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured')
  }

  // Try to get token from Authorization header first
  let authToken = request.headers.get('Authorization')?.replace('Bearer ', '')
  
  // If not in header, try to get from cookies
  if (!authToken) {
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      // Parse common Supabase cookie names
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)
      
      authToken = cookies['sb-access-token'] || 
                  cookies['supabase-auth-token'] || 
                  cookies['sb-auth-token']
    }
  }

  if (!authToken) {
    throw new Error('No authentication token found')
  }

  // Verify token with admin client
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authToken)
  
  if (error || !user) {
    throw new Error('Invalid authentication token')
  }

  return user
}

// Create Supabase admin client for server-side operations
const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Supabase admin client not configured')
    return null
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

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
    gemini: /^[a-zA-Z0-9_-]{35,}$/,
    aiml: /^[a-zA-Z0-9_-]{32,}$/,
    deepinfra: /^[a-zA-Z0-9_-]{20,}$/,
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
      user = await getAuthUser(request)
    } catch (authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

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
      user = await getAuthUser(request)
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
      user = await getAuthUser(request)
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
