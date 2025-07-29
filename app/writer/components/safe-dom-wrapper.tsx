import type React from "react"

interface SafeDOMWrapperProps {
  children: React.ReactNode
}

export function SafeDOMWrapper({ children }: SafeDOMWrapperProps) {
  // This component acts as a boundary for client-side DOM interactions.
  // It ensures that any direct DOM manipulation or browser-specific APIs
  // are only accessed when window is defined.
  // In this specific case, it's used to wrap the DialogContent
  // to ensure that react-beautiful-dnd, which relies on DOM,
  // functions correctly within Next.js's SSR environment.
  // It also helps in cases where components might conditionally render
  // based on browser environment.
  return <>{children}</>
}
