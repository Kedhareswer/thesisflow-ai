'use client'

import React, { useState, useEffect } from 'react'
import { StorageProviderCard } from './StorageProviderCard'
import { StorageProvider, StorageQuota } from '@/lib/storage/types'
import { storageManager } from '@/lib/storage/storage-manager'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RefreshCw, Settings, Info } from 'lucide-react'

export function StorageManager() {
  const { toast } = useToast()
  const [providers] = useState<StorageProvider[]>(['google-drive', 'dropbox', 'onedrive'])
  const [connectedProviders, setConnectedProviders] = useState<Set<StorageProvider>>(new Set())
  const [activeProvider, setActiveProvider] = useState<StorageProvider | null>(null)
  const [quotas, setQuotas] = useState<Map<StorageProvider, StorageQuota>>(new Map())
  const [loading, setLoading] = useState<Map<StorageProvider, boolean>>(new Map())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    // Load connected providers on mount
    loadConnectedProviders()
  }, [])

  const loadConnectedProviders = () => {
    try {
      const connected = storageManager.getConnectedProviders()
      setConnectedProviders(new Set(connected))
      
      // Get active provider
      const stored = localStorage.getItem('activeStorageProvider') as StorageProvider
      if (stored && connected.includes(stored)) {
        setActiveProvider(stored)
      }
      
      // Load quotas for connected providers
      connected.forEach(provider => {
        loadQuota(provider)
      })
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  const loadQuota = async (provider: StorageProvider) => {
    try {
      const quota = await storageManager.getQuota()
      setQuotas(prev => new Map(prev).set(provider, quota))
    } catch (error) {
      console.error(`Failed to load quota for ${provider}:`, error)
    }
  }

  const handleConnect = async (provider: StorageProvider) => {
    setLoading(prev => new Map(prev).set(provider, true))
    
    try {
      await storageManager.connectProvider(provider)
      
      // Update state
      setConnectedProviders(prev => new Set(prev).add(provider))
      
      // Set as active if first provider
      if (!activeProvider) {
        await storageManager.switchProvider(provider)
        setActiveProvider(provider)
      }
      
      // Load quota
      await loadQuota(provider)
      
      toast({
        title: 'Connected successfully',
        description: `${provider} has been connected to your account.`
      })
    } catch (error: any) {
      toast({
        title: 'Connection failed',
        description: error.message || 'Failed to connect storage provider',
        variant: 'destructive'
      })
    } finally {
      setLoading(prev => {
        const next = new Map(prev)
        next.delete(provider)
        return next
      })
    }
  }

  const handleDisconnect = async (provider: StorageProvider) => {
    try {
      await storageManager.disconnectProvider(provider)
      
      // Update state
      setConnectedProviders(prev => {
        const next = new Set(prev)
        next.delete(provider)
        return next
      })
      
      // Clear quota
      setQuotas(prev => {
        const next = new Map(prev)
        next.delete(provider)
        return next
      })
      
      // Update active provider if needed
      if (activeProvider === provider) {
        const remaining = Array.from(connectedProviders).filter(p => p !== provider)
        const newActive = remaining[0] || null
        setActiveProvider(newActive)
        if (newActive) {
          await storageManager.switchProvider(newActive)
        }
      }
      
      toast({
        title: 'Disconnected',
        description: `${provider} has been disconnected.`
      })
    } catch (error: any) {
      toast({
        title: 'Disconnection failed',
        description: error.message || 'Failed to disconnect storage provider',
        variant: 'destructive'
      })
    }
  }

  const handleSetActive = async (provider: StorageProvider) => {
    try {
      await storageManager.switchProvider(provider)
      setActiveProvider(provider)
      
      toast({
        title: 'Provider switched',
        description: `${provider} is now your active storage provider.`
      })
    } catch (error: any) {
      toast({
        title: 'Switch failed',
        description: error.message || 'Failed to switch storage provider',
        variant: 'destructive'
      })
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    
    try {
      await storageManager.syncPendingOperations()
      
      // Reload quotas
      for (const provider of connectedProviders) {
        await loadQuota(provider)
      }
      
      toast({
        title: 'Sync complete',
        description: 'All pending operations have been synced.'
      })
    } catch (error: any) {
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync pending operations',
        variant: 'destructive'
      })
    } finally {
      setSyncing(false)
    }
  }

  const getTotalStorage = () => {
    let totalUsed = 0
    let totalAvailable = 0
    
    quotas.forEach(quota => {
      totalUsed += quota.used
      totalAvailable += quota.total
    })
    
    return { used: totalUsed, total: totalAvailable }
  }

  const totalStorage = getTotalStorage()
  const totalUsagePercentage = totalStorage.total > 0 
    ? (totalStorage.used / totalStorage.total) * 100 
    : 0

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cloud Storage Management</CardTitle>
              <CardDescription>
                Connect and manage your cloud storage providers
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing || connectedProviders.size === 0}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {connectedProviders.size > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Storage Used</span>
                <span className="font-medium">
                  {connectedProviders.size} provider{connectedProviders.size !== 1 ? 's' : ''} connected
                </span>
              </div>
              <div className="text-2xl font-bold">
                {totalUsagePercentage.toFixed(1)}% used across all providers
              </div>
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No storage providers connected. Connect a provider below to start storing your files in the cloud.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Provider Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers.map(provider => (
          <StorageProviderCard
            key={provider}
            provider={provider}
            isConnected={connectedProviders.has(provider)}
            isActive={activeProvider === provider}
            quota={quotas.get(provider)}
            onConnect={() => handleConnect(provider)}
            onDisconnect={() => handleDisconnect(provider)}
            onSetActive={() => handleSetActive(provider)}
            isLoading={loading.get(provider)}
          />
        ))}
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Connect your preferred cloud storage provider using your existing account</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Files are stored directly in your cloud storage, not on our servers</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Switch between providers anytime or use multiple providers simultaneously</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Automatic caching ensures fast access and offline availability</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
