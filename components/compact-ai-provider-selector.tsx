"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AIProviderDetector } from "@/lib/ai-provider-detector"
import { type AIProvider, AI_PROVIDERS } from "@/lib/ai-providers"
import { supabase } from "@/integrations/supabase/client"

interface CompactAIProviderSelectorProps {
  selectedProvider: AIProvider | undefined
  onProviderChange: (provider: AIProvider) => void
  selectedModel?: string
  onModelChange?: (model: string) => void
}

export default function CompactAIProviderSelector({
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
}: CompactAIProviderSelectorProps) {
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const loadProviders = async () => {
    try {
      setLoading(true)
      console.log("CompactAIProviderSelector: Loading providers...")
      
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log("CompactAIProviderSelector: Session check:", session ? "✅ Authenticated" : "❌ No session")
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Add auth token if available
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
        console.log("CompactAIProviderSelector: Added auth token to request")
      }
      
      const response = await fetch('/api/ai/providers', {
        method: 'GET',
        credentials: 'include',
        headers
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
        userExists: !!session?.user
      })
      
      if (data.availableProviders && data.availableProviders.length > 0) {
        console.log("CompactAIProviderSelector: Found providers:", data.availableProviders)
      } else {
        console.warn("CompactAIProviderSelector: No providers found", {
          userProviders: data.userProviders,
          envProviders: data.envProviders,
          debug: data.debug,
          sessionExists: !!session
        })
      }
    } catch (error) {
      console.error('CompactAIProviderSelector: Error loading providers:', error)
      setAvailableProviders([])
      
      // Get session for debug info even in error case
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
      setDebugInfo({ 
        error: error instanceof Error ? error.message : "Unknown error",
        sessionExists: !!session,
        hasSession: !!session,
        userExists: !!session?.user
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProviders()
  }, [])

  // Refresh providers when the window gains focus (e.g., after user adds API keys in settings)
  useEffect(() => {
    const handleFocus = () => {
      loadProviders()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const getProviderStatus = (provider: AIProvider) => {
    const isAvailable = availableProviders.includes(provider)
    return isAvailable ? "Available" : "Not Configured"
  }

  const getProviderStatusColor = (provider: AIProvider) => {
    const isAvailable = availableProviders.includes(provider)
    return isAvailable ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
  }

  if (loading) {
    return (
      <Card className="border-gray-200 shadow-sm bg-white">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-lg font-medium text-black">AI Provider Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2 text-gray-600">Loading providers...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200 shadow-sm bg-white">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="text-lg font-medium text-black">AI Provider Configuration</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="provider-select" className="text-sm font-medium text-gray-700">
              Primary AI Provider
            </Label>
            <Select value={selectedProvider || ""} onValueChange={onProviderChange}>
              <SelectTrigger
                id="provider-select"
                className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-11"
              >
                <SelectValue placeholder="Select AI provider" />
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
            <div className="space-y-3">
              <Label htmlFor="model-select" className="text-sm font-medium text-gray-700">
                Model
              </Label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger
                  id="model-select"
                  className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-11"
                >
                  <SelectValue placeholder="Select model" />
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

        {selectedProvider && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Max Tokens:</span>
                <span className="font-medium text-black">
                  {AI_PROVIDERS[selectedProvider].maxTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available Models:</span>
                <span className="font-medium text-black">{AI_PROVIDERS[selectedProvider].models.length}</span>
              </div>
            </div>
          </div>
        )}

        {!loading && availableProviders.length === 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              No AI providers are configured. Please add API keys in Settings to enable AI features.
            </p>
            {debugInfo && (
              <details className="mt-2">
                <summary className="text-xs text-amber-700 cursor-pointer">Debug Information</summary>
                <div className="mt-2 text-xs text-amber-700 font-mono">
                  <div>Auth Header: {debugInfo.hasAuthHeader ? "✅ Present" : "❌ Missing"}</div>
                  <div>Cookie Header: {debugInfo.hasCookieHeader ? "✅ Present" : "❌ Missing"}</div>
                  {debugInfo.cookieCount && <div>Cookie Count: {debugInfo.cookieCount}</div>}
                  <div>Session: {debugInfo.sessionExists ? "✅ Active" : "❌ None"}</div>
                  {debugInfo.userError && <div>User Error: {debugInfo.userError}</div>}
                  {debugInfo.error && <div>API Error: {debugInfo.error}</div>}
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
