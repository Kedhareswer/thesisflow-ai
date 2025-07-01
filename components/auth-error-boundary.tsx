"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, LogIn, Home } from "lucide-react"
import Link from "next/link"

interface AuthErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface AuthErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

export class AuthErrorBoundary extends React.Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Auth Error Boundary caught an error:", error, errorInfo)
    
    // Log auth-specific errors
    if (this.isAuthError(error)) {
      console.error("Authentication Error:", {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }

    this.setState({
      error,
      errorInfo
    })
  }

  private isAuthError(error: Error): boolean {
    const authErrorKeywords = [
      'auth',
      'authentication', 
      'login',
      'signup',
      'token',
      'session',
      'supabase',
      'unauthorized'
    ]
    
    return authErrorKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword) ||
      error.stack?.toLowerCase().includes(keyword)
    )
  }

  private retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state
      const { fallback: FallbackComponent } = this.props

      // Use custom fallback if provided
      if (FallbackComponent && error) {
        return <FallbackComponent error={error} retry={this.retry} />
      }

      // Default auth error UI
      return <AuthErrorFallback error={error} retry={this.retry} />
    }

    return this.props.children
  }
}

// Default error fallback component
function AuthErrorFallback({ 
  error, 
  retry 
}: { 
  error: Error | null
  retry: () => void 
}) {
  const isAuthError = error && (
    error.message.includes('auth') || 
    error.message.includes('login') ||
    error.message.includes('session')
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-900">
            {isAuthError ? "Authentication Error" : "Something went wrong"}
          </CardTitle>
          <CardDescription>
            {isAuthError 
              ? "There was a problem with authentication. Please try logging in again."
              : "An unexpected error occurred. Please try again or contact support if the problem persists."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error details (only in development) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="p-3 bg-gray-100 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-2">Error Details:</p>
              <p className="text-xs text-gray-600 font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <Button onClick={retry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            
            {isAuthError && (
              <Button variant="outline" asChild className="w-full">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Go to Login
                </Link>
              </Button>
            )}
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for functional components to handle auth errors
export function useAuthErrorHandler() {
  const handleAuthError = (error: Error, context?: string) => {
    console.error(`Auth error in ${context || 'component'}:`, error)
    
    // You could also trigger error reporting service here
    // e.g., Sentry, LogRocket, etc.
    
    throw error // Re-throw to be caught by error boundary
  }

  return { handleAuthError }
} 