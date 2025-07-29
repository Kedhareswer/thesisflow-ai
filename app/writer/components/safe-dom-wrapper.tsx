"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface SafeDOMWrapperProps {
  children: React.ReactNode
}

/**
 * A wrapper component that renders its children only when the DOM is safely available.
 * This can prevent hydration errors or issues with components that rely heavily on DOM APIs
 * during server-side rendering.
 */
export function SafeDOMWrapper({ children }: SafeDOMWrapperProps) {
  const [isDOMReady, setIsDOMReady] = useState(false)

  useEffect(() => {
    // Check if window and document are defined, indicating client-side rendering
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      setIsDOMReady(true)
    }
  }, [])

  if (!isDOMReady) {
    // Optionally render a fallback or null during server-side rendering
    return null
  }

  return <>{children}</>
}
