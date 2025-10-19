import { createClient } from '@supabase/supabase-js';

interface UsagePattern {
  userId: string;
  averageDaily: number;
  averageWeekly: number;
  averageMonthly: number;
  peakUsageDay: string;
  peakUsageHour: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  volatility: 'high' | 'medium' | 'low';
}

interface UsagePrediction {
  userId: string;
  predictedMonthlyUsage: number;
  confidence: number;
  willExceedLimit: boolean;
  recommendedPlan: 'free' | 'pro';
  daysUntilLimitReached: number | null;
  suggestions: string[];
}

interface UsageAnomaly {
  userId: string;
  timestamp: string;
  type: 'spike' | 'unusual_pattern' | 'rapid_consumption' | 'potential_abuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  currentUsage: number;
  expectedUsage: number;
  deviation: number;
}

export class TokenAnalyticsService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    typeof window === 'undefined'
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /**
   * Analyze user's token usage pattern
   */
  async analyzeUsagePattern(userId: string): Promise<UsagePattern | null> {
    try {
      // Get last 30 days of transactions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: transactions, error } = await this.supabase
        .from('token_transactions')
        .select('tokens_amount, created_at, operation_type')
        .eq('user_id', userId)
        .eq('operation_type', 'deduct')
        .eq('success', true)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error || !transactions || transactions.length === 0) {
        return null;
      }

      // Calculate daily usage
      const dailyUsage = new Map<string, number>();
      const hourlyUsage = new Map<number, number>();
      const weeklyUsage: number[] = [];

      transactions.forEach((tx) => {
        const date = new Date(tx.created_at);
        const dayKey = date.toISOString().split('T')[0];
        const hour = date.getHours();

        dailyUsage.set(dayKey, (dailyUsage.get(dayKey) || 0) + tx.tokens_amount);
        hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + tx.tokens_amount);
      });

      // Calculate averages
      const totalUsage = transactions.reduce((sum, tx) => sum + tx.tokens_amount, 0);
      const daysWithUsage = dailyUsage.size;
      const averageDaily = daysWithUsage > 0 ? totalUsage / daysWithUsage : 0;
      const averageWeekly = averageDaily * 7;
      const averageMonthly = averageDaily * 30;

      // Find peak usage
      const peakDay = Array.from(dailyUsage.entries()).sort((a, b) => b[1] - a[1])[0];
      const peakHour = Array.from(hourlyUsage.entries()).sort((a, b) => b[1] - a[1])[0];

      // Calculate trend (compare first half vs second half)
      const midpoint = Math.floor(transactions.length / 2);
      const firstHalf = transactions.slice(0, midpoint);
      const secondHalf = transactions.slice(midpoint);

      const firstHalfAvg = firstHalf.reduce((sum, tx) => sum + tx.tokens_amount, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, tx) => sum + tx.tokens_amount, 0) / secondHalf.length;

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      const trendThreshold = 0.2; // 20% change
      const trendDiff = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

      if (trendDiff > trendThreshold) trend = 'increasing';
      else if (trendDiff < -trendThreshold) trend = 'decreasing';

      // Calculate volatility (standard deviation)
      const dailyValues = Array.from(dailyUsage.values());
      const variance = dailyValues.reduce((sum, val) => {
        return sum + Math.pow(val - averageDaily, 2);
      }, 0) / dailyValues.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = averageDaily > 0 ? stdDev / averageDaily : 0;

      let volatility: 'high' | 'medium' | 'low' = 'low';
      if (coefficientOfVariation > 0.5) volatility = 'high';
      else if (coefficientOfVariation > 0.25) volatility = 'medium';

      return {
        userId,
        averageDaily,
        averageWeekly,
        averageMonthly,
        peakUsageDay: peakDay?.[0] || 'N/A',
        peakUsageHour: peakHour?.[0] || 0,
        trend,
        volatility,
      };
    } catch (error) {
      console.error('Error analyzing usage pattern:', error);
      return null;
    }
  }

  /**
   * Predict user's monthly usage and provide recommendations
   */
  async predictUsage(userId: string): Promise<UsagePrediction | null> {
    try {
      const pattern = await this.analyzeUsagePattern(userId);
      if (!pattern) return null;

      // Get user's current plan
      const { data: planData } = await this.supabase
        .from('user_plans')
        .select('plan_type, monthly_token_limit')
        .eq('user_id', userId)
        .single();

      const currentLimit = planData?.monthly_token_limit || 50;
      const currentPlan = planData?.plan_type || 'free';

      // Predict monthly usage based on trend
      let predictedMonthlyUsage = pattern.averageMonthly;

      if (pattern.trend === 'increasing') {
        // Add 20% buffer for increasing trend
        predictedMonthlyUsage *= 1.2;
      } else if (pattern.trend === 'decreasing') {
        // Reduce by 10% for decreasing trend
        predictedMonthlyUsage *= 0.9;
      }

      // Adjust for volatility
      if (pattern.volatility === 'high') {
        // Add safety margin for high volatility
        predictedMonthlyUsage *= 1.15;
      }

      // Calculate confidence based on data quality
      const { count } = await this.supabase
        .from('token_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('operation_type', 'deduct');

      const dataPoints: number = typeof count === 'number' ? count : 0;
      let confidence = Math.min(dataPoints / 100, 1); // Cap at 100%
      if (pattern.volatility === 'high') confidence *= 0.8;

      // Determine if will exceed limit
      const willExceedLimit = predictedMonthlyUsage > currentLimit;

      // Calculate days until limit reached
      let daysUntilLimitReached: number | null = null;
      if (willExceedLimit && pattern.averageDaily > 0) {
        const { data: currentUsage } = await this.supabase
          .from('user_tokens')
          .select('monthly_tokens_used')
          .eq('user_id', userId)
          .single();

        const used = currentUsage?.monthly_tokens_used || 0;
        const remaining = currentLimit - used;
        daysUntilLimitReached = Math.ceil(remaining / pattern.averageDaily);
      }

      // Generate suggestions
      const suggestions: string[] = [];

      if (willExceedLimit && currentPlan === 'free') {
        suggestions.push('Upgrade to Pro plan (500 tokens/month) to avoid running out');
      }

      if (pattern.trend === 'increasing' && currentLimit - predictedMonthlyUsage < 50) {
        suggestions.push('Consider upgrading your plan as your usage is trending upward');
      }

      if (pattern.volatility === 'high') {
        suggestions.push('Your usage varies significantly - monitor your token consumption regularly');
      }

      if (pattern.peakUsageHour >= 18 || pattern.peakUsageHour <= 6) {
        suggestions.push('Most of your usage occurs during off-hours - consider batching operations');
      }

      if (predictedMonthlyUsage < currentLimit * 0.5 && currentPlan === 'pro') {
        suggestions.push('You may be able to downgrade to Free plan based on your usage patterns');
      }

      if (!willExceedLimit && predictedMonthlyUsage < currentLimit * 0.7) {
        suggestions.push('You have plenty of tokens remaining for this month');
      }

      return {
        userId,
        predictedMonthlyUsage: Math.round(predictedMonthlyUsage),
        confidence: Math.round(confidence * 100) / 100,
        willExceedLimit,
        recommendedPlan: predictedMonthlyUsage > 50 ? 'pro' : 'free',
        daysUntilLimitReached,
        suggestions,
      };
    } catch (error) {
      console.error('Error predicting usage:', error);
      return null;
    }
  }

  /**
   * Detect anomalies in token usage
   */
  async detectAnomalies(userId: string, lookbackHours: number = 24): Promise<UsageAnomaly[]> {
    try {
      const anomalies: UsageAnomaly[] = [];
      const pattern = await this.analyzeUsagePattern(userId);
      if (!pattern) return [];

      const lookbackTime = new Date();
      lookbackTime.setHours(lookbackTime.getHours() - lookbackHours);

      // Get recent transactions
      const { data: recentTx, error } = await this.supabase
        .from('token_transactions')
        .select('tokens_amount, created_at, feature_name, operation_context')
        .eq('user_id', userId)
        .eq('operation_type', 'deduct')
        .gte('created_at', lookbackTime.toISOString())
        .order('created_at', { ascending: true });

      if (error || !recentTx || recentTx.length === 0) {
        return [];
      }

      const recentUsage = recentTx.reduce((sum, tx) => sum + tx.tokens_amount, 0);
      const expectedUsage = pattern.averageDaily * (lookbackHours / 24);

      // Anomaly 1: Sudden spike (3x normal usage)
      if (recentUsage > expectedUsage * 3) {
        const deviation = ((recentUsage - expectedUsage) / expectedUsage) * 100;
        anomalies.push({
          userId,
          timestamp: new Date().toISOString(),
          type: 'spike',
          severity: recentUsage > expectedUsage * 5 ? 'critical' : 'high',
          description: `Unusually high token consumption detected in the last ${lookbackHours} hours`,
          currentUsage: recentUsage,
          expectedUsage: Math.round(expectedUsage),
          deviation: Math.round(deviation),
        });
      }

      // Anomaly 2: Rapid consumption (many requests in short time)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      const lastHourTx = recentTx.filter(tx => new Date(tx.created_at) >= oneHourAgo);

      if (lastHourTx.length > 30) { // More than 30 requests in an hour
        anomalies.push({
          userId,
          timestamp: new Date().toISOString(),
          type: 'rapid_consumption',
          severity: lastHourTx.length > 60 ? 'critical' : 'medium',
          description: `Rapid token consumption: ${lastHourTx.length} requests in the last hour`,
          currentUsage: lastHourTx.reduce((sum, tx) => sum + tx.tokens_amount, 0),
          expectedUsage: Math.round(pattern.averageDaily / 24),
          deviation: 0,
        });
      }

      // Anomaly 3: Unusual pattern (single feature dominating)
      const featureUsage = new Map<string, number>();
      recentTx.forEach(tx => {
        const feature = tx.feature_name || 'unknown';
        featureUsage.set(feature, (featureUsage.get(feature) || 0) + tx.tokens_amount);
      });

      const topFeature = Array.from(featureUsage.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topFeature && topFeature[1] > recentUsage * 0.8) {
        anomalies.push({
          userId,
          timestamp: new Date().toISOString(),
          type: 'unusual_pattern',
          severity: 'low',
          description: `Single feature (${topFeature[0]}) consuming ${Math.round((topFeature[1] / recentUsage) * 100)}% of tokens`,
          currentUsage: topFeature[1],
          expectedUsage: Math.round(recentUsage / featureUsage.size),
          deviation: 0,
        });
      }

      // Anomaly 4: Potential abuse (same operation repeated excessively)
      const operationCounts = new Map<string, number>();
      recentTx.forEach(tx => {
        const key = JSON.stringify(tx.operation_context);
        operationCounts.set(key, (operationCounts.get(key) || 0) + 1);
      });

      const topOperation = Array.from(operationCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topOperation && topOperation[1] > 50) {
        anomalies.push({
          userId,
          timestamp: new Date().toISOString(),
          type: 'potential_abuse',
          severity: topOperation[1] > 100 ? 'critical' : 'high',
          description: `Same operation repeated ${topOperation[1]} times in ${lookbackHours} hours`,
          currentUsage: topOperation[1],
          expectedUsage: 10,
          deviation: 0,
        });
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return [];
    }
  }

  /**
   * Get cost optimization suggestions
   */
  async getCostOptimizations(userId: string): Promise<string[]> {
    try {
      const suggestions: string[] = [];
      const pattern = await this.analyzeUsagePattern(userId);
      const prediction = await this.predictUsage(userId);

      if (!pattern || !prediction) return [];

      // Get usage by feature
      let featureUsage: any[] | null = null;
      try {
        const { data } = await this.supabase.rpc('get_feature_usage_breakdown', {
          p_user_id: userId,
        });
        featureUsage = (data as any[] | null) ?? null;
      } catch {
        featureUsage = null;
      }

      // Suggestion 1: Plan optimization
      if (prediction.recommendedPlan !== (await this.getCurrentPlan(userId))) {
        if (prediction.recommendedPlan === 'free') {
          suggestions.push(
            `💡 Consider downgrading to Free plan - your predicted usage (${prediction.predictedMonthlyUsage} tokens) is well within the free tier limit`
          );
        } else {
          suggestions.push(
            `⚡ Upgrade to Pro plan recommended - predicted usage (${prediction.predictedMonthlyUsage} tokens) exceeds free tier`
          );
        }
      }

      // Suggestion 2: Feature optimization
      if (featureUsage && Array.isArray(featureUsage)) {
        const topConsumer = featureUsage[0];
        if (topConsumer && topConsumer.percentage > 60) {
          suggestions.push(
            `📊 ${topConsumer.feature_name} consumes ${topConsumer.percentage}% of your tokens - consider optimizing this workflow`
          );
        }
      }

      // Suggestion 3: Usage pattern
      if (pattern.volatility === 'high') {
        suggestions.push(
          '📈 Your usage is highly variable - set up usage alerts to avoid unexpected limit exhaustion'
        );
      }

      // Suggestion 4: Peak usage
      if (pattern.peakUsageHour >= 9 && pattern.peakUsageHour <= 17) {
        suggestions.push(
          '⏰ Most usage during business hours - consider batching non-urgent operations for off-peak times'
        );
      }

      // Suggestion 5: Trend alert
      if (pattern.trend === 'increasing' && prediction.daysUntilLimitReached && prediction.daysUntilLimitReached < 10) {
        suggestions.push(
          `⚠️ Usage trending upward - projected to hit limit in ${prediction.daysUntilLimitReached} days`
        );
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting cost optimizations:', error);
      return [];
    }
  }

  private async getCurrentPlan(userId: string): Promise<'free' | 'pro'> {
    const { data } = await this.supabase
      .from('user_plans')
      .select('plan_type')
      .eq('user_id', userId)
      .single();

    return (data?.plan_type as 'free' | 'pro') || 'free';
  }
}

// Singleton instance
export const tokenAnalytics = new TokenAnalyticsService();
