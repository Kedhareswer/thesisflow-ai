"use client"

import { useCallback, useRef } from "react"

export function useSafeDOM() {
  const mountedRef = useRef(true)

  // Track component mount state
  const isMounted = useCallback(() => mountedRef.current, [])

  const safeDownload = useCallback(
    (blob: Blob, filename: string) => {
      if (!isMounted()) return

      if (typeof window !== "undefined") {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        console.warn("safeDownload: Not in a browser environment. Cannot download file.")
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
