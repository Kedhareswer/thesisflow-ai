import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LiteratureSearchService } from '@/lib/services/literature-search.service';
import { requireAuth } from '@/lib/server/auth';

// Ensure Node.js runtime for service-role usage and stable SSE behavior
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Lazy initialization to avoid build-time env var issues
let supabase: ReturnType<typeof createClient> | null = null;
let literatureSearch: LiteratureSearchService | null = null;

function getServices(): { supabase: ReturnType<typeof createClient>; literatureSearch: LiteratureSearchService } {
  if (supabase && literatureSearch) {
    return { supabase, literatureSearch } as { supabase: ReturnType<typeof createClient>; literatureSearch: LiteratureSearchService };
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  
  supabase = createClient(url, key);
  literatureSearch = new LiteratureSearchService(supabase);
  
  return { supabase: supabase!, literatureSearch: literatureSearch! };
}

interface RateLimitResult {
  allowed: boolean;
  current_count: number;
  reset_time: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim() || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  // Authenticate the user (supports Authorization header, access_token query, or cookies)
  const auth = await requireAuth(request);
  if ('error' in auth) {
    return auth.error; // 401 Unauthorized
  }
  const userId = auth.user.id as string;
  const mode = (searchParams.get('mode') || '').toLowerCase(); // "forward" | "backward" | ""
  const seed = searchParams.get('seed')?.trim() || '';
  const sessionId = (searchParams.get('sessionId')?.trim()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const isCitation = mode === 'forward' || mode === 'backward';
  if (!isCitation && query.length < 3) {
    return new Response('Query must be at least 3 characters', { status: 400 });
  }
  if (isCitation && (seed.length < 3 && query.length < 3)) {
    return new Response('Citation search requires seed or query', { status: 400 });
  }

  const clientIP = getClientIP(request);
  const rateLimit = await checkRateLimit(userId, clientIP);
  if (!rateLimit.allowed) {
    // Best-effort: record a rate-limit event for this session
    logSessionEvent(sessionId, 'rate_limited', {
      current_count: rateLimit.current_count,
      reset_time: rateLimit.reset_time,
      query,
      limit,
      mode: isCitation ? mode : 'search',
    }).catch(() => {});
    const retryAfterSec = Math.max(1, Math.ceil((new Date(rateLimit.reset_time).getTime() - Date.now()) / 1000));
    return new Response('Rate limit exceeded. Try later.', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rateLimit.reset_time).getTime().toString(),
        'Retry-After': retryAfterSec.toString(),
      },
    });
  }

  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let closed = false;
  let emitted = 0;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      // Initial event with meta
      const initPayload = {
        type: 'init',
        limit,
        rateLimit: {
          limit: 100,
          remaining: Math.max(0, 100 - rateLimit.current_count),
          resetTime: rateLimit.reset_time,
        },
        sessionId,
        mode: isCitation ? mode : 'search',
        query,
        seed,
      };
      controller.enqueue(encoder.encode(`event: init\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initPayload)}\n\n`));

      // Best-effort: ensure the session record exists and log init
      ensureSessionRecord(sessionId, userId, clientIP, {
        query,
        limit,
        mode: isCitation ? mode : 'search',
        seed,
      }).catch(() => {});
      logSessionEvent(sessionId, 'init', {
        limit,
        rateLimit: initPayload.rateLimit,
      }).catch(() => {});

      // Heartbeat to keep connection alive
      const interval = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ping\n`));
        controller.enqueue(encoder.encode(`data: {}\n\n`));
        // Touch session activity (best-effort)
        touchSession(sessionId).catch(() => {});
      }, 15000);

      // Handle client abort
      const abort = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
        // Record abort
        logSessionEvent(sessionId, 'aborted').catch(() => {});
      };
      request.signal.addEventListener('abort', abort);

      // Kick off streaming: normal multi-source or citation mode
      const run = async () => {
        const { literatureSearch } = getServices();
        if (isCitation) {
          const chosenSeed = seed || query;
          try {
            const papers = mode === 'forward'
              ? await literatureSearch.searchOpenAlexCitationsForward(chosenSeed, limit)
              : await literatureSearch.searchOpenAlexCitationsBackward(chosenSeed, limit);
            for (const p of papers) {
              if (closed) break;
              emitted += 1;
              controller.enqueue(encoder.encode(`event: paper\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(p)}\n\n`));
              // Persist result (best-effort, non-blocking)
              storeSearchResult(sessionId, p, emitted).catch(() => {});
            }
          } catch (err) {
            if (!closed) {
              controller.enqueue(encoder.encode(`event: error\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ source: 'citations', error: String(err) })}\n\n`));
              logSessionEvent(sessionId, 'error', { source: 'citations', error: String(err) }).catch(() => {});
            }
          }
        } else {
          await literatureSearch.streamPapers(
            query,
            limit,
            (paper: any) => {
              if (closed) return;
              emitted += 1;
              controller.enqueue(encoder.encode(`event: paper\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(paper)}\n\n`));
              // Persist result (best-effort)
              storeSearchResult(sessionId, paper, emitted).catch(() => {});
            },
            (source: string, error: string) => {
              if (closed) return;
              controller.enqueue(encoder.encode(`event: error\n`));
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ source, error })}\n\n`
                )
              );
              logSessionEvent(sessionId, 'error', { source, error }).catch(() => {});
            }
          );
        }
      };

      run()
        .then(() => {
          if (closed) return;
          const donePayload = {
            type: 'done',
            count: emitted,
            processingTime: Date.now() - startTime,
            mode: isCitation ? mode : 'search'
          };
          controller.enqueue(encoder.encode(`event: done\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(donePayload)}\n\n`));
          try { controller.close(); } catch {}
          closed = true;
          // Persist done + finalize session
          logSessionEvent(sessionId, 'done', donePayload).catch(() => {});
          completeSession(sessionId, emitted).catch(() => {});
          if (userId) {
            // Fire-and-forget usage tracking
            trackUsage(userId, query, {
              source: 'stream',
              count: emitted,
              searchTime: Date.now() - startTime,
              cached: false,
            }).catch(() => {});
          }
        })
        .catch((err) => {
          if (closed) return;
          controller.enqueue(encoder.encode(`event: error\n`));
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ source: 'stream', error: String(err) })}\n\n`
            )
          );
          try { controller.close(); } catch {}
          closed = true;
          logSessionEvent(sessionId, 'error', { source: 'stream', error: String(err) }).catch(() => {});
        });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': Math.max(0, 100 - rateLimit.current_count).toString(),
      'X-RateLimit-Reset': new Date(rateLimit.reset_time).getTime().toString(),
    },
  });
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  if (cfConnectingIP) return cfConnectingIP;
  return '127.0.0.1';
}

async function checkRateLimit(userId: string | null, ipAddress: string): Promise<RateLimitResult> {
  try {
    const { supabase } = getServices();
    const { data, error } = await supabase.rpc('check_literature_search_rate_limit', {
      p_user_id: userId ? userId : null,
      p_ip_address: ipAddress,
      p_limit: 100,
      p_window_minutes: 60,
    });
    if (error) throw error;
    return (data as any)?.[0] || {
      allowed: true,
      current_count: 0,
      reset_time: new Date(Date.now() + 3600000).toISOString(),
    };
  } catch (e) {
    // Soft-fail: allow request
    return {
      allowed: true,
      current_count: 0,
      reset_time: new Date(Date.now() + 3600000).toISOString(),
    };
  }
}

async function trackUsage(userId: string, query: string, result: any): Promise<void> {
  try {
    const { supabase } = getServices();
    await supabase
      .from('literature_search_usage')
      .insert({
        user_id: userId,
        query: query.substring(0, 500),
        source: result.source || 'stream',
        results_count: result.count || 0,
        search_time_ms: result.searchTime || 0,
        cached: result.cached || false,
      });
  } catch (error) {
    // Best-effort only
  }
}

// ---- Session persistence helpers (best-effort, non-blocking) ----

function stableKeyFromPaper(p: any): string {
  try {
    const doi = (p?.doi || '').toString().trim().toLowerCase();
    if (doi) return `doi:${doi}`;
    const id = (p?.id || '').toString().trim().toLowerCase();
    if (id) return `id:${id}`;
    const url = (p?.url || '').toString().trim().toLowerCase();
    if (url) return `url:${url}`;
    const title = (p?.title || '').toString().trim().toLowerCase();
    if (title) return `title:${title}`;
    return `hash:${Buffer.from(JSON.stringify(p || {})).toString('base64').slice(0, 32)}`;
  } catch {
    return `hash:${Math.random().toString(36).slice(2)}`;
  }
}

async function ensureSessionRecord(
  sessionId: string,
  userId: string | null,
  clientIP: string,
  details: { query: string; limit: number; mode: string; seed: string }
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const { supabase } = getServices();
    await supabase
      .from('search_sessions')
      .upsert({
        session_id: sessionId,
        user_id: userId || null,
        query: details.query,
        mode: details.mode,
        seed: details.seed || null,
        result_limit: details.limit,
        client_ip: clientIP,
        created_at: now,
        last_activity_at: now,
      });
  } catch {}
}

async function logSessionEvent(
  sessionId: string,
  type: string,
  data?: any
): Promise<void> {
  try {
    const { supabase } = getServices();
    await supabase
      .from('search_events')
      .insert({
        session_id: sessionId,
        event_type: type,
        data: data || null,
      });
    await touchSession(sessionId);
  } catch {}
}

async function storeSearchResult(sessionId: string, paper: any, orderIndex?: number): Promise<void> {
  try {
    const stableKey = stableKeyFromPaper(paper);
    const row = {
      session_id: sessionId,
      stable_key: stableKey,
      paper,
      source: paper?.source || null,
      order_index: typeof orderIndex === 'number' ? orderIndex : null,
    } as any;
    const { supabase } = getServices();
    await supabase
      .from('search_results')
      .upsert(row, { onConflict: 'session_id,stable_key' });
    await touchSession(sessionId);
  } catch {}
}

async function completeSession(sessionId: string, totalEmitted: number): Promise<void> {
  try {
    const now = new Date().toISOString();
    const { supabase } = getServices();
    await supabase
      .from('search_sessions')
      .update({
        last_activity_at: now,
        completed_at: now,
        total_results: totalEmitted,
      })
      .eq('session_id', sessionId);
  } catch {}
}

async function touchSession(sessionId: string): Promise<void> {
  try {
    const { supabase } = getServices();
    await supabase
      .from('search_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('session_id', sessionId);
  } catch {}
}

