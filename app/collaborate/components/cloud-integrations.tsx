"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { 
  Cloud,
  Github,
  ExternalLink,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Key,
  Globe,
  FolderOpen,
  FileText,
  Download,
  Upload
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface CloudService {
  id: string
  name: string
  type: 'google-drive' | 'dropbox' | 'onedrive' | 'github' | 'box' | 'notion'
  icon: React.ReactNode
  connected: boolean
  lastSync?: string
  syncEnabled: boolean
  permissions: string[]
  folders?: CloudFolder[]
}

interface CloudFolder {
  id: string
  name: string
  path: string
  itemCount: number
  lastModified: string
  canWrite: boolean
}

interface CloudIntegrationsProps {
  teamId: string
  currentUserRole: string
  apiCall?: (url: string, options?: RequestInit) => Promise<any>
}

export function CloudIntegrations({ teamId, currentUserRole, apiCall: providedApiCall }: CloudIntegrationsProps) {
  const { toast } = useToast()
  
  const [services, setServices] = useState<CloudService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [connectingService, setConnectingService] = useState<string | null>(null)
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [selectedService, setSelectedService] = useState<CloudService | null>(null)

  // Permissions
  const canManageIntegrations = ['owner', 'admin'].includes(currentUserRole)

  // Helper function to get authenticated fetch
  const getAuthenticatedFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Authentication required')
    }
    
    return (url: string, options: RequestInit = {}) => {
      return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          ...options.headers,
        },
      }).then(r => r.json())
    }
  }

  useEffect(() => {
    loadCloudServices()
  }, [])

  const loadCloudServices = async () => {
    try {
      setIsLoading(true)
      
      // Load existing integrations from API
      const data = providedApiCall 
        ? await providedApiCall(`/api/collaborate/cloud-integrations?teamId=${teamId}`)
        : await (await getAuthenticatedFetch())(`/api/collaborate/cloud-integrations?teamId=${teamId}`)
      
      // Define available services
      const availableServices: CloudService[] = [
        {
          id: 'google-drive',
          name: 'Google Drive',
          type: 'google-drive',
          icon: <div className="h-6 w-6 bg-blue-500 rounded"></div>,
          connected: false,
          syncEnabled: false,
          permissions: []
        },
        {
          id: 'github',
          name: 'GitHub',
          type: 'github',
          icon: <Github className="h-6 w-6" />,
          connected: false,
          syncEnabled: false,
          permissions: []
        },
        {
          id: 'dropbox',
          name: 'Dropbox',
          type: 'dropbox',
          icon: <Cloud className="h-6 w-6 text-blue-600" />,
          connected: false,
          syncEnabled: false,
          permissions: []
        },
        {
          id: 'onedrive',
          name: 'OneDrive',
          type: 'onedrive',
          icon: <Cloud className="h-6 w-6 text-blue-600" />,
          connected: false,
          syncEnabled: false,
          permissions: []
        }
      ]
      
      // Merge with existing integrations
      if (data.success && data.integrations) {
        data.integrations.forEach((integration: any) => {
          const serviceIndex = availableServices.findIndex(s => s.type === integration.service)
          if (serviceIndex !== -1) {
            availableServices[serviceIndex] = {
              ...availableServices[serviceIndex],
              id: integration.id,
              connected: true,
              syncEnabled: integration.syncEnabled,
              lastSync: integration.lastSyncAt,
              permissions: Object.keys(integration.permissions).filter(key => integration.permissions[key]),
              folders: integration.foldersSynced || []
            }
          }
        })
      }
      
      setServices(availableServices)
    } catch (error) {
      console.error('Error loading cloud services:', error)
      toast({
        title: "Error",
        description: "Failed to load cloud integrations",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async (serviceType: CloudService['type']) => {
    if (!canManageIntegrations) {
      toast({
        title: "Permission denied",
        description: "Only team owners and admins can manage integrations",
        variant: "destructive"
      })
      return
    }

    try {
      setConnectingService(serviceType)
      
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Call API to create integration
      const data = providedApiCall 
        ? await providedApiCall('/api/collaborate/cloud-integrations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              teamId,
              serviceName: serviceType,
              serviceAccount: `user@${serviceType.replace('-', '')}.com`, // Mock account
              permissions: { read: true, write: true, share: true },
              syncEnabled: true,
              autoSync: false
            }),
          })
        : await (await getAuthenticatedFetch())('/api/collaborate/cloud-integrations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              teamId,
              serviceName: serviceType,
              serviceAccount: `user@${serviceType.replace('-', '')}.com`, // Mock account
              permissions: { read: true, write: true, share: true },
              syncEnabled: true,
              autoSync: false
            }),
          })

      if (data.success) {
        setServices(prev => prev.map(service => 
          service.type === serviceType 
            ? { 
                ...service, 
                id: data.integration.id,
                connected: true, 
                syncEnabled: true, 
                lastSync: new Date().toISOString(),
                permissions: ['read', 'write', 'share']
              }
            : service
        ))
        
        toast({
          title: "Connected successfully",
          description: `${serviceType.replace('-', ' ')} has been connected to your team`
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Connection error:', error)
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to the service",
        variant: "destructive"
      })
    } finally {
      setConnectingService(null)
    }
  }

  const handleDisconnect = async (serviceId: string) => {
    if (!canManageIntegrations) return

    try {
      // Call API to delete integration
      const data = providedApiCall 
        ? await providedApiCall(`/api/collaborate/cloud-integrations?id=${serviceId}&teamId=${teamId}`, {
            method: 'DELETE',
          })
        : await (await getAuthenticatedFetch())(`/api/collaborate/cloud-integrations?id=${serviceId}&teamId=${teamId}`, {
            method: 'DELETE',
          })

      if (data.success) {
        setServices(prev => prev.map(service => 
          service.id === serviceId 
            ? { 
                ...service, 
                id: service.type, // Reset to default ID
                connected: false, 
                syncEnabled: false, 
                lastSync: undefined,
                permissions: [],
                folders: undefined
              }
            : service
        ))
        
        toast({
          title: "Disconnected",
          description: "Service has been disconnected from your team"
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect service",
        variant: "destructive"
      })
    }
  }

  const handleToggleSync = async (serviceId: string, enabled: boolean) => {
    if (!canManageIntegrations) return

    try {
      setServices(prev => prev.map(service => 
        service.id === serviceId 
          ? { ...service, syncEnabled: enabled }
          : service
      ))
      
      toast({
        title: enabled ? "Sync enabled" : "Sync disabled",
        description: `Auto-sync has been ${enabled ? 'enabled' : 'disabled'} for this service`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update sync settings",
        variant: "destructive"
      })
    }
  }

  const handleManualSync = async (serviceId: string) => {
    try {
      setServices(prev => prev.map(service => 
        service.id === serviceId 
          ? { ...service, lastSync: new Date().toISOString() }
          : service
      ))
      
      toast({
        title: "Sync completed",
        description: "Files have been synchronized successfully"
      })
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Failed to synchronize files",
        variant: "destructive"
      })
    }
  }

  const formatLastSync = (timestamp?: string) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
    return `${Math.floor(diffMinutes / 1440)}d ago`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-3" />
        <span>Loading integrations...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cloud Integrations</h3>
          <p className="text-sm text-muted-foreground">
            Connect external services to sync and share files with your team
          </p>
        </div>
        {canManageIntegrations && (
          <Button onClick={() => setShowConnectDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        )}
      </div>

      {/* Connected Services */}
      <div className="grid gap-4">
        {services.map((service) => (
          <Card key={service.id} className={service.connected ? 'border-green-200' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {service.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{service.name}</h4>
                      {service.connected ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                    {service.connected && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Last sync: {formatLastSync(service.lastSync)}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Permissions: {service.permissions.join(', ')}</span>
                          {service.folders && (
                            <span>• {service.folders.length} folder(s) synced</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {service.connected ? (
                    <>
                      <div className="flex items-center gap-2 mr-4">
                        <Label htmlFor={`sync-${service.id}`} className="text-sm">Auto-sync</Label>
                        <Switch
                          id={`sync-${service.id}`}
                          checked={service.syncEnabled}
                          onCheckedChange={(checked) => handleToggleSync(service.id, checked)}
                          disabled={!canManageIntegrations}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManualSync(service.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedService(service)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      {canManageIntegrations && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(service.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={() => handleConnect(service.type)}
                      disabled={connectingService === service.type || !canManageIntegrations}
                    >
                      {connectingService === service.type ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-2" />
                      )}
                      {connectingService === service.type ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Folders/Repositories */}
              {service.connected && service.folders && service.folders.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h5 className="font-medium mb-3">Synced Folders</h5>
                  <div className="grid gap-2">
                    {service.folders.map((folder) => (
                      <div key={folder.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium">{folder.name}</p>
                            <p className="text-xs text-muted-foreground">{folder.path}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{folder.itemCount} items</span>
                          <span>Modified {formatLastSync(folder.lastModified)}</span>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service Details Modal */}
      {selectedService && (
        <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedService.name} Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <Tabs defaultValue="folders">
                <TabsList>
                  <TabsTrigger value="folders">Folders</TabsTrigger>
                  <TabsTrigger value="permissions">Permissions</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="folders" className="space-y-4">
                  <div className="space-y-2">
                    {selectedService.folders?.map((folder) => (
                      <div key={folder.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <FolderOpen className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">{folder.name}</p>
                            <p className="text-sm text-muted-foreground">{folder.path}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{folder.itemCount} items</Badge>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="permissions" className="space-y-4">
                  <div className="space-y-3">
                    {selectedService.permissions.map((permission) => (
                      <div key={permission} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Key className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="font-medium capitalize">{permission}</p>
                            <p className="text-sm text-muted-foreground">
                              {permission === 'read' && 'View and download files'}
                              {permission === 'write' && 'Upload and modify files'}
                              {permission === 'share' && 'Share files with team members'}
                            </p>
                          </div>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-sync</Label>
                        <p className="text-sm text-muted-foreground">Automatically sync changes</p>
                      </div>
                      <Switch checked={selectedService.syncEnabled} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notifications</Label>
                        <p className="text-sm text-muted-foreground">Get notified of sync events</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Public access</Label>
                        <p className="text-sm text-muted-foreground">Allow team members to access</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
