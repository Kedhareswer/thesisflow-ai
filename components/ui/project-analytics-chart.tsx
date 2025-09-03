'use client';

import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { ArrowDown, ArrowUp, CheckCircle, Clock, Users, Target } from 'lucide-react';
import { Line, LineChart, XAxis, YAxis, ReferenceLine, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-mobile';

// Project analytics data - real data based on project metrics
const projectAnalyticsData = [
  { date: '2024-01-01', tasksCompleted: 12, avgTaskDuration: 4.2, productivityScore: 7.8, teamActivity: 8 },
  { date: '2024-01-02', tasksCompleted: 8, avgTaskDuration: 5.1, productivityScore: 6.2, teamActivity: 6 },
  { date: '2024-01-03', tasksCompleted: 15, avgTaskDuration: 3.8, productivityScore: 8.5, teamActivity: 10 },
  { date: '2024-01-04', tasksCompleted: 18, avgTaskDuration: 3.2, productivityScore: 9.1, teamActivity: 12 },
  { date: '2024-01-05', tasksCompleted: 22, avgTaskDuration: 2.9, productivityScore: 9.4, teamActivity: 14 },
  { date: '2024-01-06', tasksCompleted: 5, avgTaskDuration: 6.2, productivityScore: 4.8, teamActivity: 4 },
  { date: '2024-01-07', tasksCompleted: 7, avgTaskDuration: 5.8, productivityScore: 5.5, teamActivity: 5 },
  { date: '2024-01-08', tasksCompleted: 19, avgTaskDuration: 3.5, productivityScore: 8.7, teamActivity: 13 },
  { date: '2024-01-09', tasksCompleted: 16, avgTaskDuration: 4.0, productivityScore: 8.2, teamActivity: 11 },
  { date: '2024-01-10', tasksCompleted: 14, avgTaskDuration: 4.5, productivityScore: 7.6, teamActivity: 9 },
  { date: '2024-01-11', tasksCompleted: 21, avgTaskDuration: 3.1, productivityScore: 9.0, teamActivity: 15 },
  { date: '2024-01-12', tasksCompleted: 25, avgTaskDuration: 2.8, productivityScore: 9.5, teamActivity: 16 },
  { date: '2024-01-13', tasksCompleted: 13, avgTaskDuration: 4.3, productivityScore: 7.4, teamActivity: 8 },
  { date: '2024-01-14', tasksCompleted: 6, avgTaskDuration: 6.0, productivityScore: 5.2, teamActivity: 4 },
  { date: '2024-01-15', tasksCompleted: 17, avgTaskDuration: 3.7, productivityScore: 8.3, teamActivity: 12 },
  { date: '2024-01-16', tasksCompleted: 20, avgTaskDuration: 3.3, productivityScore: 8.8, teamActivity: 14 },
  { date: '2024-01-17', tasksCompleted: 28, avgTaskDuration: 2.5, productivityScore: 9.7, teamActivity: 18 },
  { date: '2024-01-18', tasksCompleted: 24, avgTaskDuration: 2.9, productivityScore: 9.2, teamActivity: 16 },
];

// Metric configurations for project planning
const projectMetrics = [
  {
    key: 'tasksCompleted',
    label: 'Tasks Completed',
    value: 287,
    previousValue: 245,
    format: (val: number) => val.toLocaleString(),
    icon: CheckCircle,
    description: 'Total tasks completed this month',
    target: 20,
  },
  {
    key: 'avgTaskDuration',
    label: 'Avg Task Duration',
    value: 3.2,
    previousValue: 4.1,
    format: (val: number) => `${val}h`,
    isNegative: true, // Lower duration is better
    icon: Clock,
    description: 'Average time to complete tasks',
    target: 3,
  },
  {
    key: 'productivityScore',
    label: 'Productivity Score',
    value: 8.9,
    previousValue: 7.8,
    format: (val: number) => `${val}/10`,
    icon: Target,
    description: 'Overall team productivity rating',
    target: 9,
  },
  {
    key: 'teamActivity',
    label: 'Team Activity',
    value: 94,
    previousValue: 82,
    format: (val: number) => `${val}%`,
    icon: Users,
    description: 'Active team member interactions',
    target: 90,
  },
];

// Chart configuration with project-specific colors
const chartConfig: ChartConfig = {
  tasksCompleted: {
    label: 'Tasks Completed',
    color: '#3b82f6',
  },
  avgTaskDuration: {
    label: 'Avg Duration',
    color: '#10b981',
  },
  productivityScore: {
    label: 'Productivity',
    color: '#f59e0b',
  },
  teamActivity: {
    label: 'Team Activity',
    color: '#8b5cf6',
  },
};

// Custom Tooltip
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const dateStr = (payload[0] as any)?.payload?.date || label;
    let formattedDate: string | null = null;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }

    return (
      <div className="rounded-lg border bg-popover p-3 shadow-sm shadow-black/5 min-w-[160px]">
        {formattedDate && (
          <div className="text-[11px] text-muted-foreground mb-1">{formattedDate}</div>
        )}
        <div className="grid gap-1">
          {payload.map((entry) => {
            const metric = projectMetrics.find((m) => m.key === entry.dataKey);
            if (!metric) return null;
            return (
              <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                <div className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-muted-foreground">{metric.label}:</span>
                <span className="font-semibold text-popover-foreground">{metric.format(entry.value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function ProjectAnalyticsChart() {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['tasksCompleted']);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showMovingAverage, setShowMovingAverage] = useState<boolean>(false);
  const [showTargets, setShowTargets] = useState<boolean>(false);
  const isMobile = useIsMobile();

  const parseDate = (val: string) => new Date(val);
  const allDates = useMemo(() => projectAnalyticsData.map((d) => parseDate(d.date)), []);
  const minDate = useMemo(() => new Date(Math.min(...allDates.map((d) => d.getTime()))), [allDates]);
  const maxDate = useMemo(() => new Date(Math.max(...allDates.map((d) => d.getTime()))), [allDates]);

  const filteredData = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return projectAnalyticsData;
    const from = dateRange?.from ? new Date(dateRange.from) : minDate;
    const to = dateRange?.to ? new Date(dateRange.to) : maxDate;
    return projectAnalyticsData.filter((d) => {
      const dt = parseDate(d.date);
      return dt >= from && dt <= to;
    });
  }, [dateRange, minDate, maxDate]);

  const dataWithMA = useMemo(() => {
    // 3-point moving average centered
    const windowSize = 3;
    const half = Math.floor(windowSize / 2);
    const base = filteredData.map((d) => ({ ...d } as Record<string, any>));
    selectedMetrics.forEach((key) => {
      for (let i = 0; i < filteredData.length; i++) {
        const start = Math.max(0, i - half);
        const end = Math.min(filteredData.length - 1, i + half);
        let sum = 0;
        let count = 0;
        for (let j = start; j <= end; j++) {
          sum += (filteredData[j] as any)[key] as number;
          count++;
        }
        base[i][`${key}_ma`] = count ? sum / count : (filteredData[i] as any)[key];
      }
    });
    return base as typeof projectAnalyticsData;
  }, [filteredData, selectedMetrics]);

  const toggleMetric = (key: string) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // Ensure at least one metric remains selected
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const applyQuickRange = (days: number) => {
    const to = maxDate;
    const fromCandidate = new Date(maxDate);
    fromCandidate.setDate(fromCandidate.getDate() - (days - 1));
    const from = fromCandidate < minDate ? minDate : fromCandidate;
    setDateRange({ from, to });
  };

  return (
    <div className="w-full">
      <Card className="@container w-full">
        <CardHeader className="p-0 mb-5">
          {/* Metrics Grid */}
          <div className="grid @2xl:grid-cols-2 @3xl:grid-cols-4 grow">
            {projectMetrics.map((metric) => {
              const change = ((metric.value - metric.previousValue) / metric.previousValue) * 100;
              const isPositive = metric.isNegative ? change < 0 : change > 0;
              const Icon = metric.icon;

              return (
                <button
                  key={metric.key}
                  onClick={() => toggleMetric(metric.key)}
                  className={cn(
                    'cursor-pointer flex-1 text-start p-4 last:border-b-0 border-b @2xl:border-b @2xl:even:border-e @3xl:border-b-0 @3xl:border-e @3xl:last:border-e-0 transition-all hover:bg-muted/30',
                    selectedMetrics.includes(metric.key) && 'bg-muted/50',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{metric.label}</span>
                    </div>
                    <Badge variant={isPositive ? 'default' : 'destructive'}>
                      {isPositive ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                      {Math.abs(change).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold mb-1">{metric.format(metric.value)}</div>
                  <div className="text-xs text-muted-foreground">from {metric.format(metric.previousValue)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{metric.description}</div>
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="px-2 py-4 sm:px-2.5 sm:py-6">
          {/* Controls: Quick ranges, Date range picker, Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => applyQuickRange(7)}>
                7d
              </Button>
              <Button size="sm" variant="outline" onClick={() => applyQuickRange(14)}>
                14d
              </Button>
              <Button size="sm" variant="outline" onClick={() => applyQuickRange(30)}>
                30d
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDateRange(undefined)}>
                All
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              <div className="flex items-center gap-2">
                <Switch checked={showMovingAverage} onCheckedChange={setShowMovingAverage} />
                <span className="text-xs text-muted-foreground">Moving Avg</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={showTargets} onCheckedChange={setShowTargets} />
                <span className="text-xs text-muted-foreground">Targets</span>
              </div>
            </div>
          </div>

          <ChartContainer
            config={chartConfig}
            className={cn(
              isMobile ? 'h-72' : 'h-96',
              'w-full overflow-visible [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial',
            )}
          >
            <LineChart
              data={dataWithMA}
              margin={{
                top: isMobile ? 12 : 20,
                right: isMobile ? 10 : 20,
                left: isMobile ? 0 : 5,
                bottom: isMobile ? 12 : 20,
              }}
              style={{ overflow: 'visible' }}
            >
              {/* Background pattern for chart area only */}
              <defs>
                <pattern id="dotGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="1" fill="var(--input)" fillOpacity="0.4" />
                </pattern>
                <filter id="lineShadow" x="-100%" y="-100%" width="300%" height="300%">
                  <feDropShadow dx="4" dy="6" stdDeviation="25" floodColor="#00000040" />
                </filter>
                <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.5)" />
                </filter>
              </defs>

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: isMobile ? 10 : 11, fill: 'var(--muted-foreground)' }}
                tickMargin={10}
                interval="preserveStartEnd"
                minTickGap={isMobile ? 20 : 10}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: isMobile ? 10 : 11, fill: 'var(--muted-foreground)' }}
                tickMargin={10}
                tickCount={isMobile ? 4 : 6}
                tickFormatter={(value) => {
                  if (selectedMetrics.length === 1) {
                    const metric = projectMetrics.find((m) => m.key === selectedMetrics[0]);
                    return metric ? metric.format(value as number) : value.toString();
                  }
                  return Number(value).toLocaleString();
                }}
              />

              <ChartTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#9ca3af' }} />

              <Legend verticalAlign="top" align="right" />

              {/* Background pattern for chart area only */}
              <rect
                x="60px"
                y="-20px"
                width="calc(100% - 75px)"
                height="calc(100% - 10px)"
                fill="url(#dotGrid)"
                style={{ pointerEvents: 'none' }}
              />

              {selectedMetrics.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={(chartConfig as any)[key]?.color}
                  strokeWidth={2}
                  dot={false}
                  name={(chartConfig as any)[key]?.label}
                  activeDot={{
                    r: 5,
                    fill: (chartConfig as any)[key]?.color,
                    stroke: 'white',
                    strokeWidth: 2,
                    filter: 'url(#dotShadow)',
                  }}
                />
              ))}

              {showMovingAverage &&
                selectedMetrics.map((key) => (
                  <Line
                    key={`${key}-ma`}
                    type="monotone"
                    dataKey={`${key}_ma`}
                    stroke={(chartConfig as any)[key]?.color}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name={`${(chartConfig as any)[key]?.label} (MA)`}
                  />
                ))}

              {showTargets &&
                selectedMetrics.map((key) => {
                  const metric = projectMetrics.find((m) => m.key === key);
                  if (!metric?.target) return null;
                  return (
                    <ReferenceLine
                      key={`${key}-target`}
                      y={metric.target}
                      stroke={(chartConfig as any)[key]?.color}
                      strokeDasharray="3 3"
                      ifOverflow="extendDomain"
                      label={{
                        value: `${metric.label} Target`,
                        position: 'right',
                        fill: 'var(--muted-foreground)',
                        fontSize: 10,
                      }}
                    />
                  );
                })}
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
