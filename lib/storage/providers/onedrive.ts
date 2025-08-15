// @ts-nocheck
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

export class OneDriveProvider extends BaseStorageProvider {
  provider: StorageProvider = 'onedrive'
  private readonly API_BASE = 'https://graph.microsoft.com/v1.0'
  
  constructor(config?: Partial<StorageProviderConfig>) {
    super({
      provider: 'onedrive',
      clientId: config?.clientId || process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.ONEDRIVE_CLIENT_SECRET || '',
      redirectUri: config?.redirectUri || `${window.location.origin}/api/auth/callback/onedrive`,
      scopes: config?.scopes || [
        'Files.ReadWrite.All',
        'User.Read',
        'offline_access'
      ],
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      ...config
    })
  }
  
  async authenticate(): Promise<StorageProviderAuth> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      response_mode: 'query'
    })
    
    const authUrl = `${this.config.authUrl}?${params.toString()}`
    return this.performOAuthFlow(authUrl, this.config.tokenUrl!)
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
        client_secret: this.config.clientSecret || '',
        scope: this.config.scopes.join(' ')
      })
    })
    
    const data = await response.json()
    
    this.auth = {
      provider: this.provider,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scope: data.scope?.split(' ')
    }
    
    return this.auth
  }
  
  async revokeAuth(accessToken: string): Promise<void> {
    // Microsoft doesn't provide a revoke endpoint for OAuth tokens
    // Tokens will expire naturally
    this.auth = undefined
  }
  
  async validateAuth(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/me`, {
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
    const path = folderId 
      ? `/me/drive/items/${folderId}/children`
      : '/me/drive/root/children'
    
    const params = new URLSearchParams({
      $top: String(options?.limit || 100),
      $select: 'id,name,size,createdDateTime,lastModifiedDateTime,folder,file,parentReference,@microsoft.graph.downloadUrl,webUrl'
    })
    
    if (options?.orderBy) {
      const orderBy = options.orderBy === 'modifiedTime' ? 'lastModifiedDateTime' : 'name'
      params.append('$orderby', `${orderBy} ${options.orderDirection || 'asc'}`)
    }
    
    if (options?.pageToken) {
      params.append('$skiptoken', options.pageToken)
    }
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}${path}?${params.toString()}`
    )
    
    const data = await response.json()
    
    return {
      files: data.value.map((item: any) => this.mapOneDriveFileToStorageFile(item)),
      nextPageToken: data['@odata.nextLink'] ? this.extractSkipToken(data['@odata.nextLink']) : undefined
    }
  }
  
  async getFile(fileId: string): Promise<StorageFile> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/me/drive/items/${fileId}?$select=id,name,size,createdDateTime,lastModifiedDateTime,folder,file,parentReference,@microsoft.graph.downloadUrl,webUrl`
    )
    
    const data = await response.json()
    return this.mapOneDriveFileToStorageFile(data)
  }
  
  async uploadFile(file: File | Blob, options?: UploadOptions): Promise<StorageFile> {
    const fileName = file instanceof File ? file.name : 'untitled'
    const path = options?.parentId 
      ? `/me/drive/items/${options.parentId}:/${fileName}:/content`
      : `/me/drive/root:/${fileName}:/content`
    
    // For files larger than 4MB, use upload session
    if (file.size > 4 * 1024 * 1024) {
      return this.uploadLargeFile(file, path)
    }
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}${path}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      }
    )
    
    const data = await response.json()
    return this.mapOneDriveFileToStorageFile(data)
  }
  
  private async uploadLargeFile(file: File | Blob, path: string): Promise<StorageFile> {
    // Create upload session
    const sessionResponse = await this.makeAuthenticatedRequest(
      `${this.API_BASE}${path.replace(':/content', ':/createUploadSession')}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item: {
            '@microsoft.graph.conflictBehavior': 'rename'
          }
        })
      }
    )
    
    const session = await sessionResponse.json()
    const uploadUrl = session.uploadUrl
    
    // Upload in chunks
    const chunkSize = 5 * 1024 * 1024 // 5MB chunks
    let start = 0
    
    while (start < file.size) {
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)
      
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes ${start}-${end - 1}/${file.size}`,
          'Content-Type': 'application/octet-stream'
        },
        body: chunk
      })
      
      if (end === file.size) {
        const data = await response.json()
        return this.mapOneDriveFileToStorageFile(data)
      }
      
      start = end
    }
    
    throw new Error('Upload failed')
  }
  
  async downloadFile(fileId: string, options?: DownloadOptions): Promise<Blob> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/me/drive/items/${fileId}/content`
    )
    
    return response.blob()
  }
  
  async deleteFile(fileId: string): Promise<void> {
    await this.makeAuthenticatedRequest(
      `${this.API_BASE}/me/drive/items/${fileId}`,
      { method: 'DELETE' }
    )
  }
  
  async moveFile(fileId: string, newParentId: string): Promise<StorageFile> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/me/drive/items/${fileId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parentReference: {
            id: newParentId
          }
        })
      }
    )
    
    const data = await response.json()
    return this.mapOneDriveFileToStorageFile(data)
  }
  
  async copyFile(fileId: string, newParentId?: string): Promise<StorageFile> {
    const body: any = {}
    
    if (newParentId) {
      body.parentReference = { id: newParentId }
    }
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/me/drive/items/${fileId}/copy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    )
    
    // Copy is async, we need to poll for completion
    const location = response.headers.get('Location')
    if (location) {
      await this.waitForAsyncOperation(location)
    }
    
    // Get the new file
    const newFile = await this.getFile(fileId) // This is a simplification
    return newFile
  }
  
  private async waitForAsyncOperation(url: string): Promise<void> {
    let attempts = 0
    const maxAttempts = 30
    
    while (attempts < maxAttempts) {
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.status === 'completed') {
        return
      } else if (data.status === 'failed') {
        throw new Error('Async operation failed')
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    }
    
    throw new Error('Async operation timeout')
  }
  
  async renameFile(fileId: string, newName: string): Promise<StorageFile> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/me/drive/items/${fileId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      }
    )
    
    const data = await response.json()
    return this.mapOneDriveFileToStorageFile(data)
  }
  
  async createFolder(name: string, parentId?: string): Promise<StorageFile> {
    const path = parentId 
      ? `/me/drive/items/${parentId}/children`
      : '/me/drive/root/children'
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename'
        })
      }
    )
    
    const data = await response.json()
    return this.mapOneDriveFileToStorageFile(data)
  }
  
  async searchFiles(query: string, options?: SearchOptions): Promise<SearchResult> {
    const params = new URLSearchParams({
      $top: String(options?.limit || 100)
    })
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/me/drive/root/search(q='${encodeURIComponent(query)}')?${params.toString()}`
    )
    
    const data = await response.json()
    
    return {
      files: data.value.map((item: any) => this.mapOneDriveFileToStorageFile(item)),
      nextPageToken: data['@odata.nextLink'] ? this.extractSkipToken(data['@odata.nextLink']) : undefined
    }
  }
  
  async shareFile(fileId: string, email: string, permission: 'view' | 'edit'): Promise<void> {
    await this.makeAuthenticatedRequest(
      `${this.API_BASE}/me/drive/items/${fileId}/invite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requireSignIn: true,
          sendInvitation: true,
          roles: [permission === 'edit' ? 'write' : 'read'],
          recipients: [{
            email
          }]
        })
      }
    )
  }
  
  async unshareFile(fileId: string, email: string): Promise<void> {
    // First, get permissions
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/me/drive/items/${fileId}/permissions`
    )
    
    const data = await response.json()
    const permission = data.value.find((p: any) => 
      p.grantedTo?.user?.email === email
    )
    
    if (permission) {
      await this.makeAuthenticatedRequest(
        `${this.API_BASE}/me/drive/items/${fileId}/permissions/${permission.id}`,
        { method: 'DELETE' }
      )
    }
  }
  
  async getFilePermissions(fileId: string): Promise<FilePermissions> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/me/drive/items/${fileId}/permissions`
    )
    
    const data = await response.json()
    const currentUser = await this.getUser()
    
    const userPermission = data.value.find((p: any) => 
      p.grantedTo?.user?.email === currentUser.email
    )
    
    const isOwner = data.value.some((p: any) => 
      p.grantedTo?.user?.email === currentUser.email && p.roles.includes('owner')
    )
    
    const canWrite = userPermission?.roles.includes('write') || isOwner
    
    return {
      canRead: true,
      canWrite,
      canDelete: isOwner,
      canShare: canWrite,
      isOwner,
      sharedWith: data.value
        .filter((p: any) => p.grantedTo?.user?.email)
        .map((p: any) => p.grantedTo.user.email)
    }
  }
  
  async getQuota(): Promise<StorageQuota> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/me/drive`
    )
    
    const data = await response.json()
    
    return {
      used: data.quota.used || 0,
      total: data.quota.total || 0,
      provider: this.provider,
      lastUpdated: new Date()
    }
  }
  
  async getUser(): Promise<{ id: string; email: string; name: string }> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/me`
    )
    
    const data = await response.json()
    
    if (this.auth) {
      this.auth.userEmail = data.mail || data.userPrincipalName
      this.auth.userId = data.id
    }
    
    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName
    }
  }
  
  private mapOneDriveFileToStorageFile(oneDriveFile: any): StorageFile {
    return {
      id: oneDriveFile.id,
      name: oneDriveFile.name,
      mimeType: oneDriveFile.file?.mimeType || (oneDriveFile.folder ? 'application/vnd.onedrive.folder' : 'application/octet-stream'),
      size: oneDriveFile.size || 0,
      createdAt: new Date(oneDriveFile.createdDateTime),
      modifiedAt: new Date(oneDriveFile.lastModifiedDateTime),
      path: oneDriveFile.parentReference?.path || '/',
      provider: this.provider,
      downloadUrl: oneDriveFile['@microsoft.graph.downloadUrl'],
      webViewUrl: oneDriveFile.webUrl,
      parentId: oneDriveFile.parentReference?.id,
      isFolder: !!oneDriveFile.folder,
      metadata: {
        etag: oneDriveFile.eTag,
        cTag: oneDriveFile.cTag
      }
    }
  }
  
  private extractSkipToken(url: string): string {
    const match = url.match(/\$skiptoken=([^&]+)/)
    return match ? match[1] : ''
  }
}
