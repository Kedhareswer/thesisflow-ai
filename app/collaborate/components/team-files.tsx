"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { 
  Upload, 
  File, 
  Link, 
  ExternalLink,
  Download, 
  Trash2, 
  Eye,
  Edit,
  Share,
  Folder,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Loader2,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Globe,
  Lock,
  Copy,
  CheckCircle,
  AlertCircle,
  Cloud,
  HardDrive,
  Github,
  FolderOpen,
  RefreshCw
} from 'lucide-react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { formatDistanceToNow } from 'date-fns'
import { supabaseStorageManager, GoogleDriveOAuthHandler } from '@/lib/storage/supabase-storage-manager'

interface TeamFile {
  id: string
  name: string
  type: 'file' | 'link' | 'folder'
  mime_type?: string
  url?: string
  size?: number
  uploaded_by: string
  uploaded_by_name: string
  uploaded_by_avatar?: string
  created_at: string
  updated_at?: string
  description?: string
  tags?: string[]
  is_public: boolean
  download_count: number
  team_id: string
  platform?: string
}

interface TeamFilesProps {
  teamId: string
  currentUserRole: string
  apiCall?: (url: string, options?: RequestInit) => Promise<any>
}

// Local storage utilities for caching team files
const getStorageKey = (teamId: string) => `team-files-${teamId}`

const loadCachedFiles = (teamId: string): TeamFile[] => {
  try {
    const cached = localStorage.getItem(getStorageKey(teamId))
    return cached ? JSON.parse(cached) : []
  } catch (error) {
    console.warn('Failed to load cached files:', error)
    return []
  }
}

const saveCachedFiles = (teamId: string, files: TeamFile[]) => {
  try {
    localStorage.setItem(getStorageKey(teamId), JSON.stringify(files))
  } catch (error) {
    console.warn('Failed to cache files:', error)
  }
}

const clearCachedFiles = (teamId: string) => {
  try {
    localStorage.removeItem(getStorageKey(teamId))
  } catch (error) {
    console.warn('Failed to clear cached files:', error)
  }
}

export function TeamFiles({ teamId, currentUserRole, apiCall: providedApiCall }: TeamFilesProps) {
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  
  const [files, setFiles] = useState<TeamFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedFromCache, setHasLoadedFromCache] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [reloadLoading, setReloadLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('files')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileDescription, setFileDescription] = useState('')
  const [fileTags, setFileTags] = useState('')
  const [isFilePublic, setIsFilePublic] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  
  // Link sharing states
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkPlatform, setLinkPlatform] = useState<string>('custom')
  const [linkDescription, setLinkDescription] = useState('')
  const [showLinkDialog, setShowLinkDialog] = useState(false)

  // Google Drive integration states
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false)
  const [googleDriveUser, setGoogleDriveUser] = useState<any>(null)
  const [connectingGoogleDrive, setConnectingGoogleDrive] = useState(false)
  const [googleDriveFiles, setGoogleDriveFiles] = useState<any[]>([])
  const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false)
  const [googleDriveLoading, setGoogleDriveLoading] = useState(false)

  // Permissions
  const canUpload = ['owner', 'admin', 'editor'].includes(currentUserRole)
  const canDelete = ['owner', 'admin'].includes(currentUserRole)

  // API helper function - use provided apiCall or fallback to basic fetch
  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    if (providedApiCall) {
      return providedApiCall(url, options)
    }
    
    // Fallback to basic fetch (should not be used in production)
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }, [providedApiCall])

  // Load cached files immediately
  const loadCachedData = useCallback(() => {
    if (teamId && !hasLoadedFromCache) {
      const cachedFiles = loadCachedFiles(teamId)
      if (cachedFiles.length > 0) {
        setFiles(cachedFiles)
        setHasLoadedFromCache(true)
      }
    }
  }, [teamId, hasLoadedFromCache])

  // Load files and links from API
  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true)
      }
      
      // console.log(`[FRONTEND] Loading files for team: ${teamId}`)
      const data = await apiCall(`/api/collaborate/files?teamId=${teamId}`)
      // console.log(`[FRONTEND] API response:`, data)
      
      if (data.success) {
        const freshFiles = data.files || []
        // console.log(`[FRONTEND] Processing ${freshFiles.length} files:`, freshFiles)
        setFiles(freshFiles)
        // Cache the fresh data
        saveCachedFiles(teamId, freshFiles)
        // console.log(`[FRONTEND] Files state updated and cached`)
      } else {
        console.error(`[FRONTEND] API returned success=false:`, data)
      }
    } catch (error) {
      console.error('[FRONTEND] Error loading files:', error)
      // Only show error if we don't have cached data
      if (!hasLoadedFromCache || files.length === 0) {
        toast({
          title: "Error",
          description: "Failed to load team files",
          variant: "destructive"
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [teamId, apiCall, toast, hasLoadedFromCache, files.length])

  // Manual reload function
  const handleReload = useCallback(async () => {
    try {
      setReloadLoading(true)
      console.log(`[FRONTEND] Manual reload triggered for team: ${teamId}`)
      await loadData(false) // Don't show main loading spinner
      toast({
        title: "Files refreshed",
        description: "Team files have been updated",
      })
    } catch (error) {
      console.error('[FRONTEND] Error reloading files:', error)
    } finally {
      setReloadLoading(false)
    }
  }, [loadData, toast, teamId])

  // Initial lazy fetch only once when there's no cache yet
  useEffect(() => {
    if (!teamId) return
    const cached = loadCachedFiles(teamId)
    if (!cached || cached.length === 0) {
      // Warm the list silently without repeating thereafter
      loadData(true)
    }
  }, [teamId, loadData])

  // Load cached data immediately on mount
  useEffect(() => {
    if (teamId) {
      loadCachedData()
    }
  }, [teamId, loadCachedData])

  // Do not auto-fetch; rely on explicit Refresh or post-actions
  // Invitations modal behaves similarly; we follow the same pattern here.

  // Check Google Drive connection status
  useEffect(() => {
    checkGoogleDriveStatus()
  }, [])

  // Check Google Drive connection
  const checkGoogleDriveStatus = async () => {
    try {
      const data = await apiCall('/api/auth/google-drive')
      
      if (data.success && data.connected) {
        setIsGoogleDriveConnected(true)
        setGoogleDriveUser(data.provider)
        await supabaseStorageManager.loadUserProviders()
      } else {
        setIsGoogleDriveConnected(false)
        setGoogleDriveUser(null)
      }
    } catch (error) {
      console.error('Failed to check Google Drive status:', error)
      setIsGoogleDriveConnected(false)
    }
  }

  // Clear cache when teamId changes
  useEffect(() => {
    setHasLoadedFromCache(false)
    setFiles([])
  }, [teamId])

  // Get file icon based on MIME type
  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="h-4 w-4" />
    
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />
    if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4" />
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="h-4 w-4" />
    if (mimeType.includes('code') || mimeType.includes('script')) return <Code className="h-4 w-4" />
    
    return <File className="h-4 w-4" />
  }

  // Get platform icon for links
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'google-drive':
        return <Cloud className="h-4 w-4 text-blue-600" />
      case 'dropbox':
        return <Cloud className="h-4 w-4 text-blue-400" />
      case 'onedrive':
        return <Cloud className="h-4 w-4 text-blue-500" />
      case 'github':
        return <Github className="h-4 w-4" />
      default:
        return <Link className="h-4 w-4" />
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Handle regular file upload (upload to Google Drive and record in team_files)
  const handleFileUpload = async () => {
    if (!selectedFile || !canUpload) return

    try {
      setUploadLoading(true)
      // Ensure Google Drive is connected; if not, connect now
      if (!isGoogleDriveConnected || !supabaseStorageManager.isGoogleDriveConnected()) {
        const oauthHandler = GoogleDriveOAuthHandler.getInstance()
        await oauthHandler.authenticate()
        await checkGoogleDriveStatus()
        await supabaseStorageManager.loadUserProviders()
      }

      // Upload to Drive and create team_files metadata
      const uploaded = await supabaseStorageManager.uploadFileToGoogleDrive(selectedFile, { teamId })

      // Add description/tags via metadata update to our DB record (best-effort)
      const tags = fileTags.split(',').map(tag => tag.trim()).filter(tag => tag)
      try {
        await apiCall('/api/collaborate/files', {
          method: 'POST',
          body: JSON.stringify({
            teamId,
            type: 'file',
            name: uploaded.name,
            url: uploaded.webViewUrl,
            description: fileDescription,
            tags,
            isPublic: isFilePublic,
            fileType: uploaded.mimeType,
            fileSize: uploaded.size
          })
        })
      } catch { /* ignore duplicate insert; Drive upload already created a row */ }

      // Refresh list
      await loadData(false)

      // Reset form
      setSelectedFile(null)
      setFileDescription('')
      setFileTags('')
      setIsFilePublic(false)
      setShowUploadDialog(false)

      toast({
        title: "File uploaded",
        description: `${selectedFile.name} has been uploaded to Google Drive and shared with the team`,
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload file. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploadLoading(false)
    }
  }

  // Connect to Google Drive
  const handleConnectGoogleDrive = async () => {
    try {
      setConnectingGoogleDrive(true)
      const oauthHandler = GoogleDriveOAuthHandler.getInstance()
      await oauthHandler.authenticate()
      
      await checkGoogleDriveStatus()
      toast({
        title: "Google Drive connected",
        description: "You can now upload files from Google Drive",
      })
    } catch (error) {
      console.error('Failed to connect Google Drive:', error)
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Could not connect to Google Drive",
        variant: "destructive"
      })
    } finally {
      setConnectingGoogleDrive(false)
    }
  }

  // Disconnect Google Drive
  const handleDisconnectGoogleDrive = async () => {
    try {
      await supabaseStorageManager.disconnectGoogleDrive()
      setIsGoogleDriveConnected(false)
      setGoogleDriveUser(null)
      
      toast({
        title: "Google Drive disconnected",
        description: "Google Drive integration has been removed",
      })
    } catch (error) {
      console.error('Failed to disconnect Google Drive:', error)
      toast({
        title: "Disconnect failed",
        description: error instanceof Error ? error.message : "Could not disconnect Google Drive",
        variant: "destructive"
      })
    }
  }

  // Load Google Drive files
  const loadGoogleDriveFiles = async () => {
    if (!isGoogleDriveConnected) return
    
    try {
      setGoogleDriveLoading(true)
      const files = await supabaseStorageManager.listGoogleDriveFiles()
      setGoogleDriveFiles(files.slice(0, 20)) // Limit to 20 files for UI
    } catch (error) {
      console.error('Failed to load Google Drive files:', error)
      toast({
        title: "Failed to load files",
        description: "Could not load Google Drive files",
        variant: "destructive"
      })
    } finally {
      setGoogleDriveLoading(false)
    }
  }

  // Upload from Google Drive
  const handleGoogleDriveFileUpload = async (driveFile: any) => {
    if (!canUpload) return

    try {
      setUploadLoading(true)

      // Add to team files with Google Drive reference
      const data = await apiCall('/api/collaborate/files', {
        method: 'POST',
        body: JSON.stringify({
          teamId,
          type: 'file',
          name: driveFile.name,
          url: driveFile.webViewUrl,
          description: `Shared from Google Drive`,
          tags: ['google-drive'],
          isPublic: false,
          fileType: driveFile.mimeType,
          fileSize: driveFile.size,
          cloudStorageId: driveFile.id,
          cloudStorageProvider: 'google-drive'
        }),
      })

      if (data.success) {
        try {
          await loadData(false)
        } catch {
          const updatedFiles = [data.file, ...files]
          setFiles(updatedFiles)
          saveCachedFiles(teamId, updatedFiles)
        }
        setShowGoogleDrivePicker(false)

        toast({
          title: "File shared",
          description: `${driveFile.name} has been shared with the team`,
        })
      }
    } catch (error) {
      console.error('Error sharing Google Drive file:', error)
      toast({
        title: "Share failed",
        description: error instanceof Error ? error.message : "Could not share file from Google Drive",
        variant: "destructive"
      })
    } finally {
      setUploadLoading(false)
    }
  }

  // Handle link sharing
  const handleAddLink = async () => {
    if (!linkTitle.trim() || !linkUrl.trim() || !canUpload) return

    try {
      setUploadLoading(true)

      const data = await apiCall('/api/collaborate/files', {
        method: 'POST',
        body: JSON.stringify({
          teamId,
          type: 'link',
          name: linkTitle.trim(),
          url: linkUrl.trim(),
          description: linkDescription,
          platform: linkPlatform,
          isPublic: false
        }),
      })

      if (data.success) {
        const updatedFiles = [data.file, ...files]
        setFiles(updatedFiles)
        // Update cache with new link
        saveCachedFiles(teamId, updatedFiles)

        // Reset form
        setLinkTitle('')
        setLinkUrl('')
        setLinkDescription('')
        setLinkPlatform('custom')
        setShowLinkDialog(false)

        toast({
          title: "Link added",
          description: `${linkTitle} has been added successfully`,
        })
      }
    } catch (error) {
      console.error('Error adding link:', error)
      toast({
        title: "Failed to add link",
        description: error instanceof Error ? error.message : "Could not add link. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploadLoading(false)
    }
  }

  // Copy link to clipboard
  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: "Copied to clipboard",
        description: "Link has been copied to your clipboard",
      })
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      toast({
        title: "Copy failed",
        description: "Could not copy link to clipboard",
        variant: "destructive"
      })
    }
  }

  // Delete file
  const handleDeleteFile = async (fileId: string, fileName: string, fileType: string = 'file') => {
    try {
      const data = await apiCall(`/api/collaborate/files?id=${fileId}&teamId=${teamId}&type=${fileType}`, {
        method: 'DELETE',
      })

      if (data.success) {
        const updatedFiles = files.filter(file => file.id !== fileId)
        setFiles(updatedFiles)
        // Update cache after deletion
        saveCachedFiles(teamId, updatedFiles)
        toast({
          title: fileType === 'file' ? "File deleted" : "Link deleted",
          description: `${fileName} has been deleted`,
        })
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete file. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Filter files based on search and type
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesFilter = filterType === 'all' || file.type === filterType
    
    return matchesSearch && matchesFilter
  })

  // Separate files and links
  const fileItems = filteredFiles.filter(file => file.type === 'file')
  const linkItems = filteredFiles.filter(file => file.type === 'link')
  
  console.log(`[FRONTEND] Rendering - Total files: ${files.length}, Filtered: ${filteredFiles.length}, File items: ${fileItems.length}, Link items: ${linkItems.length}`)

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files">
            <File className="h-4 w-4 mr-2" />
            Files ({fileItems.length})
          </TabsTrigger>
          <TabsTrigger value="links">
            <Link className="h-4 w-4 mr-2" />
            Shared Links ({linkItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Search and Filter Bar */}
        <div className="flex gap-4 my-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search files and links..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="file">Files Only</SelectItem>
              <SelectItem value="link">Links Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="files" className="space-y-4">
          {/* Upload File Section */}
          {canUpload && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Files
                </CardTitle>
                <CardDescription>
                  Share files with your team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                  
                  {/* Google Drive Integration */}
                  {!isGoogleDriveConnected ? (
                    <Button
                      variant="outline"
                      onClick={handleConnectGoogleDrive}
                      disabled={connectingGoogleDrive}
                      className="gap-2"
                    >
                      <Cloud className="h-4 w-4" />
                      {connectingGoogleDrive ? 'Connecting...' : 'Connect Google Drive'}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Dialog open={showGoogleDrivePicker} onOpenChange={setShowGoogleDrivePicker}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowGoogleDrivePicker(true)
                              loadGoogleDriveFiles()
                            }}
                            className="gap-2"
                          >
                            <Cloud className="h-4 w-4" />
                            Share from Drive
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Select from Google Drive</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Cloud className="h-4 w-4" />
                                Connected as {googleDriveUser?.provider_user_email}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDisconnectGoogleDrive}
                                className="text-red-600 hover:text-red-700"
                              >
                                Disconnect
                              </Button>
                            </div>
                            
                            {googleDriveLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span className="ml-2">Loading files...</span>
                              </div>
                            ) : (
                              <div className="max-h-96 overflow-y-auto space-y-2">
                                {googleDriveFiles.length === 0 ? (
                                  <div className="text-center py-8 text-gray-500">
                                    <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>No files found</p>
                                  </div>
                                ) : (
                                  googleDriveFiles.map((file) => (
                                    <div
                                      key={file.id}
                                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                      onClick={() => handleGoogleDriveFileUpload(file)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded">
                                          {getFileIcon(file.mimeType)}
                                        </div>
                                        <div>
                                          <p className="font-medium text-sm">{file.name}</p>
                                          <p className="text-xs text-gray-500">
                                            {formatFileSize(file.size || 0)} • Modified {formatDistanceToNow(new Date(file.modifiedAt), { addSuffix: true })}
                                          </p>
                                        </div>
                                      </div>
                                      <Button size="sm" variant="ghost">
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        Drive Connected
                      </div>
                    </div>
                  )}
                </div>
                
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                  <DialogTrigger asChild>
                    <div style={{ display: 'none' }} />
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload File</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="file">Choose File</Label>
                        <Input
                          id="file"
                          type="file"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="mt-1"
                        />
                        {selectedFile && (
                          <div className="mt-2 p-2 bg-gray-50 rounded flex items-center gap-2">
                            {getFileIcon(selectedFile.type)}
                            <span className="text-sm">{selectedFile.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {formatFileSize(selectedFile.size)}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe this file..."
                          value={fileDescription}
                          onChange={(e) => setFileDescription(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tags">Tags (optional)</Label>
                        <Input
                          id="tags"
                          placeholder="research, data, analysis (comma separated)"
                          value={fileTags}
                          onChange={(e) => setFileTags(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="public"
                          checked={isFilePublic}
                          onChange={(e) => setIsFilePublic(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="public" className="text-sm">
                          Make this file public to all team members
                        </Label>
                      </div>
                      <Button 
                        onClick={handleFileUpload} 
                        disabled={!selectedFile || uploadLoading}
                        className="w-full"
                      >
                        {uploadLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload File
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Files List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Files</CardTitle>
                  <CardDescription>
                    Files shared by your team members
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReload}
                  disabled={reloadLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${reloadLoading ? 'animate-spin' : ''}`} />
                  {reloadLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading files...</span>
                </div>
              ) : fileItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No files yet</p>
                  <p className="text-sm">
                    {canUpload ? "Upload your first file to get started" : "No files have been shared yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fileItems.map((file) => (
                    <div key={file.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-blue-100 rounded">
                            {getFileIcon(file.mime_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{file.name}</h4>
                            {file.description && (
                              <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {file.uploaded_by_name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                              </div>
                              {file.size && (
                                <Badge variant="outline" className="text-xs">
                                  {formatFileSize(file.size)}
                                </Badge>
                              )}
                              {file.is_public ? (
                                <Badge variant="outline" className="text-xs">
                                  <Globe className="h-3 w-3 mr-1" />
                                  Public
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Private
                                </Badge>
                              )}
                            </div>
                            {file.tags && file.tags.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {file.tags.map((tag, index) => (
                                  <Badge key={`${tag}-${index}`} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {file.url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={file.url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                          {canDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete File</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{file.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteFile(file.id, file.name, file.type)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          {/* Add Link Section */}
          {canUpload && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Share Links
                </CardTitle>
                <CardDescription>
                  Share external links and cloud storage with your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Shared Link</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          placeholder="e.g., Research Documents Folder"
                          value={linkTitle}
                          onChange={(e) => setLinkTitle(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="url">URL</Label>
                        <Input
                          id="url"
                          type="url"
                          placeholder="https://..."
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="platform">Platform</Label>
                        <Select value={linkPlatform} onValueChange={setLinkPlatform}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="google-drive">Google Drive</SelectItem>
                            <SelectItem value="dropbox">Dropbox</SelectItem>
                            <SelectItem value="onedrive">OneDrive</SelectItem>
                            <SelectItem value="github">GitHub</SelectItem>
                            <SelectItem value="custom">Custom/Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="link-description">Description (optional)</Label>
                        <Textarea
                          id="link-description"
                          placeholder="Describe what this link contains..."
                          value={linkDescription}
                          onChange={(e) => setLinkDescription(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        onClick={handleAddLink} 
                        disabled={!linkTitle.trim() || !linkUrl.trim() || uploadLoading}
                        className="w-full"
                      >
                        {uploadLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Link className="h-4 w-4 mr-2" />
                            Add Link
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Links List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Shared Links</CardTitle>
                  <CardDescription>
                    External links and cloud storage shared by your team
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReload}
                  disabled={reloadLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${reloadLoading ? 'animate-spin' : ''}`} />
                  {reloadLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {linkItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Link className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No shared links yet</p>
                  <p className="text-sm">
                    {canUpload ? "Add your first shared link to get started" : "No links have been shared yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {linkItems.map((link) => (
                    <div key={link.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-green-100 rounded">
                            {getPlatformIcon(link.platform || 'custom')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{link.name}</h4>
                            {link.description && (
                              <p className="text-sm text-gray-600 mt-1">{link.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {link.uploaded_by_name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
                              </div>
                              {link.platform && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {link.platform.replace('-', ' ')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard(link.url || '')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {link.url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={link.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                          {canDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Link</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{link.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteFile(link.id, link.name, link.type)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
