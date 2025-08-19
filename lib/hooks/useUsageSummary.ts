"use client"

import { useEffect, useMemo, useState } from "react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"

export type UsageItem = {
  feature_name: string
  usage_count: number
  limit_count: number | null
  remaining: number | null
  is_unlimited: boolean
}

export function useUsageSummary() {
  const { session } = useSupabaseAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planName, setPlanName] = useState<string | undefined>(undefined)
  const [items, setItems] = useState<UsageItem[]>([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!session?.access_token) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/user/usage/summary", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Request failed: ${res.status}`)
        }
        const data = await res.json()
        if (cancelled) return
        setPlanName(data.planName)
        setItems(Array.isArray(data.items) ? data.items : [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load usage")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [session?.access_token])

  const { totalLimit, totalRemaining, allUnlimited } = useMemo(() => {
    if (!items.length) return { totalLimit: 0, totalRemaining: 0, allUnlimited: false }
    const finite = items.filter((i) => !i.is_unlimited && typeof i.limit_count === "number")
    if (finite.length === 0) return { totalLimit: 0, totalRemaining: 0, allUnlimited: true }
    const totalLimit = finite.reduce((acc, i) => acc + (i.limit_count || 0), 0)
    const totalRemaining = finite.reduce((acc, i) => acc + (i.remaining || 0), 0)
    return { totalLimit, totalRemaining, allUnlimited: false }
  }, [items])

  return { loading, error, planName, items, totalLimit, totalRemaining, allUnlimited }
}
