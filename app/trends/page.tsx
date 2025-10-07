"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import Link from 'next/link'

interface Metrics { relevance: number; diversity: number; coverage: number; sources: number }
interface Cluster { id: string; label: string; size: number; indices: number[]; score?: number }
interface TimelinePoint { period: string; count: number }

export default function TrendsPage() {
  const [query, setQuery] = useState('')
  const [quality, setQuality] = useState<'Standard'|'Enhanced'>('Standard')
  const [timeframe, setTimeframe] = useState(12)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle'|'queued'|'running'|'failed'|'completed'>('idle')
  const [stage, setStage] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [itemsCount, setItemsCount] = useState(0)
  const [report, setReport] = useState<string>('')
  const [error, setError] = useState<string>('')
  const esRef = useRef<EventSource | null>(null)

  const closeES = useCallback(() => { if (esRef.current) { try { esRef.current.close() } catch {} esRef.current = null }}, [])

  const startJob = useCallback(async () => {
    setError('')
    setReport('')
    setClusters([])
    setTimeline([])
    setMetrics(null)
    setItemsCount(0)

    try {
      let token: string | null = null
      try {
        const { supabase } = await import('@/integrations/supabase/client')
        const s = await supabase.auth.getSession()
        token = s.data.session?.access_token || null
      } catch {}

      const resp = await fetch('/api/trends/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, timeframeMonths: timeframe, quality })
      })
      const data = await resp.json()
      if (!resp.ok || !data?.success) throw new Error(data?.error || 'Failed to start job')
      const id = data.jobId as string
      setJobId(id)
      setStatus('queued')
      setStage('init')
      setProgress(1)

      // Open SSE
      const url = new URL(`/api/trends/jobs/${id}/events`, window.location.origin)
      if (token) url.searchParams.set('access_token', token)
      const es = new EventSource(url.toString(), { withCredentials: true })
      esRef.current = es

      es.addEventListener('init', (e: MessageEvent) => {
        setStatus('running')
      })
      es.addEventListener('progress', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data || '{}')
          if (payload?.stage) setStage(String(payload.stage))
          if (typeof payload?.progress === 'number') setProgress(payload.progress)
        } catch {}
      })
      es.addEventListener('item', (e: MessageEvent) => {
        setItemsCount((c) => c + 1)
      })
      es.addEventListener('metrics', (e: MessageEvent) => { try { setMetrics(JSON.parse(e.data)) } catch {} })
      es.addEventListener('clusters', (e: MessageEvent) => { try { const d = JSON.parse(e.data); setClusters(d?.clusters || []) } catch {} })
      es.addEventListener('timeline', (e: MessageEvent) => { try { const d = JSON.parse(e.data); setTimeline(d?.timeline || []) } catch {} })
      es.addEventListener('report', (e: MessageEvent) => { try { const d = JSON.parse(e.data); if (d?.markdown) setReport(d.markdown) } catch {} })
      es.addEventListener('done', (e: MessageEvent) => { setStatus('completed'); setProgress(100); closeES() })
      es.addEventListener('error', (e: MessageEvent) => { try { const d = JSON.parse(e.data); setError(d?.error || 'Stream error') } catch { setError('Stream error') } })
      es.onerror = () => { /* keep alive or close handled by server */ }
    } catch (e: any) {
      setError(e?.message || 'Failed to start job')
    }
  }, [query, timeframe, quality, closeES])

  useEffect(() => { return () => closeES() }, [closeES])

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Trends Researcher</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Query</label>
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="e.g., LLM safety benchmarks" className="w-full px-4 py-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Timeframe (months)</label>
            <select value={timeframe} onChange={(e)=>setTimeframe(parseInt(e.target.value,10))} className="w-full px-3 py-2 border rounded-md">
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Quality</label>
            <select value={quality} onChange={(e)=>setQuality(e.target.value as any)} className="w-full px-3 py-2 border rounded-md">
              <option value="Standard">Standard</option>
              <option value="Enhanced">Enhanced</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50" onClick={startJob} disabled={!query.trim()}>
            Start Trends Job
          </button>
          {jobId && (
            <>
              <span className="text-sm text-gray-600">Job: {jobId.slice(0,8)}…</span>
              <Link href={`/api/trends/jobs/${jobId}/download?format=pdf`} className="text-blue-600 hover:underline text-sm">Download PDF</Link>
              <Link href={`/api/trends/jobs/${jobId}/download?format=md`} className="text-blue-600 hover:underline text-sm">Download MD</Link>
            </>
          )}
        </div>
        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

        {status !== 'idle' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="border rounded-md p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-gray-800 font-medium">Progress</div>
                  <div className="text-sm text-gray-600">{stage || '—'}</div>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded">
                  <div className="h-2 bg-blue-600 rounded" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-gray-500 mt-2">Items: {itemsCount}</div>
              </div>

              <div className="border rounded-md p-4 mb-4">
                <div className="text-gray-800 font-medium mb-2">Report Preview</div>
                {report ? (
                  <div className="prose max-w-none">
                    <MarkdownRenderer content={report} enableMermaid={false} />
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Report will appear here when ready.</div>
                )}
              </div>
            </div>

            <aside>
              <div className="border rounded-md p-4 mb-4">
                <div className="text-gray-800 font-medium mb-2">Metrics</div>
                {metrics ? (
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>Relevance: {Math.round(metrics.relevance*100)}%</li>
                    <li>Diversity: {Math.round(metrics.diversity*100)}%</li>
                    <li>Coverage: {Math.round(metrics.coverage*100)}%</li>
                    <li>Sources: {metrics.sources}</li>
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">No metrics yet.</div>
                )}
              </div>

              <div className="border rounded-md p-4 mb-4">
                <div className="text-gray-800 font-medium mb-2">Top Clusters</div>
                {clusters.length ? (
                  <ul className="text-sm text-gray-700 space-y-1">
                    {clusters.slice(0,8).map(c => (
                      <li key={c.id}>{c.label} <span className="text-gray-400">({c.size})</span></li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">No clusters yet.</div>
                )}
              </div>

              <div className="border rounded-md p-4">
                <div className="text-gray-800 font-medium mb-2">Timeline</div>
                {timeline.length ? (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-gray-600"><th className="py-1">Year</th><th className="py-1">Count</th></tr></thead>
                    <tbody>
                      {timeline.map((t) => (
                        <tr key={t.period}><td className="py-0.5">{t.period}</td><td className="py-0.5">{t.count}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-500">No timeline yet.</div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
