import { NextRequest, NextResponse } from 'next/server'
import { TokenMiddleware } from '@/lib/middleware/token-middleware'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

// GET /api/planner/drafts?latest=1 -> returns latest draft for current user
// PUT /api/planner/drafts -> upserts current draft { plan }
export async function GET(request: NextRequest) {
  return TokenMiddleware.withTokens(request, { featureName: 'planner_drafts', requiredTokens: 0 }, async (userId) => {
    try {
      const admin = getSupabaseAdmin() as any
      const { searchParams } = new URL(request.url)
      const latest = searchParams.get('latest') === '1'

      const q = admin
        .from('planner_drafts')
        .select('id, plan, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      const { data, error } = await q.limit(latest ? 1 : 10)
      if (error) {
        if ((error as any)?.message?.toLowerCase?.().includes('relation') || (error as any)?.code === '42P01') {
          // Table does not exist
          return NextResponse.json({ error: 'planner_drafts table not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
        }
        return NextResponse.json({ error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
      }

      return NextResponse.json({ drafts: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
    }
  })
}

export async function PUT(request: NextRequest) {
  return TokenMiddleware.withTokens(request, { featureName: 'planner_drafts', requiredTokens: 0 }, async (userId) => {
    try {
      // Enforce payload size limit to prevent oversized JSON bodies
      const MAX_PAYLOAD_SIZE = 1_000_000; // 1MB limit
      
      // First check Content-Length header if present
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
      }
      
      // Read request text and validate size before parsing
      const requestText = await request.text();
      if (requestText.length > MAX_PAYLOAD_SIZE) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
      }
      
      // Parse JSON safely
      let body;
      try {
        body = JSON.parse(requestText);
      } catch (parseError) {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
      }
      
      const plan = body?.plan
      if (!plan || typeof plan !== 'object') {
        return NextResponse.json({ error: 'Invalid plan payload' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
      }

      const admin = getSupabaseAdmin() as any
      const { data, error } = await admin
        .from('planner_drafts')
        .upsert({ user_id: userId, plan, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        .select('id, updated_at')
        .single()

      if (error) {
        if ((error as any)?.message?.toLowerCase?.().includes('relation') || (error as any)?.code === '42P01') {
          // Table does not exist
          return NextResponse.json({ error: 'planner_drafts table not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
        }
        return NextResponse.json({ error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
      }

      return NextResponse.json({ ok: true, id: data?.id, updated_at: data?.updated_at }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
    }
  })
}
