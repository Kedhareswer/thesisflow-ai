import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enhancedAIService } from '@/lib/enhanced-ai-service'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params

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

    // Get the API key (plain text)
    const { data: apiKeyData, error: dbError } = await supabaseAdmin
      .from('user_api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single()

    if (dbError || !apiKeyData) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // API key is already in plain text
    const apiKey = apiKeyData.api_key

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
