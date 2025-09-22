"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useSupabaseAuth } from "@/components/supabase-auth-provider";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type TopMetric = 'tokens' | 'requests' | 'cost';
type TopBy = 'provider' | 'model' | 'feature' | 'service';

interface TopRow {
  key: string;
  tokens: number;
  requests: number;
  cost: number;
  error_rate: number;
  avg_latency: number;
}

interface TopResponse {
  from: string;
  to: string;
  metric: TopMetric;
  by: TopBy;
  limit: number;
  rows: TopRow[];
}

const METRIC_LABELS: Record<TopMetric, string> = {
  tokens: 'Tokens',
  requests: 'Requests',
  cost: 'Cost ($)',
};

const BY_LABELS: Record<TopBy, string> = {
  provider: 'Provider',
  model: 'Model',
  feature: 'Feature',
  service: 'Service',
};

export interface TopEntitiesTableProps {
  className?: string;
  dateRange?: DateRange;
}

export function TopEntitiesTable({ className, dateRange }: TopEntitiesTableProps) {
  const { session } = useSupabaseAuth();
  const [metric, setMetric] = useState<TopMetric>('tokens');
  const [by, setBy] = useState<TopBy>('provider');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TopResponse | null>(null);
  const [sortField, setSortField] = useState<keyof TopRow>('tokens');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchData = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const body: any = { metric, by, limit: 20 };
      if (dateRange?.from) body.from = dateRange.from.toISOString();
      if (dateRange?.to) body.to = dateRange.to.toISOString();
      
      const resp = await fetch("/api/usage/top", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "Failed to load top entities");
      }
      
      const json = (await resp.json()) as TopResponse;

      // Normalization helpers
      const normProvider = (k: string) => {
        const s = (k || '').toLowerCase();
        if (s.includes('openrouter') || s === 'or' || s === 'router') return 'NOVA';
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

      // Collapse rows by normalized key if needed
      if (json?.rows?.length) {
        const normalizeKey = (k: string) => (by === 'provider' ? normProvider(k) : by === 'model' ? modelFamily(k) : k);
        const agg: Record<string, TopRow> = {};
        json.rows.forEach((row) => {
          const nk = normalizeKey(row.key);
          if (!agg[nk]) {
            agg[nk] = { key: nk, tokens: 0, requests: 0, cost: 0, error_rate: 0, avg_latency: 0 };
          }
          const prev = agg[nk];
          // Sum additive metrics
          prev.tokens += Number(row.tokens || 0);
          prev.requests += Number(row.requests || 0);
          prev.cost += Number(row.cost || 0);
          // Weighted averages by new total requests
          const totalReqBefore = prev.requests - Number(row.requests || 0);
          const req = Number(row.requests || 0);
          if (prev.requests > 0 && req >= 0) {
            prev.error_rate = ((prev.error_rate * totalReqBefore) + (Number(row.error_rate || 0) * req)) / Math.max(prev.requests, 1);
            prev.avg_latency = ((prev.avg_latency * totalReqBefore) + (Number(row.avg_latency || 0) * req)) / Math.max(prev.requests, 1);
          }
        });
        const rows = Object.values(agg).map(r => ({
          ...r,
          tokens: Math.round(r.tokens),
          requests: Math.round(r.requests),
          cost: Number(r.cost.toFixed(4)),
          error_rate: Number(r.error_rate.toFixed(2)),
          avg_latency: Math.round(r.avg_latency),
        }));
        setData({ ...json, rows });
      } else {
        setData(json);
      }
      
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, by, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]);

  const handleSort = (field: keyof TopRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedRows = React.useMemo(() => {
    if (!data?.rows) return [];
    
    return [...data.rows].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [data?.rows, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: keyof TopRow }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Top Entities</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{data?.rows.length || 0} results</Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">By:</span>
            {(Object.keys(BY_LABELS) as TopBy[]).map((b) => (
              <Button
                key={b}
                size="sm"
                variant={by === b ? "default" : "outline"}
                onClick={() => setBy(b)}
              >
                {BY_LABELS[b]}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            {(Object.keys(METRIC_LABELS) as TopMetric[]).map((m) => (
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
        </div>

        {/* Table */}
        <div className="rounded-md border">
          {error && (
            <div className="text-sm text-red-600 p-4">{error}</div>
          )}
          {!error && loading && (
            <div className="text-sm text-muted-foreground p-4">Loading…</div>
          )}
          {!error && !loading && (!data?.rows || data.rows.length === 0) && (
            <div className="text-sm text-muted-foreground p-4">No data for the selected range.</div>
          )}
          {!error && !loading && data?.rows && data.rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('key')}
                    >
                      {BY_LABELS[by]}
                      <SortIcon field="key" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('tokens')}
                    >
                      Tokens
                      <SortIcon field="tokens" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('requests')}
                    >
                      Requests
                      <SortIcon field="requests" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('cost')}
                    >
                      Cost ($)
                      <SortIcon field="cost" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row, index) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        {row.key}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.tokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.requests.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${row.cost.toFixed(4)}
                    </TableCell>
                    {/* Error % and Avg Latency cells removed */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
