"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Save, Edit3, Mail, Calendar, MapPin, Briefcase, GraduationCap, Globe, Camera } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { supabase } from "@/integrations/supabase/client"

interface UserProfile {
  display_name?: string
  bio?: string
  location?: string
  website?: string
  organization?: string
  job_title?: string
  research_interests?: string[]
  phone?: string
  created_at?: string
  last_active?: string
}

export default function ProfilePage() {
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({})
  const [formData, setFormData] = useState<UserProfile>({})

  // Simple avatar component
  const SimpleAvatar = ({
    size = "xl",
    editable = false,
  }: { size?: "sm" | "md" | "lg" | "xl"; editable?: boolean }) => {
    const getInitials = () => {
      if (user?.user_metadata?.display_name) {
        return user.user_metadata.display_name[0].toUpperCase()
      }
      if (user?.email) {
        return user.email[0].toUpperCase()
      }
      return "U"
    }

    const sizeClasses = {
      sm: "h-8 w-8 text-sm",
      md: "h-12 w-12 text-base",
      lg: "h-16 w-16 text-lg",
      xl: "h-24 w-24 text-2xl",
    }

    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold rounded-full flex items-center justify-center relative group ${editable ? "cursor-pointer" : ""}`}
      >
        {getInitials()}
        {editable && (
          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-6 w-6 text-white" />
          </div>
        )}
      </div>
    )
  }

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    try {
      // Try to load from database first
      const { data, error } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).single()

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error)
      }

      // Merge database data with auth metadata
      const profileData: UserProfile = {
        display_name: data?.display_name || user.user_metadata?.display_name || user.user_metadata?.name || "",
        bio: data?.bio || "",
        location: data?.location || "",
        website: data?.website || "",
        organization: data?.organization || "",
        job_title: data?.job_title || "",
        research_interests: data?.research_interests || [],
        phone: data?.phone || "",
        created_at: user.created_at,
        last_active: data?.last_active || new Date().toISOString(),
      }

      setProfile(profileData)
      setFormData(profileData)
    } catch (error) {
      console.error("Error loading profile:", error)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          display_name: formData.display_name,
          bio: formData.bio,
        },
      })

      if (authError) throw authError

      // Update/insert profile in database
      const { error: profileError } = await supabase.from("user_profiles").upsert({
        user_id: user.id,
        email: user.email,
        display_name: formData.display_name,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
        organization: formData.organization,
        job_title: formData.job_title,
        research_interests: formData.research_interests,
        phone: formData.phone,
        updated_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
      })

      if (profileError) throw profileError

      setProfile(formData)
      setEditing(false)

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save profile changes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData(profile)
    setEditing(false)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleResearchInterestsChange = (value: string) => {
    const interests = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    setFormData({ ...formData, research_interests: interests })
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Please sign in to view your profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>

        {!editing ? (
          <Button onClick={() => setEditing(true)} className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Profile Picture & Basic Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <SimpleAvatar size="xl" editable={editing} />
              </div>
              <CardTitle className="text-xl">{profile.display_name || "User"}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1">
                <Mail className="h-4 w-4" />
                {user.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                {profile.job_title && (
                  <p className="flex items-center justify-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4" />
                    {profile.job_title}
                  </p>
                )}

                {profile.organization && (
                  <p className="flex items-center justify-center gap-2 text-sm">
                    <GraduationCap className="h-4 w-4" />
                    {profile.organization}
                  </p>
                )}

                {profile.location && (
                  <p className="flex items-center justify-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </p>
                )}

                {profile.website && (
                  <p className="flex items-center justify-center gap-2 text-sm">
                    <Globe className="h-4 w-4" />
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Website
                    </a>
                  </p>
                )}
              </div>

              <Separator />

              <div className="text-center text-xs text-muted-foreground space-y-1">
                <p className="flex items-center justify-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {formatDate(profile.created_at)}
                </p>
                <p>Last active {formatDate(profile.last_active)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Research Interests */}
          {profile.research_interests && profile.research_interests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Research Interests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.research_interests.map((interest, index) => (
                    <Badge key={index} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Profile Details Form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                {editing ? "Edit your personal information below" : "Your personal information"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  {editing ? (
                    <Input
                      id="display_name"
                      value={formData.display_name || ""}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="Your display name"
                    />
                  ) : (
                    <p className="py-2 px-3 border rounded-md bg-muted/50">{profile.display_name || "Not set"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {editing ? (
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Your phone number"
                    />
                  ) : (
                    <p className="py-2 px-3 border rounded-md bg-muted/50">{profile.phone || "Not set"}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                {editing ? (
                  <Textarea
                    id="bio"
                    value={formData.bio || ""}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                ) : (
                  <p className="py-2 px-3 border rounded-md bg-muted/50 min-h-[80px]">
                    {profile.bio || "No bio added yet"}
                  </p>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  {editing ? (
                    <Input
                      id="job_title"
                      value={formData.job_title || ""}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      placeholder="Your job title"
                    />
                  ) : (
                    <p className="py-2 px-3 border rounded-md bg-muted/50">{profile.job_title || "Not set"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  {editing ? (
                    <Input
                      id="organization"
                      value={formData.organization || ""}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      placeholder="Your organization"
                    />
                  ) : (
                    <p className="py-2 px-3 border rounded-md bg-muted/50">{profile.organization || "Not set"}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  {editing ? (
                    <Input
                      id="location"
                      value={formData.location || ""}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Your location"
                    />
                  ) : (
                    <p className="py-2 px-3 border rounded-md bg-muted/50">{profile.location || "Not set"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  {editing ? (
                    <Input
                      id="website"
                      value={formData.website || ""}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://yourwebsite.com"
                    />
                  ) : (
                    <p className="py-2 px-3 border rounded-md bg-muted/50">{profile.website || "Not set"}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="research_interests">Research Interests</Label>
                <p className="text-sm text-muted-foreground">Separate multiple interests with commas</p>
                {editing ? (
                  <Input
                    id="research_interests"
                    value={formData.research_interests?.join(", ") || ""}
                    onChange={(e) => handleResearchInterestsChange(e.target.value)}
                    placeholder="AI, Machine Learning, Data Science, etc."
                  />
                ) : (
                  <p className="py-2 px-3 border rounded-md bg-muted/50">
                    {profile.research_interests?.join(", ") || "None specified"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
