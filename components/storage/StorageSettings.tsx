'use client'

import React, { useState, useEffect } from 'react'
import { storageManager } from '@/lib/storage/storage-manager'
import { supabaseStorageManager } from '@/lib/storage/supabase-storage-manager'
import { StorageProvider } from '@/lib/storage/types'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Settings, Save, RefreshCw } from 'lucide-react'

interface StorageSettingsData {
  defaultProvider: StorageProvider | 'none'
  autoSync: boolean
  syncInterval: number // minutes
  cacheEnabled: boolean
  maxCacheSize: number // MB
  offlineMode: boolean
  autoUpload: boolean
  compressionEnabled: boolean
  encryptionEnabled: boolean
}

export function StorageSettings() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<StorageSettingsData>({
    defaultProvider: 'none',
    autoSync: true,
    syncInterval: 5,
    cacheEnabled: true,
    maxCacheSize: 500,
    offlineMode: true,
    autoUpload: false,
    compressionEnabled: false,
    encryptionEnabled: false
  })
  const [providers, setProviders] = useState<StorageProvider[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
    loadProviders()
  }, [])

  const loadSettings = () => {
    const stored = localStorage.getItem('storageSettings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSettings(parsed)
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
  }

  const loadProviders = () => {
    try {
      const connected = storageManager.getConnectedProviders()
      
      // Add Google Drive if connected via supabaseStorageManager
      if (supabaseStorageManager.isGoogleDriveConnected() && !connected.includes('google-drive')) {
        connected.push('google-drive')
      }
      
      setProviders(connected)
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    
    try {
      // Save to localStorage
      localStorage.setItem('storageSettings', JSON.stringify(settings))
      
      // Apply settings
      if (settings.defaultProvider !== 'none') {
        await storageManager.switchProvider(settings.defaultProvider)
      }
      
      // Configure cache settings
      if (settings.cacheEnabled) {
        // Cache configuration would be applied here
        console.log('Cache enabled with max size:', settings.maxCacheSize)
      }
      
      // Configure sync settings
      if (settings.autoSync) {
        // Set up sync interval
        const intervalMs = settings.syncInterval * 60 * 1000
        console.log('Auto-sync enabled with interval:', intervalMs)
      }
      
      toast({
        title: 'Settings saved',
        description: 'Your storage preferences have been updated.'
      })
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClearCache = async () => {
    try {
      const cache = storageManager.cache
      if (cache && typeof cache.clear === 'function') {
        await cache.clear()
      }
      
      toast({
        title: 'Cache cleared',
        description: 'Local cache has been cleared successfully.'
      })
    } catch (error: any) {
      toast({
        title: 'Clear failed',
        description: error.message || 'Failed to clear cache',
        variant: 'destructive'
      })
    }
  }

  const updateSetting = <K extends keyof StorageSettingsData>(
    key: K,
    value: StorageSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Storage Preferences
          </CardTitle>
          <CardDescription>
            Configure how your files are stored and synced
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Provider */}
          <div className="space-y-2">
            <Label htmlFor="default-provider">Default Storage Provider</Label>
            <Select
              value={settings.defaultProvider}
              onValueChange={(value) => updateSetting('defaultProvider', value as StorageProvider | 'none')}
            >
              <SelectTrigger id="default-provider">
                <SelectValue placeholder="Select default provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No default</SelectItem>
                {providers.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {provider.charAt(0).toUpperCase() + provider.slice(1).replace('-', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Files will be automatically uploaded to this provider
            </p>
          </div>

          {/* Auto Sync */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync">Automatic Sync</Label>
              <p className="text-xs text-muted-foreground">
                Sync files automatically with cloud storage
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={settings.autoSync}
              onCheckedChange={(checked) => updateSetting('autoSync', checked)}
            />
          </div>

          {/* Sync Interval */}
          {settings.autoSync && (
            <div className="space-y-2">
              <Label htmlFor="sync-interval">
                Sync Interval: {settings.syncInterval} minutes
              </Label>
              <Slider
                id="sync-interval"
                min={1}
                max={60}
                step={1}
                value={[settings.syncInterval]}
                onValueChange={([value]) => updateSetting('syncInterval', value)}
              />
            </div>
          )}

          {/* Cache Settings */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cache-enabled">Enable Local Cache</Label>
              <p className="text-xs text-muted-foreground">
                Cache files locally for faster access
              </p>
            </div>
            <Switch
              id="cache-enabled"
              checked={settings.cacheEnabled}
              onCheckedChange={(checked) => updateSetting('cacheEnabled', checked)}
            />
          </div>

          {/* Cache Size */}
          {settings.cacheEnabled && (
            <div className="space-y-2">
              <Label htmlFor="cache-size">
                Max Cache Size: {settings.maxCacheSize} MB
              </Label>
              <Slider
                id="cache-size"
                min={100}
                max={2000}
                step={100}
                value={[settings.maxCacheSize]}
                onValueChange={([value]) => updateSetting('maxCacheSize', value)}
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Clear Cache
                </Button>
              </div>
            </div>
          )}

          {/* Offline Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="offline-mode">Offline Mode</Label>
              <p className="text-xs text-muted-foreground">
                Queue operations when offline and sync when reconnected
              </p>
            </div>
            <Switch
              id="offline-mode"
              checked={settings.offlineMode}
              onCheckedChange={(checked) => updateSetting('offlineMode', checked)}
            />
          </div>

          {/* Auto Upload */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-upload">Auto Upload</Label>
              <p className="text-xs text-muted-foreground">
                Automatically upload new files to cloud storage
              </p>
            </div>
            <Switch
              id="auto-upload"
              checked={settings.autoUpload}
              onCheckedChange={(checked) => updateSetting('autoUpload', checked)}
            />
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium">Advanced Settings</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compression">File Compression</Label>
                <p className="text-xs text-muted-foreground">
                  Compress files before uploading to save space
                </p>
              </div>
              <Switch
                id="compression"
                checked={settings.compressionEnabled}
                onCheckedChange={(checked) => updateSetting('compressionEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="encryption">End-to-End Encryption</Label>
                <p className="text-xs text-muted-foreground">
                  Encrypt files before uploading for enhanced security
                </p>
              </div>
              <Switch
                id="encryption"
                checked={settings.encryptionEnabled}
                onCheckedChange={(checked) => updateSetting('encryptionEnabled', checked)}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={saveSettings} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
