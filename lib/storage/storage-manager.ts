import { 
  IStorageProvider,
  StorageProvider,
  StorageProviderAuth,
  StorageFile,
  StorageQuota,
  UploadOptions,
  DownloadOptions,
  SearchOptions,
  SearchResult,
  FilePermissions,
  StorageProviderConfig
} from './types'
import { GoogleDriveProvider } from './providers/google-drive'
import { StorageCache, storageCache } from './cache'

export class StorageManager {
  private providers: Map<StorageProvider, IStorageProvider> = new Map()
  private activeProvider: StorageProvider | null = null
  private authTokens: Map<StorageProvider, StorageProviderAuth> = new Map()
  public cache: StorageCache = storageCache
  
  constructor() {
    this.loadAuthTokens()
  }
  
  // Provider management
  async connectProvider(provider: StorageProvider, config?: Partial<StorageProviderConfig>): Promise<StorageProviderAuth> {
    const providerInstance = this.createProvider(provider, config)
    
    try {
      const auth = await providerInstance.authenticate()
      
      // Save auth tokens
      this.authTokens.set(provider, auth)
      this.saveAuthTokens()
      
      // Store provider instance
      this.providers.set(provider, providerInstance)
      
      // Set as active if first provider
      if (!this.activeProvider) {
        this.activeProvider = provider
      }
      
      // Get user info and cache it
      const user = await providerInstance.getUser()
      auth.userEmail = user.email
      auth.userId = user.id
      auth.userName = user.name
      auth.avatarUrl = (user as any).picture
      
      return auth
    } catch (error) {
      console.error(`Failed to connect ${provider}:`, error)
      throw error
    }
  }
  
  async disconnectProvider(provider: StorageProvider): Promise<void> {
    const auth = this.authTokens.get(provider)
    const providerInstance = this.providers.get(provider)
    
    if (auth && providerInstance) {
      try {
        await providerInstance.revokeAuth(auth.accessToken)
      } catch (error) {
        console.error(`Failed to revoke auth for ${provider}:`, error)
      }
    }
    
    // Clear from memory
    this.providers.delete(provider)
    this.authTokens.delete(provider)
    
    // Clear from cache
    await storageCache.clearCache(provider)
    
    // Update active provider
    if (this.activeProvider === provider) {
      const remainingProviders = Array.from(this.providers.keys())
      this.activeProvider = remainingProviders[0] || null
    }
    
    this.saveAuthTokens()
  }
  
  async switchProvider(provider: StorageProvider): Promise<void> {
    if (!this.providers.has(provider)) {
      throw new Error(`Provider ${provider} is not connected`)
    }
    
    this.activeProvider = provider
    localStorage.setItem('activeStorageProvider', provider)
  }
  
  getActiveProvider(): IStorageProvider {
    if (!this.activeProvider) {
      throw new Error('No storage provider connected')
    }
    
    const provider = this.providers.get(this.activeProvider)
    if (!provider) {
      throw new Error(`Provider ${this.activeProvider} not initialized`)
    }
    
    return provider
  }
  
  getConnectedProviders(): StorageProvider[] {
    return Array.from(this.providers.keys())
  }
  
  isProviderConnected(provider: StorageProvider): boolean {
    return this.providers.has(provider)
  }
  
  // File operations with caching
  async listFiles(folderId?: string, options?: SearchOptions & { useCache?: boolean }): Promise<SearchResult> {
    const provider = this.getActiveProvider()
    
    // Check cache first if enabled
    if (options?.useCache !== false) {
      const cachedFiles = await storageCache.getCachedFiles(this.activeProvider!, folderId)
      if (cachedFiles.length > 0) {
        return {
          files: cachedFiles,
          nextPageToken: undefined
        }
      }
    }
    
    // Fetch from provider
    const result = await provider.listFiles(folderId, options)
    
    // Cache the results
    await storageCache.cacheFiles(this.activeProvider!, result.files)
    
    return result
  }
  
  async getFile(fileId: string, useCache = true): Promise<StorageFile> {
    const provider = this.getActiveProvider()
    
    // Check cache first
    if (useCache) {
      const cachedFile = await storageCache.getCachedFile(this.activeProvider!, fileId)
      if (cachedFile) {
        return cachedFile
      }
    }
    
    // Fetch from provider
    const file = await provider.getFile(fileId)
    
    // Cache the result
    await storageCache.cacheFile(file)
    
    return file
  }
  
  async uploadFile(
    file: File | Blob, 
    options?: UploadOptions & { cacheContent?: boolean }
  ): Promise<StorageFile> {
    const provider = this.getActiveProvider()
    
    // Add to sync queue for offline support
    if (!navigator.onLine) {
      await storageCache.addToSyncQueue({
        provider: this.activeProvider!,
        type: 'upload',
        data: { file, options }
      })
      
      // Create optimistic response
      const optimisticFile: StorageFile = {
        id: `temp_${Date.now()}`,
        name: file instanceof File ? file.name : 'untitled',
        size: file.size,
        mimeType: file.type,
        createdAt: new Date(),
        modifiedAt: new Date(),
        provider: this.activeProvider!,
        path: options?.parentId || '/',
        isFolder: false,
        syncStatus: 'pending'
      }
      
      await storageCache.cacheFile(optimisticFile)
      return optimisticFile
    }
    
    // Upload to provider
    const uploadedFile = await provider.uploadFile(file, options)
    
    // Cache metadata
    await storageCache.cacheFile(uploadedFile)
    
    // Optionally cache content
    if (options?.cacheContent) {
      await storageCache.cacheFileContent(uploadedFile.id, file)
    }
    
    return uploadedFile
  }
  
  async downloadFile(fileId: string, options?: DownloadOptions & { cache?: boolean }): Promise<Blob> {
    const provider = this.getActiveProvider()
    
    // Check cache first
    if (options?.cache !== false) {
      const cachedContent = await storageCache.getCachedFileContent(fileId)
      if (cachedContent) {
        return cachedContent
      }
    }
    
    // Download from provider
    const content = await provider.downloadFile(fileId, options)
    
    // Cache for future use
    if (options?.cache !== false) {
      await storageCache.cacheFileContent(fileId, content)
    }
    
    return content
  }
  
  async deleteFile(fileId: string): Promise<void> {
    const provider = this.getActiveProvider()
    
    if (!navigator.onLine) {
      // Queue for sync
      await storageCache.addToSyncQueue({
        provider: this.activeProvider!,
        type: 'delete',
        fileId
      })
      
      // Update cache to mark as deleted
      const file = await storageCache.getCachedFile(this.activeProvider!, fileId)
      if (file) {
        file.syncStatus = 'pending_delete'
        await storageCache.cacheFile(file)
      }
      
      return
    }
    
    await provider.deleteFile(fileId)
    
    // Clear from cache
    // Note: We'd need to enhance cache to support single file deletion
  }
  
  async moveFile(fileId: string, newParentId: string): Promise<StorageFile> {
    const provider = this.getActiveProvider()
    
    if (!navigator.onLine) {
      // Queue for sync
      await storageCache.addToSyncQueue({
        provider: this.activeProvider!,
        type: 'move',
        fileId,
        data: { newParentId }
      })
      
      // Update cache optimistically
      const file = await storageCache.getCachedFile(this.activeProvider!, fileId)
      if (file) {
        file.parentId = newParentId
        file.syncStatus = 'pending'
        await storageCache.cacheFile(file)
        return file
      }
    }
    
    const movedFile = await provider.moveFile(fileId, newParentId)
    await storageCache.cacheFile(movedFile)
    return movedFile
  }
  
  async copyFile(fileId: string, newParentId?: string): Promise<StorageFile> {
    const provider = this.getActiveProvider()
    const copiedFile = await provider.copyFile(fileId, newParentId)
    await storageCache.cacheFile(copiedFile)
    return copiedFile
  }
  
  async renameFile(fileId: string, newName: string): Promise<StorageFile> {
    const provider = this.getActiveProvider()
    
    if (!navigator.onLine) {
      // Queue for sync
      await storageCache.addToSyncQueue({
        provider: this.activeProvider!,
        type: 'rename',
        fileId,
        data: { newName }
      })
      
      // Update cache optimistically
      const file = await storageCache.getCachedFile(this.activeProvider!, fileId)
      if (file) {
        file.name = newName
        file.syncStatus = 'pending'
        await storageCache.cacheFile(file)
        return file
      }
    }
    
    const renamedFile = await provider.renameFile(fileId, newName)
    await storageCache.cacheFile(renamedFile)
    return renamedFile
  }
  
  async createFolder(name: string, parentId?: string): Promise<StorageFile> {
    const provider = this.getActiveProvider()
    const folder = await provider.createFolder(name, parentId)
    await storageCache.cacheFile(folder)
    return folder
  }
  
  async searchFiles(query: string, options?: SearchOptions): Promise<SearchResult> {
    const provider = this.getActiveProvider()
    const result = await provider.searchFiles(query, options)
    
    // Cache search results
    await storageCache.cacheFiles(this.activeProvider!, result.files)
    
    return result
  }
  
  // Sharing operations
  async shareFile(fileId: string, email: string, permission: 'view' | 'edit'): Promise<void> {
    const provider = this.getActiveProvider()
    await provider.shareFile(fileId, email, permission)
  }
  
  async unshareFile(fileId: string, email: string): Promise<void> {
    const provider = this.getActiveProvider()
    await provider.unshareFile(fileId, email)
  }
  
  async getFilePermissions(fileId: string): Promise<FilePermissions> {
    const provider = this.getActiveProvider()
    return provider.getFilePermissions(fileId)
  }
  
  // Quota management
  async getQuota(useCache = true): Promise<StorageQuota> {
    const provider = this.getActiveProvider()
    
    // Check cache first
    if (useCache) {
      const cachedQuota = await storageCache.getCachedQuota(this.activeProvider!)
      if (cachedQuota) {
        return cachedQuota
      }
    }
    
    // Fetch from provider
    const quota = await provider.getQuota()
    
    // Cache the result
    await storageCache.cacheQuota(quota)
    
    return quota
  }
  
  // Sync operations
  async syncPendingOperations(): Promise<void> {
    const syncQueue = await storageCache.getSyncQueue(this.activeProvider!)
    
    for (const operation of syncQueue) {
      if (operation.status !== 'pending' || operation.retryCount > 3) {
        continue
      }
      
      try {
        await storageCache.updateSyncStatus(operation.id, 'syncing')
        
        const provider = this.getActiveProvider()
        
        switch (operation.type) {
          case 'upload':
            await provider.uploadFile(operation.data.file, operation.data.options)
            break
          case 'delete':
            await provider.deleteFile(operation.fileId)
            break
          case 'move':
            await provider.moveFile(operation.fileId, operation.data.newParentId)
            break
          case 'rename':
            await provider.renameFile(operation.fileId, operation.data.newName)
            break
        }
        
        await storageCache.updateSyncStatus(operation.id, 'completed')
      } catch (error) {
        console.error(`Sync operation ${operation.id} failed:`, error)
        await storageCache.updateSyncStatus(operation.id, 'failed')
      }
    }
  }
  
  // Private methods
  private createProvider(provider: StorageProvider, config?: Partial<StorageProviderConfig>): IStorageProvider {
    switch (provider) {
      case 'google-drive':
        return new GoogleDriveProvider(config)
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }
  
  private loadAuthTokens(): void {
    const stored = localStorage.getItem('storageAuthTokens')
    if (stored) {
      try {
        const tokens = JSON.parse(stored)
        for (const [provider, auth] of Object.entries(tokens)) {
          // Only restore supported providers
          if (provider === 'google-drive') {
            const providerInstance = this.createProvider('google-drive')
            this.providers.set('google-drive', providerInstance)
            this.authTokens.set('google-drive', auth as StorageProviderAuth)
          }
        }
        
        // Restore active provider
        const activeProvider = localStorage.getItem('activeStorageProvider') as StorageProvider
        if (activeProvider === 'google-drive' && this.providers.has('google-drive')) {
          this.activeProvider = 'google-drive'
        } else if (this.providers.has('google-drive')) {
          this.activeProvider = 'google-drive'
        }
      } catch (error) {
        console.error('Failed to load auth tokens:', error)
      }
    }
  }
  
  private saveAuthTokens(): void {
    const tokens: Record<string, StorageProviderAuth> = {}
    
    for (const [provider, auth] of this.authTokens) {
      tokens[provider] = auth
    }
    
    localStorage.setItem('storageAuthTokens', JSON.stringify(tokens))
    
    if (this.activeProvider) {
      localStorage.setItem('activeStorageProvider', this.activeProvider)
    }
  }
}

// Singleton instance
export const storageManager = new StorageManager()

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    storageManager.syncPendingOperations().catch(console.error)
  })
}
