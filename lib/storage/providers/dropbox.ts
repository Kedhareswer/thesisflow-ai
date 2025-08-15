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

export class DropboxProvider extends BaseStorageProvider {
  provider: StorageProvider = 'dropbox'
  private readonly API_BASE = 'https://api.dropboxapi.com/2'
  private readonly CONTENT_BASE = 'https://content.dropboxapi.com/2'
  
  constructor(config?: Partial<StorageProviderConfig>) {
    super({
      provider: 'dropbox',
      clientId: config?.clientId || process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.DROPBOX_CLIENT_SECRET || '',
      redirectUri: config?.redirectUri || `${window.location.origin}/api/auth/callback/dropbox`,
      scopes: config?.scopes || [],
      authUrl: 'https://www.dropbox.com/oauth2/authorize',
      tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
      ...config
    })
  }
  
  async authenticate(): Promise<StorageProviderAuth> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      token_access_type: 'offline'
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
      provider: 'dropbox',
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
      refreshToken: refreshToken,
      expiresAt: data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined
    }
    
    return this.auth
  }
  
  async revokeAuth(accessToken: string): Promise<void> {
    await fetch(`${this.API_BASE}/auth/token/revoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
  }
  
  async validateAuth(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/users/get_current_account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: 'null'
      })
      return response.ok
    } catch {
      return false
    }
  }
  
  async listFiles(folderId?: string, options?: SearchOptions): Promise<SearchResult> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/list_folder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: folderId || '',
          recursive: false,
          limit: options?.limit || 100,
          include_deleted: false,
          include_has_explicit_shared_members: true,
          include_mounted_folders: true
        })
      }
    )
    
    const data = await response.json()
    
    return {
      files: data.entries.map((entry: any) => this.mapDropboxFileToStorageFile(entry)),
      nextPageToken: data.has_more ? data.cursor : undefined
    }
  }
  
  async getFile(fileId: string): Promise<StorageFile> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/get_metadata`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: fileId,
          include_has_explicit_shared_members: true
        })
      }
    )
    
    const data = await response.json()
    return this.mapDropboxFileToStorageFile(data)
  }
  
  async uploadFile(file: File | Blob, options?: UploadOptions): Promise<StorageFile> {
    const path = options?.parentId 
      ? `${options.parentId}/${file instanceof File ? file.name : 'untitled'}`
      : `/${file instanceof File ? file.name : 'untitled'}`
    
    const response = await this.makeAuthenticatedRequest(
      `${this.CONTENT_BASE}/files/upload`,
      {
        method: 'POST',
        headers: {
          'Dropbox-API-Arg': JSON.stringify({
            path,
            mode: options?.conflictResolution === 'overwrite' ? 'overwrite' : 'add',
            autorename: options?.conflictResolution === 'rename',
            mute: false
          }),
          'Content-Type': 'application/octet-stream'
        },
        body: file
      }
    )
    
    const data = await response.json()
    return this.mapDropboxFileToStorageFile(data)
  }
  
  async downloadFile(fileId: string, options?: DownloadOptions): Promise<Blob> {
    const response = await this.makeAuthenticatedRequest(
      `${this.CONTENT_BASE}/files/download`,
      {
        method: 'POST',
        headers: {
          'Dropbox-API-Arg': JSON.stringify({
            path: fileId
          })
        }
      }
    )
    
    return response.blob()
  }
  
  async deleteFile(fileId: string): Promise<void> {
    await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/delete_v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: fileId
        })
      }
    )
  }
  
  async moveFile(fileId: string, newParentId: string): Promise<StorageFile> {
    const fileName = fileId.split('/').pop()
    const newPath = `${newParentId}/${fileName}`
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/move_v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_path: fileId,
          to_path: newPath,
          autorename: true
        })
      }
    )
    
    const data = await response.json()
    return this.mapDropboxFileToStorageFile(data.metadata)
  }
  
  async copyFile(fileId: string, newParentId?: string): Promise<StorageFile> {
    const fileName = fileId.split('/').pop()
    const toPath = newParentId 
      ? `${newParentId}/${fileName}`
      : `${fileId}_copy`
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/copy_v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_path: fileId,
          to_path: toPath,
          autorename: true
        })
      }
    )
    
    const data = await response.json()
    return this.mapDropboxFileToStorageFile(data.metadata)
  }
  
  async renameFile(fileId: string, newName: string): Promise<StorageFile> {
    const parentPath = fileId.substring(0, fileId.lastIndexOf('/'))
    const newPath = `${parentPath}/${newName}`
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/move_v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_path: fileId,
          to_path: newPath
        })
      }
    )
    
    const data = await response.json()
    return this.mapDropboxFileToStorageFile(data.metadata)
  }
  
  async createFolder(name: string, parentId?: string): Promise<StorageFile> {
    const path = parentId ? `${parentId}/${name}` : `/${name}`
    
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/create_folder_v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path,
          autorename: false
        })
      }
    )
    
    const data = await response.json()
    return this.mapDropboxFileToStorageFile(data.metadata)
  }
  
  async searchFiles(query: string, options?: SearchOptions): Promise<SearchResult> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/files/search_v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          options: {
            path: options?.parentId,
            max_results: options?.limit || 100,
            file_status: 'active'
          }
        })
      }
    )
    
    const data = await response.json()
    
    return {
      files: data.matches.map((match: any) => 
        this.mapDropboxFileToStorageFile(match.metadata.metadata)
      ),
      nextPageToken: data.has_more ? data.cursor : undefined
    }
  }
  
  async shareFile(fileId: string, email: string, permission: 'view' | 'edit'): Promise<void> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/sharing/add_file_member`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: fileId,
          members: [{
            '.tag': 'email',
            email
          }],
          access_level: permission === 'edit' ? 'editor' : 'viewer',
          quiet: false
        })
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to share file')
    }
  }
  
  async unshareFile(fileId: string, email: string): Promise<void> {
    await this.makeAuthenticatedRequest(
      `${this.API_BASE}/sharing/remove_file_member_2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: fileId,
          member: {
            '.tag': 'email',
            email
          }
        })
      }
    )
  }
  
  async getFilePermissions(fileId: string): Promise<FilePermissions> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/sharing/list_file_members`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: fileId,
          limit: 100
        })
      }
    )
    
    const data = await response.json()
    const currentUser = await this.getUser()
    
    const userMember = data.users?.find((u: any) => u.user.email === currentUser.email)
    const isOwner = data.users?.some((u: any) => 
      u.user.email === currentUser.email && u.is_owner
    )
    
    return {
      canRead: true,
      canWrite: userMember?.access_type === 'editor' || isOwner,
      canDelete: isOwner,
      canShare: userMember?.access_type === 'editor' || isOwner,
      isOwner,
      sharedWith: data.users?.map((u: any) => u.user.email) || []
    }
  }
  
  async getQuota(): Promise<StorageQuota> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/users/get_space_usage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'null'
      }
    )
    
    const data = await response.json()
    
    return {
      used: data.used,
      total: data.allocation.allocated,
      provider: this.provider,
      lastUpdated: new Date()
    }
  }
  
  async getUser(): Promise<{ id: string; email: string; name: string }> {
    const response = await this.makeAuthenticatedRequest(
      `${this.API_BASE}/users/get_current_account`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'null'
      }
    )
    
    const data = await response.json()
    
    if (this.auth) {
      this.auth.userEmail = data.email
      this.auth.userId = data.account_id
    }
    
    return {
      id: data.account_id,
      email: data.email,
      name: data.name.display_name
    }
  }
  
  private mapDropboxFileToStorageFile(dropboxFile: any): StorageFile {
    return {
      id: dropboxFile.id || dropboxFile.path_lower || dropboxFile.path_display,
      name: dropboxFile.name,
      mimeType: this.getDropboxMimeType(dropboxFile),
      size: dropboxFile.size || 0,
      createdAt: dropboxFile.client_modified ? new Date(dropboxFile.client_modified) : new Date(),
      modifiedAt: dropboxFile.server_modified ? new Date(dropboxFile.server_modified) : new Date(),
      path: dropboxFile.path_display || dropboxFile.path_lower,
      provider: this.provider,
      parentId: this.getParentPath(dropboxFile.path_display || dropboxFile.path_lower),
      isFolder: dropboxFile['.tag'] === 'folder',
      metadata: {
        rev: dropboxFile.rev,
        content_hash: dropboxFile.content_hash
      }
    }
  }
  
  private getDropboxMimeType(file: any): string {
    if (file['.tag'] === 'folder') {
      return 'application/vnd.dropbox.folder'
    }
    
    const extension = file.name?.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif'
    }
    
    return mimeTypes[extension || ''] || 'application/octet-stream'
  }
  
  private getParentPath(path: string): string {
    const lastSlash = path.lastIndexOf('/')
    return lastSlash > 0 ? path.substring(0, lastSlash) : '/'
  }
}
