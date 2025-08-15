// Storage Provider Types and Interfaces

export type StorageProvider = 'google-drive' | 'local'

export interface StorageFile {
  id: string
  name: string
  mimeType: string
  size: number
  createdAt: Date
  modifiedAt: Date
  path: string
  provider: StorageProvider
  thumbnailUrl?: string
  downloadUrl?: string
  webViewUrl?: string
  parentId?: string
  isFolder: boolean
  permissions?: FilePermissions
  metadata?: Record<string, any>
  syncStatus?: 'synced' | 'pending' | 'pending_delete' | 'error'
}

export interface FilePermissions {
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  canShare: boolean
  isOwner: boolean
  sharedWith?: string[]
}

export interface StorageProviderConfig {
  provider: StorageProvider
  clientId: string
  clientSecret?: string
  redirectUri: string
  scopes: string[]
  authUrl?: string
  tokenUrl?: string
  apiBaseUrl?: string
}

export interface StorageProviderAuth {
  provider: StorageProvider
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  userId?: string
  userEmail?: string
  userName?: string
  avatarUrl?: string
  scope?: string[]
}

export interface StorageQuota {
  used: number
  total: number
  provider: StorageProvider
  lastUpdated: Date
}

export interface UploadOptions {
  parentId?: string
  mimeType?: string
  description?: string
  tags?: string[]
  onProgress?: (progress: number) => void
  conflictResolution?: 'rename' | 'overwrite' | 'skip'
}

export interface DownloadOptions {
  version?: string
  exportFormat?: string
  onProgress?: (progress: number) => void
}

export interface SearchOptions {
  query?: string
  mimeType?: string[]
  parentId?: string
  modifiedAfter?: Date
  modifiedBefore?: Date
  limit?: number
  pageToken?: string
  orderBy?: 'name' | 'modifiedTime' | 'size'
  orderDirection?: 'asc' | 'desc'
}

export interface SearchResult {
  files: StorageFile[]
  nextPageToken?: string
  totalResults?: number
}

export interface CachedFile {
  file: StorageFile
  content?: Blob
  cachedAt: Date
  lastAccessed: Date
  size: number
}

export interface FileCacheEntry {
  id: string
  name: string
  mimeType: string
  size: number
  createdAt: Date
  modifiedAt: Date
  path: string
  provider: StorageProvider
  thumbnailUrl?: string
  downloadUrl?: string
  webViewUrl?: string
  parentId?: string
  isFolder: boolean
  permissions?: FilePermissions
  metadata?: Record<string, any>
  syncStatus?: 'synced' | 'pending' | 'pending_delete' | 'error'
  cachedAt: number
  content?: Blob
}

export interface CacheEntry {
  file: StorageFile
  content?: ArrayBuffer
  thumbnail?: string
  cachedAt: Date
  expiresAt: Date
  accessCount: number
  lastAccessed: Date
  size: number
}

export interface SyncStatus {
  provider: StorageProvider
  lastSyncedAt?: Date
  isSyncing: boolean
  pendingUploads: number
  pendingDownloads: number
  errors: SyncError[]
}

export interface SyncError {
  fileId: string
  fileName: string
  error: string
  timestamp: Date
  retryCount: number
}

// Abstract interface that all storage providers must implement
export interface IStorageProvider {
  provider: StorageProvider
  
  // Authentication
  authenticate(): Promise<StorageProviderAuth>
  refreshAuth(refreshToken: string): Promise<StorageProviderAuth>
  revokeAuth(accessToken: string): Promise<void>
  validateAuth(accessToken: string): Promise<boolean>
  
  // File Operations
  listFiles(folderId?: string, options?: SearchOptions): Promise<SearchResult>
  getFile(fileId: string): Promise<StorageFile>
  uploadFile(file: File | Blob, options?: UploadOptions): Promise<StorageFile>
  downloadFile(fileId: string, options?: DownloadOptions): Promise<Blob>
  deleteFile(fileId: string): Promise<void>
  moveFile(fileId: string, newParentId: string): Promise<StorageFile>
  copyFile(fileId: string, newParentId?: string): Promise<StorageFile>
  renameFile(fileId: string, newName: string): Promise<StorageFile>
  
  // Folder Operations
  createFolder(name: string, parentId?: string): Promise<StorageFile>
  
  // Search
  searchFiles(query: string, options?: SearchOptions): Promise<SearchResult>
  
  // Sharing
  shareFile(fileId: string, email: string, permission: 'view' | 'edit'): Promise<void>
  unshareFile(fileId: string, email: string): Promise<void>
  getFilePermissions(fileId: string): Promise<FilePermissions>
  
  // Metadata
  getQuota(): Promise<StorageQuota>
  getUser(): Promise<{ id: string; email: string; name: string; picture?: string }>
}
