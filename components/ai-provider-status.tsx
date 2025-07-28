"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Settings, ExternalLink, User, Database } from "lucide-react"
import { AIConfig } from "@/lib/ai-config"

interface AIProviderStatus {
  provider: string
  name: string
  available: boolean
  error?: string
  models?: string[]
}

export function AIProviderStatus({ showActions = true }: { showActions?: boolean }) {
  const [providers, setProviders] = useState<AIProviderStatus[]>([])
  const [userApiKeys, setUserApiKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalAvailable, setTotalAvailable] = useState(0)
  const [hasUserKeys, setHasUserKeys] = useState(false)

  useEffect(() => {
    checkProviderStatus()
  }, [])

  const checkProviderStatus = async () => {
    try {
      setLoading(true)
      
      // Check user's personal API keys first
      try {
        const userKeysResponse = await fetch('/api/user-api-keys')
        if (userKeysResponse.ok) {
          const userData = await userKeysResponse.json()
          setUserApiKeys(userData.apiKeys || [])
          setHasUserKeys((userData.apiKeys || []).length > 0)
        }
      } catch (error) {
        console.log('User not authenticated or no user keys')
        setHasUserKeys(false)
      }
      
      // Check system fallback providers
      const status = await AIConfig.getProviderStatus()
      
      const providerList: AIProviderStatus[] = [
        {
          provider: 'groq',
          name: 'Groq (Fast)',
          available: status.available.includes('groq'),
          models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768']
        },
        {
          provider: 'openai',
          name: 'OpenAI (GPT)',
          available: status.available.includes('openai'),
          models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
        },
        {
          provider: 'gemini',
          name: 'Google Gemini',
          available: status.available.includes('gemini'),
          models: ['gemini-2.0-flash', 'gemini-1.5-pro']
        },
        {
          provider: 'anthropic',
          name: 'Anthropic (Claude)',
          available: status.available.includes('anthropic'),
          models: ['claude-3.5-sonnet', 'claude-3-opus']
        },
        {
          provider: 'mistral',
          name: 'Mistral AI',
          available: status.available.includes('mistral'),
          models: ['mistral-large-latest', 'mistral-medium-latest']
        },
        {
          provider: 'aiml',
          name: 'AI/ML API',
          available: status.available.includes('aiml'),
          models: ['gpt-4o', 'claude-3-sonnet']
        }
      ]

      setProviders(providerList)
      setTotalAvailable(status.available.length)
    } catch (error) {
      console.error('Error checking AI provider status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 animate-spin" />
            Checking AI Providers...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {hasUserKeys ? (
        <Alert className="border-green-200 bg-green-50">
          <User className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Using your personal API keys.</strong> You have {userApiKeys.length} personal provider{userApiKeys.length !== 1 ? 's' : ''} configured.
            System fallback providers are not needed.
          </AlertDescription>
        </Alert>
      ) : totalAvailable === 0 ? (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>No AI providers available.</strong> Configure personal API keys in the section above for the best experience.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-blue-200 bg-blue-50">
          <Database className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Using system fallback providers.</strong> Configure personal API keys above for better performance and privacy.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Fallback Providers
          </CardTitle>
          <CardDescription>
            {hasUserKeys 
              ? 'These providers are available as fallbacks when your personal keys are not working'
              : totalAvailable > 0 
                ? `${totalAvailable} of ${providers.length} fallback providers available`
                : 'No fallback providers configured'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {providers.map((provider) => (
              <div key={provider.provider} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {provider.available ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="font-medium">{provider.name}</span>
                  </div>
                  {provider.models && (
                    <div className="hidden md:flex gap-1">
                      {provider.models.slice(0, 2).map((model) => (
                        <Badge key={model} variant="secondary" className="text-xs">
                          {model}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Badge variant={provider.available ? "default" : "secondary"}>
                  {provider.available ? "Available" : "Not Configured"}
                </Badge>
              </div>
            ))}
          </div>

          {showActions && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex gap-2">
                <Button variant="outline" onClick={checkProviderStatus}>
                  Refresh Status
                </Button>
                <Button variant="outline" asChild>
                  <a href="/settings">Configure Providers</a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
