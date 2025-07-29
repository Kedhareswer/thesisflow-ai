"use client"

import { useState, useEffect, useRef } from 'react'

export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const debouncedSetState = (value: T | ((prev: T) => T)) => {
    if (!isMounted.current) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        setState(value)
      }
    }, delay)
  }

  return [state, debouncedSetState]
}
