import { createClient } from '@supabase/supabase-js';

export interface TokenStatus {
  hasTokens: boolean;
  dailyRemaining: number;
  monthlyRemaining: number;
  dailyLimit: number;
  monthlyLimit: number;
  tokensNeeded: number;
}

export interface TokenTransaction {
  id: string;
  operationType: 'deduct' | 'refund' | 'grant' | 'reset';
  tokensAmount: number;
  featureName: string;
  operationContext: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

export interface FeatureCost {
  featureName: string;
  baseCost: number;
  description: string;
  costMultipliers: Record<string, number>;
}

export class TokenService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    typeof window === 'undefined'
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /**
   * Check if user has enough tokens for a feature
   */
  async checkUserTokens(userId: string, tokensNeeded: number = 1): Promise<TokenStatus> {
    try {
      const { data, error } = await this.supabase.rpc('check_user_tokens', {
        p_user_id: userId,
        p_tokens_needed: tokensNeeded
      });

      if (error) throw error;

      return {
        hasTokens: data.has_tokens,
        dailyRemaining: data.daily_remaining,
        monthlyRemaining: data.monthly_remaining,
        dailyLimit: data.daily_limit,
        monthlyLimit: data.monthly_limit,
        tokensNeeded: data.tokens_needed
      };
    } catch (error) {
      console.error('Error checking user tokens:', error);
      throw new Error('Failed to check token status');
    }
  }

  /**
   * Check rate limit for a specific feature
   */
  async checkRateLimit(
    userId: string, 
    featureName: string = 'literature_search',
    context: Record<string, any> = {}
  ): Promise<{
    allowed: boolean;
    tokensNeeded: number;
    dailyRemaining: number;
    monthlyRemaining: number;
    resetTime: number;
    errorMessage?: string;
  }> {
    try {
      const { data, error } = await this.supabase.rpc('check_token_rate_limit', {
        p_user_id: userId,
        p_feature_name: featureName,
        p_context: context
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      throw new Error('Failed to check rate limit');
    }
  }

  /**
   * Deduct tokens for a feature usage
   */
  async deductTokens(
    userId: string,
    featureName: string,
    tokensAmount: number = 1,
    context: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('deduct_user_tokens', {
        p_user_id: userId,
        p_feature_name: featureName,
        p_tokens_amount: tokensAmount,
        p_context: context,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      });

      if (error) throw error;

      return {
        success: data.success,
        transactionId: data.transaction_id,
        error: data.error
      };
    } catch (error) {
      console.error('Error deducting tokens:', error);
      return {
        success: false,
        error: 'Failed to deduct tokens'
      };
    }
  }

  /**
   * Refund tokens for a failed operation
   */
  async refundTokens(
    userId: string,
    featureName: string,
    tokensAmount: number,
    context: Record<string, any> = {}
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('refund_user_tokens', {
        p_user_id: userId,
        p_tokens_amount: tokensAmount,
        p_feature_name: featureName,
        p_context: context
      });

      if (error) throw error;

      return {
        success: data.success,
        transactionId: data.transaction_id,
        error: data.error
      };
    } catch (error) {
      console.error('Error refunding tokens:', error);
      return {
        success: false,
        error: 'Failed to refund tokens'
      };
    }
  }

  /**
   * Get feature cost dynamically
   */
  async getFeatureCost(
    featureName: string,
    context: Record<string, any> = {}
  ): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('get_feature_cost', {
        p_feature_name: featureName,
        p_context: context
      });

      if (error) throw error;
      return data || 1;
    } catch (error) {
      console.error('Error getting feature cost:', error);
      return 1; // Default fallback
    }
  }

  /**
   * Get user's token transactions history
   */
  async getTokenTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TokenTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data.map((transaction: any) => ({
        id: transaction.id,
        operationType: transaction.operation_type,
        tokensAmount: transaction.tokens_amount,
        featureName: transaction.feature_name,
        operationContext: transaction.operation_context || {},
        success: transaction.success,
        errorMessage: transaction.error_message,
        createdAt: transaction.created_at
      }));
    } catch (error) {
      console.error('Error fetching token transactions:', error);
      return [];
    }
  }

  /**
   * Get current user token status
   */
  async getUserTokenStatus(userId: string): Promise<{
    dailyUsed: number;
    monthlyUsed: number;
    dailyLimit: number;
    monthlyLimit: number;
    dailyRemaining: number;
    monthlyRemaining: number;
  } | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return {
        dailyUsed: data.daily_tokens_used,
        monthlyUsed: data.monthly_tokens_used,
        dailyLimit: data.daily_limit,
        monthlyLimit: data.monthly_limit,
        dailyRemaining: data.daily_limit - data.daily_tokens_used,
        monthlyRemaining: data.monthly_limit - data.monthly_tokens_used
      };
    } catch (error: any) {
      // Better diagnostics
      const msg = error?.message || String(error);
      const code = error?.code || error?.status || 'unknown';
      console.warn(`[token.service] direct user_tokens fetch failed (${code}):`, msg);

      // Fallback: call app API to upsert defaults and return token status
      try {
        const { data: sessionData } = await this.supabase.auth.getSession();
        const access = sessionData?.session?.access_token;
        if (!access) {
          console.warn('[token.service] no session access token for /api/user/tokens fallback');
          return null;
        }
        const resp = await fetch('/api/user/tokens', {
          headers: { Authorization: `Bearer ${access}` },
        });
        if (!resp.ok) {
          const text = await resp.text();
          console.warn('[token.service] /api/user/tokens fallback not ok:', resp.status, text);
          return null;
        }
        const json = await resp.json();
        return {
          dailyUsed: Number(json.dailyUsed ?? 0),
          monthlyUsed: Number(json.monthlyUsed ?? 0),
          dailyLimit: Number(json.dailyLimit ?? 0),
          monthlyLimit: Number(json.monthlyLimit ?? 0),
          dailyRemaining: Number(json.dailyRemaining ?? 0),
          monthlyRemaining: Number(json.monthlyRemaining ?? 0),
        };
      } catch (fallbackErr: any) {
        console.error('[token.service] fallback /api/user/tokens failed:', fallbackErr?.message || fallbackErr);
        return null;
      }
    }
  }

  /**
   * Get all available features and their costs
   */
  async getFeatureCosts(): Promise<FeatureCost[]> {
    try {
      const { data, error } = await this.supabase
        .from('token_feature_costs')
        .select('*')
        .eq('is_active', true)
        .order('feature_name');

      if (error) throw error;

      return data.map((cost: any) => ({
        featureName: cost.feature_name,
        baseCost: cost.base_cost,
        description: cost.description,
        costMultipliers: cost.cost_multipliers || {}
      }));
    } catch (error) {
      console.error('Error fetching feature costs:', error);
      return [];
    }
  }

  /**
   * Initialize tokens for a new user
   */
  async initializeUserTokens(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc('initialize_user_tokens', {
        p_user_id: userId
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error initializing user tokens:', error);
      return false;
    }
  }
}

// Singleton instance
export const tokenService = new TokenService();
