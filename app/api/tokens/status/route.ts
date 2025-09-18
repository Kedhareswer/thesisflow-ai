import { NextRequest, NextResponse } from 'next/server';
import { tokenService } from '@/lib/services/token.service';
import { requireAuth } from '@/lib/server/auth';

// Get current user's token status (read-only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const tokenStatus = await tokenService.getUserTokenStatus(user.id);
    if (!tokenStatus) {
      const res = NextResponse.json({ success: false, error: 'Token status unavailable' }, { status: 404 });
      res.headers.set('Cache-Control', 'no-store, max-age=0');
      return res;
    }

    const res = NextResponse.json({ success: true, data: tokenStatus });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error) {
    console.error('Token status API error:', error);
    const res = NextResponse.json({ success: false, error: 'Failed to get token status' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  }
}
