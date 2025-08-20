import { createClient } from '@supabase/supabase-js'
import { GoogleDriveProvider } from './providers/google-drive'
import { StorageProvider, StorageProviderAuth, StorageFile, UploadOptions } from './types'

export class SupabaseStorageManager {
  private providers: Map<StorageProvider, GoogleDriveProvider> = new Map()
  private activeProvider: StorageProvider | null = null
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  constructor() {
    this.loadUserProviders()
  }
  
  // Load user's connected storage providers from database
  async loadUserProviders(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return
      
      const { data: providers, error } = await this.supabase
        .from('user_storage_providers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      if (error) {
        console.error('Failed to load storage providers:', error)
        return
      }
      
      for (const provider of providers || []) {
        if (provider.provider === 'google-drive') {
          const driveProvider: GoogleDriveProvider = new GoogleDriveProvider()
          
          // Store auth data for internal use - bypass protected property access
          ;(driveProvider as any).auth = {
            provider: 'google-drive',
            accessToken: provider.access_token,
            refreshToken: provider.refresh_token,
            expiresAt: provider.expires_at ? new Date(provider.expires_at) : undefined,
            scope: provider.scope || [],
            userEmail: provider.provider_user_email,
            userId: provider.provider_user_id,
            userName: provider.provider_user_name,
            avatarUrl: provider.provider_user_avatar
          }
          
          this.providers.set('google-drive', driveProvider)
          
          // Set as active if first provider
          if (!this.activeProvider) {
            this.activeProvider = 'google-drive'
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user providers:', error)
    }
  }
  
  // Initialize OAuth flow for Google Drive
  async initGoogleDriveAuth(): Promise<string> {
    try {
      const response = await fetch('/api/auth/google-drive', { 
        method: 'POST',
        credentials: 'include'
      })
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to initialize OAuth')
      }
      
      return data.authUrl
    } catch (error) {
      console.error('Failed to init Google Drive auth:', error)
      throw error
    }
  }
  
  // Complete OAuth flow after callback
  async completeGoogleDriveAuth(code: string): Promise<void> {
    try {
      const response = await fetch('/api/auth/google-drive/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code })
      })
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to complete OAuth')
      }
      
      // Reload providers to include the newly connected one
      await this.loadUserProviders()
      
    } catch (error) {
      console.error('Failed to complete Google Drive auth:', error)
      throw error
    }
  }
  
  // Get active Google Drive provider
  getGoogleDriveProvider(): GoogleDriveProvider {
    const provider = this.providers.get('google-drive')
    if (!provider) {
      throw new Error('Google Drive not connected. Please authenticate first.')
    }
    return provider
  }
  
  // Check if Google Drive is connected
  isGoogleDriveConnected(): boolean {
    return this.providers.has('google-drive')
  }
  
  // Disconnect Google Drive
  async disconnectGoogleDrive(): Promise<void> {
    try {
      const response = await fetch('/api/auth/google-drive', { 
        method: 'DELETE',
        credentials: 'include'
      })
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to disconnect')
      }
      
      // Remove from memory
      this.providers.delete('google-drive')
      if (this.activeProvider === 'google-drive') {
        this.activeProvider = null
      }
      
    } catch (error) {
      console.error('Failed to disconnect Google Drive:', error)
      throw error
    }
  }
  
  // Upload file to Google Drive
  async uploadFileToGoogleDrive(
    file: File, 
    options?: UploadOptions & { teamId?: string }
  ): Promise<StorageFile> {
    const provider = this.getGoogleDriveProvider()
    
    // Refresh token if needed
    await this.refreshTokenIfNeeded(provider)
    
    try {
      const uploadedFile = await provider.uploadFile(file, options)
      
      // If teamId provided, also save to team_files table
      if (options?.teamId) {
        await this.saveTeamFile(uploadedFile, options.teamId)
      }
      
      return uploadedFile
    } catch (error) {
      console.error('Failed to upload to Google Drive:', error)
      throw error
    }
  }
  
  // List files from Google Drive
  async listGoogleDriveFiles(folderId?: string): Promise<StorageFile[]> {
    const provider = this.getGoogleDriveProvider()
    
    // Refresh token if needed
    await this.refreshTokenIfNeeded(provider)
    
    try {
      const result = await provider.listFiles(folderId)
      return result.files
    } catch (error) {
      console.error('Failed to list Google Drive files:', error)
      throw error
    }
  }
  
  // Download file from Google Drive
  async downloadGoogleDriveFile(fileId: string): Promise<Blob> {
    const provider = this.getGoogleDriveProvider()
    
    // Refresh token if needed
    await this.refreshTokenIfNeeded(provider)
    
    try {
      return await provider.downloadFile(fileId)
    } catch (error) {
      console.error('Failed to download from Google Drive:', error)
      throw error
    }
  }
  
  // Share file with team member
  async shareGoogleDriveFile(fileId: string, email: string, permission: 'view' | 'edit'): Promise<void> {
    const provider = this.getGoogleDriveProvider()
    
    // Refresh token if needed
    await this.refreshTokenIfNeeded(provider)
    
    try {
      await provider.shareFile(fileId, email, permission)
    } catch (error) {
      console.error('Failed to share Google Drive file:', error)
      throw error
    }
  }
  
  // Private helper methods
  private async refreshTokenIfNeeded(provider: GoogleDriveProvider): Promise<void> {
    const auth = (provider as any).auth
    if (!auth || !auth.expiresAt) return
    
    const now = new Date()
    const expiresAt = new Date(auth.expiresAt)
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()
    
    // Refresh if expires within 5 minutes
    if (timeUntilExpiry < 5 * 60 * 1000) {
      try {
        if (!auth.refreshToken) {
          throw new Error('No refresh token available')
        }
        
        const newAuth = await provider.refreshAuth(auth.refreshToken)
        
        // Update in database
        const { data: { user } } = await this.supabase.auth.getUser()
        if (user) {
          await this.supabase
            .from('user_storage_providers')
            .update({
              access_token: newAuth.accessToken,
              expires_at: newAuth.expiresAt?.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('provider', 'google-drive')
            
          // Update the provider's auth
          ;(provider as any).auth = newAuth
        }
        
      } catch (error) {
        console.error('Failed to refresh Google Drive token:', error)
        throw new Error('Google Drive authentication expired. Please reconnect.')
      }
    }
  }
  
  private async saveTeamFile(file: StorageFile, teamId: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return
      
      await this.supabase
        .from('team_files')
        .insert({
          team_id: teamId,
          uploader_id: user.id,
          name: file.name,
          type: 'file',
          mime_type: file.mimeType,
          size: file.size,
          cloud_storage_id: file.id,
          cloud_storage_provider: 'google-drive',
          cloud_storage_url: file.webViewUrl,
          is_public: false,
          tags: [],
          description: `Uploaded from Google Drive`
        })
        
    } catch (error) {
      console.error('Failed to save team file record:', error)
      // Don't throw - file upload succeeded, just database record failed
    }
  }
}

// Singleton instance
export const supabaseStorageManager = new SupabaseStorageManager()

// OAuth popup handler for Google Drive
export class GoogleDriveOAuthHandler {
  private static instance: GoogleDriveOAuthHandler
  private popup: Window | null = null
  
  static getInstance(): GoogleDriveOAuthHandler {
    if (!GoogleDriveOAuthHandler.instance) {
      GoogleDriveOAuthHandler.instance = new GoogleDriveOAuthHandler()
    }
    return GoogleDriveOAuthHandler.instance
  }
  
  async authenticate(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Get OAuth URL
        const authUrl = await supabaseStorageManager.initGoogleDriveAuth()
        
        // Open popup
        this.popup = window.open(
          authUrl,
          'google-drive-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        )
        
        if (!this.popup) {
          throw new Error('Popup blocked. Please allow popups for this site.')
        }
        
        // Listen for messages from popup
        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return
          
          if (event.data.type === 'auth-callback' && event.data.provider === 'google-drive') {
            window.removeEventListener('message', handleMessage)
            
            if (event.data.error) {
              reject(new Error(event.data.error))
              return
            }
            
            if (event.data.code) {
              try {
                await supabaseStorageManager.completeGoogleDriveAuth(event.data.code)
                resolve()
              } catch (error) {
                reject(error)
              }
            }
          }
        }
        
        window.addEventListener('message', handleMessage)
        
        // Check if popup is closed manually
        const checkClosed = setInterval(() => {
          if (this.popup?.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', handleMessage)
            reject(new Error('Authentication cancelled'))
          }
        }, 1000)
        
      } catch (error) {
        reject(error)
      }
    })
  }
  
  closePopup(): void {
    if (this.popup) {
      this.popup.close()
      this.popup = null
    }
  }
}
