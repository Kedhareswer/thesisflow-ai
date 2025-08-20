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

export class LiteratureSearchService {
  private cache = new Map<string, { data: SearchResult; timestamp: number }>();
  private readonly CACHE_DURATION = 3600000; // 1 hour
  private readonly REQUEST_TIMEOUT = 8000; // 8 seconds per API call
  private readonly MAX_CONCURRENT_REQUESTS = 3;

  constructor(private supabaseClient?: any) {}

  /**
   * Fast parallel literature search with caching and fallbacks
   */
  async searchPapers(query: string, limit: number = 10): Promise<SearchResult> {
    const startTime = Date.now();
    const cacheKey = `${query.toLowerCase().trim()}_${limit}`;

    // Check in-memory cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return {
        ...cached,
        cached: true,
        searchTime: Date.now() - startTime
      };
    }

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
      // Run multiple search APIs in parallel with race conditions for speed
      const searchPromises = [
        this.searchOpenAlex(query, limit),
        this.searchArxiv(query, limit),
        this.searchCrossRef(query, limit)
      ];

      // Use Promise.allSettled to get results from all APIs, even if some fail
      const results = await Promise.allSettled(
        searchPromises.map(promise => 
          Promise.race([
            promise,
            this.timeoutPromise(this.REQUEST_TIMEOUT)
          ])
        )
      );

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
  }

  /**
   * Search OpenAlex API - fastest and most comprehensive
   */
  private async searchOpenAlex(query: string, limit: number): Promise<Paper[]> {
    try {
      const url = new URL('https://api.openalex.org/works');
      url.searchParams.set('search', query);
      url.searchParams.set('per-page', limit.toString());
      url.searchParams.set('mailto', 'research@example.com'); // Replace with actual email

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': 'AI-Research-Assistant/1.0' },
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      if (!response.ok) throw new Error(`OpenAlex API error: ${response.status}`);

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

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

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

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': 'AI-Research-Assistant/1.0 (mailto:research@example.com)' },
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

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
