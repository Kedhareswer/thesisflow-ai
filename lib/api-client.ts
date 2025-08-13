/**
 * Centralized API client with built-in caching, retry logic, and request deduplication
 * Prevents excessive API calls and improves performance
 */

import { apiCache } from './services/cache.service'

interface CacheOptions {
  enabled?: boolean
  ttl?: number // Time to live in milliseconds
  key?: string // Custom cache key
  forceRefresh?: boolean
}

interface RequestOptions extends Omit<RequestInit, 'cache'> {
  cacheOptions?: CacheOptions
  retry?: {
    enabled?: boolean
    maxAttempts?: number
    delay?: number
  }
  dedupe?: boolean // Prevent duplicate concurrent requests
}

interface PendingRequest {
  promise: Promise<any>
  timestamp: number
}

class APIClient {
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private readonly DEDUPE_WINDOW = 100 // ms - requests within this window are considered duplicates

  /**
   * Make an API request with caching and deduplication
   */
  async request<T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      cacheOptions = { enabled: true, ttl: 3 * 60 * 1000 }, // 3 minutes default
      retry = { enabled: true, maxAttempts: 2, delay: 1000 },
      dedupe = true,
      ...fetchOptions
    } = options

    // Generate cache key
    const cacheKey = cacheOptions.key || this.generateCacheKey(url, fetchOptions)
    
    // Check for duplicate in-flight requests (deduplication)
    if (dedupe && fetchOptions.method === 'GET') {
      const pending = this.pendingRequests.get(cacheKey)
      if (pending && Date.now() - pending.timestamp < this.DEDUPE_WINDOW) {
        console.log(`[API] Deduping request to ${url}`)
        return pending.promise
      }
    }

    // Check cache for GET requests
    if (cacheOptions.enabled && !cacheOptions.forceRefresh && fetchOptions.method === 'GET') {
      const cached = apiCache.get<T>(cacheKey)
      if (cached !== null) {
        console.log(`[API] Cache hit for ${url}`)
        return cached
      }
    }

    // Create the request promise
    const requestPromise = this.executeRequest<T>(
      url,
      fetchOptions,
      retry,
      cacheOptions,
      cacheKey
    )

    // Store as pending request for deduplication
    if (dedupe && fetchOptions.method === 'GET') {
      this.pendingRequests.set(cacheKey, {
        promise: requestPromise,
        timestamp: Date.now()
      })

      // Clean up after request completes
      requestPromise.finally(() => {
        this.pendingRequests.delete(cacheKey)
      })
    }

    return requestPromise
  }

  /**
   * Execute the actual request with retry logic
   */
  private async executeRequest<T>(
    url: string,
    options: RequestInit,
    retry: NonNullable<RequestOptions['retry']>,
    cacheOptions: NonNullable<CacheOptions>,
    cacheKey: string
  ): Promise<T> {
    let lastError: Error | null = null
    const maxAttempts = retry.enabled ? retry.maxAttempts! : 1

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[API] Fetching ${url} (attempt ${attempt}/${maxAttempts})`)
        
        const response = await fetch(url, {
          ...options,
          
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        // Cache successful GET responses
        if (cacheOptions.enabled && options.method === 'GET') {
          apiCache.set(cacheKey, data, cacheOptions.ttl)
          console.log(`[API] Cached response for ${url}`)
        }

        return data
      } catch (error) {
        lastError = error as Error
        console.error(`[API] Request failed (attempt ${attempt}):`, error)

        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          break
        }

        // Wait before retrying (except on last attempt)
        if (attempt < maxAttempts && retry.enabled) {
          await this.sleep(retry.delay! * attempt) // Exponential backoff
        }
      }
    }

    // Try to return stale cache on error for GET requests
    if (options.method === 'GET') {
      const staleData = apiCache.get<T>(cacheKey)
      if (staleData !== null) {
        console.warn(`[API] Using stale cache for ${url} due to request failure`)
        return staleData
      }
    }

    throw lastError || new Error('Request failed')
  }

  /**
   * Generate a cache key from URL and options
   */
  private generateCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET'
    const body = options.body ? JSON.stringify(options.body) : ''
    return `${method}_${url}_${body}`
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Convenience methods
   */
  async get<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  async post<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  }

  async put<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  }

  async delete<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  }

  /**
   * Clear all API caches
   */
  clearCache(): void {
    apiCache.clear()
    this.pendingRequests.clear()
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidateCache(pattern: string | RegExp): void {
    apiCache.invalidatePattern(pattern)
  }
}

// Export singleton instance
export const apiClient = new APIClient()

// Export convenience functions
export const api = {
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
  clearCache: apiClient.clearCache.bind(apiClient),
  invalidateCache: apiClient.invalidateCache.bind(apiClient),
}

// Hook for authenticated requests
export function useAuthenticatedAPI() {
  const getAuthHeaders = (): HeadersInit => {
    if (typeof window === 'undefined') return new Headers()
    
    // Get token from localStorage or session
    const session = localStorage.getItem('ai-research-platform-auth')
    if (session) {
      try {
        const parsed = JSON.parse(session)
        const token = parsed?.access_token
        if (token) {
          return new Headers({ Authorization: `Bearer ${token}` })
        }
      } catch {}
    }
    return new Headers()
  }

  return {
    get: <T = any>(url: string, options?: RequestOptions) => {
      const authHeaders = getAuthHeaders()
      return api.get<T>(url, {
        ...options,
        headers: authHeaders
      })
    },
    post: <T = any>(url: string, body?: any, options?: RequestOptions) => {
      const authHeaders = getAuthHeaders()
      return api.post<T>(url, body, {
        ...options,
        headers: authHeaders
      })
    },
    put: <T = any>(url: string, body?: any, options?: RequestOptions) => {
      const authHeaders = getAuthHeaders()
      return api.put<T>(url, body, {
        ...options,
        headers: authHeaders
      })
    },
    delete: <T = any>(url: string, options?: RequestOptions) => {
      const authHeaders = getAuthHeaders()
      return api.delete<T>(url, {
        ...options,
        headers: authHeaders
      })
    },
  }
}
