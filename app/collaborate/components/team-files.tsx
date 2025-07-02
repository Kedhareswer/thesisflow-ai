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
  FolderOpen
} from 'lucide-react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { formatDistanceToNow } from 'date-fns'
import { CloudIntegrations } from './cloud-integrations'

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
}

export function TeamFiles({ teamId, currentUserRole }: TeamFilesProps) {
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  
  const [files, setFiles] = useState<TeamFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadLoading, setUploadLoading] = useState(false)
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

  // Permissions
  const canUpload = ['owner', 'admin', 'editor'].includes(currentUserRole)
  const canDelete = ['owner', 'admin'].includes(currentUserRole)

  // API helper function
  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
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
  }, [])

  // Load files and links
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const data = await apiCall(`/api/collaborate/files?teamId=${teamId}`)
      
      if (data.success) {
        setFiles(data.files || [])
      }
    } catch (error) {
      console.error('Error loading files:', error)
      toast({
        title: "Error",
        description: "Failed to load team files",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [teamId, apiCall, toast])

  useEffect(() => {
    if (teamId) {
      loadData()
    }
  }, [teamId, loadData])

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

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile || !canUpload) return

    try {
      setUploadLoading(true)

      // For now, we'll simulate file upload and store metadata
      // In a real implementation, you'd upload to Supabase Storage first
      const tags = fileTags.split(',').map(tag => tag.trim()).filter(tag => tag)

      const data = await apiCall('/api/collaborate/files', {
        method: 'POST',
        body: JSON.stringify({
          teamId,
          type: 'file',
          name: selectedFile.name,
          url: '', // Would be the actual file URL from storage
          description: fileDescription,
          tags,
          isPublic: isFilePublic,
          fileType: selectedFile.type,
          fileSize: selectedFile.size
        }),
      })

      if (data.success) {
        setFiles(prev => [data.file, ...prev])

        // Reset form
        setSelectedFile(null)
        setFileDescription('')
        setFileTags('')
        setIsFilePublic(false)
        setShowUploadDialog(false)

        toast({
          title: "File uploaded",
          description: `${selectedFile.name} has been uploaded successfully`,
        })
      }
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
        setFiles(prev => [data.file, ...prev])

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
        setFiles(prev => prev.filter(file => file.id !== fileId))
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

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="files">
            <File className="h-4 w-4 mr-2" />
            Files ({fileItems.length})
          </TabsTrigger>
          <TabsTrigger value="links">
            <Link className="h-4 w-4 mr-2" />
            Shared Links ({linkItems.length})
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Cloud className="h-4 w-4 mr-2" />
            Integrations
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
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
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
              <CardTitle>Team Files</CardTitle>
              <CardDescription>
                Files shared by your team members
              </CardDescription>
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
                                  <Badge key={index} variant="secondary" className="text-xs">
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
              <CardTitle>Shared Links</CardTitle>
              <CardDescription>
                External links and cloud storage shared by your team
              </CardDescription>
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

        <TabsContent value="integrations">
          <CloudIntegrations teamId={teamId} currentUserRole={currentUserRole} />
        </TabsContent>
      </Tabs>
    </div>
  )
} 