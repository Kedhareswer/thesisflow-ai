import { 
  StorageProvider, 
  StorageProviderConfig, 
  StorageProviderAuth, 
  StorageFile, 
  StorageQuota, 
  SearchResult, 
  SearchOptions,
  UploadOptions,
  DownloadOptions,
  IStorageProvider
} from './types'

export abstract class BaseStorageProvider implements IStorageProvider {
  abstract provider: StorageProvider
  protected config: StorageProviderConfig
  protected auth?: StorageProviderAuth
  
  constructor(config: StorageProviderConfig) {
    this.config = config
  }
  
  // Helper method to check if authenticated
  protected checkAuth(): void {
    if (!this.auth || !this.auth.accessToken) {
      throw new Error(`Not authenticated with ${this.provider}`)
    }
    
    // Check if token is expired
    if (this.auth.expiresAt && new Date() > this.auth.expiresAt) {
      throw new Error(`${this.provider} token has expired`)
    }
  }
  
  // Helper method to make authenticated API requests
  protected async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    this.checkAuth()
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.auth!.accessToken}`
      }
    })
    
    if (response.status === 401) {
      // Token might be expired, try to refresh if we have a refresh token
      if (this.auth!.refreshToken) {
        await this.refreshAuth(this.auth!.refreshToken)
        // Retry the request with new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${this.auth!.accessToken}`
          }
        })
      }
      throw new Error('Authentication failed')
    }
    
    return response
  }
  
  // Helper method to handle OAuth flow
  protected async openOAuthPopup(authUrl: string): Promise<StorageProviderAuth | null> {
    // Open auth window
    const authWindow = window.open(
      authUrl,
      'auth',
      'width=500,height=600,left=100,top=100'
    )
    
    return new Promise((resolve, reject) => {
      // Listen for auth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'auth-callback' && event.data.provider === this.provider) {
          window.removeEventListener('message', handleMessage)
          authWindow?.close()
          
          if (event.data.error) {
            reject(new Error(event.data.error))
            return
          }
          
          const { code } = event.data
          
          try {
            // Exchange code for tokens - use abstract method
            const tokenData = await this.exchangeCodeForTokens(code)
            resolve(tokenData)
          } catch (error) {
            reject(error)
          }
        }
      }
      
      window.addEventListener('message', handleMessage)
      
      // Check if window was closed
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          // Don't reject - user cancelled, resolve with null instead
          resolve(null)
        }
      }, 1000)
    })
  }
  
  // Abstract method for token exchange
  protected abstract exchangeCodeForTokens(code: string): Promise<StorageProviderAuth>
  
  // Abstract methods that must be implemented by each provider
  abstract authenticate(): Promise<StorageProviderAuth>
  abstract refreshAuth(refreshToken: string): Promise<StorageProviderAuth>
  abstract revokeAuth(accessToken: string): Promise<void>
  abstract validateAuth(accessToken: string): Promise<boolean>
  abstract listFiles(folderId?: string, options?: SearchOptions): Promise<SearchResult>
  abstract getFile(fileId: string): Promise<StorageFile>
  abstract uploadFile(file: File | Blob, options?: UploadOptions): Promise<StorageFile>
  abstract downloadFile(fileId: string, options?: DownloadOptions): Promise<Blob>
  abstract deleteFile(fileId: string): Promise<void>
  abstract createFolder(name: string, parentId?: string): Promise<StorageFile>
  abstract moveFile(fileId: string, newParentId: string): Promise<StorageFile>
  abstract copyFile(fileId: string, newParentId: string): Promise<StorageFile>
  abstract renameFile(fileId: string, newName: string): Promise<StorageFile>
  abstract searchFiles(query: string, options?: SearchOptions): Promise<SearchResult>
  abstract shareFile(fileId: string, email: string, permission: 'view' | 'edit'): Promise<void>
  abstract unshareFile(fileId: string, email: string): Promise<void>
  abstract getFilePermissions(fileId: string): Promise<any>
  abstract getQuota(): Promise<StorageQuota>
  abstract getUser(): Promise<any>
}
