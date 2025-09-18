import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth'
import { tokenService } from '@/lib/services/token.service'

// Read-only token status. No mutation here.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if ('error' in auth) return auth.error
    const { user } = auth

    const status = await tokenService.getUserTokenStatus(user.id)
    if (!status) {
      return NextResponse.json({ error: 'Token status unavailable' }, { status: 404 })
    }

    const res = NextResponse.json({
      ...status,
    })
    res.headers.set('Cache-Control', 'no-store, max-age=0')
    return res
  } catch (error) {
    console.error('[user/tokens] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
