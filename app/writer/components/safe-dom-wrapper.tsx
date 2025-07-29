"use client"

import React, { useEffect, useRef } from 'react'
import { useSafeDOM } from '../hooks/use-safe-dom'

interface SafeDOMWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error) => void
}

export function SafeDOMWrapper({ children, fallback, onError }: SafeDOMWrapperProps) {
  const { cleanup } = useSafeDOM()
  const errorRef = useRef<Error | null>(null)

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // Catch any DOM-related errors
  const handleError = (error: Error) => {
    if (error.message.includes('removeChild') || 
        error.message.includes('appendChild') || 
        error.message.includes('insertBefore') ||
        error.name === 'NotFoundError') {
      errorRef.current = error
      onError?.(error)
      console.warn('DOM manipulation error caught by SafeDOMWrapper:', error)
    }
  }

  if (errorRef.current) {
    return fallback ? (
      <div className="safe-dom-fallback">
        {fallback}
      </div>
    ) : (
      <div className="safe-dom-error">
        <p>DOM manipulation error occurred. Please refresh the page.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}

// Simple error boundary for DOM errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render() {
    if (this.state.hasError) {
      return null // Let the wrapper handle the error
    }

    return this.props.children
  }
} 