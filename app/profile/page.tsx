"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Calendar, MapPin, LinkIcon, Save, Edit, BookOpen, Lightbulb, Users, Activity } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { supabase } from "@/integrations/supabase/client"

interface UserProfile {
  display_name: string
  bio: string
  location: string
  website: string
  research_interests: string[]
  institution: string
  position: string
}

export default function ProfilePage() {
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({
    display_name: "",
    bio: "",
    location: "",
    website: "",
    research_interests: [],
    institution: "",
    position: "",
  })
  const [newInterest, setNewInterest] = useState("")

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error)
        return
      }

      if (data) {
        setProfile({
          display_name: data.display_name || user.user_metadata?.display_name || user.user_metadata?.name || "",
          bio: data.bio || "",
          location: data.location || "",
          website: data.website || "",
          research_interests: data.research_interests || [],
          institution: data.institution || "",
          position: data.position || "",
        })
      } else {
        // Set default values from user metadata
        setProfile((prev) => ({
          ...prev,
          display_name: user.user_metadata?.display_name || user.user_metadata?.name || "",
        }))
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    }
  }

  const saveProfile = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase.from("user_profiles").upsert({
        id: user.id,
        display_name: profile.display_name,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        research_interests: profile.research_interests,
        institution: profile.institution,
        position: profile.position,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setEditing(false)
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      const errorMessage = error instanceof Error ? error.message : 
                          (error as any)?.message || 
                          JSON.stringify(error, null, 2) || 
                          "Unknown error occurred"
      console.error("Detailed error:", errorMessage)
      
      toast({
        title: "Save failed",
        description: `Failed to save profile: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addResearchInterest = () => {
    if (newInterest.trim() && !profile.research_interests.includes(newInterest.trim())) {
      setProfile({
        ...profile,
        research_interests: [...profile.research_interests, newInterest.trim()],
      })
      setNewInterest("")
    }
  }

  const removeResearchInterest = (interest: string) => {
    setProfile({
      ...profile,
      research_interests: profile.research_interests.filter((i) => i !== interest),
    })
  }

  const getInitials = () => {
    if (profile.display_name) {
      return profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return "U"
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
    <div className="container mx-auto py-8 space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your public profile and research information</p>
        </div>
        <Button
          onClick={() => (editing ? saveProfile() : setEditing(true))}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {editing ? (
            <>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Profile"}
            </>
          ) : (
            <>
              <Edit className="h-4 w-4" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Overview */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="/placeholder.svg" alt={profile.display_name} />
                  <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">{profile.display_name || "Anonymous User"}</h2>
                  {profile.position && profile.institution && (
                    <p className="text-sm text-muted-foreground">
                      {profile.position} at {profile.institution}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </div>

                {profile.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                )}

                {profile.website && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LinkIcon className="h-4 w-4" />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      Website
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Papers Explored</span>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Ideas Generated</span>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Collaborations</span>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Your public profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={profile.display_name}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                    disabled={!editing}
                    placeholder="Your display name"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    disabled={!editing}
                    placeholder="City, Country"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="institution">Institution</Label>
                  <Input
                    id="institution"
                    value={profile.institution}
                    onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                    disabled={!editing}
                    placeholder="University or Organization"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={profile.position}
                    onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                    disabled={!editing}
                    placeholder="Your role or title"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  disabled={!editing}
                  placeholder="https://your-website.com"
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  disabled={!editing}
                  placeholder="Tell us about yourself and your research..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Research Interests */}
          <Card>
            <CardHeader>
              <CardTitle>Research Interests</CardTitle>
              <CardDescription>Add topics and areas you're interested in researching</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing && (
                <div className="flex gap-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Add a research interest"
                    onKeyPress={(e) => e.key === "Enter" && addResearchInterest()}
                  />
                  <Button onClick={addResearchInterest} variant="outline">
                    Add
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {profile.research_interests.length > 0 ? (
                  profile.research_interests.map((interest, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {interest}
                      {editing && (
                        <button
                          onClick={() => removeResearchInterest(interest)}
                          className="ml-1 text-xs hover:text-red-600"
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {editing ? "Add your research interests above" : "No research interests added yet"}
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
