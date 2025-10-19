"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Lightbulb,
  Target,
  Zap,
} from "lucide-react";
import { useSupabaseAuth } from "@/components/supabase-auth-provider";
import { cn } from "@/lib/utils";

interface UsageTrendData {
  date: string;
  tokens: number;
  predicted?: number;
  limit: number;
}

interface PredictionData {
  predictedMonthlyUsage: number;
  confidence: number;
  willExceedLimit: boolean;
  recommendedPlan: string;
  daysUntilLimitReached: number | null;
  suggestions: string[];
}

interface AnomalyData {
  type: string;
  severity: string;
  description: string;
  timestamp: string;
}

interface UsagePattern {
  trend: 'increasing' | 'decreasing' | 'stable';
  volatility: 'high' | 'medium' | 'low';
  averageDaily: number;
  averageMonthly: number;
}

export function UsageTrendsChart() {
  const { session } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<UsageTrendData[]>([]);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [pattern, setPattern] = useState<UsagePattern | null>(null);
  const [optimizations, setOptimizations] = useState<string[]>([]);

  useEffect(() => {
    if (!session?.access_token) return;
    fetchAnalytics();
  }, [session?.access_token]);

  const fetchAnalytics = async () => {
    if (!session?.access_token) return;
    setLoading(true);

    try {
      // Fetch historical trend data (last 30 days)
      const trendRes = await fetch('/api/usage/analytics/trends', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (trendRes.ok) {
        const data = await trendRes.json();
        setTrendData(data.trendData || []);
        setPattern(data.pattern);
      }

      // Fetch predictions
      const predRes = await fetch('/api/usage/analytics/predictions', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (predRes.ok) {
        const data = await predRes.json();
        setPrediction(data);
      }

      // Fetch anomalies
      const anomRes = await fetch('/api/usage/analytics/anomalies', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (anomRes.ok) {
        const data = await predRes.json();
        setAnomalies(data.anomalies || []);
      }

      // Fetch optimizations
      const optRes = await fetch('/api/usage/analytics/optimizations', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (optRes.ok) {
        const data = await optRes.json();
        setOptimizations(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = () => {
    if (!pattern) return <Activity className="h-4 w-4" />;
    switch (pattern.trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getVolatilityColor = (volatility: string) => {
    switch (volatility) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Usage Trends Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getTrendIcon()}
                Usage Trends & Predictions
              </CardTitle>
              <CardDescription>
                30-day historical usage with AI-powered predictions
              </CardDescription>
            </div>
            {pattern && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getVolatilityColor(pattern.volatility)}>
                  {pattern.volatility} volatility
                </Badge>
                <Badge variant="outline">
                  {pattern.trend} trend
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <ReferenceLine y={trendData[0]?.limit} stroke="#ef4444" strokeDasharray="5 5" label="Limit" />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="#3b82f6"
                  fill="url(#colorTokens)"
                  strokeWidth={2}
                  name="Actual Usage"
                />
                {prediction && (
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="#8b5cf6"
                    fill="url(#colorPredicted)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Predicted"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pattern Summary */}
          {pattern && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Math.round(pattern.averageDaily)}</div>
                <div className="text-xs text-muted-foreground">Avg Daily</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{Math.round(pattern.averageMonthly)}</div>
                <div className="text-xs text-muted-foreground">Avg Monthly</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold capitalize text-green-600">{pattern.trend}</div>
                <div className="text-xs text-muted-foreground">Trend</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold capitalize text-amber-600">{pattern.volatility}</div>
                <div className="text-xs text-muted-foreground">Volatility</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Predictions Card */}
      {prediction && (
        <Card className={cn(
          "border-2",
          prediction.willExceedLimit ? "border-red-300 bg-red-50/50" : "border-green-300 bg-green-50/50"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Usage Prediction
            </CardTitle>
            <CardDescription>
              AI-powered forecast based on your usage patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">Predicted Monthly Usage</div>
                <div className="text-3xl font-bold text-purple-600">
                  {prediction.predictedMonthlyUsage}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(prediction.confidence * 100)}% confidence
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">Recommended Plan</div>
                <div className="text-2xl font-bold capitalize text-blue-600">
                  {prediction.recommendedPlan}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {prediction.recommendedPlan === 'pro' ? '500 tokens/month' : '50 tokens/month'}
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">Days Until Limit</div>
                <div className="text-3xl font-bold text-red-600">
                  {prediction.daysUntilLimitReached !== null
                    ? prediction.daysUntilLimitReached
                    : '∞'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  At current rate
                </div>
              </div>
            </div>

            {prediction.suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Suggestions
                </div>
                {prediction.suggestions.map((suggestion, idx) => (
                  <Alert key={idx} className="bg-white">
                    <AlertDescription className="text-sm">{suggestion}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Anomalies Card */}
      {anomalies.length > 0 && (
        <Card className="border-red-300 bg-red-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Usage Anomalies Detected
            </CardTitle>
            <CardDescription>
              Unusual patterns that may require attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {anomalies.map((anomaly, idx) => (
              <Alert key={idx} className="bg-white border-red-200">
                <div className="flex items-start gap-2">
                  {getSeverityIcon(anomaly.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="capitalize">
                        {anomaly.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className={cn(
                        "capitalize",
                        anomaly.severity === 'critical' && "bg-red-100 text-red-800",
                        anomaly.severity === 'high' && "bg-orange-100 text-orange-800",
                        anomaly.severity === 'medium' && "bg-yellow-100 text-yellow-800",
                        anomaly.severity === 'low' && "bg-blue-100 text-blue-800"
                      )}>
                        {anomaly.severity}
                      </Badge>
                    </div>
                    <AlertDescription>{anomaly.description}</AlertDescription>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cost Optimizations */}
      {optimizations.length > 0 && (
        <Card className="border-green-300 bg-gradient-to-br from-green-50 to-emerald-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Zap className="h-5 w-5" />
              Cost Optimization Suggestions
            </CardTitle>
            <CardDescription>
              Ways to optimize your token usage and costs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {optimizations.map((suggestion, idx) => (
              <Alert key={idx} className="bg-white border-green-200">
                <AlertDescription className="text-sm">{suggestion}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
