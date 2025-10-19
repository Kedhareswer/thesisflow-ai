import { NextRequest, NextResponse } from 'next/server';
import { tokenAnalytics } from '@/lib/services/token-analytics.service';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const suggestions = await tokenAnalytics.getCostOptimizations(user.id);

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('Error getting cost optimizations:', error);
    return NextResponse.json(
      { error: 'Failed to get cost optimizations' },
      { status: 500 }
    );
  }
}
