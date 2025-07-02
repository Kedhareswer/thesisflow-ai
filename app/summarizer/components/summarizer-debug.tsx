"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  RefreshCw,
  Settings,
  Key,
  Zap,
  Info
} from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface DiagnosticResult {
  component: string
  status: 'success' | 'warning' | 'error'
  message: string
  details?: string
  fix?: string
}

interface APIKeyStatus {
  provider: string
  hasKey: boolean
  isValid: boolean
  lastTested?: string
  error?: string
}

export function SummarizerDebug() {
  const [isRunning, setIsRunning] = useState(false)
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([])
  const [apiKeys, setApiKeys] = useState<APIKeyStatus[]>([])
  const [showDebug, setShowDebug] = useState(false)
  const { toast } = useToast()

  const runDiagnostics = async () => {
    setIsRunning(true)
    setDiagnostics([])
    
    const results: DiagnosticResult[] = []

    try {
      // Test 1: Check authentication
      results.push(await checkAuthentication())
      
      // Test 2: Check API keys
      const apiKeyResults = await checkAPIKeys()
      results.push(...apiKeyResults.diagnostics)
      setApiKeys(apiKeyResults.keys)
      
      // Test 3: Test AI service
      results.push(await testAIService())
      
      // Test 4: Test summarization endpoint
      results.push(await testSummarizationEndpoint())
      
      setDiagnostics(results)
      
      const hasErrors = results.some(r => r.status === 'error')
      const hasWarnings = results.some(r => r.status === 'warning')
      
      if (hasErrors) {
        toast({
          title: "Diagnostics completed with errors",
          description: "Found issues that need to be resolved",
          variant: "destructive"
        })
      } else if (hasWarnings) {
        toast({
          title: "Diagnostics completed with warnings", 
          description: "Some optimizations recommended",
        })
      } else {
        toast({
          title: "All diagnostics passed!",
          description: "Summarizer should be working correctly",
        })
      }
    } catch (error) {
      console.error('Diagnostic error:', error)
      results.push({
        component: 'Diagnostics',
        status: 'error',
        message: 'Failed to run diagnostics',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
      setDiagnostics(results)
    } finally {
      setIsRunning(false)
    }
  }

  const checkAuthentication = async (): Promise<DiagnosticResult> => {
    try {
      const response = await fetch('/api/user-data', {
        credentials: 'include'
      })
      
      if (response.ok) {
        return {
          component: 'Authentication',
          status: 'success',
          message: 'User is authenticated'
        }
      } else {
        return {
          component: 'Authentication',
          status: 'error',
          message: 'User is not authenticated',
          fix: 'Please log in to use the summarizer'
        }
      }
    } catch (error) {
      return {
        component: 'Authentication',
        status: 'error',
        message: 'Failed to check authentication',
        details: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  const checkAPIKeys = async (): Promise<{
    diagnostics: DiagnosticResult[]
    keys: APIKeyStatus[]
  }> => {
    try {
      const response = await fetch('/api/user-api-keys?include_keys=true', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        return {
          diagnostics: [{
            component: 'API Keys',
            status: 'error',
            message: 'Failed to fetch API keys',
            details: `HTTP ${response.status}`,
            fix: 'Check your authentication and try again'
          }],
          keys: []
        }
      }
      
      const data = await response.json()
      const keys: APIKeyStatus[] = []
      
      if (!data.success || !data.apiKeys || data.apiKeys.length === 0) {
        return {
          diagnostics: [{
            component: 'API Keys',
            status: 'error',
            message: 'No valid API keys found',
            fix: 'Add at least one AI provider API key in Settings'
          }],
          keys: []
        }
      }
      
      // Process API keys
      data.apiKeys.forEach((key: any) => {
        keys.push({
          provider: key.provider,
          hasKey: !!key.decrypted_key,
          isValid: key.test_status === 'valid',
          lastTested: key.updated_at
        })
      })
      
      const validKeys = keys.filter(k => k.hasKey && k.isValid)
      
      if (validKeys.length === 0) {
        return {
          diagnostics: [{
            component: 'API Keys',
            status: 'error',
            message: 'No valid API keys available',
            details: `Found ${keys.length} keys but none are valid`,
            fix: 'Test your API keys in Settings or add new ones'
          }],
          keys
        }
      }
      
      return {
        diagnostics: [{
          component: 'API Keys',
          status: 'success',
          message: `Found ${validKeys.length} valid API key(s)`,
          details: validKeys.map(k => k.provider).join(', ')
        }],
        keys
      }
    } catch (error) {
      return {
        diagnostics: [{
          component: 'API Keys',
          status: 'error',
          message: 'Failed to check API keys',
          details: error instanceof Error ? error.message : 'Unknown error'
        }],
        keys: []
      }
    }
  }

  const testAIService = async (): Promise<DiagnosticResult> => {
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: 'Test prompt for diagnostics. Please respond with "OK".',
          maxTokens: 50
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        return {
          component: 'AI Service',
          status: 'error',
          message: 'AI service test failed',
          details: errorData.error || `HTTP ${response.status}`,
          fix: 'Check your API keys and provider configuration'
        }
      }
      
      const data = await response.json()
      
      if (data.success && data.content) {
        return {
          component: 'AI Service',
          status: 'success',
          message: 'AI service is working',
          details: `Provider: ${data.provider}, Model: ${data.model}`
        }
      } else {
        return {
          component: 'AI Service',
          status: 'error',
          message: 'AI service returned no content',
          details: data.error || 'No error details'
        }
      }
    } catch (error) {
      return {
        component: 'AI Service',
        status: 'error',
        message: 'Failed to test AI service',
        details: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  const testSummarizationEndpoint = async (): Promise<DiagnosticResult> => {
    try {
      // Test with a simple text summarization
      const testContent = "This is a test document for summarization. It contains multiple sentences to test the summarization functionality. The summarizer should be able to process this content and generate a meaningful summary with key points."
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: `Summarize content | Style: academic | Length: brief

CONTENT:
${testContent}

OUTPUT FORMAT:
SUMMARY: [academic summary in brief detail]
KEY_POINTS: [point1] | [point2] | [point3]
READING_TIME: [minutes]
SENTIMENT: [positive/neutral/negative]`,
          maxTokens: 500
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        return {
          component: 'Summarization',
          status: 'error',
          message: 'Summarization test failed',
          details: errorData.error || `HTTP ${response.status}`,
          fix: 'The AI service may not support summarization'
        }
      }
      
      const data = await response.json()
      
      if (data.success && data.content) {
        const hasExpectedFormat = data.content.includes('SUMMARY:') || 
                                  data.content.includes('KEY_POINTS:') ||
                                  data.content.toLowerCase().includes('summary')
        
        if (hasExpectedFormat) {
          return {
            component: 'Summarization',
            status: 'success',
            message: 'Summarization is working correctly'
          }
        } else {
          return {
            component: 'Summarization',
            status: 'warning',
            message: 'Summarization works but format may be inconsistent',
            details: 'AI response doesn\'t follow expected format'
          }
        }
      } else {
        return {
          component: 'Summarization',
          status: 'error',
          message: 'Summarization test failed',
          details: data.error || 'No content returned'
        }
      }
    } catch (error) {
      return {
        component: 'Summarization',
        status: 'error',
        message: 'Failed to test summarization',
        details: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Info className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setShowDebug(true)}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          <Settings className="h-4 w-4 mr-2" />
          Debug Summarizer
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Summarizer Diagnostics</CardTitle>
              <Button variant="ghost" onClick={() => setShowDebug(false)}>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex gap-3">
                <Button
                  onClick={runDiagnostics}
                  disabled={isRunning}
                  className="flex-1"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('/settings', '_blank')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>

              {diagnostics.length > 0 && (
                <Tabs defaultValue="results">
                  <TabsList>
                    <TabsTrigger value="results">Test Results</TabsTrigger>
                    <TabsTrigger value="apikeys">API Keys</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="results" className="space-y-4">
                    {diagnostics.map((result, index) => (
                      <Alert key={index} className={`border-l-4 ${
                        result.status === 'success' ? 'border-l-green-500' :
                        result.status === 'warning' ? 'border-l-yellow-500' :
                        'border-l-red-500'
                      }`}>
                        <div className="flex items-start gap-3">
                          {getStatusIcon(result.status)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{result.component}</h4>
                              <Badge variant={
                                result.status === 'success' ? 'default' :
                                result.status === 'warning' ? 'secondary' :
                                'destructive'
                              }>
                                {result.status}
                              </Badge>
                            </div>
                            <AlertDescription className="mt-1">
                              <p className={getStatusColor(result.status)}>{result.message}</p>
                              {result.details && (
                                <p className="text-sm text-gray-600 mt-1">{result.details}</p>
                              )}
                              {result.fix && (
                                <p className="text-sm font-medium text-blue-600 mt-2">
                                  Fix: {result.fix}
                                </p>
                              )}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="apikeys" className="space-y-4">
                    {apiKeys.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No API keys found. Run diagnostics first or add API keys in Settings.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="grid gap-3">
                        {apiKeys.map((key, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3">
                              <Key className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="font-medium">{key.provider}</p>
                                {key.lastTested && (
                                  <p className="text-sm text-gray-500">
                                    Last tested: {new Date(key.lastTested).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={key.hasKey ? 'default' : 'secondary'}>
                                {key.hasKey ? 'Has Key' : 'No Key'}
                              </Badge>
                              <Badge variant={key.isValid ? 'default' : 'destructive'}>
                                {key.isValid ? 'Valid' : 'Invalid'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
