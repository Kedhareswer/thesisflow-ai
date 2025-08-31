import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const start = Date.now();
  try {
    const sessionId = params.sessionId;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const include = (searchParams.get('include') || 'all').toLowerCase(); // 'all' | 'events' | 'results' | 'session'
    const eventsLimit = Math.min(parseInt(searchParams.get('eventsLimit') || '200'), 1000);
    const resultsLimit = Math.min(parseInt(searchParams.get('resultsLimit') || '200'), 2000);

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('search_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Authorization: if session has a user_id, it must match provided userId
    if (session.user_id) {
      if (!userId || session.user_id !== userId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    const response: any = { success: true, session };

    if (include === 'all' || include === 'events') {
      const { data: events } = await supabase
        .from('search_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(eventsLimit);
      response.events = events || [];
    }

    if (include === 'all' || include === 'results') {
      const { data: results } = await supabase
        .from('search_results')
        .select('*')
        .eq('session_id', sessionId)
        .order('order_index', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
        .limit(resultsLimit);
      response.results = results || [];
    }

    response.processingTime = Date.now() - start;
    return NextResponse.json(response, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
