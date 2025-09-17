import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LiteratureSearchService } from '@/lib/services/literature-search.service';
import { withTokenValidation } from '@/lib/middleware/token-middleware';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize literature search service
const literatureSearch = new LiteratureSearchService(supabase);

// Maximum allowed aggregation window to prevent integer overflow and overly heavy queries.
// Clamp user-provided values to this range; if out-of-range or invalid, fall back to 0.
// Currently set to 24 hours in milliseconds.
const MAX_AGGREGATE_WINDOW_MS = 24 * 60 * 60 * 1000;

interface RateLimitResult {
  allowed: boolean;
  current_count: number;
  reset_time: string;
}

// Use token-based middleware for GET
export const GET = withTokenValidation(
  'literature_search',
  async (userId: string, request: NextRequest) => {
    const startTime = Date.now();
    
    try {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get('query');
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
      const aggregateWindowMsRaw = searchParams.get('aggregateWindowMs');
      let aggregateWindowMs = 0;
      if (aggregateWindowMsRaw !== null) {
        const rawNum = Number(aggregateWindowMsRaw);
        if (Number.isFinite(rawNum)) {
          const intVal = Math.trunc(rawNum);
          const clamped = Math.min(MAX_AGGREGATE_WINDOW_MS, Math.max(0, intVal));
          aggregateWindowMs = intVal === clamped ? clamped : 0;
        } else {
          aggregateWindowMs = 0;
        }
      }
      const mode = (searchParams.get('mode') || '').toLowerCase();
      const seed = searchParams.get('seed') || '';

      // Validate inputs
      const isCitationMode = mode === 'forward' || mode === 'backward';
      if (!isCitationMode && (!query || query.trim().length < 3)) {
        return NextResponse.json({
          success: false,
          error: 'Query must be at least 3 characters long',
          papers: []
        }, { status: 400 });
      }
      if (isCitationMode && !seed) {
        return NextResponse.json({
          success: false,
          error: 'Citation search requires a seed (DOI, title, or OpenAlex ID)',
          papers: []
        }, { status: 400 });
      }

      // Check cache first for standard searches
      if (!isCitationMode && (!aggregateWindowMs || aggregateWindowMs <= 0)) {
        const cacheKey = `${query!.trim().toLowerCase()}_${limit}`;
        try {
          const { data } = await supabase
            .from('literature_cache')
            .select('result, expires_at')
            .eq('query_key', cacheKey)
            .gt('expires_at', new Date().toISOString())
            .single();

          if (data?.result) {
            const cached: any = JSON.parse(data.result);
            return NextResponse.json({
              ...cached,
              cached: true,
              processingTime: Date.now() - startTime
            }, {
              status: 200,
              headers: {
                'Cache-Control': 'public, max-age=3600'
              }
            });
          }
        } catch (e) {
          console.warn('Cache lookup failed, proceeding without cache:', e);
        }
      }

      // Perform search
      let result: any;
      if (isCitationMode) {
        const papers = mode === 'forward'
          ? await literatureSearch.searchOpenAlexCitationsForward(seed, limit)
          : await literatureSearch.searchOpenAlexCitationsBackward(seed, limit);
        result = {
          success: true,
          papers,
          source: mode === 'forward' ? 'openalex-forward' : 'openalex-backward',
          count: papers.length,
          searchTime: Date.now() - startTime
        };
      } else {
        if (aggregateWindowMs && aggregateWindowMs > 0) {
          result = await literatureSearch.aggregatePapers(query!.trim(), limit, aggregateWindowMs);
        } else {
          result = await literatureSearch.searchPapers(query!.trim(), limit);
        }
      }

      // Track usage
      await trackUsage(userId, isCitationMode ? `${mode}:${seed}` : (query as string), result);

      return NextResponse.json({
        ...result,
        processingTime: Date.now() - startTime
      }, { 
        status: result.success ? 200 : 500,
        headers: {
          'Cache-Control': result.cached ? 'public, max-age=3600' : 'public, max-age=300'
        }
      });

    } catch (error) {
      console.error('Literature search API error:', error);
      
      return NextResponse.json({
        success: false,
        error: 'Internal server error',
        papers: [],
        processingTime: Date.now() - startTime
      }, { status: 500 });
    }
  },
  {
    context: { per_result: 0.1 } // Dynamic pricing based on results
  }
);

// Use token-based middleware for POST
export const POST = withTokenValidation(
  'literature_search',
  async (userId: string, request: NextRequest) => {
    try {
      const body = await request.json();
      const { query, limit = 10, mode: rawMode, seed = '', aggregateWindowMs: bodyAggregateWindowMs } = body;
      let aggregateWindowMs = 0;
      if (bodyAggregateWindowMs !== undefined && bodyAggregateWindowMs !== null) {
        const rawNum = Number(bodyAggregateWindowMs);
        if (Number.isFinite(rawNum)) {
          const intVal = Math.trunc(rawNum);
          const clamped = Math.min(MAX_AGGREGATE_WINDOW_MS, Math.max(0, intVal));
          aggregateWindowMs = intVal === clamped ? clamped : 0;
        } else {
          aggregateWindowMs = 0;
        }
      }
      const mode: string = (rawMode || '').toLowerCase();
      const isCitationMode = mode === 'forward' || mode === 'backward';

      // Validate input
      if (!isCitationMode && (!query || typeof query !== 'string' || query.trim().length < 3)) {
        return NextResponse.json({
          success: false,
          error: 'Valid query is required (minimum 3 characters)',
          papers: []
        }, { status: 400 });
      }
      if (isCitationMode && !seed) {
        return NextResponse.json({
          success: false,
          error: 'Citation search requires a seed (DOI, title, or OpenAlex ID)',
          papers: []
        }, { status: 400 });
      }

      const normalizedLimit = Math.min(limit, 50);

      // Cache-first for standard searches in POST as well
      if (!isCitationMode && (!aggregateWindowMs || aggregateWindowMs <= 0)) {
        const cacheKey = `${String(query).trim().toLowerCase()}_${normalizedLimit}`;
        try {
          const { data } = await supabase
            .from('literature_cache')
            .select('result, expires_at')
            .eq('query_key', cacheKey)
            .gt('expires_at', new Date().toISOString())
            .single();

          if (data?.result) {
            const cached: any = JSON.parse(data.result);
            return NextResponse.json({
              ...cached,
              cached: true
            }, {
              status: 200,
              headers: {
                'Cache-Control': 'public, max-age=3600'
              }
            });
          }
        } catch (e) {
          console.warn('Cache lookup (POST) failed, proceeding without cache:', e);
        }
      }

      // Perform search
      let result: any;
      if (isCitationMode) {
        const papers = mode === 'forward'
          ? await literatureSearch.searchOpenAlexCitationsForward(seed, Math.min(limit, 50))
          : await literatureSearch.searchOpenAlexCitationsBackward(seed, Math.min(limit, 50));
        result = {
          success: true,
          papers,
          source: mode === 'forward' ? 'openalex-forward' : 'openalex-backward',
          count: papers.length,
          searchTime: 0
        };
      } else {
        if (aggregateWindowMs && aggregateWindowMs > 0) {
          result = await literatureSearch.aggregatePapers(query.trim(), Math.min(limit, 50), aggregateWindowMs);
        } else {
          result = await literatureSearch.searchPapers(query.trim(), Math.min(limit, 50));
        }
      }

      // Track usage
      await trackUsage(userId, isCitationMode ? `${mode}:${seed}` : query, result);

      return NextResponse.json(result);

    } catch (error) {
      console.error('Literature search POST error:', error);
      return NextResponse.json({
        success: false,
        error: 'Internal server error',
        papers: []
      }, { status: 500 });
    }
  },
  {
    context: { per_result: 0.1 }
  }
);

// Utility functions

function getClientIP(request: NextRequest): string {
  // Try various headers to get the real client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return '127.0.0.1'; // Fallback
}

async function checkRateLimit(userId: string | null, ipAddress: string): Promise<RateLimitResult> {
  try {
    // Use user ID if available, otherwise use IP address
    const identifier = userId || ipAddress;
    
    const { data, error } = await supabase.rpc('check_literature_search_rate_limit', {
      p_user_id: userId ? userId : null,
      p_ip_address: ipAddress,
      p_limit: 100,
      p_window_minutes: 60
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Allow request if rate limit check fails
      return {
        allowed: true,
        current_count: 0,
        reset_time: new Date(Date.now() + 3600000).toISOString()
      };
    }

    return data[0] || {
      allowed: true,
      current_count: 0,
      reset_time: new Date(Date.now() + 3600000).toISOString()
    };

  } catch (error) {
    console.error('Rate limit error:', error);
    // Allow request if rate limit check fails
    return {
      allowed: true,
      current_count: 0,
      reset_time: new Date(Date.now() + 3600000).toISOString()
    };
  }
}

async function trackUsage(userId: string, query: string, result: any): Promise<void> {
  try {
    await supabase
      .from('literature_search_usage')
      .insert({
        user_id: userId,
        query: query.substring(0, 500), // Limit query length
        source: result.source || 'unknown',
        results_count: result.count || 0,
        search_time_ms: result.searchTime || 0,
        cached: result.cached || false
      });
  } catch (error) {
    console.error('Usage tracking error:', error);
    // Don't fail the request if usage tracking fails
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json'
    }
  });
}
