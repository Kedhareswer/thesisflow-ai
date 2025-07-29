"use client"

import { useCallback } from 'react'

export function useSafeDOM() {
  const safeDownload = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.style.display = 'none'
    
    // Add to DOM
    document.body.appendChild(a)
    
    // Trigger download
    a.click()
    
    // Clean up with proper error handling and timeout
    setTimeout(() => {
      try {
        if (a.parentNode) {
          document.body.removeChild(a)
        }
      } catch (removeError) {
        console.warn('Could not remove download element:', removeError)
      }
      
      // Revoke URL
      URL.revokeObjectURL(url)
    }, 100) // Small delay to ensure click completes
  }, [])

  const safeRemoveElement = useCallback((element: HTMLElement) => {
    try {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element)
      }
    } catch (error) {
      console.warn('Could not remove element:', error)
    }
  }, [])

  return {
    safeDownload,
    safeRemoveElement
  }
} 