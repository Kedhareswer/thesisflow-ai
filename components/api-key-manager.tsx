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
  Key
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ApiKey {
  id: string
  provider: string
  is_active: boolean
  last_tested_at: string | null
  test_status: 'valid' | 'invalid' | 'untested'
  created_at: string
  updated_at: string
}

interface ApiKeyFormData {
  [provider: string]: string
}

const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI GPT',
    description: 'GPT-4, GPT-3.5 Turbo and other OpenAI models',
    icon: '🤖',
    docsUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...',
    keyFormat: 'Starts with "sk-" followed by 48+ characters'
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference for LLaMA, Mixtral, and more',
    icon: '⚡',
    docsUrl: 'https://console.groq.com/keys',
    placeholder: 'gsk_...',
    keyFormat: 'Starts with "gsk_" followed by 52 characters'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google\'s most capable AI model',
    icon: '🔮',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIza...',
    keyFormat: '39 characters, alphanumeric with dashes/underscores'
  },
  {
    id: 'aiml',
    name: 'AI/ML API',
    description: 'Multiple models through AI/ML API',
    icon: '🚀',
    docsUrl: 'https://aimlapi.com/app/keys',
    placeholder: 'your-aiml-key',
    keyFormat: '32+ characters, alphanumeric with dashes/underscores'
  },
  {
    id: 'deepinfra',
    name: 'DeepInfra',
    description: 'Cost-effective inference for popular models',
    icon: '💎',
    docsUrl: 'https://deepinfra.com/dash/api_keys',
    placeholder: 'your-deepinfra-key',
    keyFormat: '20+ characters, alphanumeric with dashes/underscores'
  }
]

export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [formData, setFormData] = useState<ApiKeyFormData>({})
  const [showKeys, setShowKeys] = useState<{[provider: string]: boolean}>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<{[provider: string]: boolean}>({})
  const [testing, setTesting] = useState<{[provider: string]: boolean}>({})
  const { toast } = useToast()

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/user-api-keys')
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.apiKeys || [])
      }
    } catch (error) {
      console.error('Error loading API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveApiKey = async (provider: string, testKey: boolean = false) => {
    const apiKey = formData[provider]?.trim()
    
    if (!apiKey) {
      toast({
        title: "API key required",
        description: `Please enter your ${provider} API key`,
        variant: "destructive",
      })
      return
    }

    const actionKey = testKey ? 'testing' : 'saving'
    const setActionState = testKey ? setTesting : setSaving
    
    setActionState(prev => ({ ...prev, [provider]: true }))

    try {
      const response = await fetch('/api/user-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, testKey })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: testKey ? "API key validated" : "API key saved",
          description: data.message,
        })
        
        // Clear form data and reload keys
        setFormData(prev => ({ ...prev, [provider]: '' }))
        setShowKeys(prev => ({ ...prev, [provider]: false }))
        await loadApiKeys()
      } else {
        toast({
          title: testKey ? "Validation failed" : "Save failed",
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
    } finally {
      setActionState(prev => ({ ...prev, [provider]: false }))
    }
  }

  const deleteApiKey = async (provider: string) => {
    if (!confirm(`Are you sure you want to delete your ${provider} API key?`)) {
      return
    }

    try {
      const response = await fetch(`/api/user-api-keys?provider=${provider}`, {
        method: 'DELETE'
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
    const apiKey = apiKeys.find(key => key.provider === providerId)
    if (!apiKey) return { status: 'not_configured', label: 'Not configured', color: 'secondary' }
    
    if (apiKey.test_status === 'valid') {
      return { status: 'valid', label: 'Connected', color: 'default' }
    } else if (apiKey.test_status === 'invalid') {
      return { status: 'invalid', label: 'Invalid', color: 'destructive' }
    } else {
      return { status: 'untested', label: 'Untested', color: 'secondary' }
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {AI_PROVIDERS.map((provider) => {
          const status = getProviderStatus(provider.id)
          const hasKey = apiKeys.some(key => key.provider === provider.id)
          const lastTested = apiKeys.find(key => key.provider === provider.id)?.last_tested_at

          return (
            <Card key={provider.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{provider.icon}</div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {provider.name}
                        <Badge variant={status.color as any}>
                          {status.status === 'valid' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {status.status === 'invalid' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {status.label}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{provider.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {hasKey ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Last tested: {formatDate(lastTested || null)}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveApiKey(provider.id, true)}
                          disabled={testing[provider.id]}
                        >
                          {testing[provider.id] ? (
                            <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <TestTube className="h-3 w-3 mr-1" />
                          )}
                          Test
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteApiKey(provider.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`${provider.id}-key`}>API Key</Label>
                      <div className="flex gap-2 mt-1">
                        <div className="relative flex-1">
                          <Input
                            id={`${provider.id}-key`}
                            type={showKeys[provider.id] ? "text" : "password"}
                            placeholder={provider.placeholder}
                            value={formData[provider.id] || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              [provider.id]: e.target.value
                            }))}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowKeys(prev => ({
                              ...prev,
                              [provider.id]: !prev[provider.id]
                            }))}
                          >
                            {showKeys[provider.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {provider.keyFormat}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => saveApiKey(provider.id, false)}
                        disabled={saving[provider.id] || !formData[provider.id]?.trim()}
                        className="flex-1"
                      >
                        {saving[provider.id] ? (
                          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => saveApiKey(provider.id, true)}
                        disabled={testing[provider.id] || !formData[provider.id]?.trim()}
                      >
                        {testing[provider.id] ? (
                          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <TestTube className="h-3 w-3 mr-1" />
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

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-medium text-blue-900">API Key Security</h3>
              <p className="text-sm text-blue-800">
                Your API keys are encrypted and stored securely. They are only used to make AI requests on your behalf and are never shared with third parties.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
