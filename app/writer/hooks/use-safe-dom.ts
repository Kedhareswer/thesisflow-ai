"use client"

import { useCallback } from 'react'

export function useSafeDOM() {
  const safeDownload = useCallback((blob: Blob, filename: string) => {
    try {
      const element = document.createElement("a")
      const url = URL.createObjectURL(blob)
      element.href = url
      element.download = filename
      element.style.display = 'none'
      
      // Add to DOM
      document.body.appendChild(element)
      
      // Trigger download
      element.click()
      
      // Clean up with delayed removal to ensure download starts
      setTimeout(() => {
        try {
          if (element.parentNode) {
            document.body.removeChild(element)
          }
        } catch (removeError) {
          console.warn('Could not remove download element:', removeError)
        }
        // Revoke URL
        URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error('Error in safeDownload:', error)
    }
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

  const safeQuerySelector = useCallback((selector: string): HTMLElement | null => {
    try {
      return document.querySelector(selector) as HTMLElement
    } catch (error) {
      console.warn('Error querying selector:', selector, error)
      return null
    }
  }, [])

  const safeSetInnerHTML = useCallback((element: HTMLElement, content: string) => {
    try {
      if (element) {
        element.innerHTML = content
      }
    } catch (error) {
      console.warn('Error setting innerHTML:', error)
    }
  }, [])

  const safeClearElement = useCallback((element: HTMLElement) => {
    try {
      if (element) {
        while (element.firstChild) {
          element.removeChild(element.firstChild)
        }
      }
    } catch (error) {
      console.warn('Error clearing element:', error)
    }
  }, [])

  return {
    safeDownload,
    safeRemoveElement,
    safeQuerySelector,
    safeSetInnerHTML,
    safeClearElement
  }
} 