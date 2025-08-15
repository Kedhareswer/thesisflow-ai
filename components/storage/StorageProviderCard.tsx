'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { StorageProvider, StorageQuota } from '@/lib/storage/types'
import { 
  Cloud, 
  CheckCircle, 
  XCircle, 
  Loader2,
  HardDrive,
  Link2,
  Unlink
} from 'lucide-react'

interface StorageProviderCardProps {
  provider: StorageProvider
  isConnected: boolean
  isActive: boolean
  quota?: StorageQuota
  onConnect: () => void
  onDisconnect: () => void
  onSetActive: () => void
  isLoading?: boolean
}

const providerConfig = {
  'google-drive': {
    name: 'Google Drive',
    icon: '🔷',
    color: 'bg-blue-500',
    description: 'Store files in your Google Drive account'
  },
  'local': {
    name: 'Local Storage',
    icon: '💾',
    color: 'bg-gray-500',
    description: 'Store files locally on your device'
  }
}

export function StorageProviderCard({
  provider,
  isConnected,
  isActive,
  quota,
  onConnect,
  onDisconnect,
  onSetActive,
  isLoading = false
}: StorageProviderCardProps) {
  const config = providerConfig[provider as keyof typeof providerConfig]
  const usagePercentage = quota ? (quota.used / quota.total) * 100 : 0
  
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  return (
    <Card className={`relative ${isActive ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`text-2xl ${isConnected ? '' : 'opacity-50'}`}>
              {config.icon}
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {config.name}
                {isActive && (
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isConnected && quota && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Storage Usage</span>
              <span className="font-medium">
                {formatBytes(quota.used)} / {formatBytes(quota.total)}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {usagePercentage.toFixed(1)}% used
            </p>
          </div>
        )}
        
        <div className="flex gap-2">
          {!isConnected ? (
            <Button
              onClick={onConnect}
              disabled={isLoading}
              className="flex-1"
              variant="default"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Connect
                </>
              )}
            </Button>
          ) : (
            <>
              {!isActive && (
                <Button
                  onClick={onSetActive}
                  variant="outline"
                  className="flex-1"
                >
                  <HardDrive className="mr-2 h-4 w-4" />
                  Set as Active
                </Button>
              )}
              <Button
                onClick={onDisconnect}
                variant="destructive"
                size="sm"
              >
                <Unlink className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        
        {isConnected && (
          <div className="text-xs text-muted-foreground">
            Last synced: {quota?.lastUpdated ? new Date(quota.lastUpdated).toLocaleString() : 'Never'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
