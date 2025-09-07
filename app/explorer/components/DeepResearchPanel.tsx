"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useDeepSearch, type DeepSearchItem, type DeepSearchWarning } from "@/hooks/use-deep-search"
import type { AIProvider } from "@/lib/ai-providers"
import MinimalAIProviderSelector from "@/components/ai-provider-selector-minimal"

interface DeepResearchPanelProps {
  initialQuery?: string
  selectedProvider?: AIProvider
  selectedModel?: string
  onProviderChange?: (p?: AIProvider) => void
  onModelChange?: (m?: string) => void
}

export function DeepResearchPanel({
  initialQuery,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
}: DeepResearchPanelProps) {
  const router = useRouter()
  const params = useSearchParams()
  const [query, setQuery] = useState<string>(initialQuery || "")
  const [limit, setLimit] = useState<number>(20)

  const {
    start,
    stop,
    reset,
    items,
    warnings,
    summary,
    isLoading,
    done,
    error,
  } = useDeepSearch()

  // Auto-start on mount if initialQuery provided
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      start({ query: initialQuery.trim(), limit, provider: selectedProvider, model: selectedModel })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  const handleStart = () => {
    if (!query.trim()) return
    // reflect in URL for shareability
    const usp = new URLSearchParams(Array.from(params.entries()))
    usp.set("deep", "1")
    usp.set("query", query.trim())
    router.push(`/explorer?${usp.toString()}`)
    start({ query: query.trim(), limit, provider: selectedProvider, model: selectedModel })
  }

  const kindClass = (kind?: DeepSearchItem["kind"]) => {
    switch (kind) {
      case "scholar":
        return "bg-indigo-100 text-indigo-700"
      case "docs":
        return "bg-emerald-100 text-emerald-700"
      case "news":
        return "bg-amber-100 text-amber-700"
      default:
        return "bg-slate-100 text-slate-700"
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <CardTitle>Deep Research</CardTitle>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a topic or question"
              className="w-[320px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleStart()
              }}
            />
            <Input
              type="number"
              value={limit}
              min={5}
              max={50}
              onChange={(e) => setLimit(Number(e.target.value) || 20)}
              className="w-[90px]"
              placeholder="Limit"
            />
            {!isLoading ? (
              <Button onClick={handleStart}>Start</Button>
            ) : (
              <Button variant="secondary" onClick={stop}>Stop</Button>
            )}
            <Button variant="ghost" onClick={() => { setQuery(""); reset() }}>Clear</Button>
          </div>
          <MinimalAIProviderSelector
            selectedProvider={selectedProvider}
            onProviderChange={onProviderChange as any}
            selectedModel={selectedModel}
            onModelChange={onModelChange as any}
            variant="inline"
            showModelSelector={true}
            showConfigLink={false}
          />
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-3 border-red-200">
            <AlertDescription className="text-red-700">{String(error)}</AlertDescription>
          </Alert>
        )}

        {warnings.length > 0 && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-2">
            <div className="text-xs font-medium text-amber-800 mb-1">Warnings</div>
            <ul className="space-y-1 text-xs text-amber-900">
              {warnings.map((w: DeepSearchWarning, i: number) => (
                <li key={i}>{w.source ? `[${w.source}] ` : ""}{w.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {isLoading && items.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600"><LoadingSpinner size="sm" />Searching…</div>
          )}
          {items.map((it, idx) => (
            <div key={idx} className="rounded border border-gray-200 p-3 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Badge className={kindClass(it.kind)}>{it.kind || "web"}</Badge>
                  <a href={it.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-700 hover:underline">
                    {it.title || it.url}
                  </a>
                </div>
                <div className="text-[11px] text-gray-500">{it.source}</div>
              </div>
              {it.snippet && <p className="mt-1 text-xs text-gray-700 line-clamp-3">{it.snippet}</p>}
            </div>
          ))}
          {done && items.length === 0 && (
            <div className="text-sm text-gray-500">No results.</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
