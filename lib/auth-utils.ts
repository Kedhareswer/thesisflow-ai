import { createClient } from '@supabase/supabase-js'

// Create Supabase admin client for server-side operations
export const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Get auth token from request headers or cookies (comprehensive approach)
export async function getAuthUser(request: Request, source = "api") {
  const supabaseAdmin = createSupabaseAdmin()
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured')
  }

  console.log(`getAuthUser (${source}): Starting authentication...`)

  // Try to get token from Authorization header first
  let authToken = request.headers.get('Authorization')?.replace('Bearer ', '')
  console.log(`getAuthUser (${source}): Authorization header token:`, authToken ? "Present" : "Missing")
  
  // If not in header, check query param (SSE via EventSource cannot set headers)
  if (!authToken) {
    try {
      const url = new URL((request as any).url || '')
      const qp = url.searchParams.get('access_token')
      if (qp) {
        authToken = qp
        console.log(`getAuthUser (${source}): Found auth token in query param 'access_token'`)
      }
    } catch {
      // ignore URL parse errors
    }
  }
  
  // If not in header, try to get from cookies
  if (!authToken) {
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      console.log(`getAuthUser (${source}): Cookie header present, parsing...`)
      
      // Parse cookies
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        if (key && value) {
          acc[key] = decodeURIComponent(value)
        }
        return acc
      }, {} as Record<string, string>)
      
      console.log(`getAuthUser (${source}): Available cookies:`, Object.keys(cookies))
      
      // Look for Supabase auth tokens with the custom storage key
      // The client uses 'ai-research-platform-auth' as the storage key
      const possibleTokenKeys = [
        'ai-research-platform-auth.access_token',
        'ai-research-platform-auth-access-token', 
        'sb-ai-research-platform-auth-auth-token',
        'sb-access-token',
        'supabase-auth-token',
        'sb-auth-token'
      ]
      
      for (const key of possibleTokenKeys) {
        if (cookies[key]) {
          authToken = cookies[key]
          console.log(`getAuthUser (${source}): Found auth token in cookie:`, key)
          break
        }
      }
      
      // Try to parse from localStorage-style cookie values
      if (!authToken) {
        for (const [key, value] of Object.entries(cookies)) {
          if (key.includes('ai-research-platform-auth') || key.includes('supabase')) {
            try {
              const parsed = JSON.parse(value)
              if (parsed.access_token) {
                authToken = parsed.access_token
                console.log(`getAuthUser (${source}): Found auth token in parsed cookie:`, key)
                break
              }
            } catch (error) {
              // Not JSON, continue
            }
          }
        }
      }
    }
  }

  if (!authToken) {
    console.log(`getAuthUser (${source}): No authentication token found`)
    return null
  }

  console.log(`getAuthUser (${source}): Attempting to verify token...`)
  
  try {
    // Verify token with admin client
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(authToken)
    
    if (error) {
      console.error(`getAuthUser (${source}): Token verification failed:`, error.message)
      return null
    }
    
    if (!user) {
      console.log(`getAuthUser (${source}): No user found for token`)
      return null
    }

    console.log(`getAuthUser (${source}): Successfully authenticated user:`, user.id)
    return user
  } catch (error) {
    console.error(`getAuthUser (${source}): Error during authentication:`, error)
    return null
  }
}

// Require authentication (throws error if not authenticated)
export async function requireAuth(request: Request, source = "api") {
  const user = await getAuthUser(request, source)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}
