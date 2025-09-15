'use client'

import React, { useState, useEffect } from 'react'
import { storageManager } from '@/lib/storage/storage-manager'
import { supabaseStorageManager } from '@/lib/storage/supabase-storage-manager'
import { StorageFile, StorageProvider } from '@/lib/storage/types'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { CloudFileUploader } from './CloudFileUploader'
import {
  Folder,
  File,
  Download,
  Trash2,
  MoreVertical,
  Share2,
  Edit3,
  Copy,
  Move,
  ChevronRight,
  Home,
  RefreshCw,
  Search,
  Grid,
  List,
  Upload
} from 'lucide-react'

interface CloudFileBrowserProps {
  onFileSelect?: (file: StorageFile) => void
  showUpload?: boolean
  allowMultiSelect?: boolean
}

export function CloudFileBrowser({
  onFileSelect,
  showUpload = true,
  allowMultiSelect = false
}: CloudFileBrowserProps) {
  const { toast } = useToast()
  const [files, setFiles] = useState<StorageFile[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [currentFolderId])

  const loadFiles = async () => {
    setLoading(true)
    try {
      // Check if Google Drive is connected and use the appropriate manager
      if (supabaseStorageManager.isGoogleDriveConnected()) {
        const files = await supabaseStorageManager.listGoogleDriveFiles(currentFolderId)
        setFiles(files)
      } else {
        const result = await storageManager.listFiles(currentFolderId, {
          useCache: true,
          limit: 100
        })
        setFiles(result.files)
      }
    } catch (error: any) {
      toast({
        title: 'Failed to load files',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileClick = (file: StorageFile) => {
    if (file.isFolder) {
      // Navigate into folder
      setCurrentPath([...currentPath, file.name])
      setCurrentFolderId(file.id)
      setSelectedFiles(new Set())
    } else {
      // Select file
      if (allowMultiSelect) {
        setSelectedFiles(prev => {
          const next = new Set(prev)
          if (next.has(file.id)) {
            next.delete(file.id)
          } else {
            next.add(file.id)
          }
          return next
        })
      }
      
      if (onFileSelect) {
        onFileSelect(file)
      }
    }
  }

  const handleDownload = async (file: StorageFile) => {
    try {
      let blob: Blob;
      
      // Check if Google Drive is connected and the file is from Google Drive
      if (supabaseStorageManager.isGoogleDriveConnected() && file.provider === 'google-drive') {
        blob = await supabaseStorageManager.downloadGoogleDriveFile(file.id)
      } else {
        blob = await storageManager.downloadFile(file.id, { cache: true })
      }
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: 'Download complete',
        description: `${file.name} has been downloaded`
      })
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async (file: StorageFile) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) {
      return
    }
    
    try {
      // Check if Google Drive is connected and the file is from Google Drive
      if (supabaseStorageManager.isGoogleDriveConnected() && file.provider === 'google-drive') {
        // For Google Drive, we need to get the provider instance and call deleteFile directly
        const provider = supabaseStorageManager.getGoogleDriveProvider()
        await provider.deleteFile(file.id)
      } else {
        await storageManager.deleteFile(file.id)
      }
      await loadFiles()
      
      toast({
        title: 'File deleted',
        description: `${file.name} has been deleted`
      })
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleRename = async (file: StorageFile) => {
    const newName = prompt('Enter new name:', file.name)
    if (!newName || newName === file.name) return
    
    try {
      // Check if Google Drive is connected and the file is from Google Drive
      if (supabaseStorageManager.isGoogleDriveConnected() && file.provider === 'google-drive') {
        // For Google Drive, we need to get the provider instance and call renameFile directly
        const provider = supabaseStorageManager.getGoogleDriveProvider()
        await provider.renameFile(file.id, newName)
      } else {
        await storageManager.renameFile(file.id, newName)
      }
      await loadFiles()
      
      toast({
        title: 'File renamed',
        description: `Renamed to ${newName}`
      })
    } catch (error: any) {
      toast({
        title: 'Rename failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleSearch = async () => {
    if (!searchQuery) {
      await loadFiles()
      return
    }
    
    setLoading(true)
    try {
      // Check if Google Drive is connected and use the appropriate manager
      if (supabaseStorageManager.isGoogleDriveConnected()) {
        // For Google Drive search, we need to get the provider instance and call searchFiles directly
        const provider = supabaseStorageManager.getGoogleDriveProvider()
        const result = await provider.searchFiles(searchQuery, {
          parentId: currentFolderId,
          limit: 100
        })
        setFiles(result.files)
      } else {
        const result = await storageManager.searchFiles(searchQuery, {
          parentId: currentFolderId,
          limit: 100
        })
        setFiles(result.files)
      }
    } catch (error: any) {
      toast({
        title: 'Search failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const navigateToFolder = (index: number) => {
    if (index === -1) {
      // Go to root
      setCurrentPath([])
      setCurrentFolderId(undefined)
    } else {
      // Go to specific folder in path
      setCurrentPath(currentPath.slice(0, index + 1))
      // Note: In production, you'd need to track folder IDs for each path segment
    }
    setSelectedFiles(new Set())
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Breadcrumb */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToFolder(-1)}
          >
            <Home className="h-4 w-4" />
          </Button>
          {currentPath.map((folder, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToFolder(index)}
              >
                {folder}
              </Button>
            </React.Fragment>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-64"
            />
            <Button variant="outline" size="sm" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          {/* View toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Actions */}
          <Button variant="outline" size="sm" onClick={loadFiles}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          {showUpload && (
            <Button onClick={() => setShowUploadDialog(!showUploadDialog)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          )}
        </div>
      </div>

      {/* Upload dialog */}
      {showUploadDialog && (
        <CloudFileUploader
          parentId={currentFolderId}
          onUploadComplete={async (uploadedFiles) => {
            // If Google Drive is connected, we might need to reload the providers
            if (supabaseStorageManager.isGoogleDriveConnected()) {
              await supabaseStorageManager.loadUserProviders()
            }
            loadFiles()
            setShowUploadDialog(false)
          }}
        />
      )}

      {/* File list */}
      {viewMode === 'list' ? (
        <Table>
          <TableHeader>
            <TableRow>
              {allowMultiSelect && <TableHead className="w-12"></TableHead>}
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Modified</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow
                key={file.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleFileClick(file)}
              >
                {allowMultiSelect && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => handleFileClick(file)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {file.isFolder ? (
                      <Folder className="h-4 w-4 text-blue-500" />
                    ) : (
                      <File className="h-4 w-4 text-gray-400" />
                    )}
                    <span>{file.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {file.isFolder ? '-' : formatFileSize(file.size || 0)}
                </TableCell>
                <TableCell>{formatDate(file.modifiedAt)}</TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {file.provider}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu 
                    trigger={
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    }
                  >
                      {!file.isFolder && (
                        <>
                          <div onClick={() => handleDownload(file)} className="px-2 py-1 hover:bg-gray-100 cursor-pointer flex items-center">
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </div>
                          <div className="border-t my-1" />
                        </>
                      )}
                      <div onClick={() => handleRename(file)} className="px-2 py-1 hover:bg-gray-100 cursor-pointer flex items-center">
                        <Edit3 className="mr-2 h-4 w-4" />
                        Rename
                      </div>
                      <div className="px-2 py-1 hover:bg-gray-100 cursor-pointer flex items-center">
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </div>
                      <div className="px-2 py-1 hover:bg-gray-100 cursor-pointer flex items-center">
                        <Move className="mr-2 h-4 w-4" />
                        Move
                      </div>
                      <div className="px-2 py-1 hover:bg-gray-100 cursor-pointer flex items-center">
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </div>
                      <div className="border-t my-1" />
                      <div 
                        onClick={() => handleDelete(file)}
                        className="px-2 py-1 hover:bg-gray-100 cursor-pointer flex items-center text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </div>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex flex-col items-center p-4 rounded-lg hover:bg-muted/50 cursor-pointer"
              onClick={() => handleFileClick(file)}
            >
              {file.isFolder ? (
                <Folder className="h-12 w-12 text-blue-500 mb-2" />
              ) : (
                <File className="h-12 w-12 text-gray-400 mb-2" />
              )}
              <span className="text-sm text-center truncate w-full">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {file.isFolder ? 'Folder' : formatFileSize(file.size || 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
