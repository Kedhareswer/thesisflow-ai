"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Brain, Zap, DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { AIProviderService, type AIProvider, AI_PROVIDERS } from "@/lib/ai-providers"
import { useToast } from "@/hooks/use-toast"

interface AIProviderSelectorProps {
  selectedProvider: AIProvider | undefined
  onProviderChange: (provider: AIProvider) => void
  selectedModel?: string
  onModelChange?: (model: string) => void
  showComparison?: boolean
}

export default function AIProviderSelector({
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
  showComparison = false,
}: AIProviderSelectorProps) {
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([])
  const [enableFallback, setEnableFallback] = useState(true)
  const [testingProvider, setTestingProvider] = useState<AIProvider | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    setAvailableProviders(AIProviderService.getAvailableProviders())
  }, [])

  const testProvider = async (provider: AIProvider) => {
    setTestingProvider(provider)
    try {
      await AIProviderService.generateResponse(
        "Hello, this is a test message. Please respond with 'Test successful'.",
        provider,
      )
      toast({
        title: "Provider Test Successful",
        description: `${AI_PROVIDERS[provider].name} is working correctly.`,
      })
    } catch (error) {
      toast({
        title: "Provider Test Failed",
        description: `${AI_PROVIDERS[provider].name} is not responding correctly.`,
        variant: "destructive",
      })
    } finally {
      setTestingProvider(null)
    }
  }

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case "gemini":
        return <Brain className="h-4 w-4" />
      case "groq":
        return <Zap className="h-4 w-4" />
      case "aiml":
        return <Brain className="h-4 w-4" />
      case "deepinfra":
        return <DollarSign className="h-4 w-4" />
      case "openai":
        return <Brain className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  const getProviderStatus = (provider: AIProvider) => {
    const isAvailable = availableProviders.includes(provider)
    return isAvailable ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getProviderFeatures = (provider: AIProvider) => {
    const config = AI_PROVIDERS[provider]
    const featureMap: Record<string, { label: string; color: string }> = {
      "fast-inference": { label: "Fast", color: "bg-green-100 text-green-800" },
      "cost-effective": { label: "Affordable", color: "bg-blue-100 text-blue-800" },
      "function-calling": { label: "Functions", color: "bg-purple-100 text-purple-800" },
      code: { label: "Code", color: "bg-orange-100 text-orange-800" },
      analysis: { label: "Analysis", color: "bg-indigo-100 text-indigo-800" },
    }

    return config.supportedFeatures
      .filter((feature) => featureMap[feature])
      .map((feature) => (
        <Badge key={feature} variant="secondary" className={featureMap[feature].color}>
          {featureMap[feature].label}
        </Badge>
      ))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Provider Configuration
          </CardTitle>
          <CardDescription>Choose your preferred AI provider and configure settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>Primary AI Provider</Label>
            <Select value={selectedProvider || ""} onValueChange={onProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select AI provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AI_PROVIDERS).map(([key, config]) => (
                  <SelectItem key={key} value={key} disabled={!availableProviders.includes(key as AIProvider)}>
                    <div className="flex items-center gap-2">
                      {getProviderIcon(key as AIProvider)}
                      <span>{config.name}</span>
                      {getProviderStatus(key as AIProvider)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          {selectedProvider && onModelChange && (
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger>
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

          {/* Fallback Option */}
          <div className="flex items-center space-x-2">
            <Switch id="fallback" checked={enableFallback} onCheckedChange={setEnableFallback} />
            <Label htmlFor="fallback">Enable automatic fallback to other providers</Label>
          </div>

          <Separator />

          {/* Provider Details */}
          {selectedProvider && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Provider Details</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testProvider(selectedProvider)}
                  disabled={testingProvider === selectedProvider}
                >
                  {testingProvider === selectedProvider ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Max Tokens:</span>
                  <span className="ml-2">{AI_PROVIDERS[selectedProvider].maxTokens.toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium">Models:</span>
                  <span className="ml-2">{AI_PROVIDERS[selectedProvider].models.length}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-medium text-sm">Features:</span>
                <div className="flex flex-wrap gap-1">{getProviderFeatures(selectedProvider)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Comparison */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Provider Comparison</CardTitle>
            <CardDescription>Compare features and capabilities across providers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(AI_PROVIDERS).map(([key, config]) => {
                const isAvailable = availableProviders.includes(key as AIProvider)
                return (
                  <div key={key} className={`p-3 border rounded-lg ${!isAvailable ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getProviderIcon(key as AIProvider)}
                        <span className="font-medium">{config.name}</span>
                        {getProviderStatus(key as AIProvider)}
                      </div>
                      <div className="text-sm text-muted-foreground">{config.maxTokens.toLocaleString()} tokens</div>
                    </div>
                    <div className="flex flex-wrap gap-1">{getProviderFeatures(key as AIProvider)}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
