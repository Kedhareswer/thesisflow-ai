"use client"

import { useState, useEffect, useRef } from 'react'

export function useSafeState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const safeSetState = (value: T | ((prev: T) => T)) => {
    if (isMounted.current) {
      setState(value)
    }
  }

  return [state, safeSetState] as const
}

export function useSafeCallback<T extends (...args: any[]) => any>(callback: T): T {
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  return ((...args: any[]) => {
    if (isMounted.current) {
      return callback(...args)
    }
  }) as T
}
