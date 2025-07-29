"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, AlertTriangle, FileText, Home } from "lucide-react"

interface WriterErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface WriterErrorBoundaryProps {
  children: React.ReactNode
}

export class WriterErrorBoundary extends React.Component<WriterErrorBoundaryProps, WriterErrorBoundaryState> {
  constructor(props: WriterErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): WriterErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Writer Error Boundary caught an error:", error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = "/"
  }

  isDOMError = (error: Error): boolean => {
    return (
      error.message.includes("removeChild") ||
      error.message.includes("appendChild") ||
      error.message.includes("insertBefore") ||
      error.message.includes("querySelector") ||
      error.message.includes("getElementById") ||
      error.message.includes("innerHTML") ||
      error.name === "NotFoundError" ||
      error.name === "HierarchyRequestError"
    )
  }

  render() {
    if (this.state.hasError) {
      const isDOMError = this.state.error ? this.isDOMError(this.state.error) : false

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-gray-900">
                {isDOMError ? "DOM Manipulation Error" : "Something went wrong"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {isDOMError 
                    ? "DOM manipulation conflict detected" 
                    : "An unexpected error occurred"
                  }
                </AlertTitle>
                <AlertDescription>
                  {isDOMError 
                    ? "The application encountered a conflict while manipulating the DOM. This is usually caused by rapid state changes or component lifecycle issues."
                    : "The writer encountered an error while processing your request."
                  }
                </AlertDescription>
              </Alert>

              {this.state.error && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Error Details:</h4>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Stack trace
                      </summary>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-32 mt-2">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} variant="ghost" className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {isDOMError && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">What happened?</h4>
                  <p className="text-sm text-blue-700">
                    This error typically occurs when the application tries to manipulate DOM elements 
                    that have already been removed or modified by React's reconciliation process. 
                    The error has been caught and the application should now be stable.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
} 