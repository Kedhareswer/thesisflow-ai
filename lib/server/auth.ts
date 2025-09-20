import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-only Supabase admin client: validate required env vars and avoid persisting sessions
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Server auth missing env: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export type RequireAuthSuccess = { user: { id: string; [k: string]: any }; token: string | null }
export type RequireAuthError = { error: NextResponse }
export type RequireAuthResult = RequireAuthSuccess | RequireAuthError

export async function requireAuth(request: NextRequest): Promise<RequireAuthResult> {
  try {
    // 1) Authorization: Bearer <token>
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && user) return { user, token }
    }

    // 2) Supabase cookies (e.g., sb-access-token) - HttpOnly server-side session
    const cookieToken = request.cookies.get('sb-access-token')?.value
      || request.cookies.get('supabase-auth-token')?.value
    if (cookieToken) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(cookieToken)
      if (!error && user) return { user, token: cookieToken }
    }

    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  } catch (err) {
    console.error('[auth] requireAuth error', err)
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
}
