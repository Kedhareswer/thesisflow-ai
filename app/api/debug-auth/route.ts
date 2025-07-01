import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    console.log("DEBUG AUTH: Starting authentication check...")
    
    // Log all headers
    const headers = Object.fromEntries(request.headers.entries())
    console.log("DEBUG AUTH: Request headers:", {
      authorization: headers.authorization ? "Present" : "Missing",
      cookie: headers.cookie ? "Present" : "Missing",
      userAgent: headers['user-agent'],
    })
    
    // Log cookies in detail
    const cookieHeader = request.headers.get('cookie')
    let cookies: Record<string, string> = {}
    
    if (cookieHeader) {
      cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        if (key && value) {
          acc[key] = value.length > 50 ? `${value.substring(0, 50)}...` : value
        }
        return acc
      }, {} as Record<string, string>)
      
      console.log("DEBUG AUTH: Parsed cookies:", Object.keys(cookies))
      
      // Look for Supabase auth cookies
      const authCookies = Object.keys(cookies).filter(key => 
        key.includes('auth') || key.includes('supabase') || key.includes('ai-research-platform')
      )
      console.log("DEBUG AUTH: Auth-related cookies:", authCookies)
    }
    
    // Try to get authenticated user
    let user = null
    let authError = null
    
    try {
      user = await getAuthUser(request, "debug-auth")
    } catch (error) {
      authError = error instanceof Error ? error.message : String(error)
      console.error("DEBUG AUTH: Authentication failed:", authError)
    }
    
    const result = {
      timestamp: new Date().toISOString(),
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
      } : null,
      authError,
      headers: {
        hasAuthorization: !!headers.authorization,
        hasCookie: !!headers.cookie,
        cookieKeys: cookieHeader ? Object.keys(cookies) : [],
        authCookieKeys: cookieHeader ? Object.keys(cookies).filter(key => 
          key.includes('auth') || key.includes('supabase') || key.includes('ai-research-platform')
        ) : [],
      },
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    }
    
    console.log("DEBUG AUTH: Final result:", result)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("DEBUG AUTH: Unexpected error:", error)
    return NextResponse.json({
      error: "Debug authentication check failed",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
} 