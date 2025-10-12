import { createClient } from '@supabase/supabase-js';

interface Paper {
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

interface SearchResult {
  success: boolean;
  papers: Paper[];
  source: string;
  count: number;
  cached?: boolean;
  searchTime: number;
  error?: string;
}

interface OpenAlexWork {
  id: string;
  title: string;
  authorships: Array<{
    author: { display_name: string };
  }>;
  abstract_inverted_index?: Record<string, number[]>;
  publication_year: number;
  primary_location?: {
    source?: { display_name: string };
  };
  doi?: string;
  cited_by_count: number;
}

interface ArxivEntry {
  id: { _: string };
  title: { _: string };
  summary: { _: string };
  published: { _: string };
  author: Array<{ name: { _: string } }> | { name: { _: string } };
}

// Rate limiting and concurrency control types
interface RateConfig {
  capacity: number;      // max burst tokens
  refillMs: number;      // interval to refill tokens
  refillAmount: number;  // tokens added per interval
  concurrency: number;   // max concurrent requests
}

interface TokenBucket {
  capacity: number;
  tokens: number;
  refillMs: number;
  refillAmount: number;
  lastRefill: number; // epoch ms
}

interface Semaphore {
  max: number;
  current: number;
  queue: Array<() => void>;
}

export class LiteratureSearchService {
  private cache = new Map<string, { data: SearchResult; timestamp: number }>();
  private inflight = new Map<string, Promise<SearchResult>>();
  private readonly CACHE_DURATION = 3600000; // 1 hour
  private readonly REQUEST_TIMEOUT = 6000; // 6 seconds per API call
  private readonly MAX_CONCURRENT_REQUESTS = 3;
  // Per-source policies
  private rateConfigs = new Map<string, RateConfig>();
  private buckets = new Map<string, TokenBucket>();
  private semaphores = new Map<string, Semaphore>();
  // Opt-in debug logs for policies
  private debugPolicies = process.env.LIT_SEARCH_DEBUG === '1';
  private debugLog(...args: any[]): void {
    if (this.debugPolicies) console.debug('[lit-pol]', ...args);
  }

  constructor(private supabaseClient?: any) {
    this.initRatePolicies();
  }

  // Initialize defaults for known sources (conservative, adjustable later)
  private initRatePolicies() {
    const defaults: Record<string, RateConfig> = {
      openalex:    { capacity: 8, refillMs: 250, refillAmount: 1, concurrency: 2 },
      arxiv:       { capacity: 4, refillMs: 500, refillAmount: 1, concurrency: 2 },
      crossref:    { capacity: 4, refillMs: 500, refillAmount: 1, concurrency: 2 },
      openaire:    { capacity: 4, refillMs: 500, refillAmount: 1, concurrency: 2 },
      doaj:        { capacity: 4, refillMs: 500, refillAmount: 1, concurrency: 2 },
      pubmed:      { capacity: 4, refillMs: 500, refillAmount: 1, concurrency: 2 },
      core:        { capacity: 2, refillMs: 1000, refillAmount: 1, concurrency: 1 },
      scholar:     { capacity: 1, refillMs: 1000, refillAmount: 1, concurrency: 1 },
      shodhganga:  { capacity: 1, refillMs: 1000, refillAmount: 1, concurrency: 1 },
      jstor:       { capacity: 1, refillMs: 1000, refillAmount: 1, concurrency: 1 },
      serpapi:     { capacity: 5, refillMs: 500, refillAmount: 1, concurrency: 2 },
    };
    Object.entries(defaults).forEach(([k, v]) => {
      this.rateConfigs.set(k, v);
      this.buckets.set(k, {
        capacity: v.capacity,
        tokens: v.capacity,
        refillMs: v.refillMs,
        refillAmount: v.refillAmount,
        lastRefill: Date.now(),
      });
      this.semaphores.set(k, { max: v.concurrency, current: 0, queue: [] });
    });
  }

  // Simple semaphore acquire/release
  private async acquireSemaphore(source: string): Promise<() => void> {
    const sem = this.semaphores.get(source);
    if (!sem) return () => {};
    if (sem.current < sem.max) {
      sem.current++;
      this.debugLog('semaphore acquire', { source, current: sem.current, max: sem.max });
      return () => {
        sem.current--;
        this.debugLog('semaphore release', { source, current: sem.current, max: sem.max });
        const next = sem.queue.shift();
        if (next) next();
      };
    }
    this.debugLog('semaphore wait', { source, current: sem.current, max: sem.max });
    await new Promise<void>(resolve => sem.queue.push(resolve));
    sem.current++;
    this.debugLog('semaphore acquire', { source, current: sem.current, max: sem.max });
    return () => {
      sem.current--;
      this.debugLog('semaphore release', { source, current: sem.current, max: sem.max });
      const next = sem.queue.shift();
      if (next) next();
    };
  }

  private refillBucket(b: TokenBucket): void {
    const now = Date.now();
    if (now <= b.lastRefill) return;
    const elapsed = now - b.lastRefill;
    if (elapsed >= b.refillMs) {
      const intervals = Math.floor(elapsed / b.refillMs);
      b.tokens = Math.min(b.capacity, b.tokens + intervals * b.refillAmount);
      b.lastRefill += intervals * b.refillMs;
    }
  }

  private async takeToken(source: string): Promise<void> {
    const b = this.buckets.get(source);
    if (!b) return; // no bucket -> unlimited
    for (;;) {
      this.refillBucket(b);
      if (b.tokens > 0) {
        b.tokens -= 1;
        this.debugLog('token take', { source, tokens: b.tokens, capacity: b.capacity });
        return;
      }
      const wait = Math.max(15, b.refillMs - (Date.now() - b.lastRefill));
      this.debugLog('token wait', { source, waitMs: wait, tokens: b.tokens, capacity: b.capacity });
      await this.sleep(wait);
    }
  }

  private sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

  // Unified fetch with per-source rate limiting, concurrency caps, and jittered backoff
  private async fetchWithPolicies(
    source: string,
    input: string | URL | Request,
    init: RequestInit = {},
    opts: { timeoutMs?: number; retries?: number } = {}
  ): Promise<Response> {
    const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : this.REQUEST_TIMEOUT;
    const maxRetries = typeof opts.retries === 'number' ? opts.retries : 2;
    let attempt = 0;
    let backoff = 300; // ms

    while (true) {
      attempt++;
      const release = await this.acquireSemaphore(source);
      await this.takeToken(source);
      const b = this.buckets.get(source);
      const sem = this.semaphores.get(source);
      this.debugLog('attempt begin', {
        source,
        attempt,
        timeoutMs,
        maxRetries,
        tokens: b ? `${b.tokens}/${b.capacity}` : 'na',
        concurrency: sem ? `${sem.current}/${sem.max}` : 'na'
      });
      const ac = new AbortController();
      const userSignal = init.signal as AbortSignal | undefined;
      let timer: any;
      const onAbort = () => ac.abort();
      try {
        if (userSignal) {
          if (userSignal.aborted) throw new Error('Aborted');
          userSignal.addEventListener('abort', onAbort, { once: true });
        }
        timer = setTimeout(() => ac.abort(), Math.max(100, timeoutMs));
        const resp = await fetch(input as any, { ...init, signal: ac.signal });

        // Release immediately after receiving response
        release();
        clearTimeout(timer);
        if (userSignal) userSignal.removeEventListener('abort', onAbort);

        if (resp.status === 429) {
          if (attempt > maxRetries) return resp;
          const retryAfterRaw = resp.headers.get('Retry-After');
          const resetRaw = resp.headers.get('X-RateLimit-Reset');
          let waitMs = 0;
          if (retryAfterRaw) {
            const sec = Number(retryAfterRaw);
            waitMs = isNaN(sec) ? Math.max(0, new Date(retryAfterRaw).getTime() - Date.now()) : sec * 1000;
          } else if (resetRaw) {
            const reset = Number(resetRaw);
            waitMs = reset > 10000000000 ? Math.max(0, reset - Date.now()) : Math.max(0, reset * 1000 - Date.now());
          } else {
            waitMs = backoff;
          }
          const jitter = Math.floor(Math.random() * 250);
          this.debugLog('http 429 backoff', { source, attempt, waitMs, jitter });
          await this.sleep(Math.min(60000, waitMs + jitter));
          backoff = Math.min(4000, backoff * 2);
          continue;
        }
        if (resp.status >= 500 && resp.status < 600) {
          if (attempt > maxRetries) return resp;
          const jitter = Math.floor(Math.random() * 250);
          this.debugLog('http 5xx backoff', { source, attempt, backoff, jitter, status: resp.status });
          await this.sleep(backoff + jitter);
          backoff = Math.min(4000, backoff * 2);
          continue;
        }
        this.debugLog('attempt success', { source, attempt, status: resp.status });
        return resp;
      } catch (err) {
        clearTimeout(timer);
        if (userSignal) userSignal.removeEventListener('abort', onAbort);
        release();
        if (attempt > maxRetries) throw err;
        const jitter = Math.floor(Math.random() * 250);
        this.debugLog('network error backoff', { source, attempt, backoff, jitter, error: String(err) });
        await this.sleep(backoff + jitter);
        backoff = Math.min(4000, backoff * 2);
      }
    }
  }

  /**
   * Fast parallel literature search with caching and fallbacks
   */
  async searchPapers(query: string, limit: number = 10): Promise<SearchResult> {
    const startTime = Date.now();
    const cacheKey = `${query.toLowerCase().trim()}_${limit}`;

    // Check database cache
    if (this.supabaseClient) {
      const dbCached = await this.getFromDatabaseCache(cacheKey);
      if (dbCached) {
        return {
          ...dbCached,
          cached: true,
          searchTime: Date.now() - startTime
        };
      }
    }


    // Coalesce duplicate concurrent requests
    const existing = this.inflight.get(cacheKey);
    if (existing) return existing;

    const run = (async (): Promise<SearchResult> => {
      try {
        // Check database cache
        if (this.supabaseClient) {
          const dbCached = await this.getFromDatabaseCache(cacheKey);
          if (dbCached) {
            this.cache.set(cacheKey, { data: dbCached, timestamp: Date.now() });
            return {
              ...dbCached,
              cached: true,
              searchTime: Date.now() - startTime
            };
          }
        }

        try {
          // Run parallel API calls with timeouts
          const openAlexPromise = this.searchOpenAlex(query, limit);
          const arxivPromise = this.searchArxiv(query, limit);
          const crossRefPromise = this.searchCrossRef(query, Math.min(20, Math.max(limit, 10))); // CrossRef can be slower

          // Fast-path: return immediately if OpenAlex returns enough results within ~1.8s
          try {
            const fastOpenAlex = await Promise.race([
              openAlexPromise,
              this.timeoutPromise(1800)
            ]);
            if (Array.isArray(fastOpenAlex) && fastOpenAlex.length >= limit) {
              const result: SearchResult = {
                success: true,
                papers: fastOpenAlex.slice(0, limit),
                source: 'openalex-fast',
                count: fastOpenAlex.length,
                searchTime: Date.now() - startTime
              };
              // Fire-and-forget: compute combined results and cache for subsequent calls
              (async () => {
                const fullResults = await Promise.allSettled([
                  Promise.race([openAlexPromise, this.timeoutPromise(this.REQUEST_TIMEOUT)]),
                  Promise.race([arxivPromise, this.timeoutPromise(this.REQUEST_TIMEOUT)]),
                  Promise.race([crossRefPromise, this.timeoutPromise(this.REQUEST_TIMEOUT)])
                ]);
                const papers = this.combineResults(fullResults, Math.max(50, limit));
                const combined: SearchResult = {
                  success: true,
                  papers: papers.slice(0, limit),
                  source: 'combined',
                  count: papers.length,
                  searchTime: Date.now() - startTime
                };
                await this.cacheResult(cacheKey, combined);
              })().catch(() => {});
              return result;
            }
          } catch {
            // Ignore fast-path timeout; continue with normal flow
          }

          // Race with global timeout for all sources
          const results = await Promise.allSettled([
            Promise.race([openAlexPromise, this.timeoutPromise(this.REQUEST_TIMEOUT)]),
            Promise.race([arxivPromise, this.timeoutPromise(this.REQUEST_TIMEOUT)]),
            Promise.race([crossRefPromise, this.timeoutPromise(this.REQUEST_TIMEOUT)])
          ]);

          // Combine results from successful APIs
          const papers = this.combineResults(results, limit);

          if (papers.length === 0) {
            // If all parallel requests failed, try sequential backup
            const backupResult = await this.fallbackSequentialSearch(query, limit);
            if (backupResult.papers.length > 0) {
              await this.cacheResult(cacheKey, backupResult);
              return {
                ...backupResult,
                searchTime: Date.now() - startTime
              };
            }

            return {
              success: false,
              papers: [],
              source: 'none',
              count: 0,
              error: 'No results found from any source',
              searchTime: Date.now() - startTime
            };
          }

          const result: SearchResult = {
            success: true,
            papers: papers.slice(0, limit),
            source: 'combined',
            count: papers.length,
            searchTime: Date.now() - startTime
          };

          // Cache the successful result
          await this.cacheResult(cacheKey, result);

          return result;

        } catch (error) {
          console.error('Literature search error:', error);
          return {
            success: false,
            papers: [],
            source: 'error',
            count: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
            searchTime: Date.now() - startTime
          };
        }
      } finally {
        this.inflight.delete(cacheKey);
      }
    })();

    this.inflight.set(cacheKey, run);
    return run;
  }

  /**
   * Stream papers per item via callback as they arrive from sources.
   * This preserves existing normalization, de-duplicates, and emits early.
   */
  async streamPapers(
    query: string,
    limit: number,
    onPaper: (paper: Paper) => void,
    onError?: (source: string, error: string) => void
  ): Promise<{ count: number }> {
    const startTime = Date.now();
    const seen = new Set<string>(); // by normalized title
    let emitted = 0;

    const emitArray = (arr: Paper[], source: string) => {
      for (const p of arr) {
        if (!p?.title) continue;
        const key = p.title.toLowerCase().trim();
        if (seen.has(key)) continue;
        seen.add(key);
        onPaper(p);
        emitted++;
        if (emitted >= limit) break;
      }
    };

    const withCatch = async (name: string, fn: () => Promise<Paper[]>) => {
      try {
        const res = await Promise.race([fn(), this.timeoutPromise(this.REQUEST_TIMEOUT)]);
        if (Array.isArray(res)) emitArray(res, name);
      } catch (e) {
        onError?.(name, e instanceof Error ? e.message : String(e));
      }
    };

    const tasks: Promise<void>[] = [
      withCatch('openalex', () => this.searchOpenAlex(query, limit)),
      withCatch('arxiv', () => this.searchArxiv(query, limit)),
      withCatch('crossref', () => this.searchCrossRef(query, Math.min(20, Math.max(limit, 10)))),
      withCatch('openaire', () => this.searchOpenAIRE(query, limit)),
      withCatch('doaj', () => this.searchDOAJ(query, limit)),
    ];
    // Optional sources
    if (process.env.CORE_API_KEY) {
      tasks.push(withCatch('core', () => this.searchCORE(query, limit)));
    }
    tasks.push(withCatch('pubmed', () => this.searchPubMed(query, limit)));
    // Keyless extras (best-effort HTML parsing)
    tasks.push(withCatch('scholar', () => this.searchGoogleScholarLite(query, limit)));
    tasks.push(withCatch('shodhganga', () => this.searchShodhganga(query, limit)));
    tasks.push(withCatch('jstor', () => this.searchJSTORLite(query, limit)));
    if (process.env.SERPAPI_KEY) {
      tasks.push(withCatch('serpapi', () => this.searchSerpGoogleScholar(query, limit)));
    }

    await Promise.allSettled(tasks);

    // Optionally cache final combined for the query key
    const cacheKey = `${query.toLowerCase().trim()}_${limit}`;
    const combined: SearchResult = {
      success: true,
      papers: [], // stream already delivered; cache empty or skip
      source: 'stream',
      count: emitted,
      searchTime: Date.now() - startTime
    };
    try { await this.cacheResult(cacheKey, combined); } catch {}

    return { count: emitted };
  }

  /**
   * Aggregate results from many sources with a maximum time window.
   * Returns as soon as all sources finish, or at most after maxDurationMs.
   */
  async aggregatePapers(
    query: string,
    limit: number,
    maxDurationMs: number = 120000
  ): Promise<SearchResult> {
    const startTime = Date.now();
    const seen = new Set<string>();
    const collected: Paper[] = [];

    const addUnique = (arr: Paper[]) => {
      for (const p of arr) {
        if (!p?.title) continue;
        const key = p.title.toLowerCase().trim();
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(p);
      }
    };

    // Prepare source tasks (best-effort; individual timeouts still apply)
    const tasks: Promise<void>[] = [];
    const addTask = (name: string, fn: () => Promise<Paper[]>) => {
      tasks.push(
        (async () => {
          try {
            const res = await Promise.race([fn(), this.timeoutPromise(this.REQUEST_TIMEOUT)]);
            if (Array.isArray(res)) addUnique(res);
          } catch (e) {
            // Swallow and continue; aggregation is best-effort
          }
        })()
      );
    };

    // Core sources
    addTask('openalex', () => this.searchOpenAlex(query, Math.min(50, Math.max(10, limit))));
    addTask('arxiv', () => this.searchArxiv(query, Math.min(50, Math.max(10, limit))));
    addTask('crossref', () => this.searchCrossRef(query, Math.min(50, Math.max(20, limit))));
    addTask('openaire', () => this.searchOpenAIRE(query, Math.min(50, Math.max(10, limit))));
    addTask('doaj', () => this.searchDOAJ(query, Math.min(50, Math.max(10, limit))));
    addTask('pubmed', () => this.searchPubMed(query, Math.min(50, Math.max(10, limit))));
    // Optional sources
    if (process.env.CORE_API_KEY) {
      addTask('core', () => this.searchCORE(query, Math.min(50, Math.max(10, limit))));
    }
    // Keyless extras (HTML)
    addTask('scholar', () => this.searchGoogleScholarLite(query, Math.min(50, Math.max(10, limit))));
    addTask('shodhganga', () => this.searchShodhganga(query, Math.min(50, Math.max(10, limit))));
    addTask('jstor', () => this.searchJSTORLite(query, Math.min(50, Math.max(10, limit))));
    if (process.env.SERPAPI_KEY) {
      addTask('serpapi', () => this.searchSerpGoogleScholar(query, Math.min(50, Math.max(10, limit))));
    }

    // Wait until either all tasks finish or the max window elapses
    const allDone = Promise.allSettled(tasks);
    const windowElapsed = new Promise<void>((resolve) => setTimeout(resolve, Math.max(1000, maxDurationMs)));
    await Promise.race([allDone, windowElapsed]);

    // Sort by citations then year and trim to limit
    const papers = collected
      .sort((a, b) => {
        const citationDiff = (b.citations || 0) - (a.citations || 0);
        if (citationDiff !== 0) return citationDiff;
        return parseInt(b.year || '0') - parseInt(a.year || '0');
      })
      .slice(0, limit);

    return {
      success: true,
      papers,
      source: 'aggregate',
      count: collected.length,
      searchTime: Date.now() - startTime
    };
  }

  /**
   * Search OpenAIRE API (minimal). If API shape changes, safely returns [].
   */
  private async searchOpenAIRE(query: string, limit: number): Promise<Paper[]> {
    try {
      const url = new URL('https://api.openaire.eu/search/publications');
      url.searchParams.set('title', query);
      url.searchParams.set('size', Math.min(50, Math.max(10, limit)).toString());
      url.searchParams.set('format', 'json');

      const response = await this.fetchWithPolicies('openaire', url.toString(), {
        headers: { 'User-Agent': 'AI-Research-Assistant/1.0' }
      }, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });
      if (!response.ok) throw new Error(`OpenAIRE API error: ${response.status}`);

      const data = await response.json().catch(() => null);
      const records = (data?.response?.results?.result || []) as any[];

      return records.map((r: any) => {
        const md = r?.metadata || r?.result?.metadata || {};
        const title = md?.title?.value || md?.title || 'No title';
        const authors = Array.isArray(md?.creator)
          ? md.creator.map((c: any) => c?.name || c).filter(Boolean)
          : [];
        const abstract = md?.description?.value || md?.description || '';
        const year = (md?.dateofacceptance || md?.date || '').toString().slice(0, 4);
        const doi = md?.doi || md?.identifier?.find?.((id: any) => (id?.value || '').startsWith('10.'))?.value;
        const url = md?.identifier?.find?.((id: any) => (id?.value || '').startsWith('http'))?.value || '';
        return {
          id: doi || url || title,
          title,
          authors,
          abstract,
          year,
          journal: md?.source || md?.publisher || 'OpenAIRE',
          url: doi ? `https://doi.org/${doi}` : url,
          citations: 0,
          source: 'openaire',
          doi
        } as Paper;
      });
    } catch (error) {
      console.warn('OpenAIRE search failed:', error);
      return [];
    }
  }

  /**
   * Search DOAJ API (open access journals)
   */
  private async searchDOAJ(query: string, limit: number): Promise<Paper[]> {
    try {
      const url = new URL('https://doaj.org/api/v2/search/articles/' + encodeURIComponent(query));
      url.searchParams.set('pageSize', Math.min(50, Math.max(10, limit)).toString());

      const response = await this.fetchWithPolicies('doaj', url.toString(), {
        headers: { 'User-Agent': 'AI-Research-Assistant/1.0' }
      }, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });
      if (!response.ok) throw new Error(`DOAJ API error: ${response.status}`);

      const data = await response.json();
      const results = (data?.results || []) as any[];
      return results.map((item: any) => {
        const b = item?.bibjson || {};
        const title = b.title || 'No title';
        const authors = (b.author || []).map((a: any) => `${a.name || ''}`.trim()).filter(Boolean);
        const abstract = b.abstract || '';
        const year = (b.year || '').toString();
        const doi = (b.identifier || []).find((id: any) => id.type === 'doi')?.id;
        const url = b.link?.find?.((l: any) => l.type === 'fulltext')?.url || (doi ? `https://doi.org/${doi}` : '');
        const journal = b.journal?.title || b.journal || 'DOAJ';
        return {
          id: doi || url || title,
          title,
          authors,
          abstract,
          year,
          journal,
          url,
          citations: 0,
          source: 'doaj',
          doi
        } as Paper;
      });
    } catch (error) {
      console.warn('DOAJ search failed:', error);
      return [];
    }
  }

  /**
   * Search OpenAlex API - fastest and most comprehensive
   */
  private async searchOpenAlex(query: string, limit: number): Promise<Paper[]> {
    try {
      // Sanitize query - remove special characters that might cause 400 errors
      const cleanQuery = query.trim().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ')
      if (!cleanQuery) return []
      
      const url = new URL('https://api.openalex.org/works');
      url.searchParams.set('search', cleanQuery);
      url.searchParams.set('per-page', Math.min(50, Math.max(1, limit)).toString());
      url.searchParams.set('mailto', 'research@thesisflow.ai');

      const response = await this.fetchWithPolicies('openalex', url.toString(), {
        headers: { 'User-Agent': 'ThesisFlow-AI/1.0' }
      }, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });

      if (!response.ok) {
        console.warn(`OpenAlex API error: ${response.status} for query: ${cleanQuery}`)
        return []
      }

      const data = await response.json();
      return data.results?.map((work: OpenAlexWork) => ({
        id: work.id || '',
        title: work.title || 'No title',
        authors: work.authorships?.map(a => a.author?.display_name).filter(Boolean) || [],
        abstract: this.reconstructAbstract(work.abstract_inverted_index) || 'No abstract available',
        year: work.publication_year?.toString() || '',
        journal: work.primary_location?.source?.display_name || 'Unknown',
        url: work.doi || work.id || '',
        citations: work.cited_by_count || 0,
        source: 'openalex',
        doi: work.doi
      })) || [];

    } catch (error) {
      console.warn('OpenAlex search failed:', error);
      return [];
    }
  }

  /**
   * Search arXiv API - good for preprints and computer science papers
   */
  private async searchArxiv(query: string, limit: number): Promise<Paper[]> {
    try {
      const url = new URL('http://export.arxiv.org/api/query');
      url.searchParams.set('search_query', `all:${query}`);
      url.searchParams.set('start', '0');
      url.searchParams.set('max_results', limit.toString());

      const response = await this.fetchWithPolicies('arxiv', url.toString(), {}, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });

      if (!response.ok) throw new Error(`ArXiv API error: ${response.status}`);

      const xmlText = await response.text();
      return this.parseArxivXML(xmlText);

    } catch (error) {
      console.warn('ArXiv search failed:', error);
      return [];
    }
  }

  /**
   * Search CrossRef API - good for DOI resolution and journal papers
   */
  private async searchCrossRef(query: string, limit: number): Promise<Paper[]> {
    try {
      const url = new URL('https://api.crossref.org/works');
      url.searchParams.set('query', query);
      url.searchParams.set('rows', limit.toString());

      const response = await this.fetchWithPolicies('crossref', url.toString(), {
        headers: { 'User-Agent': 'AI-Research-Assistant/1.0 (mailto:research@example.com)' }
      }, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });

      if (!response.ok) throw new Error(`CrossRef API error: ${response.status}`);

      const data = await response.json();
      return data.message?.items?.map((item: any) => ({
        id: item.DOI || '',
        title: item.title?.[0] || 'No title',
        authors: item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()) || [],
        abstract: item.abstract || 'No abstract available',
        year: item.published?.['date-parts']?.[0]?.[0]?.toString() || '',
        journal: item['container-title']?.[0] || 'Unknown',
        url: item.DOI ? `https://doi.org/${item.DOI}` : '',
        citations: item['is-referenced-by-count'] || 0,
        source: 'crossref',
        doi: item.DOI
      })) || [];

    } catch (error) {
      console.warn('CrossRef search failed:', error);
      return [];
    }
  }

  /**
   * Fallback sequential search if parallel search fails
   */
  private async fallbackSequentialSearch(query: string, limit: number): Promise<SearchResult> {
    // Try OpenAlex first (most reliable)
    let papers = await this.searchOpenAlex(query, limit);
    if (papers.length > 0) {
      return {
        success: true,
        papers,
        source: 'openalex-fallback',
        count: papers.length,
        searchTime: 0
      };
    }

    // Try ArXiv if OpenAlex fails
    papers = await this.searchArxiv(query, limit);
    if (papers.length > 0) {
      return {
        success: true,
        papers,
        source: 'arxiv-fallback',
        count: papers.length,
        searchTime: 0
      };
    }

    return {
      success: false,
      papers: [],
      source: 'fallback-failed',
      count: 0,
      searchTime: 0
    };
  }

  /**
   * Combine and deduplicate results from multiple sources
   */
  private combineResults(results: PromiseSettledResult<any>[], limit: number): Paper[] {
    const allPapers: Paper[] = [];
    const seenTitles = new Set<string>();

    for (const result of results) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        for (const paper of result.value) {
          const normalizedTitle = paper.title?.toLowerCase().trim();
          if (normalizedTitle && !seenTitles.has(normalizedTitle)) {
            seenTitles.add(normalizedTitle);
            allPapers.push(paper);
          }
        }
      }
    }

    // Sort by citation count and publication year
    return allPapers
      .sort((a, b) => {
        const citationDiff = (b.citations || 0) - (a.citations || 0);
        if (citationDiff !== 0) return citationDiff;
        return parseInt(b.year || '0') - parseInt(a.year || '0');
      })
      .slice(0, limit);
  }

  /**
   * Reconstruct abstract from OpenAlex inverted index
   */
  private reconstructAbstract(invertedIndex?: Record<string, number[]>): string {
    if (!invertedIndex || Object.keys(invertedIndex).length === 0) {
      return '';
    }

    try {
      const words: { [position: number]: string } = {};
      
      for (const [word, positions] of Object.entries(invertedIndex)) {
        for (const pos of positions) {
          words[pos] = word;
        }
      }

      const sortedPositions = Object.keys(words)
        .map(Number)
        .sort((a, b) => a - b);

      return sortedPositions.map(pos => words[pos]).join(' ');
    } catch {
      return '';
    }
  }

  /**
   * Parse ArXiv XML response
   */
  private parseArxivXML(xmlText: string): Paper[] {
    try {
      // Simple XML parsing for ArXiv format
      const papers: Paper[] = [];
      const entryMatches = xmlText.match(/<entry>[\s\S]*?<\/entry>/g);
      
      if (!entryMatches) return [];

      for (const entry of entryMatches) {
        const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || '';
        const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim() || '';
        const published = entry.match(/<published>(.*?)<\/published>/)?.[1]?.trim() || '';
        const id = entry.match(/<id>(.*?)<\/id>/)?.[1]?.trim() || '';
        
        const authorMatches = entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g);
        const authors = authorMatches?.map(match => 
          match.match(/<name>(.*?)<\/name>/)?.[1]?.trim() || ''
        ).filter(Boolean) || [];

        if (title) {
          papers.push({
            id,
            title,
            authors,
            abstract: summary,
            year: published.slice(0, 4),
            journal: 'arXiv',
            url: id,
            citations: 0,
            source: 'arxiv'
          });
        }
      }

      return papers;
    } catch {
      return [];
    }
  }

  /**
   * Get cached result if not expired
   */
  private getCachedResult(key: string): SearchResult | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Get result from database cache
   */
  private async getFromDatabaseCache(key: string): Promise<SearchResult | null> {
    if (!this.supabaseClient) return null;

    try {
      const { data, error } = await this.supabaseClient
        .from('literature_cache')
        .select('result')
        .eq('query_key', key)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) return null;
      return JSON.parse(data.result);
    } catch {
      return null;
    }
  }

  /**
   * Cache successful result in memory and database
   */
  private async cacheResult(key: string, result: SearchResult): Promise<void> {
    // In-memory cache
    this.cache.set(key, { data: result, timestamp: Date.now() });

    // Database cache
    if (this.supabaseClient) {
      try {
        const expiresAt = new Date(Date.now() + this.CACHE_DURATION).toISOString();
        await this.supabaseClient
          .from('literature_cache')
          .upsert({
            query_key: key,
            result: JSON.stringify(result),
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
          });
      } catch (error) {
        console.warn('Failed to cache result in database:', error);
      }
    }
  }

  /**
   * Create timeout promise for race conditions
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), ms);
    });
  }

  /**
   * Parse simple Google-style operators from the query.
   * Supports: site:example.com and filetype:pdf
   */
  private parseQueryOperators(raw: string): { cleaned: string; site?: string; filetype?: string } {
    const parts = (raw || '').split(/\s+/).filter(Boolean);
    let site: string | undefined;
    let filetype: string | undefined;
    const rest: string[] = [];
    for (const p of parts) {
      const low = p.toLowerCase();
      if (low.startsWith('site:')) {
        site = p.slice(5);
      } else if (low.startsWith('filetype:')) {
        filetype = p.slice(9);
      } else {
        rest.push(p);
      }
    }
    return { cleaned: rest.join(' ').trim(), site, filetype };
  }

  /**
   * Resolve various seed formats to an OpenAlex work ID (e.g., W2741809807)
   */
  private async resolveOpenAlexWorkId(seed: string): Promise<string | null> {
    try {
      const s = seed.trim();
      // Already an OpenAlex URL or ID
      const wMatch = s.match(/(?:openalex\.org\/)?(W\d+)/i);
      if (wMatch) return wMatch[1].toUpperCase();

      // DOI URL -> DOI
      const doiFromUrl = s.match(/doi\.org\/(10\.[^\s\/]+\/[^\s]+)$/i)?.[1];
      const doi = doiFromUrl || (s.startsWith('10.') ? s : '');
      if (doi) {
        const url = new URL('https://api.openalex.org/works');
        url.searchParams.set('filter', `doi:${encodeURIComponent(doi)}`);
        url.searchParams.set('per-page', '1');
        url.searchParams.set('mailto', 'research@example.com');
        const resp = await this.fetchWithPolicies('openalex', url.toString(), {}, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });
        const data = await resp.json().catch(() => null);
        const id = data?.results?.[0]?.id as string | undefined;
        const idMatch = id?.match(/openalex\.org\/(W\d+)/i)?.[1];
        if (idMatch) return idMatch.toUpperCase();
      }

      // Fallback: treat seed as a title; search and pick first
      const url = new URL('https://api.openalex.org/works');
      url.searchParams.set('search', s);
      url.searchParams.set('per-page', '1');
      url.searchParams.set('mailto', 'research@example.com');
      const resp = await this.fetchWithPolicies('openalex', url.toString(), {}, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });
      const data = await resp.json().catch(() => null);
      const id = data?.results?.[0]?.id as string | undefined;
      const idMatch = id?.match(/openalex\.org\/(W\d+)/i)?.[1];
      return idMatch ? idMatch.toUpperCase() : null;
    } catch {
      return null;
    }
  }

  /**
   * OpenAlex forward citations: works that cite the seed work.
   */
  async searchOpenAlexCitationsForward(seed: string, limit: number): Promise<Paper[]> {
    try {
      const workId = await this.resolveOpenAlexWorkId(seed);
      if (!workId) return [];
      const url = new URL('https://api.openalex.org/works');
      url.searchParams.set('filter', `cites:${workId}`);
      url.searchParams.set('per-page', Math.min(50, Math.max(10, limit)).toString());
      url.searchParams.set('mailto', 'research@example.com');
      const response = await this.fetchWithPolicies('openalex', url.toString(), {
        headers: { 'User-Agent': 'AI-Research-Assistant/1.0' }
      }, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });
      if (!response.ok) throw new Error(`OpenAlex citations (forward) error: ${response.status}`);
      const data = await response.json();
      return (data?.results || []).map((work: OpenAlexWork) => ({
        id: work.id || '',
        title: work.title || 'No title',
        authors: work.authorships?.map(a => a.author?.display_name).filter(Boolean) || [],
        abstract: this.reconstructAbstract(work.abstract_inverted_index) || '',
        year: work.publication_year?.toString() || '',
        journal: work.primary_location?.source?.display_name || 'Unknown',
        url: work.doi || work.id || '',
        citations: work.cited_by_count || 0,
        source: 'openalex-forward',
        doi: work.doi
      }));
    } catch (e) {
      console.warn('OpenAlex forward citations failed:', e);
      return [];
    }
  }

  /**
   * OpenAlex backward citations: references of the seed work.
   */
  async searchOpenAlexCitationsBackward(seed: string, limit: number): Promise<Paper[]> {
    try {
      const workId = await this.resolveOpenAlexWorkId(seed);
      if (!workId) return [];
      // Fetch the seed work to get referenced_works list
      const workUrl = new URL(`https://api.openalex.org/works/${workId}`);
      workUrl.searchParams.set('mailto', 'research@example.com');
      const workResp = await this.fetchWithPolicies('openalex', workUrl.toString(), {}, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });
      if (!workResp.ok) throw new Error(`OpenAlex work fetch error: ${workResp.status}`);
      const workJson: any = await workResp.json().catch(() => null);
      const refs: string[] = Array.isArray(workJson?.referenced_works) ? workJson.referenced_works : [];
      if (refs.length === 0) return [];
      const ids = refs.slice(0, Math.min(limit, 50))
        .map((u: string) => u.match(/openalex\.org\/(W\d+)/i)?.[1])
        .filter(Boolean)
        .join('|');
      if (!ids) return [];
      const url = new URL('https://api.openalex.org/works');
      url.searchParams.set('filter', `ids:${ids}`);
      url.searchParams.set('per-page', Math.min(50, Math.max(10, limit)).toString());
      url.searchParams.set('mailto', 'research@example.com');
      const response = await this.fetchWithPolicies('openalex', url.toString(), {}, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });
      if (!response.ok) throw new Error(`OpenAlex citations (backward) error: ${response.status}`);
      const data = await response.json();
      return (data?.results || []).map((w: OpenAlexWork) => ({
        id: w.id || '',
        title: w.title || 'No title',
        authors: w.authorships?.map(a => a.author?.display_name).filter(Boolean) || [],
        abstract: this.reconstructAbstract(w.abstract_inverted_index) || '',
        year: w.publication_year?.toString() || '',
        journal: w.primary_location?.source?.display_name || 'Unknown',
        url: w.doi || w.id || '',
        citations: w.cited_by_count || 0,
        source: 'openalex-backward',
        doi: w.doi
      }));
    } catch (e) {
      console.warn('OpenAlex backward citations failed:', e);
      return [];
    }
  }

  /**
   * CORE search (requires CORE_API_KEY). Returns [] if unavailable.
   */
  private async searchCORE(query: string, limit: number): Promise<Paper[]> {
    try {
      const apiKey = process.env.CORE_API_KEY;
      if (!apiKey) return [];
      const url = new URL('https://api.core.ac.uk/v3/search/works');
      url.searchParams.set('q', query);
      url.searchParams.set('limit', Math.min(50, Math.max(10, limit)).toString());
      const response = await this.fetchWithPolicies('core', url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` }
      }, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });
      if (!response.ok) throw new Error(`CORE API error: ${response.status}`);
      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      return results.map((item: any) => {
        const title = item?.title || 'No title';
        const authors: string[] = (item?.authors || []).map((a: any) => a?.name || '').filter(Boolean);
        const abstract = item?.abstract || '';
        const year = (item?.year || '').toString();
        const doi: string | undefined = item?.doi;
        const url = doi ? `https://doi.org/${doi}` : (item?.downloadUrl || item?.urls?.[0] || '');
        const citations = Number(item?.citations || 0) || 0;
        return {
          id: doi || url || title,
          title,
          authors,
          abstract,
          year,
          journal: item?.publisher || 'CORE',
          url,
          citations,
          source: 'core',
          doi
        } as Paper;
      });
    } catch (e) {
      console.warn('CORE search failed:', e);
      return [];
    }
  }

  /**
   * PubMed search via NCBI E-utilities (ESearch + ESummary)
   */
  private async searchPubMed(query: string, limit: number): Promise<Paper[]> {
    try {
      const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
      // ESearch to get IDs
      const esearch = new URL(`${base}/esearch.fcgi`);
      esearch.searchParams.set('db', 'pubmed');
      esearch.searchParams.set('term', query);
      esearch.searchParams.set('retmode', 'json');
      esearch.searchParams.set('retmax', Math.min(50, Math.max(10, limit)).toString());
      const esResp = await this.fetchWithPolicies('pubmed', esearch.toString(), {}, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });
      if (!esResp.ok) throw new Error(`PubMed ESearch error: ${esResp.status}`);
      const esJson: any = await esResp.json().catch(() => null);
      const ids: string[] = esJson?.esearchresult?.idlist || [];
      if (!ids.length) return [];
      // ESummary to fetch details
      const esum = new URL(`${base}/esummary.fcgi`);
      esum.searchParams.set('db', 'pubmed');
      esum.searchParams.set('id', ids.slice(0, Math.min(limit, 50)).join(','));
      esum.searchParams.set('retmode', 'json');
      const sumResp = await this.fetchWithPolicies('pubmed', esum.toString(), {}, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });
      if (!sumResp.ok) throw new Error(`PubMed ESummary error: ${sumResp.status}`);
      const sumJson: any = await sumResp.json().catch(() => null);
      const result: Paper[] = [];
      const uidList: string[] = sumJson?.result?.uids || [];
      for (const uid of uidList) {
        const it = sumJson.result[uid];
        if (!it) continue;
        const title = it?.title || 'No title';
        const authors: string[] = (it?.authors || []).map((a: any) => [a?.name, a?.authtype].filter(Boolean).join(' ')).filter(Boolean);
        const year = (it?.pubdate || '').toString().slice(0, 4);
        const journal = it?.fulljournalname || it?.source || 'PubMed';
        const url = it?.elocationid?.startsWith('10.') ? `https://doi.org/${it.elocationid}` : `https://pubmed.ncbi.nlm.nih.gov/${uid}/`;
        const doi = it?.elocationid?.startsWith('10.') ? it.elocationid : undefined;
        result.push({
          id: doi || url || title,
          title,
          authors,
          abstract: '',
          year,
          journal,
          url,
          citations: 0,
          source: 'pubmed',
          doi
        });
      }
      return result;
    } catch (e) {
      console.warn('PubMed search failed:', e);
      return [];
    }
  }

  /**
   * Google Scholar (best-effort HTML parsing). No API key. Subject to blocking; returns [] on failure.
   */
  private async searchGoogleScholarLite(query: string, limit: number): Promise<Paper[]> {
    try {
      const { cleaned, site, filetype } = this.parseQueryOperators(query);
      let q = cleaned;
      if (site) q += ` site:${site}`;
      if (filetype) q += ` filetype:${filetype}`;
      const url = new URL('https://scholar.google.com/scholar');
      url.searchParams.set('q', q);
      url.searchParams.set('hl', 'en');
      const resp = await this.fetchWithPolicies('scholar', url.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Research-Assistant/1.0)' }
      }, { timeoutMs: Math.min(this.REQUEST_TIMEOUT, 4000), retries: 1 });
      if (!resp.ok) throw new Error(String(resp.status));
      const html = await resp.text();
      const results: Paper[] = [];
      const re = /<h3 class=\"gs_rt\">[\s\S]*?<a href=\"([^\"]+)\"[\s\S]*?>([\s\S]*?)<\/a>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) && results.length < limit) {
        const href = m[1];
        const title = m[2].replace(/<[^>]+>/g, '').trim();
        if (!title) continue;
        results.push({
          id: href || title,
          title,
          authors: [],
          abstract: '',
          year: '',
          journal: 'Google Scholar',
          url: href,
          citations: 0,
          source: 'scholar'
        });
      }
      return results;
    } catch {
      return [];
    }
  }

  /**
   * Shodhganga (DSpace) search via simple-search HTML. No API key.
   */
  private async searchShodhganga(query: string, limit: number): Promise<Paper[]> {
    try {
      const { cleaned } = this.parseQueryOperators(query);
      const url = new URL('https://shodhganga.inflibnet.ac.in/simple-search');
      url.searchParams.set('query', cleaned);
      const resp = await this.fetchWithPolicies('shodhganga', url.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Research-Assistant/1.0)' }
      }, { timeoutMs: Math.min(this.REQUEST_TIMEOUT, 5000), retries: 1 });
      if (!resp.ok) throw new Error(String(resp.status));
      const html = await resp.text();
      const results: Paper[] = [];
      const re = /<a[^>]*class=\"ds-artifact-title\"[^>]*href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) && results.length < limit) {
        const path = m[1];
        const title = m[2].replace(/<[^>]+>/g, '').trim();
        const href = path.startsWith('http') ? path : `https://shodhganga.inflibnet.ac.in${path}`;
        results.push({
          id: href || title,
          title: title || 'Shodhganga Result',
          authors: [],
          abstract: '',
          year: '',
          journal: 'Shodhganga',
          url: href,
          citations: 0,
          source: 'shodhganga'
        });
      }
      return results;
    } catch {
      return [];
    }
  }

  /**
   * JSTOR basic search (HTML). Often gated; return [] if blocked.
   */
  private async searchSerpGoogleScholar(query: string, limit: number): Promise<Paper[]> {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) return [];
    try {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google_scholar');
      url.searchParams.set('q', query);
      url.searchParams.set('num', Math.min(20, limit).toString());
      url.searchParams.set('api_key', apiKey);

      const resp = await this.fetchWithPolicies('serpapi', url.toString(), {
        headers: { 'User-Agent': 'AI-Research-Assistant/1.0' }
      }, { timeoutMs: this.REQUEST_TIMEOUT, retries: 2 });
      if (!resp.ok) throw new Error(`SerpAPI error: ${resp.status}`);

      const data = await resp.json();
      const results = data?.organic_results || [];
      return results.slice(0, limit).map((r: any) => {
        const title = r?.title || 'No title';
        const authors = (r?.publication_info?.summary || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const yearMatch = r?.publication_info?.summary?.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : '';
        const doi = r?.inline_links?.doi || undefined;
        return {
          id: r.result_id || r.link || title,
          title,
          authors,
          abstract: r?.snippet || '',
          year,
          journal: r?.publication_info?.container_title || 'Google Scholar',
          url: r?.link,
          citations: r?.inline_links?.cited_by?.total || 0,
          source: 'serpapi',
          doi
        } as Paper;
      });
    } catch (error) {
      console.warn('SerpAPI Google Scholar search failed:', error);
      return [];
    }
  }

  private async searchJSTORLite(query: string, limit: number): Promise<Paper[]> {
    try {
      const { cleaned } = this.parseQueryOperators(query);
      const url = new URL('https://www.jstor.org/action/doBasicSearch');
      url.searchParams.set('Query', cleaned);
      const resp = await this.fetchWithPolicies('jstor', url.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Research-Assistant/1.0)' }
      }, { timeoutMs: Math.min(this.REQUEST_TIMEOUT, 4000), retries: 1 });
      if (!resp.ok) throw new Error(String(resp.status));
      const html = await resp.text();
      const results: Paper[] = [];
      const re = /<a[^>]*class=\"title\"[^>]*href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) && results.length < limit) {
        const path = m[1];
        const href = path.startsWith('http') ? path : `https://www.jstor.org${path}`;
        const title = m[2].replace(/<[^>]+>/g, '').trim();
        results.push({
          id: href || title,
          title: title || 'JSTOR Result',
          authors: [],
          abstract: '',
          year: '',
          journal: 'JSTOR',
          url: href,
          citations: 0,
          source: 'jstor'
        });
      }
      return results;
    } catch {
      return [];
    }
  }

  /**
   * Microsoft Academic has been discontinued; use OpenAlex under an alias.
   */
  private async searchMicrosoftAcademic(query: string, limit: number): Promise<Paper[]> {
    return this.searchOpenAlex(query, limit);
  }

  /**
   * Clean expired cache entries
   */
  cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}
