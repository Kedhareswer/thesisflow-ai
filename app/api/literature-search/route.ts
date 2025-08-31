import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LiteratureSearchService } from '@/lib/services/literature-search.service';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize literature search service
const literatureSearch = new LiteratureSearchService(supabase);

interface RateLimitResult {
  allowed: boolean;
  current_count: number;
  reset_time: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const aggregateWindowMsRaw = searchParams.get('aggregateWindowMs');
    const aggregateWindowMs = aggregateWindowMsRaw ? Math.max(0, parseInt(aggregateWindowMsRaw)) : 0;
    const userId = searchParams.get('userId'); // Optional for authenticated requests
    const mode = (searchParams.get('mode') || '').toLowerCase(); // forward | backward
    const seed = searchParams.get('seed') || '';

    // Validate inputs: allow citation mode without query if seed is provided
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

    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Cache-first: serve DB cache before applying rate limits for standard searches
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
          const rateLimitResult = await checkRateLimit(userId, clientIP);
          const response = {
            ...cached,
            cached: true,
            rateLimitInfo: {
              limit: 100,
              remaining: Math.max(0, 100 - rateLimitResult.current_count),
              resetTime: rateLimitResult.reset_time
            },
            processingTime: Date.now() - startTime
          };

          return NextResponse.json(response, {
            status: 200,
            headers: {
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': Math.max(0, 100 - rateLimitResult.current_count).toString(),
              'X-RateLimit-Reset': new Date(rateLimitResult.reset_time).getTime().toString(),
              'Cache-Control': 'public, max-age=3600'
            }
          });
        }
      } catch (e) {
        // If cache lookup fails, continue to normal flow
        console.warn('Cache lookup failed, proceeding without cache:', e);
      }
    }
    
    // Check rate limits (100 requests per hour per user/IP) after cache-first
    const rateLimitResult = await checkRateLimit(userId, clientIP);
    if (!rateLimitResult.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((new Date(rateLimitResult.reset_time).getTime() - Date.now()) / 1000));
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        papers: [],
        rateLimitInfo: {
          limit: 100,
          remaining: 0,
          resetTime: rateLimitResult.reset_time
        }
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimitResult.reset_time).getTime().toString(),
          'Retry-After': retryAfterSec.toString()
        }
      });
    }

    // Perform search (standard or citation)
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
    if (userId) {
      await trackUsage(userId, isCitationMode ? `${mode}:${seed}` : (query as string), result);
    }

    // Add rate limit info to response
    const response = {
      ...result,
      rateLimitInfo: {
        limit: 100,
        remaining: Math.max(0, 100 - rateLimitResult.current_count),
        resetTime: rateLimitResult.reset_time
      },
      processingTime: Date.now() - startTime
    };

    return NextResponse.json(response, { 
      status: result.success ? 200 : 500,
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': Math.max(0, 100 - rateLimitResult.current_count).toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.reset_time).getTime().toString(),
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 10, userId, mode: rawMode, seed = '', aggregateWindowMs: bodyAggregateWindowMs } = body;
    const aggregateWindowMs = bodyAggregateWindowMs ? Math.max(0, parseInt(String(bodyAggregateWindowMs))) : 0;
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

    const clientIP = getClientIP(request);
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
          const rateLimitResult = await checkRateLimit(userId, clientIP);
          return NextResponse.json({
            ...cached,
            cached: true,
            rateLimitInfo: {
              limit: 100,
              remaining: Math.max(0, 100 - rateLimitResult.current_count),
              resetTime: rateLimitResult.reset_time
            }
          }, {
            status: 200,
            headers: {
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': Math.max(0, 100 - rateLimitResult.current_count).toString(),
              'X-RateLimit-Reset': new Date(rateLimitResult.reset_time).getTime().toString(),
              'Cache-Control': 'public, max-age=3600'
            }
          });
        }
      } catch (e) {
        console.warn('Cache lookup (POST) failed, proceeding without cache:', e);
      }
    }

    // Check rate limits
    const rateLimitResult = await checkRateLimit(userId, clientIP);
    if (!rateLimitResult.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((new Date(rateLimitResult.reset_time).getTime() - Date.now()) / 1000));
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded',
        papers: [],
        rateLimitInfo: {
          limit: 100,
          remaining: 0,
          resetTime: rateLimitResult.reset_time
        }
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimitResult.reset_time).getTime().toString(),
          'Retry-After': retryAfterSec.toString()
        }
      });
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
    if (userId) {
      await trackUsage(userId, isCitationMode ? `${mode}:${seed}` : query, result);
    }

    return NextResponse.json({
      ...result,
      rateLimitInfo: {
        limit: 100,
        remaining: Math.max(0, 100 - rateLimitResult.current_count),
        resetTime: rateLimitResult.reset_time
      }
    });

  } catch (error) {
    console.error('Literature search POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      papers: []
    }, { status: 500 });
  }
}

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
