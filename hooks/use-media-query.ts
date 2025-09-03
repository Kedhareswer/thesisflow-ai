"use client"

import { useEffect, useState } from "react"

/**
 * useMediaQuery
 * React hook to subscribe to a CSS media query.
 * Returns whether the query currently matches.
 */
export function useMediaQuery(query: string, initial: boolean = false): boolean {
  const getMatches = (q: string): boolean => {
    if (typeof window === "undefined") return initial
    return window.matchMedia(q).matches
  }

  const [matches, setMatches] = useState<boolean>(getMatches(query))

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQueryList = window.matchMedia(query)
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches)

    mediaQueryList.addEventListener("change", listener)
    return () => mediaQueryList.removeEventListener("change", listener)
  }, [query])

  return matches
}
