import { StorageFile, StorageQuota, StorageProvider } from './types'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface FileCacheEntry extends StorageFile {
  content?: Blob
  cachedAt: number
}

export class StorageCache {
  private readonly CACHE_PREFIX = 'storage_cache_'
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB
  private db: IDBDatabase | null = null
  private memoryCache: Map<string, CacheEntry<any>> = new Map()
  
  constructor() {
    this.initIndexedDB()
  }
  
  private async initIndexedDB(): Promise<void> {
    if (!window.indexedDB) {
      console.warn('IndexedDB not supported, falling back to localStorage')
      return
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StorageCache', 1)
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB')
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Store for file metadata
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' })
          fileStore.createIndex('provider', 'provider', { unique: false })
          fileStore.createIndex('parentId', 'parentId', { unique: false })
          fileStore.createIndex('modifiedAt', 'modifiedAt', { unique: false })
        }
        
        // Store for file content blobs
        if (!db.objectStoreNames.contains('blobs')) {
          const blobStore = db.createObjectStore('blobs', { keyPath: 'id' })
          blobStore.createIndex('size', 'size', { unique: false })
          blobStore.createIndex('accessedAt', 'accessedAt', { unique: false })
        }
        
        // Store for quota information
        if (!db.objectStoreNames.contains('quota')) {
          db.createObjectStore('quota', { keyPath: 'provider' })
        }
        
        // Store for sync queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true })
          syncStore.createIndex('provider', 'provider', { unique: false })
          syncStore.createIndex('status', 'status', { unique: false })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }
  
  // File metadata caching
  async cacheFile(file: StorageFile): Promise<void> {
    const cacheKey = this.getCacheKey('file', file.provider, file.id)
    
    // Memory cache for quick access
    this.memoryCache.set(cacheKey, {
      data: file,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL
    })
    
    // Persist to IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['files'], 'readwrite')
      const store = transaction.objectStore('files')
      await this.promisifyRequest(store.put({
        ...file,
        cachedAt: Date.now()
      }))
    } else {
      // Fallback to localStorage
      this.setLocalStorage(cacheKey, file)
    }
  }
  
  async getCachedFile(provider: StorageProvider, fileId: string): Promise<StorageFile | null> {
    const cacheKey = this.getCacheKey('file', provider, fileId)
    
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey)
    if (memoryEntry && this.isValidCache(memoryEntry)) {
      return memoryEntry.data
    }
    
    // Check IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['files'], 'readonly')
      const store = transaction.objectStore('files')
      const file = await this.promisifyRequest<FileCacheEntry>(store.get(fileId))
      
      if (file && this.isValidFileCache(file)) {
        // Refresh memory cache
        this.memoryCache.set(cacheKey, {
          data: file,
          timestamp: Date.now(),
          ttl: this.DEFAULT_TTL
        })
        return file
      }
    } else {
      // Fallback to localStorage
      return this.getLocalStorage<StorageFile>(cacheKey)
    }
    
    return null
  }
  
  async cacheFiles(provider: StorageProvider, files: StorageFile[]): Promise<void> {
    if (!this.db) {
      // Fallback to localStorage for each file
      for (const file of files) {
        await this.cacheFile(file)
      }
      return
    }
    
    const transaction = this.db.transaction(['files'], 'readwrite')
    const store = transaction.objectStore('files')
    
    for (const file of files) {
      const cacheKey = this.getCacheKey('file', provider, file.id)
      
      // Update memory cache
      this.memoryCache.set(cacheKey, {
        data: file,
        timestamp: Date.now(),
        ttl: this.DEFAULT_TTL
      })
      
      // Update IndexedDB
      await this.promisifyRequest(store.put({
        ...file,
        cachedAt: Date.now()
      }))
    }
  }
  
  async getCachedFiles(provider: StorageProvider, parentId?: string): Promise<StorageFile[]> {
    if (!this.db) {
      // Fallback to localStorage - limited functionality
      const files: StorageFile[] = []
      const keys = Object.keys(localStorage).filter(k => 
        k.startsWith(`${this.CACHE_PREFIX}file_${provider}_`)
      )
      
      for (const key of keys) {
        const file = this.getLocalStorage<StorageFile>(key)
        if (file && (!parentId || file.parentId === parentId)) {
          files.push(file)
        }
      }
      
      return files
    }
    
    const transaction = this.db.transaction(['files'], 'readonly')
    const store = transaction.objectStore('files')
    const index = store.index('provider')
    
    const files: StorageFile[] = []
    const request = index.openCursor(IDBKeyRange.only(provider))
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const file = cursor.value as FileCacheEntry
          if (!parentId || file.parentId === parentId) {
            if (this.isValidFileCache(file)) {
              files.push(file)
            }
          }
          cursor.continue()
        } else {
          resolve(files)
        }
      }
      
      request.onerror = () => {
        console.error('Failed to read cached files')
        resolve([])
      }
    })
  }
  
  // File content caching
  async cacheFileContent(fileId: string, content: Blob): Promise<void> {
    if (!this.db) {
      console.warn('Cannot cache file content without IndexedDB')
      return
    }
    
    // Check cache size before adding
    const currentSize = await this.getCacheSize()
    if (currentSize + content.size > this.MAX_CACHE_SIZE) {
      await this.evictOldContent()
    }
    
    const transaction = this.db.transaction(['blobs'], 'readwrite')
    const store = transaction.objectStore('blobs')
    
    await this.promisifyRequest(store.put({
      id: fileId,
      content,
      size: content.size,
      accessedAt: Date.now(),
      cachedAt: Date.now()
    }))
  }
  
  async getCachedFileContent(fileId: string): Promise<Blob | null> {
    if (!this.db) {
      return null
    }
    
    const transaction = this.db.transaction(['blobs'], 'readwrite')
    const store = transaction.objectStore('blobs')
    const entry = await this.promisifyRequest<any>(store.get(fileId))
    
    if (entry) {
      // Update access time
      entry.accessedAt = Date.now()
      await this.promisifyRequest(store.put(entry))
      return entry.content
    }
    
    return null
  }
  
  // Quota caching
  async cacheQuota(quota: StorageQuota): Promise<void> {
    const cacheKey = this.getCacheKey('quota', quota.provider)
    
    // Memory cache
    this.memoryCache.set(cacheKey, {
      data: quota,
      timestamp: Date.now(),
      ttl: 60 * 1000 // 1 minute for quota
    })
    
    // Persist
    if (this.db) {
      const transaction = this.db.transaction(['quota'], 'readwrite')
      const store = transaction.objectStore('quota')
      await this.promisifyRequest(store.put(quota))
    } else {
      this.setLocalStorage(cacheKey, quota)
    }
  }
  
  async getCachedQuota(provider: StorageProvider): Promise<StorageQuota | null> {
    const cacheKey = this.getCacheKey('quota', provider)
    
    // Check memory cache
    const memoryEntry = this.memoryCache.get(cacheKey)
    if (memoryEntry && this.isValidCache(memoryEntry)) {
      return memoryEntry.data
    }
    
    // Check persistent storage
    if (this.db) {
      const transaction = this.db.transaction(['quota'], 'readonly')
      const store = transaction.objectStore('quota')
      const quota = await this.promisifyRequest<StorageQuota>(store.get(provider))
      
      if (quota && (Date.now() - quota.lastUpdated.getTime()) < 60000) {
        return quota
      }
    } else {
      return this.getLocalStorage<StorageQuota>(cacheKey)
    }
    
    return null
  }
  
  // Sync queue management
  async addToSyncQueue(operation: {
    provider: StorageProvider
    type: 'upload' | 'delete' | 'move' | 'rename'
    fileId?: string
    data?: any
  }): Promise<void> {
    if (!this.db) {
      console.warn('Sync queue requires IndexedDB')
      return
    }
    
    const transaction = this.db.transaction(['syncQueue'], 'readwrite')
    const store = transaction.objectStore('syncQueue')
    
    await this.promisifyRequest(store.add({
      ...operation,
      status: 'pending',
      timestamp: Date.now(),
      retryCount: 0
    }))
  }
  
  async getSyncQueue(provider?: StorageProvider): Promise<any[]> {
    if (!this.db) {
      return []
    }
    
    const transaction = this.db.transaction(['syncQueue'], 'readonly')
    const store = transaction.objectStore('syncQueue')
    
    if (provider) {
      const index = store.index('provider')
      return this.promisifyRequest(index.getAll(provider))
    }
    
    return this.promisifyRequest(store.getAll())
  }
  
  async updateSyncStatus(id: number, status: 'syncing' | 'completed' | 'failed'): Promise<void> {
    if (!this.db) {
      return
    }
    
    const transaction = this.db.transaction(['syncQueue'], 'readwrite')
    const store = transaction.objectStore('syncQueue')
    const item = await this.promisifyRequest<any>(store.get(id))
    
    if (item) {
      item.status = status
      item.lastAttempt = Date.now()
      
      if (status === 'failed') {
        item.retryCount++
      }
      
      await this.promisifyRequest(store.put(item))
    }
  }
  
  // Cache management
  async clearCache(provider?: StorageProvider): Promise<void> {
    // Clear memory cache
    if (provider) {
      const keysToDelete = Array.from(this.memoryCache.keys()).filter(k => 
        k.includes(`_${provider}_`)
      )
      keysToDelete.forEach(k => this.memoryCache.delete(k))
    } else {
      this.memoryCache.clear()
    }
    
    // Clear IndexedDB
    if (this.db) {
      const stores = ['files', 'blobs', 'quota', 'syncQueue']
      
      for (const storeName of stores) {
        const transaction = this.db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        
        if (provider && store.indexNames.contains('provider')) {
          const index = store.index('provider')
          const request = index.openCursor(IDBKeyRange.only(provider))
          
          await new Promise((resolve) => {
            request.onsuccess = () => {
              const cursor = request.result
              if (cursor) {
                cursor.delete()
                cursor.continue()
              } else {
                resolve(undefined)
              }
            }
          })
        } else if (!provider) {
          await this.promisifyRequest(store.clear())
        }
      }
    }
    
    // Clear localStorage
    const keys = Object.keys(localStorage).filter(k => {
      if (provider) {
        return k.startsWith(this.CACHE_PREFIX) && k.includes(`_${provider}_`)
      }
      return k.startsWith(this.CACHE_PREFIX)
    })
    
    keys.forEach(k => localStorage.removeItem(k))
  }
  
  private async getCacheSize(): Promise<number> {
    if (!this.db) {
      return 0
    }
    
    const transaction = this.db.transaction(['blobs'], 'readonly')
    const store = transaction.objectStore('blobs')
    const allBlobs = await this.promisifyRequest<any[]>(store.getAll())
    
    return allBlobs.reduce((total, entry) => total + (entry.size || 0), 0)
  }
  
  private async evictOldContent(): Promise<void> {
    if (!this.db) {
      return
    }
    
    const transaction = this.db.transaction(['blobs'], 'readwrite')
    const store = transaction.objectStore('blobs')
    const index = store.index('accessedAt')
    
    // Delete oldest accessed items until we're under 80% of max size
    const targetSize = this.MAX_CACHE_SIZE * 0.8
    let currentSize = await this.getCacheSize()
    
    const cursor = index.openCursor()
    
    await new Promise((resolve) => {
      cursor.onsuccess = () => {
        const result = cursor.result
        if (result && currentSize > targetSize) {
          const entry = result.value
          currentSize -= entry.size || 0
          result.delete()
          result.continue()
        } else {
          resolve(undefined)
        }
      }
    })
  }
  
  private getCacheKey(...parts: any[]): string {
    return `${this.CACHE_PREFIX}${parts.join('_')}`
  }
  
  private isValidCache(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }
  
  private isValidFileCache(file: FileCacheEntry): boolean {
    const cachedAt = file.cachedAt || 0
    return Date.now() - cachedAt < this.DEFAULT_TTL
  }
  
  private setLocalStorage(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify({
        data: value,
        timestamp: Date.now()
      }))
    } catch (e) {
      console.warn('Failed to save to localStorage:', e)
      // Clear old entries if storage is full
      this.clearOldLocalStorage()
    }
  }
  
  private getLocalStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key)
      if (!item) return null
      
      const { data, timestamp } = JSON.parse(item)
      if (Date.now() - timestamp > this.DEFAULT_TTL) {
        localStorage.removeItem(key)
        return null
      }
      
      return data
    } catch {
      return null
    }
  }
  
  private clearOldLocalStorage(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.CACHE_PREFIX))
    const now = Date.now()
    
    keys.forEach(key => {
      try {
        const item = localStorage.getItem(key)
        if (item) {
          const { timestamp } = JSON.parse(item)
          if (now - timestamp > this.DEFAULT_TTL) {
            localStorage.removeItem(key)
          }
        }
      } catch {
        localStorage.removeItem(key)
      }
    })
  }
  
  private promisifyRequest<T>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Clear all cached data
  async clear(): Promise<void> {
    try {
      // Clear IndexedDB
      if (this.db) {
        const transaction = this.db.transaction(['files', 'metadata', 'sync_queue'], 'readwrite')
        const filesStore = transaction.objectStore('files')
        const metadataStore = transaction.objectStore('metadata') 
        const syncStore = transaction.objectStore('sync_queue')
        
        await Promise.all([
          this.promisifyRequest(filesStore.clear()),
          this.promisifyRequest(metadataStore.clear()),
          this.promisifyRequest(syncStore.clear())
        ])
      }
      
      // Clear memory cache
      this.memoryCache.clear()
      
      // Clear localStorage cache entries
      const keys = Object.keys(localStorage).filter(k => k.startsWith(this.CACHE_PREFIX))
      keys.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.error('Failed to clear cache:', error)
      throw error
    }
  }
}

// Singleton instance
export const storageCache = new StorageCache()
