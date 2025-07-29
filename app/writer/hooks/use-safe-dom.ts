"use client"

import { useCallback, useRef } from "react"

export function useSafeDOM() {
  const mountedRef = useRef(true)

  // Track component mount state
  const isMounted = useCallback(() => mountedRef.current, [])

  const safeDownload = useCallback(
    (blob: Blob, filename: string) => {
      if (!isMounted()) return

      try {
        const element = document.createElement("a")
        const url = URL.createObjectURL(blob)
        element.href = url
        element.download = filename
        element.style.display = "none"

        // Add to DOM
        document.body.appendChild(element)

        // Trigger download
        element.click()

        // Clean up with delayed removal to ensure download starts
        setTimeout(() => {
          if (!isMounted()) return

          try {
            if (element.parentNode) {
              document.body.removeChild(element)
            }
          } catch (removeError) {
            console.warn("Could not remove download element:", removeError)
          }
          // Revoke URL
          URL.revokeObjectURL(url)
        }, 100)
      } catch (error) {
        console.error("Error in safeDownload:", error)
      }
    },
    [isMounted],
  )

  const safeRemoveElement = useCallback(
    (element: HTMLElement) => {
      if (!isMounted()) return

      try {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element)
        }
      } catch (error) {
        console.warn("Could not remove element:", error)
      }
    },
    [isMounted],
  )

  const safeQuerySelector = useCallback(
    (selector: string): HTMLElement | null => {
      if (!isMounted()) return null

      try {
        return document.querySelector(selector) as HTMLElement
      } catch (error) {
        console.warn("Error querying selector:", selector, error)
        return null
      }
    },
    [isMounted],
  )

  const safeSetInnerHTML = useCallback(
    (element: HTMLElement, content: string) => {
      if (!isMounted()) return

      try {
        if (element) {
          element.innerHTML = content
        }
      } catch (error) {
        console.warn("Error setting innerHTML:", error)
      }
    },
    [isMounted],
  )

  const safeClearElement = useCallback(
    (element: HTMLElement) => {
      if (!isMounted()) return

      try {
        if (element) {
          while (element.firstChild) {
            element.removeChild(element.firstChild)
          }
        }
      } catch (error) {
        console.warn("Error clearing element:", error)
      }
    },
    [isMounted],
  )

  const safeAppendChild = useCallback(
    (parent: HTMLElement, child: HTMLElement) => {
      if (!isMounted()) return

      try {
        if (parent && child) {
          parent.appendChild(child)
        }
      } catch (error) {
        console.warn("Error appending child:", error)
      }
    },
    [isMounted],
  )

  const safeInsertBefore = useCallback(
    (parent: HTMLElement, child: HTMLElement, reference: HTMLElement | null) => {
      if (!isMounted()) return

      try {
        if (parent && child) {
          parent.insertBefore(child, reference)
        }
      } catch (error) {
        console.warn("Error inserting before:", error)
      }
    },
    [isMounted],
  )

  const safeReplaceChild = useCallback(
    (parent: HTMLElement, newChild: HTMLElement, oldChild: HTMLElement) => {
      if (!isMounted()) return

      try {
        if (parent && newChild && oldChild) {
          parent.replaceChild(newChild, oldChild)
        }
      } catch (error) {
        console.warn("Error replacing child:", error)
      }
    },
    [isMounted],
  )

  // Cleanup function to be called on unmount
  const cleanup = useCallback(() => {
    mountedRef.current = false
  }, [])

  return {
    safeDownload,
    safeRemoveElement,
    safeQuerySelector,
    safeSetInnerHTML,
    safeClearElement,
    safeAppendChild,
    safeInsertBefore,
    safeReplaceChild,
    isMounted,
    cleanup,
  }
}
