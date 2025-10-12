import { NextRequest, NextResponse } from 'next/server'

// Sync Supabase session tokens into HttpOnly cookies so that middleware and
// server-side routes can recognize the authenticated session.
// This endpoint is called from the client on every auth state change
// (SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT) and after successful sign-in.

export async function POST(request: NextRequest) {
  try {
    const { event, session } = await request.json() as {
      event?: string
      session?: {
        access_token?: string
        refresh_token?: string
        expires_at?: number | null
        expires_in?: number | null
      } | null
    }

    const res = NextResponse.json({ ok: true })

    // Helper to clear our cookies
    const clearCookies = () => {
      const isProduction = process.env.NODE_ENV === 'production'
      res.cookies.set('sb-access-token', '', { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/', maxAge: 0 })
      res.cookies.set('sb-refresh-token', '', { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/', maxAge: 0 })
    }

    // If we have a session (SIGNED_IN or TOKEN_REFRESHED), set cookies
    if (session && session.access_token && session.refresh_token) {
      // Access token typically expires hourly; we still set a reasonable maxAge
      // because the cookie will be refreshed on TOKEN_REFRESHED.
      const accessMaxAge = 60 * 60 // 1 hour
      const refreshMaxAge = 60 * 60 * 24 * 7 // 7 days

      // Set secure cookies only in production, allow HTTP in development
      const isProduction = process.env.NODE_ENV === 'production'
      
      res.cookies.set('sb-access-token', session.access_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: accessMaxAge,
      })

      res.cookies.set('sb-refresh-token', session.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: refreshMaxAge,
      })

      return res
    }

    // On SIGNED_OUT or missing session, clear cookies
    if (!session || event === 'SIGNED_OUT') {
      clearCookies()
      return res
    }

    // Default: nothing to do, but return ok
    return res
  } catch (error) {
    console.error('[auth/sync] Failed to sync auth cookies:', error)
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
  }
}
