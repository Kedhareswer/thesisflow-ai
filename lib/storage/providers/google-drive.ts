import { BaseStorageProvider } from '../base-provider'
import {
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
} from '../types'

export class GoogleDriveProvider extends BaseStorageProvider {
  provider: StorageProvider = 'google-drive'
  private readonly API_BASE = 'https://www.googleapis.com/drive/v3'
  private readonly UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'
  
  constructor(config?: Partial<StorageProviderConfig>) {
    super({
      provider: 'google-drive',
      clientId: config?.clientId || process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
      redirectUri: config?.redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback/google-drive` : ''),
      scopes: config?.scopes || [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      ...config
    })
  }
  
  async authenticate(): Promise<StorageProviderAuth> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    })
    
    const authUrl = `${this.config.authUrl}?${params.toString()}`
    const auth = await this.openOAuthPopup(authUrl)
    if (!auth) {
      throw new Error('Authentication was cancelled by user')
    }
    return auth
  }
  
  protected async exchangeCodeForTokens(code: string): Promise<StorageProviderAuth> {
    const response = await fetch(this.config.tokenUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret || '',
        redirect_uri: this.config.redirectUri,
      })
    })
    
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error_description || data.error)
    }
    
    return {
      provider: 'google-drive',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined
    }
  }
  
  async refreshAuth(refreshToken: string): Promise<StorageProviderAuth> {
    const response = await fetch(this.config.tokenUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret || ''
      })
    })
    
    const data = await response.json()
    
    this.auth = {
      provider: this.provider,
      accessToken: data.access_token,
      refreshToken: refreshToken, // Google doesn't always return a new refresh token
      expiresAt: data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scope: data.scope?.split(' ')
    }
    
    return this.auth
  }
  
  async revokeAuth(accessToken: string): Promise<void> {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
      method: 'POST'
    })
  }
  
  async validateAuth(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      return response.ok
    } catch {
      return false
    }
  }
  
  async listFiles(folderId?: string, options?: SearchOptions): Promise<SearchResult> {
    const params = new URLSearchParams({
      pageSize: String(options?.limit || 100),
      fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,parents,thumbnailLink,webViewLink,permissions,owners),nextPageToken'
    })
    
    if (folderId) {
      params.append('q', `'${folderId}' in parents and trashed = false`)
    } else {
      params.append('q', 'trashed = false')
    }
    
    if (options?.pageToken) {
      params.append('pageToken', options.pageToken)
    }
    
    if (options?.orderBy) {
      const orderBy = options.orderBy === 'modifiedTime' ? 'modifiedTime' : 'name'
      params.append('orderBy', `${orderBy} ${options.orderDirection || 'asc'}`)
    }
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files?${params.toString()}`
    )
    
    const data = await response.json()
    // Guard for empty or unexpected responses
    const filesArray = Array.isArray(data?.files) ? data.files : []
    return {
      files: filesArray.map(this.mapGoogleFileToStorageFile),
      nextPageToken: data?.nextPageToken
    }
  }
  
  async getFile(fileId: string): Promise<StorageFile> {
    const params = new URLSearchParams({
      fields: 'id,name,mimeType,size,createdTime,modifiedTime,parents,thumbnailLink,webViewLink,permissions,owners'
    })
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/${fileId}?${params.toString()}`
    )
    
    const data = await response.json()
    return this.mapGoogleFileToStorageFile(data)
  }
  
  async uploadFile(file: File | Blob, options?: UploadOptions): Promise<StorageFile> {
    const metadata = {
      name: file instanceof File ? file.name : 'untitled',
      mimeType: file.type || 'application/octet-stream',
      parents: options?.parentId ? [options.parentId] : undefined,
      description: options?.description
    }
    
    const formData = new FormData()
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    formData.append('file', file)
    
    const response = await this.makeAuthenticatedRequest(
      `${this.UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,parents,thumbnailLink,webViewLink`,
      {
        method: 'POST',
        body: formData
      }
    )
    
    const data = await response.json()
    return this.mapGoogleFileToStorageFile(data)
  }
  
  async downloadFile(fileId: string, options?: DownloadOptions): Promise<Blob> {
    const params = new URLSearchParams({ alt: 'media' })
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/${fileId}?${params.toString()}`
    )
    
    return response.blob()
  }
  
  async deleteFile(fileId: string): Promise<void> {
    await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/${fileId}`,
      { method: 'DELETE' }
    )
  }
  
  async moveFile(fileId: string, newParentId: string): Promise<StorageFile> {
    // First, get current parents
    const file = await this.getFile(fileId)
    const previousParents = file.parentId || 'root'
    
    const params = new URLSearchParams({
      addParents: newParentId,
      removeParents: previousParents,
      fields: 'id,name,mimeType,size,createdTime,modifiedTime,parents,thumbnailLink,webViewLink'
    })
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/${fileId}?${params.toString()}`,
      { method: 'PATCH' }
    )
    
    const data = await response.json()
    return this.mapGoogleFileToStorageFile(data)
  }
  
  async copyFile(fileId: string, newParentId?: string): Promise<StorageFile> {
    const body: any = {}
    if (newParentId) {
      body.parents = [newParentId]
    }
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/${fileId}/copy?fields=id,name,mimeType,size,createdTime,modifiedTime,parents,thumbnailLink,webViewLink`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    )
    
    const data = await response.json()
    return this.mapGoogleFileToStorageFile(data)
  }
  
  async renameFile(fileId: string, newName: string): Promise<StorageFile> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,parents,thumbnailLink,webViewLink`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      }
    )
    
    const data = await response.json()
    return this.mapGoogleFileToStorageFile(data)
  }
  
  async createFolder(name: string, parentId?: string): Promise<StorageFile> {
    const metadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined
    }
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files?fields=id,name,mimeType,createdTime,modifiedTime,parents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      }
    )
    
    const data = await response.json()
    return this.mapGoogleFileToStorageFile(data)
  }
  
  async searchFiles(query: string, options?: SearchOptions): Promise<SearchResult> {
    const q = [`fullText contains '${query}'`, 'trashed = false']
    
    if (options?.mimeType && options.mimeType.length > 0) {
      const mimeTypeQuery = options.mimeType.map(mt => `mimeType='${mt}'`).join(' or ')
      q.push(`(${mimeTypeQuery})`)
    }
    
    if (options?.parentId) {
      q.push(`'${options.parentId}' in parents`)
    }
    
    const params = new URLSearchParams({
      q: q.join(' and '),
      pageSize: String(options?.limit || 100),
      fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,parents,thumbnailLink,webViewLink),nextPageToken'
    })
    
    if (options?.pageToken) {
      params.append('pageToken', options.pageToken)
    }
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files?${params.toString()}`
    )
    
    const data = await response.json()
    
    return {
      files: data.files.map(this.mapGoogleFileToStorageFile),
      nextPageToken: data.nextPageToken
    }
  }
  
  async shareFile(fileId: string, email: string, permission: 'view' | 'edit'): Promise<void> {
    const role = permission === 'edit' ? 'writer' : 'reader'
    
    await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'user',
          role,
          emailAddress: email
        })
      }
    )
  }
  
  async unshareFile(fileId: string, email: string): Promise<void> {
    // First, list permissions to find the permission ID for this email
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/${fileId}/permissions?fields=permissions(id,emailAddress)`
    )
    
    const data = await response.json()
    const permission = data.permissions.find((p: any) => p.emailAddress === email)
    
    if (permission) {
      await this.makeAuthenticatedRequest(
        `${this.API_BASE}/files/${fileId}/permissions/${permission.id}`,
        { method: 'DELETE' }
      )
    }
  }
  
  async getFilePermissions(fileId: string): Promise<FilePermissions> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/${fileId}/permissions?fields=permissions(role,type,emailAddress)`
    )
    
    const data = await response.json()
    const permissions = data.permissions || []
    
    const userPermission = permissions.find((p: any) => p.type === 'user' && p.emailAddress === this.auth?.userEmail)
    const isOwner = userPermission?.role === 'owner'
    const canWrite = isOwner || userPermission?.role === 'writer'
    
    return {
      canRead: true, // If we can fetch permissions, we can read
      canWrite,
      canDelete: isOwner,
      canShare: isOwner || canWrite,
      isOwner,
      sharedWith: permissions
        .filter((p: any) => p.type === 'user')
        .map((p: any) => p.emailAddress)
    }
  }
  
  async getQuota(): Promise<StorageQuota> {
    const response = await this.makeAuthenticatedRequest(
      'https://www.googleapis.com/drive/v3/about?fields=storageQuota'
    )
    
    const data = await response.json()
    
    return {
      used: parseInt(data.storageQuota.usage || '0'),
      total: parseInt(data.storageQuota.limit || '0'),
      provider: this.provider,
      lastUpdated: new Date()
    }
  }
  
  async getUser(): Promise<{ id: string; email: string; name: string; picture?: string }> {
    const response = await this.makeAuthenticatedRequest(
      'https://www.googleapis.com/oauth2/v2/userinfo'
    )
    
    const data = await response.json()
    
    // Store user email for permission checks
    if (this.auth) {
      this.auth.userEmail = data.email
      this.auth.userId = data.id
      this.auth.userName = data.name
      this.auth.avatarUrl = data.picture
    }
    
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture
    }
  }
  
  private mapGoogleFileToStorageFile(googleFile: any): StorageFile {
    return {
      id: googleFile.id,
      name: googleFile.name,
      mimeType: googleFile.mimeType,
      size: parseInt(googleFile.size || '0'),
      createdAt: new Date(googleFile.createdTime),
      modifiedAt: new Date(googleFile.modifiedTime),
      path: googleFile.parents?.[0] || 'root',
      provider: this.provider,
      thumbnailUrl: googleFile.thumbnailLink,
      webViewUrl: googleFile.webViewLink,
      parentId: googleFile.parents?.[0],
      isFolder: googleFile.mimeType === 'application/vnd.google-apps.folder',
      metadata: {
        owners: googleFile.owners,
        permissions: googleFile.permissions
      }
    }
  }
}
