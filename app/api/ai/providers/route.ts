import { NextResponse } from "next/server"
import { AIProviderDetector } from "@/lib/ai-provider-detector"
import { getAuthUser, createSupabaseAdmin } from '@/lib/auth-utils'
import crypto from 'crypto'

// Using shared authentication utilities from lib/auth-utils.ts

// Get user API keys
async function getUserApiKeys(userId: string) {
  const supabaseAdmin = createSupabaseAdmin()
  if (!supabaseAdmin) {
    return []
  }

  const { data: apiKeys, error } = await supabaseAdmin
    .from('user_api_keys')
    .select('provider, is_active, test_status')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('test_status', 'valid')

  if (error) {
    console.error('Error fetching user API keys:', error)
    return []
  }

  return apiKeys?.map(key => key.provider) || []
}

export async function GET(request: Request) {
  try {
    console.log("=== AI Providers API Debug ===")
    
    // Get environment-based providers
    const envProviders = AIProviderDetector.getFallbackProviders()
    const envBestProvider = AIProviderDetector.getBestProvider()
    const providerStatus = AIProviderDetector.getProviderStatus()

    console.log("Environment Providers:", envProviders)
    
    // Debug: Check headers and cookies
    console.log("Request headers:")
    const authHeader = request.headers.get('Authorization')
    console.log("- Authorization header:", authHeader ? "Present" : "Missing")
    
    const cookieHeader = request.headers.get('cookie')
    console.log("- Cookie header:", cookieHeader ? "Present (length: " + cookieHeader.length + ")" : "Missing")
    
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)
      
      console.log("- Available cookies:", Object.keys(cookies))
      
      // Check for Supabase auth cookies
      const authCookies = Object.keys(cookies).filter(key => 
        key.includes('supabase') || key.includes('sb-') || key.includes('auth')
      )
      console.log("- Auth-related cookies:", authCookies)
    }

    // Try to get user-based providers
    let userProviders: string[] = []
    let userError: string | null = null
    
    try {
      const user = await getAuthUser(request, "providers")
      console.log("User authentication result:", user ? `Success (ID: ${user.id})` : "Failed")
      
      if (user) {
        userProviders = await getUserApiKeys(user.id)
        console.log("User API keys found:", userProviders)
      } else {
        userError = "No authenticated user found"
      }
    } catch (error) {
      userError = error instanceof Error ? error.message : "Unknown auth error"
      console.error("User authentication error:", userError)
    }

    // Combine both sources (user providers take priority)
    const allProviders = [...new Set([...userProviders, ...envProviders])]
    const bestProvider = userProviders.length > 0 ? userProviders[0] : envBestProvider

    console.log("Final result:")
    console.log("- User Providers:", userProviders)
    console.log("- Environment Providers:", envProviders)
    console.log("- Combined Providers:", allProviders)
    console.log("- Best Provider:", bestProvider)
    console.log("- User Error:", userError)
    console.log("=== End Debug ===")

    return NextResponse.json({
      success: true,
      availableProviders: allProviders,
      bestProvider,
      providerStatus,
      totalAvailable: allProviders.length,
      userProviders,
      envProviders,
      debug: {
        userError,
        hasAuthHeader: !!authHeader,
        hasCookieHeader: !!cookieHeader,
        cookieCount: cookieHeader ? cookieHeader.split(';').length : 0
      }
    })
  } catch (error) {
    console.error("Error checking AI provider availability:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check provider availability",
        availableProviders: [],
        bestProvider: null,
        debug: {
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        }
      },
      { status: 500 }
    )
  }
}
