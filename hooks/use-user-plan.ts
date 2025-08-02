import { useState, useEffect, useCallback } from 'react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'

interface UserPlan {
  plan_type: 'free' | 'professional' | 'enterprise'
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

  const fetchPlanData = useCallback(async () => {
    if (!user || !session) return

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plan data'
      setError(errorMessage)
      console.error('Error fetching plan data:', err)
    } finally {
      setLoading(false)
    }
  }, [user, session])

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

      // Refresh plan data after incrementing
      await fetchPlanData()
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
  }, [user, session, fetchPlanData, toast])

  const canUseFeature = useCallback((feature: string): boolean => {
    if (!planData) return false
    
    const usageItem = planData.usage.find(item => item.feature === feature)
    if (!usageItem) return false
    
    return usageItem.is_unlimited || usageItem.remaining > 0
  }, [planData])

  const getUsageForFeature = useCallback((feature: string): UsageItem | null => {
    if (!planData) return null
    
    return planData.usage.find(item => item.feature === feature) || null
  }, [planData])

  const getPlanType = useCallback((): string => {
    return planData?.plan?.plan_type || 'free'
  }, [planData])

  const isProfessionalOrHigher = useCallback((): boolean => {
    const planType = getPlanType()
    return planType === 'professional' || planType === 'enterprise'
  }, [getPlanType])

  const isEnterprise = useCallback((): boolean => {
    return getPlanType() === 'enterprise'
  }, [getPlanType])

  useEffect(() => {
    fetchPlanData()
  }, [fetchPlanData])

  return {
    planData,
    loading,
    error,
    fetchPlanData,
    incrementUsage,
    canUseFeature,
    getUsageForFeature,
    getPlanType,
    isProfessionalOrHigher,
    isEnterprise,
  }
} 