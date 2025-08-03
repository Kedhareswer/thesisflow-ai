"use client"

import { useState, useRef, useCallback } from 'react'
import { Upload, Camera, Trash2, Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string
  userId: string
  onUploadComplete: (avatarUrl: string) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ProfilePictureUpload({
  currentAvatarUrl,
  userId,
  onUploadComplete,
  disabled = false,
  size = 'lg'
}: ProfilePictureUploadProps) {
  const { toast } = useToast()
  const { user } = useSupabaseAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24', 
    lg: 'h-32 w-32'
  }

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, WebP, or GIF)'
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return 'File size must be less than 5MB'
    }

    return null
  }

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      toast({
        title: "Invalid file",
        description: validationError,
        variant: "destructive"
      })
      return
    }

    if (!user?.email) {
      toast({
        title: "Upload failed",
        description: "User email not found. Please try logging out and back in.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsUploading(true)

      // Create file path with user ID and timestamp
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      // Delete existing avatar if it exists
      if (currentAvatarUrl) {
        const oldFileName = currentAvatarUrl.split('/').pop()
        if (oldFileName) {
          await supabase.storage
            .from('avatars')
            .remove([`${userId}/${oldFileName}`])
        }
      }

      // Upload new file
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: false,
          cacheControl: '0' // Disable cache
        })

      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL with cache-busting parameter
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`

      // Update user profile with new avatar URL - include email field
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          email: user.email, // Include the required email field
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })

      if (updateError) {
        // Clean up uploaded file if profile update fails
        await supabase.storage.from('avatars').remove([fileName])
        throw new Error(`Profile update failed: ${updateError.message}`)
      }

      // Also update user metadata for consistency
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
      })

      if (metadataError) {
        console.warn('Failed to update user metadata:', metadataError)
        // Don't throw here as the main upload succeeded
      }

      onUploadComplete(avatarUrl)
      setPreviewUrl(null)

      toast({
        title: "Success",
        description: "Profile picture updated successfully"
      })

    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    uploadFile(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [])

  const removeAvatar = async () => {
    if (!currentAvatarUrl || !user?.email) return

    try {
      setIsUploading(true)

      // Remove from storage
      const fileName = currentAvatarUrl.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('avatars')
          .remove([`${userId}/${fileName}`])
      }

      // Update profile to remove avatar URL - include email field
      const { error } = await supabase
        .from('user_profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      onUploadComplete('')

      toast({
        title: "Success",
        description: "Profile picture removed successfully"
      })

    } catch (error) {
      console.error('Remove error:', error)
      toast({
        title: "Error",
        description: "Failed to remove profile picture",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar Display */}
      <div 
        className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-4 border-gray-200 hover:border-gray-300 transition-colors`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Avatar className={`${sizeClasses[size]} cursor-pointer`} onClick={() => !disabled && fileInputRef.current?.click()}>
          <AvatarImage 
            src={previewUrl || currentAvatarUrl || "/placeholder.svg"} 
            alt="Profile picture" 
          />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <User className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>

        {/* Upload Overlay */}
        {!disabled && (
          <div className={`
            absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 
            flex items-center justify-center transition-opacity cursor-pointer
            ${dragActive ? 'opacity-100 bg-blue-500 bg-opacity-20' : ''}
          `}
          onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </div>
        )}
      </div>

      {/* Upload Controls */}
      {!disabled && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>

          {currentAvatarUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={removeAvatar}
              disabled={isUploading}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      )}

      {/* Drag & Drop Instructions */}
      {!disabled && dragActive && (
        <div className="text-sm text-blue-600 font-medium">
          Drop your image here
        </div>
      )}

      {!disabled && !dragActive && (
        <div className="text-xs text-gray-500 text-center max-w-xs">
          Click to upload or drag and drop<br/>
          JPEG, PNG, WebP or GIF (max 5MB)
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  )
}
