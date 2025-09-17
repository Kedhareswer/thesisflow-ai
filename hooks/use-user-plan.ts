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
  const [tokenStatus, setTokenStatus] = useState<{
    dailyUsed: number
    monthlyUsed: number
    dailyLimit: number
    monthlyLimit: number
    dailyRemaining: number
    monthlyRemaining: number
    lastDailyReset?: string
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

  const incrementUsage = useCallback(async (feature: string): Promise<boolean> => {
    if (!user || !session) return false

    try {
      const response = await fetch('/api/user/plan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feature }),
      })

      if (response.status === 429) {
        // Usage limit exceeded
        const data = await response.json()
        toast({
          title: "Usage Limit Exceeded",
          description: `You've reached your monthly limit for ${feature}. Please upgrade your plan to continue.`,
          variant: "destructive",
        })
        return false
      }

      if (!response.ok) {
        throw new Error('Failed to increment usage')
      }

      // Refresh plan data after incrementing (force refresh to get latest)
      await fetchPlanData(true)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to increment usage'
      console.error('Error incrementing usage:', err)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return false
    }
  }, [user?.id, session?.access_token, fetchPlanData, toast])

  const normalizeFeatureKey = useCallback((f: string) => f.replace(/\s+/g, '_').toLowerCase(), [])

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
        const dailyLimit = Number((data as any).daily_limit ?? 0)
        const dailyUsed = Number((data as any).daily_tokens_used ?? 0)
        const monthlyLimit = Number((data as any).monthly_limit ?? 0)
        const monthlyUsed = Number((data as any).monthly_tokens_used ?? 0)
        const dailyRemaining = Math.max(0, dailyLimit - dailyUsed)
        const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed)
        setTokenStatus({
          dailyUsed,
          monthlyUsed,
          dailyLimit,
          monthlyLimit,
          dailyRemaining,
          monthlyRemaining,
          lastDailyReset: (data as any).last_daily_reset ? String((data as any).last_daily_reset) : undefined,
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
          dailyUsed: Number(data.dailyUsed ?? 0),
          monthlyUsed: Number(data.monthlyUsed ?? 0),
          dailyLimit: Number(data.dailyLimit ?? 0),
          monthlyLimit: Number(data.monthlyLimit ?? 0),
          dailyRemaining: Number(data.dailyRemaining ?? 0),
          monthlyRemaining: Number(data.monthlyRemaining ?? 0),
          lastDailyReset: data.lastDailyReset ? String(data.lastDailyReset) : undefined,
          lastMonthlyReset: data.lastMonthlyReset ? String(data.lastMonthlyReset) : undefined,
        })
      }
    } catch (fallbackErr) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Fallback /api/user/tokens also failed', fallbackErr)
      }
    }
  }, [user?.id, session?.access_token])

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