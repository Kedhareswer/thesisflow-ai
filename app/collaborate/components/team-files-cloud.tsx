'use client'

import React, { useState, useEffect } from 'react'
import { CloudFileBrowser } from '@/components/storage/CloudFileBrowser'
import { StorageManager } from '@/components/storage/StorageManager'
import { storageManager } from '@/lib/storage/storage-manager'
import { StorageFile } from '@/lib/storage/types'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Cloud, Files, Settings, Info } from 'lucide-react'

interface TeamFilesCloudProps {
  teamId: string
  projectId?: string
}

export function TeamFilesCloud({ teamId, projectId }: TeamFilesCloudProps) {
  const { toast } = useToast()
  const [hasProvider, setHasProvider] = useState(false)
  const [activeTab, setActiveTab] = useState('files')

  useEffect(() => {
    checkProviders()
  }, [])

  const checkProviders = () => {
    try {
      const providers = storageManager.getConnectedProviders()
      setHasProvider(providers.length > 0)
    } catch {
      setHasProvider(false)
    }
  }

  const handleFileSelect = (file: StorageFile) => {
    console.log('Selected file:', file)
    // You can implement file preview or other actions here
  }

  const handleProviderConnected = () => {
    checkProviders()
    setActiveTab('files')
    toast({
      title: 'Provider connected',
      description: 'You can now start uploading files to your cloud storage.'
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Files</CardTitle>
            <CardDescription>
              Manage and share files with your team using cloud storage
            </CardDescription>
          </div>
          <Cloud className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="files">
              <Files className="mr-2 h-4 w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger value="storage">
              <Settings className="mr-2 h-4 w-4" />
              Storage Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4">
            {hasProvider ? (
              <CloudFileBrowser
                onFileSelect={handleFileSelect}
                showUpload={true}
                allowMultiSelect={false}
              />
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p>No cloud storage provider connected.</p>
                  <p>Please connect a storage provider to start uploading and managing files.</p>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => setActiveTab('storage')}
                    className="mt-2"
                  >
                    Connect Storage Provider
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="storage">
            <StorageManager />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
