"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Shield, Bell, User, Download, Trash2, Key } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { supabase } from "@/integrations/supabase/client"
import { BackBreadcrumb } from "@/components/ui/back-breadcrumb"

interface UserSettings {
  email_notifications: boolean
  research_updates: boolean
  collaboration_invites: boolean
  security_alerts: boolean
  marketing_emails: boolean
  theme: "light" | "dark" | "system"
  language: string
  timezone: string
  auto_save: boolean
  data_sharing: boolean
}

export default function SettingsPage() {
  const { user, signOut } = useSupabaseAuth()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    research_updates: true,
    collaboration_invites: true,
    security_alerts: true,
    marketing_emails: false,
    theme: "system",
    language: "en",
    timezone: "UTC",
    auto_save: true,
    data_sharing: false,
  })
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    if (!user) return

    try {
      console.log("Loading settings for user:", user.id)
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (error) {
        console.log("Settings query result:", { data, error })
        // PGRST116 is "not found" which is expected for new users
        if (error.code !== "PGRST116") {
          console.error("Error loading settings:", error)
          return
        }
      }

      if (data) {
        console.log("Found existing settings:", data)
        setSettings({
          email_notifications: data.email_notifications ?? true,
          research_updates: data.research_updates ?? true,
          collaboration_invites: data.collaboration_invites ?? true,
          security_alerts: data.security_alerts ?? true,
          marketing_emails: data.marketing_emails ?? false,
          theme: data.theme ?? "system",
          language: data.language ?? "en",
          timezone: data.timezone ?? "UTC",
          auto_save: data.auto_save ?? true,
          data_sharing: data.data_sharing ?? false,
        })
      } else {
        console.log("No settings found, using defaults")
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  const saveSettings = async () => {
    if (!user) return

    setSaving(true)
    try {
      // First check if settings already exist for this user
      const { data: existingSettings, error: checkError } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing settings:", checkError)
        throw checkError
      }

      let result
      
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from("user_settings")
          .update({
            email_notifications: settings.email_notifications,
            research_updates: settings.research_updates,
            collaboration_invites: settings.collaboration_invites,
            security_alerts: settings.security_alerts,
            marketing_emails: settings.marketing_emails,
            theme: settings.theme,
            language: settings.language,
            timezone: settings.timezone,
            auto_save: settings.auto_save,
            data_sharing: settings.data_sharing,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
      } else {
        // Insert new settings
        result = await supabase
          .from("user_settings")
          .insert({
            user_id: user.id,
            email_notifications: settings.email_notifications,
            research_updates: settings.research_updates,
            collaboration_invites: settings.collaboration_invites,
            security_alerts: settings.security_alerts,
            marketing_emails: settings.marketing_emails,
            theme: settings.theme,
            language: settings.language,
            timezone: settings.timezone,
            auto_save: settings.auto_save,
            data_sharing: settings.data_sharing,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
      }

      if (result.error) throw result.error

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : (error as any)?.message || JSON.stringify(error, null, 2) || "Unknown error occurred"
      console.error("Detailed error:", errorMessage)

      toast({
        title: "Save failed",
        description: `Failed to save settings: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Please ensure passwords match and are not empty.",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      })
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setNewPassword("")
      setConfirmPassword("")

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      })
    } catch (error) {
      console.error("Error changing password:", error)
      toast({
        title: "Password change failed",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const exportData = async () => {
    if (!user) return

    try {
      // This would typically involve calling an API endpoint that generates
      // a data export file. For now, we'll create a simple JSON export.
      const exportData = {
        user_profile: user,
        settings: settings,
        export_date: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `bolt-research-hub-data-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Data exported",
        description: "Your data has been downloaded as a JSON file.",
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      })
    }
  }

  const deleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.",
    )

    if (!confirmed) return

    try {
      // In a real implementation, you'd call a secure backend endpoint
      // that handles account deletion properly
      toast({
        title: "Account deletion requested",
        description: "Please contact support to complete account deletion.",
      })
    } catch (error) {
      toast({
        title: "Deletion failed",
        description: "Failed to delete account. Please contact support.",
        variant: "destructive",
      })
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Please sign in to view your settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <BackBreadcrumb className="mb-2" />
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>View and manage your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Email Address</Label>
                  <Input value={user.email || ""} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>Account Created</Label>
                  <Input value={new Date(user.created_at).toLocaleDateString()} disabled className="bg-muted" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Language</Label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-save"
                  checked={settings.auto_save}
                  onCheckedChange={(checked) => setSettings({ ...settings, auto_save: checked })}
                />
                <Label htmlFor="auto-save">Enable auto-save for documents</Label>
              </div>

              <Button onClick={saveSettings} disabled={saving} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <Button
                onClick={changePassword}
                disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
                className="flex items-center gap-2"
              >
                <Key className="h-4 w-4" />
                {changingPassword ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>Choose what email notifications you'd like to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive general email notifications</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="research-updates">Research Updates</Label>
                    <p className="text-sm text-muted-foreground">Get notified about new research tools and features</p>
                  </div>
                  <Switch
                    id="research-updates"
                    checked={settings.research_updates}
                    onCheckedChange={(checked) => setSettings({ ...settings, research_updates: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="collaboration-invites">Collaboration Invites</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications when invited to collaborate</p>
                  </div>
                  <Switch
                    id="collaboration-invites"
                    checked={settings.collaboration_invites}
                    onCheckedChange={(checked) => setSettings({ ...settings, collaboration_invites: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="security-alerts">Security Alerts</Label>
                    <p className="text-sm text-muted-foreground">Important security notifications (recommended)</p>
                  </div>
                  <Switch
                    id="security-alerts"
                    checked={settings.security_alerts}
                    onCheckedChange={(checked) => setSettings({ ...settings, security_alerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="marketing-emails">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">Receive promotional content and product updates</p>
                  </div>
                  <Switch
                    id="marketing-emails"
                    checked={settings.marketing_emails}
                    onCheckedChange={(checked) => setSettings({ ...settings, marketing_emails: checked })}
                  />
                </div>
              </div>

              <Button onClick={saveSettings} disabled={saving} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Data
              </CardTitle>
              <CardDescription>Control how your data is used and shared</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="data-sharing">Anonymous Usage Data</Label>
                  <p className="text-sm text-muted-foreground">
                    Help improve our service by sharing anonymous usage statistics
                  </p>
                </div>
                <Switch
                  id="data-sharing"
                  checked={settings.data_sharing}
                  onCheckedChange={(checked) => setSettings({ ...settings, data_sharing: checked })}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data Management</h3>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Export Your Data</Label>
                    <p className="text-sm text-muted-foreground">Download a copy of all your data</p>
                  </div>
                  <Button variant="outline" onClick={exportData} className="flex items-center gap-2 bg-transparent">
                    <Download className="h-4 w-4" />
                    Export Data
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg border-red-200">
                  <div>
                    <Label className="text-red-600">Delete Account</Label>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" onClick={deleteAccount} className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </div>

              <Button onClick={saveSettings} disabled={saving} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Privacy Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nova AI Status - Simplified info panel */}
        <div className="mt-6">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h3 className="font-semibold text-green-800">AI Provider Status</h3>
              </div>
              <p className="text-sm text-green-700 mb-2">
                ThesisFlow AI uses <strong>Nova AI</strong> exclusively for all AI features.
              </p>
              <p className="text-xs text-green-600">
                No configuration needed - Nova AI is optimized for academic and research tasks.
              </p>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  )
}
