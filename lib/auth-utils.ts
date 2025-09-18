import { requireAuth as requireAuthServer } from '@/lib/server/auth'
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

// Centralized auth: delegate to server-side requireAuth helper
export async function getAuthUser(request: Request, _source = 'api') {
  try {
    const result = await requireAuthServer(request as any)
    if ('error' in result) return null
    return result.user as any
  } catch (e) {
    return null
  }
}

// Require authentication (throws error if not authenticated)
export async function requireAuth(request: Request, _source = 'api') {
  const result = await requireAuthServer(request as any)
  if ('error' in result) {
    throw new Error('Authentication required')
  }
  return result.user as any
}
