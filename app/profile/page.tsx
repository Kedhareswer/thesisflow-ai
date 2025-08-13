"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Calendar, MapPin, LinkIcon, Save, Edit, BookOpen, Lightbulb, Users, Activity, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { supabase } from "@/integrations/supabase/client"
import { ProfilePictureUpload } from "@/components/ui/profile-picture-upload"

interface UserProfile {
  display_name: string
  bio: string
  location: string
  website: string
  research_interests: string[]
  institution: string
  position: string
  avatar_url: string
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
    avatar_url: "",
  })
  const [newInterest, setNewInterest] = useState("")

  // Activity overview state with proper typing
  const [activity, setActivity] = useState<{
    papersExplored: number | null
    ideasGenerated: number | null
    collaborations: number | null
  }>({
    papersExplored: null,
    ideasGenerated: null,
    collaborations: null,
  })
  const [activityLoading, setActivityLoading] = useState(false)
  // Ref to debounce activity reloads triggered by realtime updates
  const activityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (user) {
      loadProfile()
      // Initial load of activity
      loadActivity()
    }
  }, [user]) // Use user object as dependency to avoid missed updates

  // Real-time subscriptions for activity updates
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`activity_updates_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `owner_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Documents updated:', payload)
          // Debounce the refresh to avoid too many updates
          {
            if (activityDebounceRef.current) {
              clearTimeout(activityDebounceRef.current)
            }
            activityDebounceRef.current = setTimeout(() => loadActivity(), 500)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'research_ideas',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Research ideas updated:', payload)
          {
            if (activityDebounceRef.current) {
              clearTimeout(activityDebounceRef.current)
            }
            activityDebounceRef.current = setTimeout(() => loadActivity(), 500)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Team members updated:', payload)
          {
            if (activityDebounceRef.current) {
              clearTimeout(activityDebounceRef.current)
            }
            activityDebounceRef.current = setTimeout(() => loadActivity(), 500)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id]) // Use user.id as dependency

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
          avatar_url: data.avatar_url || "",
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

  const loadActivity = async () => {
    if (!user) return;
    
    // Set loading state
    setActivityLoading(true)
    
    try {
      console.log("Loading activity data for user:", user.id)
      
      // Fetch activity data from the user_activity table
      const { data: activityData, error } = await supabase
        .from('user_activity')
        .select('papers_explored, ideas_generated, collaborations')
        .eq('user_id', user.id)
        .maybeSingle()

      console.log("Activity data loaded:", {
        data: activityData,
        error: error
      })

      if (error) {
        console.error("Error loading activity:", error)
        // If error, try to create a new activity record
        const { data: newActivity, error: insertError } = await supabase
          .from('user_activity')
          .insert({
            user_id: user.id,
            papers_explored: 0,
            ideas_generated: 0,
            collaborations: 0
          })
          .select()
          .single()
        
        if (!insertError && newActivity) {
          setActivity({
            papersExplored: newActivity.papers_explored ?? 0,
            ideasGenerated: newActivity.ideas_generated ?? 0,
            collaborations: newActivity.collaborations ?? 0,
          })
        }
      } else if (activityData) {
        // Update state with the fetched activity data
        setActivity({
          papersExplored: activityData.papers_explored ?? 0,
          ideasGenerated: activityData.ideas_generated ?? 0,
          collaborations: activityData.collaborations ?? 0,
        })
      } else {
        // No data found, create a new record
        const { data: newActivity, error: insertError } = await supabase
          .from('user_activity')
          .insert({
            user_id: user.id,
            papers_explored: 0,
            ideas_generated: 0,
            collaborations: 0
          })
          .select()
          .single()
        
        if (!insertError && newActivity) {
          setActivity({
            papersExplored: newActivity.papers_explored ?? 0,
            ideasGenerated: newActivity.ideas_generated ?? 0,
            collaborations: newActivity.collaborations ?? 0,
          })
        }
      }
      
      // Show success feedback
      if (!error || activityData) {
        toast({
          title: "Activity Updated",
          description: "Your activity overview has been refreshed.",
          duration: 2000,
        })
      }
    } catch (e) {
      console.error("Error loading activity:", e)
      toast({
        title: "Error",
        description: "Failed to load activity data. Please try again.",
        variant: "destructive",
      })
      // Keep previous values on error
      setActivity(prevActivity => prevActivity)
    } finally {
      setActivityLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!user) return

    setSaving(true)
    try {
      console.log("Saving profile for user:", user.id)
      console.log("Profile data:", profile)

      // First check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing profile:", checkError)
        throw new Error(`Failed to check existing profile: ${checkError.message}`)
      }

      const profileData = {
        id: user.id,
        display_name: profile.display_name || null,
        bio: profile.bio || null,
        location: profile.location || null,
        website: profile.website || null,
        research_interests: profile.research_interests || [],
        institution: profile.institution || null,
        position: profile.position || null,
        avatar_url: profile.avatar_url || null,
        updated_at: new Date().toISOString(),
      }

      let result
      if (existingProfile) {
        // Update existing profile
        console.log("Updating existing profile")
        result = await supabase
          .from("user_profiles")
          .update(profileData)
          .eq("id", user.id)
      } else {
        // Insert new profile
        console.log("Creating new profile")
        result = await supabase
          .from("user_profiles")
          .insert({
            ...profileData,
            created_at: new Date().toISOString(),
          })
      }

      if (result.error) {
        console.error("Database operation error:", result.error)
        throw new Error(`Database error: ${result.error.message}`)
      }

      setEditing(false)
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      
      let errorMessage = "Unknown error occurred"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String((error as any).message)
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      console.error("Detailed error:", errorMessage)
      
      // Provide user-friendly error messages
      if (errorMessage.includes("row-level security")) {
        errorMessage = "You don't have permission to save this profile. Please try logging out and back in."
      } else if (errorMessage.includes("auth")) {
        errorMessage = "Authentication error. Please try logging out and back in."
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        errorMessage = "Network error. Please check your connection and try again."
      }
      
      toast({
        title: "Save failed",
        description: errorMessage,
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
                {editing ? (
                  <ProfilePictureUpload
                    currentAvatarUrl={profile.avatar_url}
                    userId={user.id}
                    onUploadComplete={(avatarUrl) => {
                      setProfile({ ...profile, avatar_url: avatarUrl })
                      // Force a page refresh to update all avatar displays
                      window.location.reload()
                    }}
                    size="lg"
                  />
                ) : (
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={profile.avatar_url ? `${profile.avatar_url}?v=${Date.now()}` : "/placeholder.svg"} 
                      alt={profile.display_name} 
                    />
                    <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                )}

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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity Overview
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    loadActivity()
                  }}
                  disabled={activityLoading}
                  className="h-6 w-6 p-0"
                  type="button"
                  aria-label="Refresh activity"
                >
                  <RefreshCw className={`h-4 w-4 ${activityLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Papers Explored</span>
                </div>
                <Badge variant="secondary">
                  {activityLoading ? '...' : activity.papersExplored ?? 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Ideas Generated</span>
                </div>
                <Badge variant="secondary">
                  {activityLoading ? '...' : activity.ideasGenerated ?? 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Collaborations</span>
                </div>
                <Badge variant="secondary">
                  {activityLoading ? '...' : activity.collaborations ?? 0}
                </Badge>
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
