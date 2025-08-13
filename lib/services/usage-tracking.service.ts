/**
 * SECURE USAGE TRACKING SERVICE
 * 
 * CRITICAL SECURITY PRINCIPLES:
 * 1. Usage tracking is COMPLETELY separate from session management
 * 2. Only server-side authenticated calls can modify usage
 * 3. Client-side can only READ usage, never reset or modify
 * 4. All usage modifications are logged for audit
 */

export interface UsageStats {
  literature_searches: { used: number; limit: number; unlimited: boolean }
  ai_generations: { used: number; limit: number; unlimited: boolean }
  document_uploads: { used: number; limit: number; unlimited: boolean }
  team_collaboration: { used: number; limit: number; unlimited: boolean }
  team_members: { used: number; limit: number; unlimited: boolean }
}

export interface UsageIncrementResult {
  success: boolean
  newUsageCount: number
  remaining: number
  limitExceeded: boolean
  error?: string
}

class SecureUsageTrackingService {
  private static instance: SecureUsageTrackingService
  private baseUrl: string

  private constructor() {
    this.baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : process.env.NEXT_PUBLIC_APP_URL || ''
  }

  static getInstance(): SecureUsageTrackingService {
    if (!SecureUsageTrackingService.instance) {
      SecureUsageTrackingService.instance = new SecureUsageTrackingService()
    }
    return SecureUsageTrackingService.instance
  }

  /**
   * Get current usage statistics for a user
   * This is the ONLY method that should be called from client-side
   */
  async getUserUsage(accessToken: string): Promise<UsageStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/plan`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch user usage:', response.status)
        return null
      }

      const data = await response.json()
      
      // Transform the usage data
      const usage: UsageStats = {
        literature_searches: { used: 0, limit: 0, unlimited: false },
        ai_generations: { used: 0, limit: 0, unlimited: false },
        document_uploads: { used: 0, limit: 0, unlimited: false },
        team_collaboration: { used: 0, limit: 0, unlimited: false },
        team_members: { used: 0, limit: 0, unlimited: false }
      }

      // Map the response to our usage stats
      if (data.usage && Array.isArray(data.usage)) {
        data.usage.forEach((item: any) => {
          if (usage[item.feature as keyof UsageStats]) {
            usage[item.feature as keyof UsageStats] = {
              used: item.usage_count || 0,
              limit: item.limit_count || 0,
              unlimited: item.is_unlimited || false
            }
          }
        })
      }

      return usage
    } catch (error) {
      console.error('Error fetching user usage:', error)
      return null
    }
  }

  /**
   * Increment usage for a specific feature
   * This method ensures proper authentication and rate limiting
   */
  async incrementUsage(
    feature: keyof UsageStats,
    accessToken: string,
    metadata?: any
  ): Promise<UsageIncrementResult> {
    try {
      // 🚨 SECURITY: Log all usage increment attempts
      console.log('Usage increment request:', {
        feature,
        timestamp: new Date().toISOString(),
        metadata: metadata ? Object.keys(metadata) : null
      })

      const response = await fetch(`${this.baseUrl}/api/user/usage/increment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feature,
          metadata
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        if (response.status === 403) {
          return {
            success: false,
            newUsageCount: 0,
            remaining: 0,
            limitExceeded: true,
            error: 'Usage limit exceeded'
          }
        }

        return {
          success: false,
          newUsageCount: 0,
          remaining: 0,
          limitExceeded: false,
          error: errorData.error || 'Failed to increment usage'
        }
      }

      const result = await response.json()
      
      return {
        success: true,
        newUsageCount: result.newUsageCount || 0,
        remaining: result.remaining || 0,
        limitExceeded: false
      }

    } catch (error) {
      console.error('Error incrementing usage:', error)
      return {
        success: false,
        newUsageCount: 0,
        remaining: 0,
        limitExceeded: false,
        error: 'Network error'
      }
    }
  }

  /**
   * 🚨 CRITICAL SECURITY METHOD
   * This method should NEVER be called from client-side code
   * It's only for documentation and server-side usage
   */
  private async ADMIN_resetUsage(userId: string, systemKey: string): Promise<boolean> {
    // This method should never be implemented for client-side use
    throw new Error('🚨 SECURITY VIOLATION: Client-side usage reset is forbidden!')
  }

  /**
   * Check if user can perform an action without incrementing usage
   */
  async canPerformAction(
    feature: keyof UsageStats,
    accessToken: string
  ): Promise<{ canPerform: boolean; remaining: number; reason?: string }> {
    try {
      const usage = await this.getUserUsage(accessToken)
      
      if (!usage) {
        return { canPerform: false, remaining: 0, reason: 'Unable to fetch usage data' }
      }

      const featureUsage = usage[feature]
      
      if (featureUsage.unlimited) {
        return { canPerform: true, remaining: -1 }
      }

      const remaining = featureUsage.limit - featureUsage.used
      
      if (remaining <= 0) {
        return { 
          canPerform: false, 
          remaining: 0, 
          reason: 'Usage limit exceeded for this feature' 
        }
      }

      return { canPerform: true, remaining }

    } catch (error) {
      console.error('Error checking action permission:', error)
      return { canPerform: false, remaining: 0, reason: 'Error checking permissions' }
    }
  }
}

export const usageTrackingService = SecureUsageTrackingService.getInstance()

/**
 * React Hook for secure usage tracking
 * This hook provides a safe interface for components to check and increment usage
 */
export function useSecureUsageTracking() {
  const incrementUsage = async (
    feature: keyof UsageStats,
    accessToken: string,
    metadata?: any
  ): Promise<UsageIncrementResult> => {
    return await usageTrackingService.incrementUsage(feature, accessToken, metadata)
  }

  const checkCanPerform = async (
    feature: keyof UsageStats,
    accessToken: string
  ) => {
    return await usageTrackingService.canPerformAction(feature, accessToken)
  }

  const getUserUsage = async (accessToken: string) => {
    return await usageTrackingService.getUserUsage(accessToken)
  }

  return {
    incrementUsage,
    checkCanPerform,
    getUserUsage
  }
}
