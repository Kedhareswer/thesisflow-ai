"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertCircle, ChevronDown, ChevronRight, ExternalLink, RefreshCw } from "lucide-react"
import { ErrorHandler, type UserFriendlyError } from "@/lib/utils/error-handler"

interface ErrorDisplayProps {
  error: string | UserFriendlyError | null
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorDisplay({ error, onRetry, onDismiss, className }: ErrorDisplayProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  
  if (!error) return null

  // Convert string errors to UserFriendlyError format
  const processedError: UserFriendlyError = typeof error === 'string' 
    ? ErrorHandler.processError(error, { operation: 'summarizer-display' })
    : error

  const uiError = ErrorHandler.formatErrorForUI(processedError)

  return (
    <Alert className={`border-red-200 bg-red-50 ${className}`}>
      <AlertCircle className="h-4 w-4 text-red-600" />
      <div className="flex-1">
        <AlertTitle className="text-red-800 font-medium">
          {uiError.title}
        </AlertTitle>
        <AlertDescription className="text-red-700 mt-2">
          <div className="space-y-3">
            {/* Main error message */}
            <p>{uiError.message}</p>
            
            {/* Actionable guidance */}
            {uiError.actionableGuidance && (
              <div className="bg-red-100 rounded-md p-3 text-sm">
                <div 
                  className="whitespace-pre-line"
                  dangerouslySetInnerHTML={{ 
                    __html: uiError.actionableGuidance
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/• /g, '• ')
                      .replace(/https?:\/\/[^\s]+/g, (url) => 
                        `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-red-600 underline hover:text-red-800">${url} <span class="inline-block">↗</span></a>`
                      )
                  }}
                />
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
              )}
              
              {/* Quick action buttons based on error type */}
              {processedError.errorType === 'file_processing' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://quantumn-pdf-chatapp.netlify.app/', '_blank')}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Try QuantumPDF
                </Button>
              )}
              
              {processedError.errorType === 'ai_generation' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/settings'}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Check API Keys
                </Button>
              )}
              
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-red-600 hover:bg-red-100"
                >
                  Dismiss
                </Button>
              )}
            </div>
            
            {/* Technical details (collapsible) */}
            {uiError.showTechnicalDetails && uiError.technicalDetails && (
              <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-100 p-0 h-auto font-normal"
                  >
                    {showTechnicalDetails ? (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    ) : (
                      <ChevronRight className="h-3 w-3 mr-1" />
                    )}
                    Technical Details
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="bg-red-100 rounded-md p-2 text-xs font-mono text-red-800 break-all">
                    {uiError.technicalDetails}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </AlertDescription>
      </div>
    </Alert>
  )
}

// Helper component for inline error messages (smaller, less prominent)
interface InlineErrorProps {
  error: string | UserFriendlyError | null
  className?: string
}

export function InlineError({ error, className }: InlineErrorProps) {
  if (!error) return null

  const processedError: UserFriendlyError = typeof error === 'string' 
    ? ErrorHandler.processError(error, { operation: 'summarizer-inline' })
    : error

  return (
    <div className={`text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2 ${className}`}>
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">{processedError.title}</p>
          <p className="text-red-500 mt-1">{processedError.message}</p>
          {processedError.actions.length > 0 && (
            <ul className="mt-2 text-xs space-y-1">
              {processedError.actions.slice(0, 2).map((action, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-red-400">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// Loading state with error recovery
interface LoadingWithErrorProps {
  loading: boolean
  error: string | UserFriendlyError | null
  onRetry?: () => void
  loadingMessage?: string
  children?: React.ReactNode
}

export function LoadingWithError({ 
  loading, 
  error, 
  onRetry, 
  loadingMessage = "Processing...",
  children 
}: LoadingWithErrorProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="font-light">{loadingMessage}</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={onRetry}
        className="my-4"
      />
    )
  }

  return <>{children}</>
}