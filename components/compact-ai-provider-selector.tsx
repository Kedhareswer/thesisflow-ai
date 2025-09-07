"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { type AIProvider, AI_PROVIDERS } from "@/lib/ai-providers"
import { supabase } from "@/integrations/supabase/client"
import { Loader2 } from "lucide-react"

interface CompactAIProviderSelectorProps {
  selectedProvider: AIProvider | undefined
  onProviderChange: (provider: AIProvider) => void
  selectedModel?: string
  onModelChange?: (model: string) => void
  variant?: 'card' | 'compact'
}

export default function CompactAIProviderSelector({
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
  variant = 'card',
}: CompactAIProviderSelectorProps) {
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const loadProviders = async () => {
    try {
      setLoading(true)
      console.log("CompactAIProviderSelector: Loading providers...")

      // Get current user session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      console.log("CompactAIProviderSelector: Session check:", session ? "✅ Authenticated" : "❌ No session")

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      // Add auth token if available
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`
        console.log("CompactAIProviderSelector: Added auth token to request")
      }

      const response = await fetch("/api/ai/providers", {
        method: "GET",
        credentials: "include",
        headers,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("CompactAIProviderSelector: API response:", data)

      setAvailableProviders(data.availableProviders || [])
      setDebugInfo({
        ...data.debug,
        sessionExists: !!session,
        hasSession: !!session,
        userExists: !!session?.user,
      })

      if (data.availableProviders && data.availableProviders.length > 0) {
        console.log("CompactAIProviderSelector: Found providers:", data.availableProviders)
      } else {
        console.warn("CompactAIProviderSelector: No providers found", {
          userProviders: data.userProviders,
          envProviders: data.envProviders,
          debug: data.debug,
          sessionExists: !!session,
        })
      }
    } catch (error) {
      console.error("CompactAIProviderSelector: Error loading providers:", error)
      setAvailableProviders([])

      // Get session for debug info even in error case
      const {
        data: { session },
      } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
      setDebugInfo({
        error: error instanceof Error ? error.message : "Unknown error",
        sessionExists: !!session,
        hasSession: !!session,
        userExists: !!session?.user,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProviders()
  }, [])



  const getProviderStatus = (provider: AIProvider) => {
    const isAvailable = availableProviders.includes(provider)
    return isAvailable ? "Available" : "Not Configured"
  }

  const getProviderStatusColor = (provider: AIProvider) => {
    const isAvailable = availableProviders.includes(provider)
    return isAvailable ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-300"
  }

  if (loading) {
    if (variant === 'compact') {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600 py-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Loading providers…</span>
        </div>
      )
    }
    return (
      <Card className="border-gray-200 shadow-sm bg-white/50 text-gray-800">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-lg font-medium text-gray-900">AI Provider</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-600">Loading providers...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="provider-select" className="text-xs font-medium text-gray-700">
            Provider
          </Label>
          <Select value={selectedProvider || ""} onValueChange={onProviderChange}>
            <SelectTrigger
              id="provider-select"
              className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-8 bg-white min-w-[220px]"
            >
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {Object.entries(AI_PROVIDERS).map(([key, config]) => (
                <SelectItem
                  key={key}
                  value={key}
                  disabled={!availableProviders.includes(key as AIProvider)}
                  className="hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{config.name}</span>
                    <Badge variant="outline" className={`ml-2 text-[10px] ${getProviderStatusColor(key as AIProvider)}`}>
                      {getProviderStatus(key as AIProvider)}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProvider && onModelChange && (
          <div className="space-y-1">
            <Label htmlFor="model-select" className="text-xs font-medium text-gray-700">
              Model
            </Label>
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger
                id="model-select"
                className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-8 bg-white min-w-[220px]"
              >
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {AI_PROVIDERS[selectedProvider].models.map((model) => (
                  <SelectItem key={model} value={model} className="hover:bg-gray-50">
                    <span className="font-medium">{model}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="border-gray-200 shadow-sm bg-white/50 text-gray-800">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="text-lg font-medium text-gray-900">AI Provider</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="provider-select" className="text-sm font-medium text-gray-700">
              Provider
            </Label>
            <Select value={selectedProvider || ""} onValueChange={onProviderChange}>
              <SelectTrigger
                id="provider-select"
                className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-10 bg-white"
              >
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {Object.entries(AI_PROVIDERS).map(([key, config]) => (
                  <SelectItem
                    key={key}
                    value={key}
                    disabled={!availableProviders.includes(key as AIProvider)}
                    className="hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{config.name}</span>
                      <Badge variant="outline" className={`ml-2 text-xs ${getProviderStatusColor(key as AIProvider)}`}>
                        {getProviderStatus(key as AIProvider)}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProvider && onModelChange && (
            <div className="space-y-2">
              <Label htmlFor="model-select" className="text-sm font-medium text-gray-700">
                Model
              </Label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger
                  id="model-select"
                  className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-10 bg-white"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {AI_PROVIDERS[selectedProvider].models.map((model) => (
                    <SelectItem key={model} value={model} className="hover:bg-gray-50">
                      <span className="font-medium">{model}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
