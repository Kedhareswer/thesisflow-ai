import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LiteratureSearchService } from '@/lib/services/literature-search.service';

// Supabase client (service role for server-side ops like rate limiting + usage)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const literatureSearch = new LiteratureSearchService(supabase);

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
  const userId = searchParams.get('userId');
  const mode = (searchParams.get('mode') || '').toLowerCase(); // "forward" | "backward" | ""
  const seed = searchParams.get('seed')?.trim() || '';

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
    return new Response('Rate limit exceeded. Try later.', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rateLimit.reset_time).getTime().toString(),
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
      };
      controller.enqueue(encoder.encode(`event: init\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initPayload)}\n\n`));

      // Heartbeat to keep connection alive
      const interval = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ping\n`));
        controller.enqueue(encoder.encode(`data: {}\n\n`));
      }, 15000);

      // Handle client abort
      const abort = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      };
      request.signal.addEventListener('abort', abort);

      // Kick off streaming: normal multi-source or citation mode
      const run = async () => {
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
            }
          } catch (err) {
            if (!closed) {
              controller.enqueue(encoder.encode(`event: error\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ source: 'citations', error: String(err) })}\n\n`));
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
            },
            (source: string, error: string) => {
              if (closed) return;
              controller.enqueue(encoder.encode(`event: error\n`));
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ source, error })}\n\n`
                )
              );
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
    const { data, error } = await supabase.rpc('check_literature_search_rate_limit', {
      p_user_id: userId ? userId : null,
      p_ip_address: ipAddress,
      p_limit: 100,
      p_window_minutes: 60,
    });
    if (error) throw error;
    return data?.[0] || {
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
