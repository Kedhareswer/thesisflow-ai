"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  TestTube,
  Save,
  Trash2,
  ExternalLink,
  RefreshCw,
  Key,
  Shield,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { enhancedAIService } from "@/lib/enhanced-ai-service"

interface ApiKey {
  id: string
  provider: string
  is_active: boolean
  last_tested_at: string | null
  test_status: "valid" | "invalid" | "untested"
  created_at: string
  updated_at: string
}

interface ApiKeyFormData {
  [provider: string]: string
}

const AI_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4 Turbo, GPT-4, and GPT-3.5 Turbo models",
    docsUrl: "https://platform.openai.com/api-keys",
    placeholder: "sk-...",
    keyFormat: 'Starts with "sk-" followed by 48+ characters',
  },
  {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference with Llama 3.3, DeepSeek, and Gemma models",
    docsUrl: "https://console.groq.com/keys",
    placeholder: "gsk_...",
    keyFormat: 'Starts with "gsk_" followed by 50+ characters',
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini 1.5 Pro and Ultra models",
    docsUrl: "https://aistudio.google.com/app/apikey",
    placeholder: "AIza...",
    keyFormat: "Starts with 'AIza' followed by 35+ characters",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3 Opus, Sonnet, and Haiku models",
    docsUrl: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-...",
    keyFormat: 'Starts with "sk-ant-" followed by 40+ characters',
  },
  {
    id: "mistral",
    name: "Mistral AI",
    description: "Mistral Large, Medium, and Small models",
    docsUrl: "https://console.mistral.ai/api-keys/",
    placeholder: "...",
    keyFormat: "32+ characters, alphanumeric",
  },
  {
    id: "aiml",
    name: "AIML API",
    description: "Multiple AI models including GPT-4 and Claude",
    docsUrl: "https://aiml.com/api-keys",
    placeholder: "...",
    keyFormat: "10+ characters, alphanumeric",
  },
]

export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [formData, setFormData] = useState<ApiKeyFormData>({})
  const [showKeys, setShowKeys] = useState<{ [provider: string]: boolean }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<{ [provider: string]: boolean }>({})
  const [testing, setTesting] = useState<{ [provider: string]: boolean }>({})
  const { toast } = useToast()
  const { session, user } = useSupabaseAuth()

  useEffect(() => {
    if (session) {
      loadApiKeys()
    }
  }, [session])

  const loadApiKeys = async () => {
    try {
      // Get auth token from session
      const token = session?.access_token

      if (!token) {
        console.error("No authentication token available")
        return
      }

      const response = await fetch("/api/user-api-keys", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.apiKeys || [])
      } else {
        console.error("Failed to load API keys:", await response.text())
      }
    } catch (error) {
      console.error("Error loading API keys:", error)
    } finally {
      setLoading(false)
    }
  }

  const testApiKey = async (provider: string, apiKey: string) => {
    try {
      const token = session?.access_token
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch("/api/user-api-keys", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ provider, apiKey, testKey: true }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Validation failed")
      }
      return data
    } catch (error) {
      throw error
    }
  }

  const saveApiKey = async (provider: string, testFirst = false) => {
    const apiKey = formData[provider]?.trim()

    if (!apiKey) {
      toast({
        title: "API key required",
        description: `Please enter your ${provider} API key`,
        variant: "destructive",
      })
      return
    }

    const actionState = testFirst ? setTesting : setSaving
    actionState((prev) => ({ ...prev, [provider]: true }))

    try {
      // Test the key first if requested
      if (testFirst) {
        const testResult = await testApiKey(provider, apiKey)
        toast({
          title: "API key validated",
          description: testResult.message,
        })
      }

      // Save the key
      const token = session?.access_token
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch("/api/user-api-keys", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ provider, apiKey, testKey: false }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Save failed")
      }

      // Clear the form field
      setFormData((prev) => ({ ...prev, [provider]: "" }))

      // Refresh the list
      await loadApiKeys()

      // Force reload AI service configuration
      await enhancedAIService.loadUserApiKeys()

      toast({
        title: "API key saved",
        description: "Your API key has been saved and configured successfully",
      })
    } catch (error) {
      console.error(`Error saving ${provider} API key:`, error)
      toast({
        title: "Error saving API key",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      actionState((prev) => ({ ...prev, [provider]: false }))
    }
  }

  const deleteApiKey = async (provider: string) => {
    if (!confirm(`Are you sure you want to delete your ${provider} API key?`)) {
      return
    }

    try {
      // Get auth token from session
      const token = session?.access_token

      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please log in to delete API keys",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/user-api-keys?provider=${provider}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "API key deleted",
          description: data.message,
        })
        await loadApiKeys()
      } else {
        toast({
          title: "Delete failed",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getProviderStatus = (providerId: string) => {
    const apiKey = apiKeys.find((key) => key.provider === providerId)
    if (!apiKey) return { status: "not_configured", label: "Not Configured", variant: "secondary" as const }

    if (apiKey.test_status === "valid") {
      return { status: "valid", label: "Connected", variant: "default" as const }
    } else if (apiKey.test_status === "invalid") {
      return { status: "invalid", label: "Invalid", variant: "destructive" as const }
    } else {
      return { status: "untested", label: "Untested", variant: "secondary" as const }
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const testSavedKey = async (provider: string) => {
    setTesting((prev) => ({ ...prev, [provider]: true }))
    try {
      const token = session?.access_token
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`/api/user-api-keys/${provider}/test`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Test failed")
      }

      toast({
        title: "API key test successful",
        description: `Successfully tested ${provider} API key with model: ${data.model}`,
      })
      
      // Reload keys to update test status
      await loadApiKeys()
    } catch (error) {
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Failed to test API key",
        variant: "destructive",
      })
    } finally {
      setTesting((prev) => ({ ...prev, [provider]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading API keys...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {AI_PROVIDERS.map((provider) => {
          const status = getProviderStatus(provider.id)
          const hasKey = apiKeys.some((key) => key.provider === provider.id)
          const lastTested = apiKeys.find((key) => key.provider === provider.id)?.last_tested_at
          const savedKey = apiKeys.find((k) => k.provider === provider.id)
          const isSaving = saving[provider.id] || false
          const isTesting = testing[provider.id] || false
          const showKey = showKeys[provider.id] || false

          return (
            <Card key={provider.id} className="border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <Badge variant={status.variant}>
                        {status.status === "valid" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {status.status === "invalid" && <AlertCircle className="h-3 w-3 mr-1" />}
                        {status.label}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">{provider.description}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {hasKey ? (
                  <div className="flex items-center justify-between p-3 bg-muted rounded border">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">API Key Configured</p>
                        <p className="text-xs text-muted-foreground">Last tested: {formatDate(lastTested || null)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testSavedKey(provider.id)}
                        disabled={isTesting}
                      >
                        {isTesting ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                            Testing
                          </>
                        ) : (
                          <TestTube className="h-3 w-3 mr-1" />
                        )}
                        Test
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteApiKey(provider.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-key`} className="text-sm font-medium">
                        API Key
                      </Label>
                      <div className="relative">
                        <Input
                          id={`${provider.id}-key`}
                          type={showKey ? "text" : "password"}
                          placeholder={provider.placeholder}
                          value={formData[provider.id] || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [provider.id]: e.target.value,
                            }))
                          }
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() =>
                            setShowKeys((prev) => ({
                              ...prev,
                              [provider.id]: !prev[provider.id],
                            }))
                          }
                        >
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{provider.keyFormat}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveApiKey(provider.id, true)}
                        disabled={isSaving || isTesting}
                        className="flex-1"
                      >
                        {isTesting ? (
                          <>
                            <TestTube className="h-3 w-3 animate-spin mr-1" />
                            Testing
                          </>
                        ) : isSaving ? (
                          <>
                            <Save className="h-3 w-3 animate-spin mr-1" />
                            Saving
                          </>
                        ) : (
                          <Shield className="h-3 w-3 mr-1" />
                        )}
                        Test & Save
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Security & Privacy</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your API keys are stored securely in the database and only used for your AI
                requests. They are never shared with third parties. Please keep your API keys confidential.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
