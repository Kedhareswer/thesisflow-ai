"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AIProviderService, type AIProvider, AI_PROVIDERS } from "@/lib/ai-providers"

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

  useEffect(() => {
    setAvailableProviders(AIProviderService.getAvailableProviders())
  }, [])

  const getProviderStatus = (provider: AIProvider) => {
    const isAvailable = availableProviders.includes(provider)
    return isAvailable ? "Available" : "Not Configured"
  }

  const getProviderStatusColor = (provider: AIProvider) => {
    const isAvailable = availableProviders.includes(provider)
    return isAvailable ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
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

        {availableProviders.length === 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              No AI providers are configured. Please add API keys in Settings to enable AI features.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
