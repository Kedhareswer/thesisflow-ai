"use client"

import { useState, useEffect, useCallback } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { type AIProvider, AI_PROVIDERS } from "@/lib/ai-providers"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Settings, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MinimalAIProviderSelectorProps {
  selectedProvider: AIProvider | undefined
  onProviderChange: (provider: AIProvider | undefined) => void
  selectedModel?: string
  onModelChange?: (model: string | undefined) => void
  variant?: "inline" | "compact" | "full"
  showModelSelector?: boolean
  showConfigLink?: boolean
  showFallbackOption?: boolean
  className?: string
}

export default function MinimalAIProviderSelector({
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
  variant = "compact",
  showModelSelector = true,
  showConfigLink = true,
  showFallbackOption = true,
  className = "",
}: MinimalAIProviderSelectorProps) {
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`
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
      setAvailableProviders(data.availableProviders || [])

      // Don't auto-select provider - let user choose or use auto fallback
      // This allows the system to use the enhanced fallback mechanism
      console.log("MinimalAIProviderSelector: Available providers loaded:", data.availableProviders)
    } catch (error) {
      console.error("Error loading providers:", error)
      setAvailableProviders([])
    } finally {
      setLoading(false)
    }
  }, [onProviderChange, selectedProvider])

  useEffect(() => {
    loadProviders()
  }, [])

  const getProviderStatus = (provider: AIProvider) => {
    return availableProviders.includes(provider) ? "available" : "unavailable"
  }

  const getProviderBadgeColor = (provider: AIProvider) => {
    return availableProviders.includes(provider)
      ? "bg-green-100 text-green-700 border-green-200"
      : "bg-gray-100 text-gray-500 border-gray-300"
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading AI providers...</span>
      </div>
    )
  }

  // Inline variant - single line with provider and model
  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">AI:</span>
        </div>

        <Select 
          value={selectedProvider || "auto"} 
          onValueChange={(value) => onProviderChange(value === "auto" ? undefined : value as AIProvider)}
        >
          <SelectTrigger className="w-32 h-8 text-xs border-gray-200">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {showFallbackOption && (
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3" />
                  <span>Auto</span>
                  <Badge variant="secondary" className="text-xs">
                    {availableProviders.length > 0 ? `${availableProviders.length} Available` : 'Fallback'}
                  </Badge>
                </div>
              </SelectItem>
            )}
            {Object.entries(AI_PROVIDERS).map(([key, config]) => (
              <SelectItem key={key} value={key} disabled={!availableProviders.includes(key as AIProvider)}>
                <div className="flex items-center gap-2">
                  <span>{config.name}</span>
                  {!availableProviders.includes(key as AIProvider) && (
                    <Badge variant="outline" className="text-xs">
                      Setup Required
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedProvider && showModelSelector && onModelChange && (
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger className="w-40 h-8 text-xs border-gray-200">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS[selectedProvider].models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showConfigLink && availableProviders.length === 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/settings", "_blank")}
            className="h-8 text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            Setup
          </Button>
        )}
      </div>
    )
  }

  // Compact variant - minimal card layout
  if (variant === "compact") {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">AI Provider</span>
          </div>
          {availableProviders.length > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
              {availableProviders.length} Available
            </Badge>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Provider</Label>
            <Select 
              value={selectedProvider || "auto"} 
              onValueChange={(value) => onProviderChange(value === "auto" ? undefined : value as AIProvider)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {showFallbackOption && (
                  <SelectItem value="auto">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span>Auto Select</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {availableProviders.length > 0 ? `${availableProviders.length} Available` : 'Setup Required'}
                      </Badge>
                    </div>
                  </SelectItem>
                )}
                {Object.entries(AI_PROVIDERS).map(([key, config]) => (
                  <SelectItem key={key} value={key} disabled={!availableProviders.includes(key as AIProvider)}>
                    <div className="flex items-center justify-between w-full">
                      <span>{config.name}</span>
                      <Badge variant="outline" className={`ml-2 text-xs ${getProviderBadgeColor(key as AIProvider)}`}>
                        {getProviderStatus(key as AIProvider)}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProvider && showModelSelector && onModelChange && (
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Model</Label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS[selectedProvider].models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {showConfigLink && availableProviders.length === 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/settings", "_blank")}
              className="w-full h-8 text-xs"
            >
              <Settings className="h-3 w-3 mr-1" />
              Configure AI Providers
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Full variant - detailed layout (fallback)
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">AI Provider</h3>
        </div>
        {availableProviders.length > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {availableProviders.length} Available
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm text-gray-700 mb-2 block">Provider</Label>
          <Select 
            value={selectedProvider || "auto"} 
            onValueChange={(value) => onProviderChange(value === "auto" ? undefined : value as AIProvider)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              {showFallbackOption && (
                <SelectItem value="auto">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span className="font-medium">Auto Select</span>
                    </div>
                    <Badge variant="secondary">
                      {availableProviders.length > 0 ? `${availableProviders.length} Available` : 'Setup Required'}
                    </Badge>
                  </div>
                </SelectItem>
              )}
              {Object.entries(AI_PROVIDERS).map(([key, config]) => (
                <SelectItem key={key} value={key} disabled={!availableProviders.includes(key as AIProvider)}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{config.name}</span>
                    <Badge variant="outline" className={`ml-2 ${getProviderBadgeColor(key as AIProvider)}`}>
                      {getProviderStatus(key as AIProvider)}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProvider && showModelSelector && onModelChange && (
          <div>
            <Label className="text-sm text-gray-700 mb-2 block">Model</Label>
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS[selectedProvider].models.map((model) => (
                  <SelectItem key={model} value={model}>
                    <span className="font-medium">{model}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedProvider && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 space-y-1">
              <div>Max Tokens: {AI_PROVIDERS[selectedProvider].maxTokens.toLocaleString()}</div>
              <div>Models: {AI_PROVIDERS[selectedProvider].models.length}</div>
            </div>
          </div>
        )}

        {showConfigLink && availableProviders.length === 0 && (
          <div className="pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => window.open("/settings", "_blank")} className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Configure AI Providers
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
