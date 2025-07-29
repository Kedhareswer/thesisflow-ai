import { useEffect, useCallback } from 'react'

export function useGlobalErrorHandler() {
  const handleError = useCallback((event: ErrorEvent) => {
    const error = event.error || new Error(event.message)
    
    // Check if it's a DOM manipulation error
    if (
      error.message.includes('removeChild') ||
      error.message.includes('appendChild') ||
      error.message.includes('insertBefore') ||
      error.message.includes('querySelector') ||
      error.name === 'NotFoundError' ||
      error.name === 'HierarchyRequestError'
    ) {
      console.warn('Global DOM error handler caught:', error)
      
      // Prevent the error from propagating
      event.preventDefault()
      
      // Try to recover gracefully
      try {
        // Clear any problematic DOM elements
        const problematicElements = document.querySelectorAll('[data-dom-error]')
        problematicElements.forEach(el => {
          try {
            if (el.parentNode) {
              el.parentNode.removeChild(el)
            }
          } catch (e) {
            console.warn('Could not remove problematic element:', e)
          }
        })
      } catch (e) {
        console.warn('Error recovery failed:', e)
      }
      
      return false
    }
    
    return true
  }, [])

  const handleUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    const error = event.reason
    
    // Check if it's a DOM-related promise rejection
    if (
      error && 
      typeof error === 'object' &&
      (error.message?.includes('removeChild') ||
       error.message?.includes('appendChild') ||
       error.message?.includes('insertBefore'))
    ) {
      console.warn('Global DOM promise rejection handler caught:', error)
      
      // Prevent the rejection from being unhandled
      event.preventDefault()
      
      return false
    }
    
    return true
  }, [])

  useEffect(() => {
    // Add global error handlers
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [handleError, handleUnhandledRejection])
} 