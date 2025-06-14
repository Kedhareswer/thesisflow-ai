"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { User, Mail, Calendar, Shield, Edit3, Save, X } from "lucide-react"
import { toast } from "sonner"

export default function ProfilePage() {
  const { user, updateProfile } = useSupabaseAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    institution: "",
    research_interests: "",
  })

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.user_metadata?.full_name || "",
        bio: user.user_metadata?.bio || "",
        institution: user.user_metadata?.institution || "",
        research_interests: user.user_metadata?.research_interests || "",
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    try {
      await updateProfile(formData)
      setIsEditing(false)
      toast.success("Profile updated successfully!")
    } catch (error) {
      toast.error("Failed to update profile")
      console.error("Profile update error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (user) {
      setFormData({
        full_name: user.user_metadata?.full_name || "",
        bio: user.user_metadata?.bio || "",
        institution: user.user_metadata?.institution || "",
        research_interests: user.user_metadata?.research_interests || "",
      })
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view your profile</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-gray-600">Manage your account information and preferences</p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {loading ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="text-2xl bg-gray-100 text-gray-900">
                    {formData.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl">{formData.full_name || "User"}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                {user.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                Joined {new Date(user.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" />
                <Badge variant="secondary">Researcher</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal details and research information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {formData.full_name || "Not provided"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution">Institution</Label>
                  {isEditing ? (
                    <Input
                      id="institution"
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      placeholder="Your institution or organization"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {formData.institution || "Not provided"}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-md min-h-[80px]">
                    {formData.bio || "No bio provided"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="research_interests">Research Interests</Label>
                {isEditing ? (
                  <Textarea
                    id="research_interests"
                    value={formData.research_interests}
                    onChange={(e) => setFormData({ ...formData, research_interests: e.target.value })}
                    placeholder="Your research areas and interests..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-md min-h-[80px]">
                    {formData.research_interests || "No research interests specified"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and security information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium">Email Address</Label>
                <p className="text-sm text-gray-900 mt-1">{user.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Account Status</Label>
                <div className="mt-1">
                  <Badge variant={user.email_confirmed_at ? "default" : "secondary"}>
                    {user.email_confirmed_at ? "Verified" : "Unverified"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Last Sign In</Label>
                <p className="text-sm text-gray-900 mt-1">
                  {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Account Created</Label>
                <p className="text-sm text-gray-900 mt-1">{new Date(user.created_at).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
