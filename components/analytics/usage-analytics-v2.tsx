"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, Legend, AreaChart, Area, ResponsiveContainer } from "recharts";
import { useSupabaseAuth } from "@/components/supabase-auth-provider";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type Metric = 'tokens' | 'requests' | 'cost' | 'avg_tokens' | 'p95_tokens' | 'avg_latency' | 'p95_latency';
type Dimension = 'service' | 'provider' | 'model' | 'feature' | 'origin' | 'quality' | 'per_result_bucket';

interface AnalyticsV2Response {
  from: string;
  to: string;
  days: string[];
  series: Record<string, number[]>;
  totals: Record<string, number>;
  totalMetric: number;
  totalPerDay: number[];
  metric: Metric;
  dimension: Dimension;
  previous?: {
    from: string;
    to: string;
    days: string[];
    series: Record<string, number[]>;
    totals: Record<string, number>;
    totalMetric: number;
    totalPerDay: number[];
  };
}

const COLORS = [
  "#2563eb", "#16a34a", "#f59e0b", "#8b5cf6", "#ef4444",
  "#06b6d4", "#f97316", "#22c55e", "#a855f7", "#e11d48",
];

const METRIC_LABELS: Record<Metric, string> = {
  tokens: 'Tokens',
  requests: 'Requests',
  cost: 'Cost ($)',
  avg_tokens: 'Avg Tokens',
  p95_tokens: 'P95 Tokens',
  avg_latency: 'Avg Latency (ms)',
  p95_latency: 'P95 Latency (ms)',
};

const DIMENSION_LABELS: Record<Dimension, string> = {
  service: 'Service',
  provider: 'Provider',
  model: 'Model',
  feature: 'Feature',
  origin: 'Origin',
  quality: 'Quality',
  per_result_bucket: 'Results Range',
};

const toDateStr = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export interface UsageAnalyticsV2Props {
  className?: string;
}

export function UsageAnalyticsV2({ className }: UsageAnalyticsV2Props) {
  const { session } = useSupabaseAuth();
  const [metric, setMetric] = useState<Metric>('tokens');
  const [dimension, setDimension] = useState<Dimension>('service');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [compare, setCompare] = useState(false);
  const [cumulative, setCumulative] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsV2Response | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const fetchData = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const body: any = { metric, dimension, compare, cumulative };
      if (dateRange?.from) body.from = dateRange.from.toISOString();
      if (dateRange?.to) body.to = dateRange.to.toISOString();
      
      const resp = await fetch("/api/usage/analytics/v2", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "Failed to load analytics");
      }
      
      const json = (await resp.json()) as AnalyticsV2Response;

      // Normalization helpers
      const normProvider = (k: string) => {
        const s = (k || '').toLowerCase();
        if (s.includes('openrouter') || s === 'or' || s === 'router') return 'Nova';
        if (s.includes('openai')) return 'OpenAI';
        if (s.includes('anthropic')) return 'Anthropic';
        if (s.includes('gemini') || s.includes('google')) return 'Gemini';
        if (s.includes('groq')) return 'Groq';
        if (s === 'aiml' || s.includes('aiml')) return 'AIML';
        return k || 'unknown';
      };
      const modelFamily = (k: string) => {
        const s = (k || '').toLowerCase();
        if (s.includes('gpt') || s.includes('o3') || s.includes('4o')) return 'gpt';
        if (s.includes('claude')) return 'claude';
        if (s.includes('llama')) return 'llama';
        if (s.includes('gemini')) return 'gemini';
        if (s.includes('mixtral')) return 'mixtral';
        if (s.includes('qwen')) return 'qwen';
        if (s.includes('deepseek')) return 'deepseek';
        if (s.includes('glm')) return 'glm';
        if (s.includes('nemotron')) return 'nemotron';
        if (s.includes('gemma')) return 'gemma';
        if (s.includes('mistral')) return 'mistral';
        return s || 'unknown';
      };

      // If dimension is provider/model, collapse series by normalized key
      if (json && (dimension === 'provider' || dimension === 'model')) {
        const normalize = (k: string) => (dimension === 'provider' ? normProvider(k) : modelFamily(k));
        const collapsedSeries: Record<string, number[]> = {};
        const collapsedTotals: Record<string, number> = {};
        Object.entries(json.series).forEach(([key, arr]) => {
          const nk = normalize(key);
          if (!collapsedSeries[nk]) collapsedSeries[nk] = Array(arr.length).fill(0);
          arr.forEach((v, i) => { collapsedSeries[nk][i] += v || 0; });
          collapsedTotals[nk] = (collapsedTotals[nk] || 0) + (json.totals[key] || 0);
        });
        json.series = collapsedSeries;
        json.totals = collapsedTotals;
      }

      setData(json);
      
      // Auto-select top 5 series by total
      const topKeys = Object.entries(json.totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k);
      setSelectedKeys(prev => prev.length ? prev : topKeys);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, dimension, compare, cumulative, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.days.map((day, i) => {
      const point: Record<string, any> = { date: day };
      Object.entries(data.series).forEach(([key, arr]) => {
        point[key] = arr[i] || 0;
      });
      point.__total = data.totalPerDay[i] || 0;
      
      // Add previous period data if available
      if (data.previous && data.previous.days[i]) {
        point.__prev_total = data.previous.totalPerDay[i] || 0;
        Object.entries(data.previous.series).forEach(([key, arr]) => {
          point[`__prev_${key}`] = arr[i] || 0;
        });
      }
      
      return point;
    });
  }, [data]);

  const seriesKeys = useMemo(() => {
    if (!data) return [];
    return Object.keys(data.series);
  }, [data]);

  const colorsByKey = useMemo(() => {
    const map: Record<string, string> = {};
    seriesKeys.forEach((k, idx) => (map[k] = COLORS[idx % COLORS.length]));
    return map;
  }, [seriesKeys]);

  const chartConfig = useMemo(() => {
    const cfg: any = {};
    seriesKeys.forEach((k) => {
      cfg[k] = { label: k, color: colorsByKey[k] };
    });
    cfg.__total = { label: 'Total', color: '#6b7280' };
    cfg.__prev_total = { label: 'Previous Total', color: '#9ca3af' };
    return cfg;
  }, [seriesKeys, colorsByKey]);

  const toggleKey = (key: string) => {
    setSelectedKeys(prev => {
      if (prev.includes(key)) {
        const next = prev.filter(k => k !== key);
        return next.length ? next : prev;
      }
      return [...prev, key];
    });
  };

  const applyQuickRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (days - 1));
    setDateRange({ from, to });
  };

  const hasData = data && chartData.length > 0 && seriesKeys.length > 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Usage Analytics</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={chartType === 'line' ? 'default' : 'outline'}
              onClick={() => setChartType('line')}
            >
              Line
            </Button>
            <Button
              size="sm"
              variant={chartType === 'area' ? 'default' : 'outline'}
              onClick={() => setChartType('area')}
            >
              Area
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={metric === m ? "default" : "outline"}
                onClick={() => setMetric(m)}
              >
                {METRIC_LABELS[m]}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-1">
            {(Object.keys(DIMENSION_LABELS) as Dimension[]).map((d) => (
              <Button
                key={d}
                size="sm"
                variant={dimension === d ? "default" : "outline"}
                onClick={() => setDimension(d)}
              >
                {DIMENSION_LABELS[d]}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => applyQuickRange(7)}>7d</Button>
            <Button size="sm" variant="outline" onClick={() => applyQuickRange(14)}>14d</Button>
            <Button size="sm" variant="outline" onClick={() => applyQuickRange(30)}>30d</Button>
            <Button size="sm" variant="ghost" onClick={() => setDateRange(undefined)}>All</Button>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={compare ? "default" : "outline"}
              onClick={() => setCompare(!compare)}
            >
              Compare
            </Button>
            <Button
              size="sm"
              variant={cumulative ? "default" : "outline"}
              onClick={() => setCumulative(!cumulative)}
            >
              Cumulative
            </Button>
          </div>
        </div>

        {/* Series selector */}
        {hasData && (
          <div className="flex flex-wrap items-center gap-2">
            {seriesKeys.map((key) => (
              <Badge
                key={key}
                variant={selectedKeys.includes(key) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleKey(key)}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: colorsByKey[key] }}
                />
                {key} ({data?.totals[key]?.toLocaleString() || 0})
              </Badge>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="w-full h-80">
          {error && (
            <div className="text-sm text-red-600 p-4">{error}</div>
          )}
          {!error && loading && (
            <div className="text-sm text-muted-foreground p-4">Loading…</div>
          )}
          {!error && !loading && !hasData && (
            <div className="text-sm text-muted-foreground p-4">No usage data for the selected range.</div>
          )}
          {!error && !loading && hasData && (
            <ChartContainer config={chartConfig} className="h-full w-full">
              {chartType === 'area' ? (
                <AreaChart
                  data={chartData}
                  margin={{ top: 12, right: 16, bottom: 12, left: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickMargin={10}
                    interval="preserveStartEnd"
                    minTickGap={16}
                    tickFormatter={toDateStr}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickMargin={8}
                  />
                  <ChartTooltip 
                    cursor={{ strokeDasharray: "3 3", stroke: "#9ca3af" }}
                    content={<ChartTooltipContent />}
                  />
                  <Legend verticalAlign="top" align="right" />
                  
                  {selectedKeys.map((key) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stackId="1"
                      stroke={colorsByKey[key]}
                      fill={colorsByKey[key]}
                      fillOpacity={0.6}
                      strokeWidth={2}
                      name={key}
                    />
                  ))}
                  
                  {/* Total overlay */}
                  <Line
                    type="monotone"
                    dataKey="__total"
                    stroke="#6b7280"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Total"
                  />
                  
                  {/* Previous period comparison */}
                  {compare && data?.previous && (
                    <Line
                      type="monotone"
                      dataKey="__prev_total"
                      stroke="#9ca3af"
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      dot={false}
                      name="Previous Total"
                    />
                  )}
                </AreaChart>
              ) : (
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 16, bottom: 12, left: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickMargin={10}
                    interval="preserveStartEnd"
                    minTickGap={16}
                    tickFormatter={toDateStr}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickMargin={8}
                  />
                  <ChartTooltip 
                    cursor={{ strokeDasharray: "3 3", stroke: "#9ca3af" }}
                    content={<ChartTooltipContent />}
                  />
                  <Legend verticalAlign="top" align="right" />
                  
                  {selectedKeys.map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={colorsByKey[key]}
                      strokeWidth={2}
                      dot={false}
                      name={key}
                    />
                  ))}
                  
                  {/* Total overlay */}
                  <Line
                    type="monotone"
                    dataKey="__total"
                    stroke="#6b7280"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Total"
                  />
                  
                  {/* Previous period comparison */}
                  {compare && data?.previous && (
                    <Line
                      type="monotone"
                      dataKey="__prev_total"
                      stroke="#9ca3af"
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      dot={false}
                      name="Previous Total"
                    />
                  )}
                </LineChart>
              )}
            </ChartContainer>
          )}
        </div>

        {/* Summary stats */}
        {hasData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold">{data.totalMetric.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total {METRIC_LABELS[metric]}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Object.keys(data.series).length}</div>
              <div className="text-xs text-muted-foreground">Unique {DIMENSION_LABELS[dimension]}s</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{data.days.length}</div>
              <div className="text-xs text-muted-foreground">Days</div>
            </div>
            {compare && data.previous && (
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {data.totalMetric > data.previous.totalMetric ? '+' : ''}
                  {(((data.totalMetric - data.previous.totalMetric) / Math.max(data.previous.totalMetric, 1)) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">vs Previous</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
