import { useState, useCallback, useRef } from 'react';

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
  onSuccess?: (result: SearchResult) => void;
  onError?: (error: string) => void;
}

export function useLiteratureSearch(options: UseLiteratureSearchOptions = {}) {
  const {
    defaultLimit = 10,
    autoSearch = false,
    debounceMs = 500,
    aggregateWindowMs = 0,
    ignoreWhileAggregating = true,
    onSuccess,
    onError
  } = options;

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

  const search = useCallback(async (
    query: string,
    limit: number = defaultLimit,
    userId?: string
  ): Promise<SearchResult | null> => {
    if (!query || query.trim().length < 3) {
      setState(prev => ({ ...prev, error: 'Query must be at least 3 characters long' }));
      return null;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Cancel any scheduled retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Create new abort controller
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

      const response = await fetch(`/api/literature-search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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

        // Limited auto-retry/backoff only if 429 and reset is within 2 minutes window
        const status = response.status;
        if (status === 429 && rateLimitInfo?.resetTime) {
          const resetAt = new Date(rateLimitInfo.resetTime).getTime();
          const now = Date.now();
          const waitMs = Math.max(1000, Math.min(30000, resetAt - now));
          const withinTwoMin = resetAt - now <= 120000;
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

      setState({
        results: result.papers || [],
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

      if (onError) {
        onError(errorMessage);
      }

      return null;
    }
  }, [defaultLimit, onSuccess, onError, aggregateWindowMs]);

  const searchWithDebounce = useCallback((
    query: string,
    limit: number = defaultLimit,
    userId?: string
  ) => {
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

    // Clear debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
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

  const retry = useCallback(() => {
    if (currentQuery) {
      search(currentQuery, lastLimitRef.current || defaultLimit);
    }
  }, [currentQuery, defaultLimit, search]);

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
  }, []);

  return {
    ...state,
    search,
    searchWithDebounce,
    clearResults,
    retry,
    cleanup,
    currentQuery,
    isRateLimited: state.rateLimitInfo?.remaining === 0,
    aggregateWindowMs
  };
}
