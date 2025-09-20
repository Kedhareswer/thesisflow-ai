import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy initialization of Supabase admin client to avoid build-time env var issues
let supabaseAdmin: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Server auth missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  supabaseAdmin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
  
  return supabaseAdmin
}

export type RequireAuthSuccess = { user: { id: string; [k: string]: any }; token: string | null }
export type RequireAuthError = { error: NextResponse }
export type RequireAuthResult = RequireAuthSuccess | RequireAuthError

export async function requireAuth(request: NextRequest): Promise<RequireAuthResult> {
  try {
    const admin = getSupabaseAdmin()
    
    // 1) Authorization: Bearer <token>
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user }, error } = await admin.auth.getUser(token)
      if (!error && user) return { user, token }
    }

    // 2) Supabase cookies (e.g., sb-access-token) - HttpOnly server-side session
    const cookieToken = request.cookies.get('sb-access-token')?.value
      || request.cookies.get('supabase-auth-token')?.value
    if (cookieToken) {
      const { data: { user }, error } = await admin.auth.getUser(cookieToken)
      if (!error && user) return { user, token: cookieToken }
    }

    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  } catch (err) {
    console.error('[auth] requireAuth error', err)
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
}
