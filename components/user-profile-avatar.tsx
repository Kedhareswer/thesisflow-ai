"use client"

import { useState, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Camera, Upload, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { supabase } from "@/integrations/supabase/client"

interface UserProfileAvatarProps {
  size?: "sm" | "md" | "lg" | "xl"
  editable?: boolean
  className?: string
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12", 
  lg: "h-16 w-16",
  xl: "h-24 w-24"
}

export function UserProfileAvatar({ size = "md", editable = false, className = "" }: UserProfileAvatarProps) {
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.user_metadata?.avatar_url || null
  )

  const getInitials = () => {
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true)

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB')
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file')
      }

      if (!user) {
        throw new Error('User not authenticated')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })

      if (updateError) throw updateError

      // Update user profile in database
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.warn('Profile update failed:', profileError)
        // Don't throw here as the main upload succeeded
      }

      setAvatarUrl(publicUrl)
      
      toast({
        title: "Profile picture updated",
        description: "Your avatar has been successfully updated.",
      })

    } catch (error) {
      console.error('Avatar upload error:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadAvatar(file)
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  if (editable) {
    return (
      <div className="relative group">
        <Avatar className={`${sizeClasses[size]} ${className} cursor-pointer transition-opacity group-hover:opacity-80`}>
          <AvatarImage src={avatarUrl || undefined} alt="Profile picture" />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        {/* Upload overlay */}
        <div 
          className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          onClick={openFileDialog}
        >
          {uploading ? (
            <Upload className="h-4 w-4 text-white animate-spin" />
          ) : (
            <Camera className="h-4 w-4 text-white" />
          )}
        </div>

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </div>
    )
  }

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage src={avatarUrl || undefined} alt="Profile picture" />
      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  )
}
