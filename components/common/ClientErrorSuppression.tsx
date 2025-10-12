"use client"

import { useEffect } from 'react'
import { ErrorHandler } from '@/lib/utils/error-handler'

export function ClientErrorSuppression() {
  useEffect(() => {
    // Initialize Chrome extension error suppression
    ErrorHandler.initializeChromeExtensionErrorSuppression()
  }, [])

  // This component doesn't render anything
  return null
}
