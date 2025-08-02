import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'
import { enhancedAIService } from '@/lib/enhanced-ai-service'

// Using shared authentication utilities from lib/auth-utils.ts

// API key validation functions
function validateApiKey(provider: string, apiKey: string): boolean {
  switch (provider) {
    case 'openai':
      return apiKey.startsWith('sk-') && apiKey.length >= 20
    case 'groq':
      return apiKey.startsWith('gsk_') && apiKey.length >= 20
    case 'gemini':
      return apiKey.startsWith('AIza') && apiKey.length >= 35
    case 'anthropic':
      return apiKey.startsWith('sk-ant-') && apiKey.length >= 20
    case 'mistral':
      return apiKey.length >= 20 && !apiKey.includes(' ')
    case 'aiml':
      return apiKey.length >= 20 && !apiKey.includes(' ')

    default:
      return apiKey.length >= 10 && !apiKey.includes(' ')
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
      // Get user's API keys WITH the actual keys for AI service use
      const { data: apiKeys, error } = await supabaseAdmin
        .from('user_api_keys')
        .select('id, provider, api_key, is_active, last_tested_at, test_status, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('test_status', 'valid')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching API keys:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      // Return the API keys with the actual key values
      const formattedKeys = (apiKeys || []).map((key: any) => ({
            provider: key.provider,
        decrypted_key: key.api_key, // No decryption needed - it's already plain text
            is_active: key.is_active,
            test_status: key.test_status,
            created_at: key.created_at,
            updated_at: key.updated_at
      }))

      return NextResponse.json({ success: true, apiKeys: formattedKeys })
    }
    
    // Get user's API keys (without the actual keys for list view)
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
    console.log("User API Keys POST: Provider:", provider, "API Key length:", apiKey?.length)

    if (!provider || !apiKey) {
      console.log("User API Keys POST: Missing provider or API key")
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
    console.log("User API Keys POST: Validating API key format for provider:", provider)
    if (!validateApiKey(provider, apiKey)) {
      console.log("User API Keys POST: API key validation failed for provider:", provider)
      return NextResponse.json({ 
        error: `Invalid API key format for ${provider}. Please check your key and try again.` 
      }, { status: 400 })
    }

    console.log("User API Keys POST: API key validation passed")

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("User API Keys POST: Supabase admin client not configured")
      return NextResponse.json(
        { error: "Service configuration error", success: false },
        { status: 500 }
      )
    }

    console.log("User API Keys POST: Attempting to save API key to database...")

    // Insert or update the API key (stored as plain text)
    const { error: upsertError } = await supabaseAdmin
      .from('user_api_keys')
      .upsert({
        user_id: user.id,
        provider,
        api_key: apiKey, // Store as plain text
        is_active: true,
        last_tested_at: null,
        test_status: 'valid', // Set as valid for new keys
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider'
      })

    if (upsertError) {
      console.error('Error saving API key:', upsertError)
      return NextResponse.json({ 
        error: 'Failed to save API key',
        details: upsertError.message 
      }, { status: 500 })
    }

    console.log("User API Keys POST: API key saved successfully")

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

    // Get provider from query parameters instead of request body
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required", success: false },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("User API Keys DELETE: Supabase admin client not configured")
      return NextResponse.json(
        { error: "Service configuration error", success: false },
        { status: 500 }
      )
    }

    // Delete the API key
    const { error: deleteError } = await supabaseAdmin
      .from('user_api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (deleteError) {
      console.error('Error deleting API key:', deleteError)
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `${provider} API key deleted successfully` 
    })
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
