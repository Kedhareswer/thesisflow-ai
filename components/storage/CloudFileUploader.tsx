'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { storageManager } from '@/lib/storage/storage-manager'
import { StorageFile } from '@/lib/storage/types'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  Cloud,
  Loader2
} from 'lucide-react'

interface CloudFileUploaderProps {
  onUploadComplete?: (files: StorageFile[]) => void
  parentId?: string
  maxFiles?: number
  maxSize?: number
  acceptedTypes?: string[]
}

interface UploadingFile {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  result?: StorageFile
}

export function CloudFileUploader({
  onUploadComplete,
  parentId,
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024, // 100MB
  acceptedTypes
}: CloudFileUploaderProps) {
  const { toast } = useToast()
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map())
  const [isUploading, setIsUploading] = useState(false)

  const uploadFile = async (file: File) => {
    const fileId = `${file.name}-${Date.now()}`
    
    // Initialize upload state
    setUploadingFiles(prev => new Map(prev).set(fileId, {
      file,
      progress: 0,
      status: 'uploading'
    }))

    try {
      // Check if provider is connected
      const providers = storageManager.getConnectedProviders()
      if (providers.length === 0) {
        throw new Error('No cloud storage provider connected. Please connect a provider first.')
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => {
          const next = new Map(prev)
          const current = next.get(fileId)
          if (current && current.progress < 90) {
            current.progress = Math.min(current.progress + 10, 90)
            next.set(fileId, current)
          }
          return next
        })
      }, 200)

      // Upload to cloud storage
      const result = await storageManager.uploadFile(file, {
        parentId,
        cacheContent: true // Cache for offline access
      })

      clearInterval(progressInterval)

      // Update to completed
      setUploadingFiles(prev => {
        const next = new Map(prev)
        next.set(fileId, {
          file,
          progress: 100,
          status: 'completed',
          result
        })
        return next
      })

      return result
    } catch (error: any) {
      // Update to error
      setUploadingFiles(prev => {
        const next = new Map(prev)
        next.set(fileId, {
          file,
          progress: 0,
          status: 'error',
          error: error.message
        })
        return next
      })
      throw error
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    const uploadedFiles: StorageFile[] = []

    for (const file of acceptedFiles) {
      try {
        const result = await uploadFile(file)
        uploadedFiles.push(result)
      } catch (error: any) {
        toast({
          title: 'Upload failed',
          description: `Failed to upload ${file.name}: ${error.message}`,
          variant: 'destructive'
        })
      }
    }

    setIsUploading(false)

    if (uploadedFiles.length > 0) {
      toast({
        title: 'Upload complete',
        description: `Successfully uploaded ${uploadedFiles.length} file(s)`
      })

      if (onUploadComplete) {
        onUploadComplete(uploadedFiles)
      }
    }
  }, [parentId, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept: acceptedTypes ? 
      acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}) : 
      undefined
  })

  const removeFile = (fileId: string) => {
    setUploadingFiles(prev => {
      const next = new Map(prev)
      next.delete(fileId)
      return next
    })
  }

  const clearCompleted = () => {
    setUploadingFiles(prev => {
      const next = new Map(prev)
      Array.from(next.entries()).forEach(([id, file]) => {
        if (file.status === 'completed') {
          next.delete(id)
        }
      })
      return next
    })
  }

  const hasFiles = uploadingFiles.size > 0

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-2">
          <Cloud className="h-12 w-12 text-gray-400" />
          <div>
            <p className="text-sm font-medium">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>
          {maxSize && (
            <p className="text-xs text-muted-foreground">
              Max file size: {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          )}
        </div>
      </div>

      {/* Upload progress */}
      {hasFiles && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">Uploading Files</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCompleted}
                disabled={isUploading}
              >
                Clear completed
              </Button>
            </div>
            <div className="space-y-3">
              {Array.from(uploadingFiles.entries()).map(([id, uploadFile]) => (
                <div key={id} className="flex items-center space-x-3">
                  <File className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadFile.file.name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {uploadFile.status === 'uploading' && (
                        <>
                          <Progress value={uploadFile.progress} className="flex-1 h-1" />
                          <span className="text-xs text-muted-foreground">
                            {uploadFile.progress}%
                          </span>
                        </>
                      )}
                      {uploadFile.status === 'completed' && (
                        <div className="flex items-center text-green-500 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Uploaded
                        </div>
                      )}
                      {uploadFile.status === 'error' && (
                        <div className="flex items-center text-red-500 text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {uploadFile.error}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(id)}
                    disabled={uploadFile.status === 'uploading'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
