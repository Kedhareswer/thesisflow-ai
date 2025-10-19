import { NextRequest, NextResponse } from 'next/server';
import { tokenAnalytics } from '@/lib/services/token-analytics.service';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Get user from auth
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

    // Get usage pattern
    const pattern = await tokenAnalytics.analyzeUsagePattern(user.id);

    if (!pattern) {
      return NextResponse.json(
        { error: 'No usage data available' },
        { status: 404 }
      );
    }

    // Get trend data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: transactions } = await supabase
      .from('token_transactions')
      .select('tokens_amount, created_at')
      .eq('user_id', user.id)
      .eq('operation_type', 'deduct')
      .eq('success', true)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Get user's limit
    const { data: planData } = await supabase
      .from('user_plans')
      .select('monthly_token_limit')
      .eq('user_id', user.id)
      .single();

    const limit = planData?.monthly_token_limit || 50;

    // Aggregate by day
    const dailyUsage = new Map<string, number>();
    transactions?.forEach(tx => {
      const day = new Date(tx.created_at).toISOString().split('T')[0];
      dailyUsage.set(day, (dailyUsage.get(day) || 0) + tx.tokens_amount);
    });

    // Generate trend data for all days in range
    const trendData = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      trendData.push({
        date: dateStr,
        tokens: dailyUsage.get(dateStr) || 0,
        limit,
      });
    }

    // Add predictions for next 7 days
    const prediction = await tokenAnalytics.predictUsage(user.id);
    if (prediction) {
      const avgDaily = pattern.averageDaily;
      for (let i = 1; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        trendData.push({
          date: dateStr,
          tokens: 0,
          predicted: Math.round(avgDaily),
          limit,
        });
      }
    }

    return NextResponse.json({
      trendData,
      pattern,
    });

  } catch (error) {
    console.error('Error fetching usage trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage trends' },
      { status: 500 }
    );
  }
}
