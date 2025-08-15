# Cloud Storage Integration Setup Guide

## Overview
This guide explains how to set up and use the cloud storage integration feature that allows users to connect their own cloud storage providers (Google Drive, Dropbox, OneDrive) for file storage.

## Features
- **Multi-Provider Support**: Connect Google Drive, Dropbox, and OneDrive
- **Local Caching**: Fast access with IndexedDB caching
- **Offline Support**: Queue operations when offline, sync when reconnected
- **Unified Interface**: Consistent API across all providers
- **Security**: OAuth 2.0 authentication for all providers

## Prerequisites

### Environment Variables
Add the following to your `.env.local` file:

```env
# Google Drive
NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID=your_google_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_google_client_secret

# Dropbox
NEXT_PUBLIC_DROPBOX_CLIENT_ID=your_dropbox_client_id
DROPBOX_CLIENT_SECRET=your_dropbox_client_secret

# OneDrive
NEXT_PUBLIC_ONEDRIVE_CLIENT_ID=your_onedrive_client_id
ONEDRIVE_CLIENT_SECRET=your_onedrive_client_secret

# App URL (for OAuth callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### OAuth Setup

#### Google Drive
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:3000/api/auth/callback/google-drive`
6. Add scopes: `https://www.googleapis.com/auth/drive.file`

#### Dropbox
1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Create a new app
3. Choose "Scoped access" and "Full Dropbox"
4. Add redirect URI: `http://localhost:3000/api/auth/callback/dropbox`
5. Generate access token for development

#### OneDrive
1. Go to [Azure App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Register a new application
3. Add redirect URI: `http://localhost:3000/api/auth/callback/onedrive`
4. Add API permissions: Files.ReadWrite.All
5. Create a client secret

## Installation

```bash
# Install required dependencies
npm install

# Or using pnpm
pnpm install
```

## Usage

### 1. Connect a Storage Provider

```tsx
import { StorageManager } from '@/components/storage/StorageManager'

// In your component
<StorageManager />
```

### 2. Upload Files

```tsx
import { CloudFileUploader } from '@/components/storage/CloudFileUploader'

<CloudFileUploader
  onUploadComplete={(files) => {
    console.log('Uploaded files:', files)
  }}
/>
```

### 3. Browse Files

```tsx
import { CloudFileBrowser } from '@/components/storage/CloudFileBrowser'

<CloudFileBrowser
  onFileSelect={(file) => {
    console.log('Selected file:', file)
  }}
/>
```

### 4. Use in Team Files

```tsx
import { TeamFilesCloud } from '@/app/collaborate/components/team-files-cloud'

<TeamFilesCloud teamId="team-123" />
```

## API Reference

### StorageManager Service

```typescript
import { storageManager } from '@/lib/storage/storage-manager'

// Connect provider
await storageManager.connectProvider('google-drive')

// Upload file
const file = await storageManager.uploadFile(fileBlob, {
  parentId: 'folder-id',
  cacheContent: true
})

// Download file
const blob = await storageManager.downloadFile('file-id')

// List files
const { files } = await storageManager.listFiles('folder-id')

// Search files
const results = await storageManager.searchFiles('query')

// Get quota
const quota = await storageManager.getQuota()
```

## Architecture

### Components
- **BaseStorageProvider**: Abstract base class for providers
- **GoogleDriveProvider**: Google Drive implementation
- **DropboxProvider**: Dropbox implementation  
- **OneDriveProvider**: OneDrive implementation
- **StorageCache**: IndexedDB caching layer
- **StorageManager**: Main service orchestrator

### Data Flow
1. User initiates action (upload/download/list)
2. StorageManager checks cache first
3. If not cached, calls provider API
4. Results cached in IndexedDB
5. Returns data to user

### Offline Support
- Operations queued in IndexedDB when offline
- Automatic sync when connection restored
- Conflict resolution via timestamps

## Configuration

### Storage Settings
Users can configure:
- Default storage provider
- Auto-sync interval
- Cache size limits
- Offline mode
- Compression settings
- Encryption settings

Access via Settings UI or programmatically:

```typescript
const settings = {
  defaultProvider: 'google-drive',
  autoSync: true,
  syncInterval: 5, // minutes
  cacheEnabled: true,
  maxCacheSize: 500, // MB
  offlineMode: true
}

localStorage.setItem('storageSettings', JSON.stringify(settings))
```

## Testing

### Manual Testing
1. Connect each provider
2. Upload test files
3. Browse and download files
4. Test offline mode (disconnect network)
5. Verify sync on reconnection

### Unit Tests
```bash
npm run test:storage
```

## Troubleshooting

### Common Issues

1. **OAuth Error**: Check redirect URIs match exactly
2. **CORS Issues**: Ensure API endpoints allow your domain
3. **Token Expired**: Implement token refresh logic
4. **Cache Full**: Clear cache or increase limit
5. **Sync Conflicts**: Check timestamps and merge strategy

### Debug Mode
Enable debug logging:
```typescript
localStorage.setItem('DEBUG_STORAGE', 'true')
```

## Security Considerations

1. **Token Storage**: Currently uses localStorage (consider secure alternatives)
2. **Encryption**: Optional client-side encryption available
3. **CORS**: Configure appropriate CORS headers
4. **Rate Limiting**: Implement provider-specific rate limits
5. **Data Privacy**: Files stored in user's own cloud accounts

## Future Enhancements

- [ ] AWS S3 integration
- [ ] Azure Blob Storage support
- [ ] WebDAV protocol support
- [ ] File versioning
- [ ] Collaborative editing
- [ ] Advanced search filters
- [ ] Bulk operations
- [ ] File preview generation
- [ ] Automatic backup scheduling
- [ ] End-to-end encryption by default

## Support

For issues or questions:
1. Check this documentation
2. Review provider-specific API docs
3. Check browser console for errors
4. Enable debug mode for detailed logs
