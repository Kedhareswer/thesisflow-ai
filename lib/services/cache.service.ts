/**
 * Cache Service for managing localStorage and in-memory caching
 * Helps prevent excessive API calls by caching frequently accessed data
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheOptions {
  prefix?: string
  defaultTTL?: number
}

export class CacheService {
  private prefix: string
  private defaultTTL: number
  private memoryCache: Map<string, CacheEntry<any>>

  constructor(options: CacheOptions = {}) {
    this.prefix = options.prefix || 'cache_'
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000 // 5 minutes default
    this.memoryCache = new Map()
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    // Check memory cache first
    const memKey = this.prefix + key
    const memEntry = this.memoryCache.get(memKey)
    if (memEntry && this.isValid(memEntry)) {
      return memEntry.data
    }

    // Check localStorage
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(memKey)
      if (!stored) return null

      const entry: CacheEntry<T> = JSON.parse(stored)
      if (this.isValid(entry)) {
        // Store in memory cache for faster access
        this.memoryCache.set(memKey, entry)
        return entry.data
      }

      // Clean up expired entry
      localStorage.removeItem(memKey)
      this.memoryCache.delete(memKey)
    } catch (error) {
      console.error('Cache get error:', error)
    }

    return null
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }

    const fullKey = this.prefix + key

    // Store in memory cache
    this.memoryCache.set(fullKey, entry)

    // Store in localStorage
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(fullKey, JSON.stringify(entry))
      // Periodically clean up expired entries
      this.clearExpired()
    } catch (error) {
      console.error('Cache set error:', error)
      // If localStorage is full, clear expired entries and try again
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.clearExpired()
        try {
          localStorage.setItem(fullKey, JSON.stringify(entry))
        } catch {
          // Still failed, clear some cache
          this.clear()
        }
      }
    }
  }

  /**
   * Remove item from cache
   */
  remove(key: string): void {
    const fullKey = this.prefix + key
    this.memoryCache.delete(fullKey)
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(fullKey)
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    // Clear memory cache
    this.memoryCache.clear()

    // Clear localStorage
    if (typeof window === 'undefined') return

    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  /**
   * Clear only expired entries
   */
  clearExpired(): void {
    // Clear expired from memory cache
    this.memoryCache.forEach((entry, key) => {
      if (!this.isValid(entry)) {
        this.memoryCache.delete(key)
      }
    })

    // Clear expired from localStorage
    if (typeof window === 'undefined') return

    const keysToCheck: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.prefix)) {
        keysToCheck.push(key)
      }
    }

    keysToCheck.forEach(key => {
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const entry = JSON.parse(stored)
          if (!this.isValid(entry)) {
            localStorage.removeItem(key)
          }
        }
      } catch {
        // Invalid entry, remove it
        localStorage.removeItem(key)
      }
    })
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern

    // Clear from memory cache
    this.memoryCache.forEach((_, key) => {
      const cleanKey = key.replace(this.prefix, '')
      if (regex.test(cleanKey)) {
        this.memoryCache.delete(key)
      }
    })

    // Clear from localStorage
    if (typeof window === 'undefined') return

    const keysToCheck: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.prefix)) {
        const cleanKey = key.replace(this.prefix, '')
        if (regex.test(cleanKey)) {
          keysToCheck.push(key)
        }
      }
    }
    keysToCheck.forEach(key => localStorage.removeItem(key))
  }

  /**
   * Get or fetch data with caching
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check if we have valid cached data
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    try {
      const data = await fetcher()
      this.set(key, data, ttl)
      return data
    } catch (error) {
      // Check if we have expired cache we can use as fallback
      const fullKey = this.prefix + key
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(fullKey)
          if (stored) {
            const entry: CacheEntry<T> = JSON.parse(stored)
            // Return stale data if fetch failed
            console.warn(`Using stale cache for ${key} due to fetch error`)
            return entry.data
          }
        } catch {}
      }
      throw error
    }
  }
}

// Create singleton instances for different cache types
export const userCache = new CacheService({
  prefix: 'bolt_user_',
  defaultTTL: 10 * 60 * 1000 // 10 minutes for user data
})

export const planCache = new CacheService({
  prefix: 'bolt_plan_',
  defaultTTL: 5 * 60 * 1000 // 5 minutes for plan data
})

export const notificationCache = new CacheService({
  prefix: 'bolt_notif_',
  defaultTTL: 2 * 60 * 1000 // 2 minutes for notifications
})

export const apiCache = new CacheService({
  prefix: 'bolt_api_',
  defaultTTL: 3 * 60 * 1000 // 3 minutes for general API calls
})

// Helper to clear all caches on logout
export function clearAllCaches() {
  userCache.clear()
  planCache.clear()
  notificationCache.clear()
  apiCache.clear()
}

// Helper to invalidate user-related caches
export function invalidateUserCaches() {
  userCache.clear()
  planCache.clear()
  notificationCache.clear()
}

export default CacheService
