import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@supabase/supabase-js'
import { planCache } from '@/lib/services/cache.service'

interface UserPlan {
  plan_type: 'free' | 'pro' | 'enterprise'
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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
      setPlanData(data)
      
      // Cache the data
      planCache.set(cacheKey, data, 5 * 60 * 1000) // 5 minutes TTL
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

  const canUseFeature = useCallback((feature: string): boolean => {
    // If plan data is still loading, we can't make a determination yet
    if (loading) return false
    
    // If no plan data and not loading, assume free plan restrictions
    if (!planData) return false
    
    const usageItem = planData.usage.find(item => item.feature === feature)
    if (!usageItem) return false
    
    return usageItem.is_unlimited || usageItem.remaining > 0
  }, [planData, loading])

  const getUsageForFeature = useCallback((feature: string): UsageItem | null => {
    if (!planData) return null
    
    return planData.usage.find(item => item.feature === feature) || null
  }, [planData])

  const getPlanType = useCallback((): string => {
    return planData?.plan?.plan_type || 'free'
  }, [planData])

  const isProOrHigher = useCallback((): boolean => {
    const planType = getPlanType()
    return planType === 'pro' || planType === 'professional' || planType === 'enterprise'
  }, [getPlanType])

  // Alias for backward compatibility
  const isProfessionalOrHigher = isProOrHigher

  const isEnterprise = useCallback((): boolean => {
    return getPlanType() === 'enterprise'
  }, [getPlanType])

  const isPlanDataReady = useCallback((): boolean => {
    return !loading && planData !== null
  }, [loading, planData])

  // Setup real-time subscription for usage updates
  useEffect(() => {
    if (!user || !session) {
      // Cleanup existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    // Initialize Supabase client if not already done
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }

    // Subscribe to user_usage table changes for this user
    subscriptionRef.current = supabaseRef.current
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
          console.log('Usage updated:', payload)
          // Refresh plan data when usage changes (force refresh)
          fetchPlanData(true)
        }
      )
      .subscribe()

    // Initial fetch
    fetchPlanData()

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [user?.id, session?.access_token]) // Only re-run when user ID or session token changes

  // Add a manual refresh function
  const refreshPlanData = useCallback(() => {
    fetchPlanData()
  }, [fetchPlanData])

  return {
    planData,
    loading,
    error,
    fetchPlanData,
    refreshPlanData,
    incrementUsage,
    canUseFeature,
    getUsageForFeature,
    getPlanType,
    isProOrHigher,
    isProfessionalOrHigher, // Backward compatibility
    isEnterprise,
    isPlanDataReady,
  }
} 