"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  AlertCircle, 
  RefreshCw, 
  Home, 
  ChevronDown, 
  ChevronUp,
  Bug,
  Mail,
  Copy,
  CheckCircle2
} from "lucide-react"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Log error to console
    console.error('Application Error:', error)
  }, [error])

  const copyErrorDetails = () => {
    const errorDetails = `
Error: ${error.message || 'Unknown error'}
Digest: ${error.digest || 'N/A'}
Stack: ${error.stack || 'No stack trace available'}
Timestamp: ${new Date().toISOString()}
URL: ${typeof window !== 'undefined' ? window.location.href : 'Unknown'}
User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}
    `.trim()

    navigator.clipboard.writeText(errorDetails)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getErrorType = (error: Error) => {
    if (error.message.includes('fetch')) return 'Network Error'
    if (error.message.includes('timeout')) return 'Timeout Error'
    if (error.message.includes('auth')) return 'Authentication Error'
    if (error.message.includes('permission')) return 'Permission Error'
    return 'Application Error'
  }

  const getRecoverySuggestions = (error: Error) => {
    const msg = error.message.toLowerCase()
    const suggestions = []

    if (msg.includes('network') || msg.includes('fetch')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Verify the service is available')
    }
    if (msg.includes('auth') || msg.includes('unauthorized')) {
      suggestions.push('Try logging out and logging back in')
      suggestions.push('Clear your browser cache and cookies')
    }
    if (msg.includes('timeout')) {
      suggestions.push('Wait a moment and try again')
      suggestions.push('Check your connection speed')
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Try refreshing the page')
      suggestions.push('Clear your browser cache')
      suggestions.push('Try a different browser')
    }

    return suggestions
  }

  const errorType = getErrorType(error)
  const suggestions = getRecoverySuggestions(error)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <Card className="border-destructive/50">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-8 w-8" />
              </div>
              <Badge variant="destructive" className="mb-4">
                {errorType}
              </Badge>
              <h1 className="text-3xl font-bold mb-2">Something Went Wrong</h1>
              <p className="text-muted-foreground max-w-md">
                We encountered an unexpected error. This has been logged and our team will investigate.
              </p>
            </div>

            <Separator className="my-6" />

            <div className="mb-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Error Details
              </h3>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-sm font-mono text-destructive break-all">
                    {error.message || 'An unexpected error occurred'}
                  </p>
                  {error.digest && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Error ID: <code className="bg-background px-1 py-0.5 rounded">{error.digest}</code>
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3">What you can try:</h3>
              <ul className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3 justify-center mb-6">
              <Button onClick={reset} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/">
                  <Home className="w-4 h-4" />
                  Go Home
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={copyErrorDetails}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Error
                  </>
                )}
              </Button>
            </div>

            {error.stack && (
              <div className="border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="gap-2 w-full justify-between"
                >
                  <span>Technical Details</span>
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
                
                {showDetails && (
                  <div className="mt-4 p-4 bg-muted rounded-lg overflow-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <Separator className="my-6" />

            <div className="text-center bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Still having issues?
              </p>
              <Button asChild variant="link" className="gap-2">
                <Link href="/contact">
                  <Mail className="w-4 h-4" />
                  Contact Support
                </Link>
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Development Mode:</strong> This detailed error information is only visible in development.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Error persisting?{' '}
            <Link href="/docs" className="text-primary hover:underline">
              Check Documentation
            </Link>
            {' '}or{' '}
            <Link href="/status" className="text-primary hover:underline">
              Service Status
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
