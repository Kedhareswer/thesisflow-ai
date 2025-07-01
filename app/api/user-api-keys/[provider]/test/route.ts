import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enhancedAIService } from '@/lib/enhanced-ai-service'
import crypto from 'crypto'

// Create Supabase admin client
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

// Decryption function
function decrypt(text: string): string {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-secret-key-here-123456'
  const ALGORITHM = 'aes-256-cbc'
  
  const textParts = text.split(':')
  const iv = Buffer.from(textParts.shift()!, 'hex')
  const encryptedText = textParts.join(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider

    // Get auth token
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    // Get the encrypted API key
    const { data: apiKeyData, error: dbError } = await supabaseAdmin
      .from('user_api_keys')
      .select('api_key_encrypted')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single()

    if (dbError || !apiKeyData) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Decrypt the API key
    const apiKey = decrypt(apiKeyData.api_key_encrypted)

    // Test the API key
    const testResult = await enhancedAIService.testApiKey(provider, apiKey)
    if (!testResult.valid) {
      throw new Error(testResult.error || 'API key validation failed')
    }

    // Update the test status
    await supabaseAdmin
      .from('user_api_keys')
      .update({
        test_status: 'valid',
        last_tested_at: new Date().toISOString(),
        test_model: testResult.model
      })
      .eq('user_id', user.id)
      .eq('provider', provider)

    return NextResponse.json({
      message: `Successfully tested ${provider} API key`,
      model: testResult.model,
      provider
    })
  } catch (error) {
    console.error('API key test error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 400 })
  }
} 