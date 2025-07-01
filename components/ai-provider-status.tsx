"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Settings, ExternalLink } from "lucide-react"
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
  const [loading, setLoading] = useState(true)
  const [totalAvailable, setTotalAvailable] = useState(0)

  useEffect(() => {
    checkProviderStatus()
  }, [])

  const checkProviderStatus = async () => {
    try {
      setLoading(true)
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
          provider: 'aiml',
          name: 'AI/ML API',
          available: status.available.includes('aiml'),
          models: ['gpt-4o', 'claude-3-sonnet']
        },
        {
          provider: 'deepinfra',
          name: 'DeepInfra',
          available: status.available.includes('deepinfra'),
          models: ['Meta-Llama-3.1-70B-Instruct']
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
      {totalAvailable === 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>No AI providers configured.</strong> Add API keys to your environment variables to enable AI features.
            <br />
            <Button variant="link" className="p-0 h-auto text-amber-700 underline" asChild>
              <a href="/settings" className="flex items-center gap-1 mt-2">
                Configure in Settings <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Provider Status
          </CardTitle>
          <CardDescription>
            {totalAvailable > 0 
              ? `${totalAvailable} of ${providers.length} providers available`
              : 'No providers configured'
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
