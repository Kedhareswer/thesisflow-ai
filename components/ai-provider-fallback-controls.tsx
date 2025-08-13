"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, RefreshCw, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AIProvider } from "@/lib/ai-providers"

interface ProviderInfo {
  provider: AIProvider
  name: string
  models: string[]
  maxTokens: number
  supportedFeatures: string[]
}

interface AIProviderFallbackControlsProps {
  selectedProvider?: AIProvider
  selectedModel?: string
  onProviderChange?: (provider: AIProvider | undefined) => void
  onModelChange?: (model: string | undefined) => void
  showTestButton?: boolean
  className?: string
}

export function AIProviderFallbackControls({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  showTestButton = true,
  className = ""
}: AIProviderFallbackControlsProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string }>>({})
  const { toast } = useToast()

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/ai/providers")
      const data = await response.json()

      if (data.success) {
        setProviders(data.providers)
      } else {
        toast({
          title: "Failed to load providers",
          description: data.error || "Could not load available AI providers",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error loading providers:", error)
      toast({
        title: "Error",
        description: "Failed to load AI providers",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const testProvider = async (provider: AIProvider, model?: string) => {
    try {
      setTesting(true)
      const response = await fetch("/api/ai/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          testPrompt: "Test connection - please respond with 'Connection successful'"
        })
      })

      const result = await response.json()
      const key = `${provider}-${model || 'default'}`
      
      setTestResults(prev => ({
        ...prev,
        [key]: {
          success: result.success,
          error: result.error
        }
      }))

      if (result.success) {
        toast({
          title: "Test Successful",
          description: `${provider} is working correctly${result.fallbackInfo ? ` (${result.fallbackInfo.totalRetries} retries)` : ''}`,
        })
      } else {
        toast({
          title: "Test Failed",
          description: result.error || `Failed to connect to ${provider}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error testing provider:", error)
      const key = `${provider}-${model || 'default'}`
      setTestResults(prev => ({
        ...prev,
        [key]: {
          success: false,
          error: "Network error"
        }
      }))
      toast({
        title: "Test Error",
        description: "Failed to test provider connection",
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
  }

  const testAllProviders = async () => {
    for (const provider of providers) {
      await testProvider(provider.provider)
      // Small delay between tests to avoid overwhelming the APIs
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  const selectedProviderInfo = providers.find(p => p.provider === selectedProvider)
  const availableModels = selectedProviderInfo?.models || []

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading AI providers...</span>
        </CardContent>
      </Card>
    )
  }

  if (providers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            No AI Providers Available
          </CardTitle>
          <CardDescription>
            You need to configure at least one AI provider to use the summarizer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.open('/settings', '_blank')} variant="outline">
            Configure API Keys
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          AI Provider Settings
        </CardTitle>
        <CardDescription>
          Choose a specific provider or leave blank for automatic fallback ({providers.length} providers available)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">AI Provider</label>
          <div className="flex gap-2">
            <Select
              value={selectedProvider || "auto"}
              onValueChange={(value) => {
                const provider = value === "auto" ? undefined : value as AIProvider
                onProviderChange?.(provider)
                if (provider !== selectedProvider) {
                  onModelChange?.(undefined) // Reset model when provider changes
                }
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Automatic Fallback
                  </div>
                </SelectItem>
                {providers.map((provider) => {
                  const testKey = `${provider.provider}-default`
                  const testResult = testResults[testKey]
                  return (
                    <SelectItem key={provider.provider} value={provider.provider}>
                      <div className="flex items-center gap-2">
                        {testResult?.success && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {testResult?.success === false && <XCircle className="h-4 w-4 text-red-500" />}
                        <span>{provider.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {provider.models.length} models
                        </Badge>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            
            {showTestButton && selectedProvider && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => testProvider(selectedProvider, selectedModel)}
                disabled={testing}
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
              </Button>
            )}
          </div>
        </div>

        {/* Model Selection */}
        {selectedProvider && availableModels.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <Select
              value={selectedModel || "default"}
              onValueChange={(value) => onModelChange?.(value === "default" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Model</SelectItem>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Provider Info */}
        {selectedProviderInfo && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              <strong>Max Tokens:</strong> {selectedProviderInfo.maxTokens.toLocaleString()}
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedProviderInfo.supportedFeatures.map((feature) => (
                <Badge key={feature} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Test All Button */}
        {showTestButton && providers.length > 1 && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={testAllProviders}
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Testing Providers...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test All Providers
                </>
              )}
            </Button>
          </div>
        )}

        {/* Fallback Info */}
        {!selectedProvider && (
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <strong>Automatic Fallback:</strong> The system will try providers in order of preference. 
            If one fails, it will automatically retry with exponential backoff, then move to the next provider.
          </div>
        )}
      </CardContent>
    </Card>
  )
}