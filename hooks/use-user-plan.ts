import { useState, useEffect, useCallback, useRef } from 'react'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@supabase/supabase-js'
import { planCache } from '@/lib/services/cache.service'

interface UserPlan {
  plan_type: 'free' | 'pro'
  status: 'active' | 'cancelled' | 'expired' | 'suspended'
  current_period_end: string
}

interface UsageItem {
  feature: string
  usage_count: number
  limit_count: number
  remaining: number
  is_unlimited: boolean
}

interface PlanData {
  plan: UserPlan
  usage: UsageItem[]
}

export function useUserPlan() {
  const { user, session } = useSupabaseAuth()
  const { toast } = useToast()
  const [planData, setPlanData] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const subscriptionRef = useRef<any>(null)
  const subscriptionTokensRef = useRef<any>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const broadcastRef = useRef<BroadcastChannel | null>(null)
  const [tokenStatus, setTokenStatus] = useState<{
    monthlyUsed: number
    monthlyLimit: number
    monthlyRemaining: number
    lastMonthlyReset?: string
  } | null>(null)

  const fetchPlanData = useCallback(async (forceRefresh = false) => {
    if (!user || !session) return

    const cacheKey = `plan_${user.id}`
    
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cached = planCache.get<PlanData>(cacheKey)
      if (cached) {
        setPlanData(cached)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user/plan', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch plan data')
      }

      const data = await response.json()
      // Normalize plan type to only 'free' | 'pro'
      const rawType = String(data?.plan?.plan_type || '').toLowerCase()
      const paidAliases = new Set(['pro','professional','premium','plus','paid','starter_pro','business','enterprise'])
      const normalizedPlanType: 'free' | 'pro' = paidAliases.has(rawType) ? 'pro' : 'free'
      const normalized: PlanData = {
        ...data,
        plan: {
          ...data.plan,
          plan_type: normalizedPlanType,
        },
      }
      setPlanData(normalized)
      
      // Cache the data
      planCache.set(cacheKey, normalized, 5 * 60 * 1000) // 5 minutes TTL
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plan data'
      setError(errorMessage)
      console.error('Error fetching plan data:', err)
      
      // Try to use stale cache on error
      const staleCache = planCache.get<PlanData>(cacheKey)
      if (staleCache) {
        console.warn('Using stale cache due to fetch error')
        setPlanData(staleCache)
      }
    } finally {
      setLoading(false)
    }
  }, [user?.id, session?.access_token])

  // Feature key helpers must be defined BEFORE they are used in incrementUsage
  const normalizeFeatureKey = useCallback((f: string) => f.replace(/\s+/g, '_').toLowerCase(), [])

  // Map common aliases to canonical backend keys
  const canonicalizeFeature = useCallback((feature: string) => {
    const key = normalizeFeatureKey(feature)
    const map: Record<string, string> = {
      // Literature Search
      'literature_search': 'literature_searches',
      'literature_searches': 'literature_searches',
      'search_literature': 'literature_searches',
      'explorer_search': 'literature_searches',
      'explorer': 'literature_searches',
      // Summarizer
      'document_summary': 'document_summaries',
      'document_summaries': 'document_summaries',
      'summary': 'document_summaries',
      'summarizer': 'document_summaries',
      // AI Assistant / Generations / Writer
      'ai_generation': 'ai_generations',
      'ai_generations': 'ai_generations',
      'assistant': 'ai_generations',
      'ai_assistant': 'ai_generations',
      'chat': 'ai_generations',
      'writer': 'ai_generations',
      'ai_writer': 'ai_generations',
      // Uploads
      'document_uploads': 'document_uploads',
      'doc_uploads': 'document_uploads',
      'uploads': 'document_uploads',
    }
    return map[key] || key
  }, [normalizeFeatureKey])

  // Move fetchTokenStatus above incrementUsage to avoid 'used before declaration' lint
  const fetchTokenStatus = useCallback(async () => {
    if (!user || !session) return
    try {
      const supa = ensureSupabase()
      const { data, error } = await supa
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (error) throw error
      if (data) {
        const monthlyLimit = Number((data as any).monthly_limit ?? 0)
        const monthlyUsed = Number((data as any).monthly_tokens_used ?? 0)
        const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed)
        setTokenStatus({
          monthlyUsed,
          monthlyLimit,
          monthlyRemaining,
          lastMonthlyReset: (data as any).last_monthly_reset ? String((data as any).last_monthly_reset) : undefined,
        })
        return
      }
      // Fall through to HTTP fallback when no row
    } catch (err) {
      // Try HTTP fallback if direct query failed
      if (process.env.NODE_ENV === 'development') {
        console.warn('Direct Supabase token fetch failed; trying /api/user/tokens fallback', err)
      }
    }
    // Fallback to API route which also upserts default row when missing
    try {
      const resp = await fetch('/api/user/tokens', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      if (resp.ok) {
        const data = await resp.json()
        setTokenStatus({
          monthlyUsed: Number(data.monthlyUsed ?? data?.data?.monthlyUsed ?? 0),
          monthlyLimit: Number(data.monthlyLimit ?? data?.data?.monthlyLimit ?? 0),
          monthlyRemaining: Number(data.monthlyRemaining ?? data?.data?.monthlyRemaining ?? 0),
          lastMonthlyReset: data.lastMonthlyReset ? String(data.lastMonthlyReset) : undefined,
        })
      }
    } catch (fallbackErr) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Fallback /api/user/tokens also failed', fallbackErr)
      }
    }
  }, [user?.id, session?.access_token])

  const incrementUsage = useCallback(async (feature: string, context?: Record<string, any>): Promise<boolean> => {
    if (!user || !session) return false

    try {
      const canonicalFeature = canonicalizeFeature(feature)
      // Step 1: Deduct tokens first (checks availability too)
      const deductResp = await fetch('/api/user/tokens/deduct', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ feature: canonicalFeature, amount: 1, context }),
      })

      if (deductResp.status === 429) {
        const msg = await deductResp.json().catch(() => ({}))
        toast({
          title: 'Not enough tokens',
          description: 'You have run out of monthly tokens. Consider upgrading to Pro.',
          variant: 'destructive',
        })
        return false
      }
      if (!deductResp.ok) {
        const txt = await deductResp.text()
        throw new Error(`Token deduction failed: ${txt}`)
      }

      // Notify other tabs/components that tokens changed
      try { broadcastRef.current?.postMessage({ type: 'tokens-updated' }) } catch {}

      // Step 2: Increment feature usage (limits per feature)
      // Try primary route first
      let response = await fetch('/api/user/plan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ feature: canonicalFeature }),
      })

      if (response.status === 429) {
        // Some environments misreport can_use_feature; attempt safe fallback increment
        if (process.env.NODE_ENV === 'development') {
          console.warn('[use-user-plan] /api/user/plan returned 429 — trying fallback /api/user/usage/increment before refund')
        }
        const fb429 = await fetch('/api/user/usage/increment', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ feature: canonicalFeature, metadata: { context, source: 'client-fallback-429' } }),
        })

        if (!fb429.ok) {
          // Fallback also failed -> refund tokens and notify
          await fetch('/api/user/tokens/refund', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ feature: canonicalFeature, amount: 1, context }),
          }).catch(() => {})

          toast({
            title: 'Usage Limit Exceeded',
            description: `You've reached your monthly limit for ${canonicalFeature}. Please upgrade your plan to continue.`,
            variant: 'destructive',
          })
          // Broadcast token change after refund
          try { broadcastRef.current?.postMessage({ type: 'tokens-updated' }) } catch {}
          // Refresh tokens (after refund) and plan just in case
          await Promise.all([fetchTokenStatus(), fetchPlanData(true)])
          return false
        }
      }

      // If primary route failed due to feature mismatch (e.g., 400/404/406/500),
      // attempt fallback increment endpoint before refunding
      if (!response.ok && ![429].includes(response.status)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[use-user-plan] /api/user/plan failed with', response.status, '— trying fallback /api/user/usage/increment')
        }
        const fb = await fetch('/api/user/usage/increment', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ feature: canonicalFeature, metadata: { context, source: 'client-fallback' } }),
        })

        if (!fb.ok) {
          // Both failed -> refund tokens
          await fetch('/api/user/tokens/refund', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ feature: canonicalFeature, amount: 1, context }),
          }).catch(() => {})
          const errTxt = await fb.text().catch(() => '')
          throw new Error(`Failed to increment usage (fallback): ${fb.status} ${errTxt}`)
        }
      }

      // Broadcast usage updated
      try { broadcastRef.current?.postMessage({ type: 'usage-updated' }) } catch {}

      // Refresh plan and tokens after successful consumption
      await Promise.all([fetchPlanData(true), fetchTokenStatus()])
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to consume tokens/usage'
      console.error('Error incrementing usage:', err)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      return false
    }
  }, [user?.id, session?.access_token, fetchPlanData, fetchTokenStatus, toast, canonicalizeFeature])

  // (removed duplicate canonicalizeFeature/normalizeFeatureKey declarations)

  const canUseFeature = useCallback((feature: string): boolean => {
    // If plan data is still loading, we can't make a determination yet
    if (loading) return false
    
    // If no plan data and not loading, assume free plan restrictions
    if (!planData) return false

    const key = normalizeFeatureKey(feature)
    const usageItem = planData.usage.find(item => item.feature === key)

    if (!usageItem) {
      // If usage record is missing but user is Pro, default-allow
      const planType = planData.plan?.plan_type
      if (planType === 'pro') {
        return true
      }
      return false
    }
    
    return usageItem.is_unlimited || usageItem.remaining > 0
  }, [planData, loading, normalizeFeatureKey])

  const getUsageForFeature = useCallback((feature: string): UsageItem | null => {
    if (!planData) return null
    const key = normalizeFeatureKey(feature)
    return planData.usage.find(item => item.feature === key) || null
  }, [planData, normalizeFeatureKey])

  const getPlanType = useCallback((): string => {
    return planData?.plan?.plan_type || 'free'
  }, [planData])

  const isProOrHigher = useCallback((): boolean => {
    const planType = getPlanType()
    return planType === 'pro'
  }, [getPlanType])

  const isProfessionalOrHigher = isProOrHigher

  const isPlanDataReady = useCallback((): boolean => {
    return !loading && planData !== null
  }, [loading, planData])

  const ensureSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
    return supabaseRef.current
  }

  // fetchTokenStatus has been moved above

  useEffect(() => {
    if (!user || !session) {
      // Cleanup existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
      if (subscriptionTokensRef.current) {
        subscriptionTokensRef.current.unsubscribe()
        subscriptionTokensRef.current = null
      }
      if (broadcastRef.current) {
        try { broadcastRef.current.close() } catch {}
        broadcastRef.current = null
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    ensureSupabase()

    const supa = ensureSupabase()
    subscriptionRef.current = supa
      .channel('user_usage_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_usage',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('Usage updated:', payload)
          }
          fetchPlanData(true)
        }
      )
      .subscribe()

    subscriptionTokensRef.current = supa
      .channel('user_tokens_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_tokens',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchTokenStatus()
      )
      .subscribe()

    fetchPlanData()
    fetchTokenStatus()

    // Fallback cross-component sync via BroadcastChannel
    try {
      broadcastRef.current = new BroadcastChannel('usage-events')
      broadcastRef.current.onmessage = (ev: MessageEvent) => {
        const type = ev?.data?.type
        if (type === 'tokens-updated') {
          fetchTokenStatus()
        } else if (type === 'usage-updated') {
          fetchPlanData(true)
        }
      }
    } catch {}

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
      if (subscriptionTokensRef.current) {
        subscriptionTokensRef.current.unsubscribe()
        subscriptionTokensRef.current = null
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [user?.id, session?.access_token])

  const refreshPlanData = useCallback(() => {
    fetchPlanData()
  }, [fetchPlanData])

  return {
    planData,
    loading,
    error,
    fetchPlanData,
    fetchTokenStatus,
    refreshPlanData,
    incrementUsage,
    canUseFeature,
    getUsageForFeature,
    getPlanType,
    isProOrHigher,
    isProfessionalOrHigher,
    isPlanDataReady,
    tokenStatus,
  }
}