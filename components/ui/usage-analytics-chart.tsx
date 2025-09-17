"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, Legend } from "recharts";
import { useSupabaseAuth } from "@/components/supabase-auth-provider";
import { cn } from "@/lib/utils";

// Minimal, compact usage analytics chart showing tokens/day across dimensions
// - Dimensions: service (explorer, summarizer, ai_assistant, ai_writing, other)
//               provider (openai, groq, gemini, anthropic, etc)
//               model (gpt-4o, llama3, etc)
// Data source: /api/usage/analytics (aggregates token_transactions)

type UsageApiResponse = {
  from: string
  to: string
  days: string[]
  series: {
    service: Record<string, number[]>
    provider: Record<string, number[]>
    model: Record<string, number[]>
  }
  totals: {
    perServiceTokens: Record<string, number>
    perProviderTokens: Record<string, number>
    perModelTokens: Record<string, number>
  }
  totalTokens: number
}

const COLORS = [
  "#2563eb", // blue
  "#16a34a", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#22c55e", // emerald
  "#a855f7", // purple
  "#e11d48", // rose
];

const toDateStr = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function UsageAnalyticsChart() {
  const { session } = useSupabaseAuth();
  const [dimension, setDimension] = useState<"service" | "provider" | "model">("service");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UsageApiResponse | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const fetchData = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const body: any = {};
      if (dateRange?.from) body.from = dateRange.from.toISOString();
      if (dateRange?.to) body.to = dateRange.to.toISOString();
      const resp = await fetch("/api/usage/analytics", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "Failed to load usage analytics");
      }
      const json = (await resp.json()) as UsageApiResponse;
      setData(json);
      // Default select top 4 series by total for the chosen dimension
      const totalsByDim =
        dimension === "service" ? json.totals.perServiceTokens : dimension === "provider" ? json.totals.perProviderTokens : json.totals.perModelTokens;
      const topKeys = Object.entries(totalsByDim)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 4)
        .map(([k]) => k);
      setSelectedKeys((prev) => (prev.length ? prev : topKeys));
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimension, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]);

  const chartData = useMemo(() => {
    if (!data) return [] as any[];
    const src = data.series[dimension];
    return data.days.map((day, i) => {
      const point: Record<string, any> = { date: day };
      let total = 0;
      Object.entries(src).forEach(([key, arr]) => {
        const v = (arr as number[])[i] || 0;
        point[key] = v;
        total += v;
      });
      // Overlay total for the day across all series
      point.__total = total;
      return point;
    });
  }, [data, dimension]);

  const seriesKeys = useMemo(() => {
    if (!data) return [] as string[];
    return Object.keys(data.series[dimension] || {});
  }, [data, dimension]);

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        return next.length ? next : prev; // keep at least one selected
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

  const colorsByKey = useMemo(() => {
    const map: Record<string, string> = {};
    seriesKeys.forEach((k, idx) => (map[k] = COLORS[idx % COLORS.length]));
    return map;
  }, [seriesKeys]);

  // Minimal configs for ChartContainer
  const chartConfig = useMemo(() => {
    const cfg: any = {};
    seriesKeys.forEach((k) => {
      cfg[k] = { label: k, color: colorsByKey[k] };
    });
    // Provide config for totals overlay (legend styling if used elsewhere)
    cfg.__total = { label: 'Total', color: '#6b7280' };
    return cfg;
  }, [seriesKeys, colorsByKey]);

  const hasData = data && chartData.length > 0 && seriesKeys.length > 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Usage Analytics</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button size="sm" variant={dimension === "service" ? "default" : "outline"} onClick={() => setDimension("service")}>Service</Button>
            <Button size="sm" variant={dimension === "provider" ? "default" : "outline"} onClick={() => setDimension("provider")}>Provider</Button>
            <Button size="sm" variant={dimension === "model" ? "default" : "outline"} onClick={() => setDimension("model")}>Model</Button>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => applyQuickRange(7)}>7d</Button>
            <Button size="sm" variant="outline" onClick={() => applyQuickRange(14)}>14d</Button>
            <Button size="sm" variant="outline" onClick={() => applyQuickRange(30)}>30d</Button>
            <Button size="sm" variant="ghost" onClick={() => setDateRange(undefined)}>All</Button>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
        </div>

        {/* Series selector (compact) */}
        {hasData && (
          <div className="flex flex-wrap items-center gap-2">
            {seriesKeys.map((key) => (
              <button
                key={key}
                onClick={() => toggleKey(key)}
                className={cn(
                  "text-xs rounded-full border px-2 py-1",
                  selectedKeys.includes(key) ? "bg-primary/10 border-primary text-foreground" : "bg-background text-muted-foreground"
                )}
                title={key}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: colorsByKey[key] }} />
                {key}
              </button>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="w-full">
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          {!error && loading && (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}
          {!error && !loading && !hasData && (
            <div className="text-sm text-muted-foreground">No usage yet for the selected range.</div>
          )}
          {!error && !loading && hasData && (
            <ChartContainer config={chartConfig} className="h-80 w-full overflow-visible">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 16, bottom: 12, left: 0 }}
                style={{ overflow: "visible" }}
              >
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickMargin={10}
                  interval="preserveStartEnd"
                  minTickGap={16}
                  tickFormatter={(value) => toDateStr(value)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickMargin={8}
                />
                <ChartTooltip cursor={{ strokeDasharray: "3 3", stroke: "#9ca3af" }} />
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
                {/* Daily totals overlay */}
                <Line
                  key="__total"
                  type="monotone"
                  dataKey="__total"
                  stroke="#6b7280"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Total"
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
