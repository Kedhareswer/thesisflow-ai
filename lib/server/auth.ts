import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
        if (!error && user) return { user, token }
        console.warn('[auth] Bearer token validation failed:', error?.message)
      } catch (bearerError) {
        console.warn('[auth] Bearer auth error:', bearerError)
      }
    }

    // 2) Query string: ?access_token=... or ?token=...
    const url = new URL(request.url)
    const qsToken = url.searchParams.get('access_token') || url.searchParams.get('token')
    if (qsToken) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(qsToken)
        if (!error && user) return { user, token: qsToken }
        console.warn('[auth] Query string token validation failed:', error?.message)
      } catch (qsError) {
        console.warn('[auth] Query string auth error:', qsError)
      }
    }

    // 3) Supabase cookies (e.g., sb-access-token)
    const cookieToken = request.cookies.get('sb-access-token')?.value
      || request.cookies.get('supabase-auth-token')?.value
    if (cookieToken) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(cookieToken)
        if (!error && user) return { user, token: cookieToken }
        console.warn('[auth] Cookie token validation failed:', error?.message)
      } catch (cookieError) {
        console.warn('[auth] Cookie auth error:', cookieError)
      }
    }

    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  } catch (err) {
    console.error('[auth] requireAuth error', err)
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
}
