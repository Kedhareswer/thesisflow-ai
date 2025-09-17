import { NextRequest, NextResponse } from 'next/server';
import { tokenService } from '@/lib/services/token.service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get current user's token status
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');
    
    let user = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
      if (!error) user = authUser;
    } else if (cookieHeader) {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (!error) user = authUser;
    }

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get token status
    const tokenStatus = await tokenService.getUserTokenStatus(user.id);
    
    if (!tokenStatus) {
      // Initialize tokens if they don't exist
      await tokenService.initializeUserTokens(user.id);
      const newTokenStatus = await tokenService.getUserTokenStatus(user.id);
      return NextResponse.json({
        success: true,
        data: newTokenStatus || {
          dailyUsed: 0,
          monthlyUsed: 0,
          dailyLimit: 10,
          monthlyLimit: 50,
          dailyRemaining: 10,
          monthlyRemaining: 50
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: tokenStatus
    });

  } catch (error) {
    console.error('Token status API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get token status'
    }, { status: 500 });
  }
}
