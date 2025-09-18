import { useState, useCallback, useRef, useEffect } from 'react';

// Authentication helper function using Supabase session
const getAuthHeaders = async (): Promise<HeadersInit> => {
  if (typeof window === 'undefined') return new Headers({ 'Content-Type': 'application/json' });
  
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      return new Headers({ 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}` 
      });
    }
  } catch (error) {
    console.warn('Failed to get auth session:', error);
  }
  
  return new Headers({ 'Content-Type': 'application/json' });
};

// Get auth token for query parameters (EventSource)
const getAuthToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.warn('Failed to get auth token:', error);
    return null;
  }
};

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: string;
  journal: string;
  url: string;
  citations: number;
  source: string;
  doi?: string;
}

export interface SearchResult {
  success: boolean;
  papers: Paper[];
  source: string;
  count: number;
  cached?: boolean;
  searchTime: number;
  error?: string;
  rateLimitInfo?: {
    limit: number;
    remaining: number;
    resetTime: string;
  };
  processingTime?: number;
}

export interface UseLiteratureSearchState {
  results: Paper[];
  isLoading: boolean;
  error: string | null;
  searchTime: number;
  source: string;
  cached: boolean;
  rateLimitInfo: {
    limit: number;
    remaining: number;
    resetTime: string;
  } | null;
}

export interface UseLiteratureSearchOptions {
  defaultLimit?: number;
  autoSearch?: boolean;
  debounceMs?: number;
  aggregateWindowMs?: number; // e.g., 120000 for 2 minutes
  ignoreWhileAggregating?: boolean; // prevent firing new requests while one aggregate search runs
  useSSE?: boolean; // prefer SSE progressive streaming when not aggregating
  sessionId?: string; // external session identifier (optional)
  sseFallbackToFetchMs?: number; // if no SSE progress within this time, fallback to fetch
  onSuccess?: (result: SearchResult) => void;
  onError?: (error: string) => void;
  // Optional: preload an existing session on mount
  autoPreloadSession?: boolean;
  userIdForSession?: string; // used for session API auth checks
  includeInPreload?: 'all' | 'events' | 'results' | 'session';
}

export function useLiteratureSearch(options: UseLiteratureSearchOptions = {}) {
  const {
    defaultLimit = 10,
    autoSearch = false,
    debounceMs = 500,
    aggregateWindowMs = 0,
    ignoreWhileAggregating = true,
    useSSE = true,
    sessionId,
    sseFallbackToFetchMs = 1500,
    onSuccess,
    onError,
    autoPreloadSession = false,
    userIdForSession,
    includeInPreload = 'results'
  } = options;

  // Per-query cooldown (to avoid rapid repeat hits of the same normalized query)
  const PER_QUERY_COOLDOWN_MS = 60000; // 60s

  const [state, setState] = useState<UseLiteratureSearchState>({
    results: [],
    isLoading: false,
    error: null,
    searchTime: 0,
    source: '',
    cached: false,
    rateLimitInfo: null
  });

  const [currentQuery, setCurrentQuery] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLimitRef = useRef<number>(defaultLimit);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aggregatingRef = useRef<boolean>(false);
  const aggregationDeadlineRef = useRef<number | null>(null);
  const lastQueryFetchRef = useRef<Record<string, number>>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const sseFallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const receivedAnyPaperRef = useRef<boolean>(false);
  const seenKeysRef = useRef<Set<string>>(new Set());
  const sessionIdRef = useRef<string>(
    sessionId || (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  );

  // Keep a ref of the latest results to seed dedupe before streaming
  const resultsRef = useRef<Paper[]>([]);
  useEffect(() => {
    resultsRef.current = state.results;
  }, [state.results]);

  // Small helper: build a stable dedupe key for a paper across sources
  const paperKey = (p: Partial<Paper>): string => {
    const doi = (p.doi || '').trim().toLowerCase();
    if (doi) return `doi:${doi}`;
    const id = (p.id || '').trim().toLowerCase();
    if (id) return `id:${id}`;
    const url = (p.url || '').trim().toLowerCase();
    if (url) return `url:${url}`;
    const title = (p.title || '').trim().toLowerCase();
    if (title) return `title:${title}`;
    return `hash:${JSON.stringify(p).toLowerCase()}`;
  };

  // Internal: perform classic fetch flow (existing implementation)
  const doFetchSearch = useCallback(async (
    query: string,
    limit: number,
    userId?: string
  ): Promise<SearchResult | null> => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Cancel any scheduled retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    // Close any SSE
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch {}
      eventSourceRef.current = null;
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      // Remember the last requested limit for consistent retries
      lastLimitRef.current = Math.min(limit, 50);
      const params = new URLSearchParams({
        query: query.trim(),
        limit: lastLimitRef.current.toString()
      });

      if (userId) {
        params.append('userId', userId);
      }
      if (aggregateWindowMs && aggregateWindowMs > 0) {
        params.append('aggregateWindowMs', String(aggregateWindowMs));
        aggregatingRef.current = true;
        aggregationDeadlineRef.current = Date.now() + aggregateWindowMs;
      } else {
        aggregatingRef.current = false;
        aggregationDeadlineRef.current = null;
      }

      // Record last-attempt timestamp for cooldown
      try {
        const key = `${query.trim().toLowerCase()}_${lastLimitRef.current}`;
        lastQueryFetchRef.current[key] = Date.now();
      } catch {}

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/literature-search?${params}`, {
        method: 'GET',
        headers: headers,
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any));

        // Build a helpful message
        const errorMessage = (errorData && (errorData.error || errorData.message))
          || (response.status === 429 ? 'Rate limit exceeded. Please try again later.' : `HTTP ${response.status}: ${response.statusText}`);

        // Extract rate limit info from payload or headers (best-effort)
        let rateLimitInfo = errorData?.rateLimitInfo || null;
        if (!rateLimitInfo) {
          const limit = Number(response.headers.get('X-RateLimit-Limit') || '')
          const remaining = Number(response.headers.get('X-RateLimit-Remaining') || '')
          const reset = response.headers.get('X-RateLimit-Reset') || ''
          if (!Number.isNaN(limit) && !Number.isNaN(remaining)) {
            rateLimitInfo = {
              limit,
              remaining,
              resetTime: reset || new Date(Date.now() + 60_000).toISOString()
            }
          }
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          results: [],
          rateLimitInfo
        }));

        // Reset aggregation flags on failure
        aggregatingRef.current = false;
        aggregationDeadlineRef.current = null;

        // Limited auto-retry aligned to server-provided reset with small jitter
        const status = response.status;
        if (status === 429 && rateLimitInfo?.resetTime) {
          const resetAt = new Date(rateLimitInfo.resetTime).getTime();
          const now = Date.now();
          let waitMs = resetAt - now;
          // Prefer standard Retry-After header if present
          const retryAfterHeader = response.headers.get('Retry-After');
          if (retryAfterHeader) {
            const sec = Number(retryAfterHeader);
            if (!Number.isNaN(sec)) {
              waitMs = Math.max(waitMs, sec * 1000);
            }
          }
          // Add jitter (500–1500ms) to avoid herding
          const jitter = Math.floor(Math.random() * 1000) + 500;
          waitMs = Math.max(0, waitMs + jitter);
          const withinTwoMin = waitMs <= 120000;
          if (withinTwoMin && waitMs > 0) {
            retryTimeoutRef.current = setTimeout(() => {
              // Only retry if not aborted by a new search in the meantime
              search(query, lastLimitRef.current || defaultLimit, userId);
            }, waitMs);
          }
        }

        if (onError) onError(errorMessage);
        return null;
      }

      const result: SearchResult = await response.json();

      // Ensure newest-first ordering by year when available
      const sorted = [...(result.papers || [])].sort((a: Paper, b: Paper) => {
        const ya = parseInt((a.year || '').toString().slice(0, 4)) || 0
        const yb = parseInt((b.year || '').toString().slice(0, 4)) || 0
        return yb - ya
      })

      setState({
        results: sorted,
        isLoading: false,
        error: null,
        searchTime: result.searchTime || 0,
        source: result.source || 'unknown',
        cached: result.cached || false,
        rateLimitInfo: result.rateLimitInfo || null
      });

      // Reset aggregation flags on success
      aggregatingRef.current = false;
      aggregationDeadlineRef.current = null;

      setCurrentQuery(query);

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Request was cancelled, don't update state
        aggregatingRef.current = false;
        aggregationDeadlineRef.current = null;
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        results: []
      }));
      if (onError) onError(errorMessage);
      return null;
    }
  }, [aggregateWindowMs, defaultLimit, onError, onSuccess]);

  const search = useCallback(async (
    query: string,
    limit: number = defaultLimit,
    userId?: string
  ): Promise<SearchResult | null> => {
    if (!query || query.trim().length < 3) {
      setState(prev => ({ ...prev, error: 'Query must be at least 3 characters long' }));
      return null;
    }
    // If SSE is enabled and not using aggregate window, try streaming first
    if (useSSE && (!aggregateWindowMs || aggregateWindowMs <= 0)) {
      // Cancel any existing fetch and SSE
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close(); } catch {}
        eventSourceRef.current = null;
      }

      // Prepare state for streaming
      setState(prev => ({ ...prev, isLoading: true, error: null, cached: false, source: 'stream' }));
      lastLimitRef.current = Math.min(limit, 50);
      receivedAnyPaperRef.current = false;
      // Seed dedupe set from any preloaded results
      try {
        const seeded = new Set<string>();
        for (const p of resultsRef.current) {
          seeded.add(paperKey(p));
        }
        seenKeysRef.current = seeded;
      } catch {
        seenKeysRef.current.clear();
      }

      // Build URL
      const params = new URLSearchParams({
        query: query.trim(),
        limit: String(lastLimitRef.current),
      });
      if (userId) params.append('userId', userId);
      if (sessionIdRef.current) params.append('sessionId', sessionIdRef.current);

      // Add auth token to query params for EventSource (since it doesn't support custom headers)
      const authToken = await getAuthToken();
      if (authToken) {
        params.append('access_token', authToken);
      }
      const es = new EventSource(`/api/literature-search/stream?${params.toString()}`);
      eventSourceRef.current = es;

      // Fallback timer: if no progress quickly, close and fallback to fetch
      if (sseFallbackTimerRef.current) clearTimeout(sseFallbackTimerRef.current);
      sseFallbackTimerRef.current = setTimeout(() => {
        if (!receivedAnyPaperRef.current) {
          try { es.close(); } catch {}
          eventSourceRef.current = null;
          doFetchSearch(query, limit, userId);
        }
      }, sseFallbackToFetchMs);

      es.addEventListener('init', (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          if (data?.rateLimit) {
            setState(prev => ({
              ...prev,
              rateLimitInfo: {
                limit: data.rateLimit.limit ?? 100,
                remaining: data.rateLimit.remaining ?? 0,
                resetTime: data.rateLimit.resetTime ?? new Date(Date.now() + 3600000).toISOString()
              }
            }));
          }
        } catch {}
      });

      es.addEventListener('paper', (ev: MessageEvent) => {
        receivedAnyPaperRef.current = true;
        const p: Paper = (() => { try { return JSON.parse(ev.data); } catch { return ev.data as any; } })();
        const key = paperKey(p);
        if (seenKeysRef.current.has(key)) return;
        seenKeysRef.current.add(key);

        setState(prev => {
          if (prev.results.length >= lastLimitRef.current) return prev;
          const next = [...prev.results, p];
          return { ...prev, results: next };
        });
      });

      es.addEventListener('error', (ev: MessageEvent) => {
        // Per-source error, keep streaming others
        // Optionally, could log or surface lightweight info
      });

      es.onmessage = () => { /* default messages ignored */ };

      es.onerror = () => {
        // Network or server error; fallback to fetch if nothing received
        try { es.close(); } catch {}
        eventSourceRef.current = null;
        if (!receivedAnyPaperRef.current) {
          doFetchSearch(query, limit, userId);
        } else {
          // We have partial results; finalize state as best-effort
          setState(prev => ({ ...prev, isLoading: false }));
        }
      };

      es.addEventListener('done', (ev: MessageEvent) => {
        if (sseFallbackTimerRef.current) {
          clearTimeout(sseFallbackTimerRef.current);
          sseFallbackTimerRef.current = null;
        }
        const payload = (() => { try { return JSON.parse(ev.data); } catch { return {}; } })() as any;
        setState(prev => {
          const sorted = [...prev.results].sort((a: Paper, b: Paper) => {
            const ya = parseInt((a.year || '').toString().slice(0, 4)) || 0
            const yb = parseInt((b.year || '').toString().slice(0, 4)) || 0
            return yb - ya
          })
          return {
            ...prev,
            isLoading: false,
            error: null,
            searchTime: typeof payload?.processingTime === 'number' ? payload.processingTime : prev.searchTime,
            source: payload?.mode === 'search' ? 'stream' : (prev.source || 'stream'),
            results: sorted,
          }
        });
        setCurrentQuery(query);
        try { es.close(); } catch {}
        eventSourceRef.current = null;
      });

      return null; // streaming path doesn't return a final result synchronously
    }

    // Otherwise, fall back to standard fetch path (includes aggregate window)
    return doFetchSearch(query, limit, userId);
  }, [useSSE, aggregateWindowMs, doFetchSearch, defaultLimit]);

  const searchWithDebounce = useCallback((
    query: string,
    limit: number = defaultLimit,
    userId?: string
  ) => {
    // Cooldown check to reduce duplicate identical queries
    try {
      const key = `${query.trim().toLowerCase()}_${limit}`;
      const last = lastQueryFetchRef.current[key];
      if (last && Date.now() - last < PER_QUERY_COOLDOWN_MS) {
        return;
      }
    } catch {}

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      // Optionally ignore while aggregating to avoid spamming server
      if (ignoreWhileAggregating && aggregatingRef.current) {
        return;
      }
      search(query, limit, userId);
    }, debounceMs);
  }, [search, debounceMs, defaultLimit, ignoreWhileAggregating]);

  const clearResults = useCallback(() => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch {}
      eventSourceRef.current = null;
    }

    // Clear debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (sseFallbackTimerRef.current) {
      clearTimeout(sseFallbackTimerRef.current);
      sseFallbackTimerRef.current = null;
    }

    setState({
      results: [],
      isLoading: false,
      error: null,
      searchTime: 0,
      source: '',
      cached: false,
      rateLimitInfo: null
    });

    setCurrentQuery('');
    aggregatingRef.current = false;
    aggregationDeadlineRef.current = null;
  }, []);

  // Preload session results on mount if requested
  const loadSession = useCallback(async (
    sessionIdArg?: string,
    userIdArg?: string,
    include: 'all' | 'events' | 'results' | 'session' = includeInPreload
  ) => {
    const sid = sessionIdArg || sessionIdRef.current;
    if (!sid) return { success: false } as any;
    try {
      const qs = new URLSearchParams();
      if (userIdArg || userIdForSession) qs.set('userId', (userIdArg || userIdForSession) as string);
      if (include) qs.set('include', include);
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/literature-search/session/${encodeURIComponent(sid)}?${qs.toString()}`, {
        method: 'GET',
        headers: headers
      });
      if (!res.ok) return { success: false } as any;
      const payload = await res.json();

      const loadedResults: Paper[] = (payload?.results || []).map((r: any) => r.paper as Paper);
      // Seed dedupe set from loaded results
      try {
        const seeded = new Set<string>();
        for (const p of loadedResults) seeded.add(paperKey(p));
        seenKeysRef.current = seeded;
      } catch {}

      setState(prev => ({
        ...prev,
        results: loadedResults,
        isLoading: false,
        error: null,
        cached: false,
        source: 'session',
        searchTime: prev.searchTime,
      }));

      // Update sessionId if different and set current query for UX
      sessionIdRef.current = sid;
      try {
        if (payload?.session?.query) setCurrentQuery(payload.session.query);
      } catch {}

      return payload;
    } catch {
      return { success: false } as any;
    }
  }, [includeInPreload, userIdForSession]);

  useEffect(() => {
    if (autoPreloadSession && sessionIdRef.current) {
      // Fire and forget
      loadSession(sessionIdRef.current, userIdForSession, includeInPreload);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = useCallback(() => {
    // If rate-limited and reset time hasn't passed, do nothing
    const info = state.rateLimitInfo;
    if (info) {
      const resetAt = new Date(info.resetTime).getTime();
      if (Date.now() < resetAt) {
        return;
      }
    }
    if (currentQuery) {
      search(currentQuery, lastLimitRef.current || defaultLimit);
    }
  }, [state.rateLimitInfo, currentQuery, defaultLimit, search]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch {}
      eventSourceRef.current = null;
    }
    if (sseFallbackTimerRef.current) {
      clearTimeout(sseFallbackTimerRef.current);
      sseFallbackTimerRef.current = null;
    }
  }, []);

  // Auto cleanup on component unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    ...state,
    search,
    searchWithDebounce,
    clearResults,
    retry,
    cleanup,
    currentQuery,
    isRateLimited: state.rateLimitInfo?.remaining === 0,
    aggregateWindowMs,
    loadSession,
    sessionId: sessionIdRef.current
  };
}
