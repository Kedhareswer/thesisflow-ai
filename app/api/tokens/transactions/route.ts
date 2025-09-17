import { NextRequest, NextResponse } from 'next/server';
import { tokenService } from '@/lib/services/token.service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get user's token transactions
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Get transactions
    const transactions = await tokenService.getTokenTransactions(user.id, limit, offset);

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        limit,
        offset,
        hasMore: transactions.length === limit
      }
    });

  } catch (error) {
    console.error('Token transactions API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get token transactions'
    }, { status: 500 });
  }
}
