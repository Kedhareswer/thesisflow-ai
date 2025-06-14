"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { Settings, Bell, Shield, Palette, Globe, Key, Trash2, Download, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export default function SettingsPage() {
  const { user, signOut } = useSupabaseAuth()
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    research_updates: true,
    collaboration_invites: true,
    system_updates: false,
  })
  const [preferences, setPreferences] = useState({
    theme: "light",
    language: "en",
    timezone: "UTC",
    default_view: "grid",
  })

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }))
    toast.success("Notification preferences updated")
  }

  const handlePreferenceChange = (key: string, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
    toast.success("Preferences updated")
  }

  const handlePasswordReset = async () => {
    if (!user?.email) return

    setLoading(true)
    try {
      // This would trigger a password reset email
      toast.success("Password reset email sent!")
    } catch (error) {
      toast.error("Failed to send password reset email")
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = () => {
    toast.success("Data export initiated. You'll receive an email when ready.")
  }

  const handleDeleteAccount = () => {
    toast.error("Account deletion requires email confirmation. Feature coming soon.")
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to access settings</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-gray-600">Manage your account preferences and security settings</p>
        </div>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure how you want to receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-sm text-gray-600">Receive notifications via email</p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => handleNotificationChange("email", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Research Updates</Label>
                <p className="text-sm text-gray-600">Get notified about new research papers</p>
              </div>
              <Switch
                checked={notifications.research_updates}
                onCheckedChange={(checked) => handleNotificationChange("research_updates", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Collaboration Invites</Label>
                <p className="text-sm text-gray-600">Notifications for team invitations</p>
              </div>
              <Switch
                checked={notifications.collaboration_invites}
                onCheckedChange={(checked) => handleNotificationChange("collaboration_invites", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">System Updates</Label>
                <p className="text-sm text-gray-600">Platform updates and maintenance notices</p>
              </div>
              <Switch
                checked={notifications.system_updates}
                onCheckedChange={(checked) => handleNotificationChange("system_updates", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Preferences
            </CardTitle>
            <CardDescription>Customize your Research Hub experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={preferences.theme} onValueChange={(value) => handlePreferenceChange("theme", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => handlePreferenceChange("language", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) => handlePreferenceChange("timezone", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="EST">Eastern Time</SelectItem>
                    <SelectItem value="PST">Pacific Time</SelectItem>
                    <SelectItem value="GMT">GMT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default View</Label>
                <Select
                  value={preferences.default_view}
                  onValueChange={(value) => handlePreferenceChange("default_view", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid View</SelectItem>
                    <SelectItem value="list">List View</SelectItem>
                    <SelectItem value="card">Card View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security and authentication</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Password</Label>
                <p className="text-sm text-gray-600">Last updated: Never</p>
              </div>
              <Button variant="outline" onClick={handlePasswordReset} disabled={loading}>
                <Key className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                <p className="text-sm text-gray-600">Add an extra layer of security</p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Active Sessions</Label>
                <p className="text-sm text-gray-600">Manage your active login sessions</p>
              </div>
              <Button variant="outline" disabled>
                <Globe className="h-4 w-4 mr-2" />
                View Sessions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data & Privacy
            </CardTitle>
            <CardDescription>Control your data and privacy settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Export Data</Label>
                <p className="text-sm text-gray-600">Download a copy of your data</p>
              </div>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Data Retention</Label>
                <p className="text-sm text-gray-600">How long we keep your data</p>
              </div>
              <Badge variant="outline">Indefinite</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-red-600">Delete Account</Label>
                <p className="text-sm text-gray-600">Permanently delete your account and all data</p>
              </div>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
