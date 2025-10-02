"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Sidebar from "../../ai-agents/components/Sidebar"
import { useRouter } from "next/navigation"
import { getSession, safeHostname } from "@/lib/services/topics-session.store"
import type { Paper } from "@/hooks/use-literature-search"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Search, ExternalLink, Eye, Plus } from "lucide-react"

interface PageProps { params: { id: string } }

interface DetailState {
  reviewed: Record<string, boolean>
  notes: Array<{ id: string; text: string; at: number }>
  tags: string[]
  activities: Array<{ id: string; type: string; text?: string; sourceId?: string; at: number }>
}

function useDetailState(sessionId: string) {
  const KEY = `thesisflow_topics_detail_v2_${sessionId}`
  const [state, setState] = useState<DetailState>(() => {
    if (typeof window === "undefined") return { reviewed: {}, notes: [], tags: [], activities: [] }
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return { reviewed: {}, notes: [], tags: [], activities: [] }
      const parsed = JSON.parse(raw)
      return { reviewed: {}, notes: [], tags: [], activities: [], ...parsed }
    } catch {
      return { reviewed: {}, notes: [], tags: [], activities: [] }
    }
  })
  useEffect(() => {
    if (typeof window === "undefined") return
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
  }, [state, KEY])
  return [state, setState] as const
}

export default function TopicDetailPage({ params }: PageProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { id } = params
  const router = useRouter()

  const session = useMemo(() => getSession(id), [id])

  const [state, setState] = useDetailState(id)
  const [q, setQ] = useState("")
  const [sortBy, setSortBy] = useState<'relevance' | 'date'>("relevance")
  const [showAll, setShowAll] = useState(false)

  // Safe fallbacks before any early returns to ensure hook order
  const results = session?.results ?? []
  const safeQuery = q.trim().toLowerCase()

  useEffect(() => {
    if (!session) {
      // Session missing; redirect to library
      router.replace("/topics/library")
    }
  }, [session, router])

  const toYear = (y: unknown) => {
    const n = typeof y === 'number' ? y : typeof y === 'string' ? parseInt(y as string, 10) : NaN
    return Number.isFinite(n) ? (n as number) : 0
  }

  const filtered = useMemo(() => {
    let arr = results.slice()
    if (safeQuery) {
      arr = arr.filter((p) =>
        p.title?.toLowerCase().includes(safeQuery) ||
        p.abstract?.toLowerCase().includes(safeQuery) ||
        p.journal?.toLowerCase().includes(safeQuery) ||
        safeHostname(p.url).includes(safeQuery)
      )
    }
    if (sortBy === 'date') {
      arr.sort((a, b) => toYear(b.year) - toYear(a.year))
    }
    return arr
  }, [results, safeQuery, sortBy])

  if (!session) return null

  const total = session.results.length
  const reviewedCount = Object.values(state.reviewed).filter(Boolean).length
  const progressPct = total > 0 ? Math.round((reviewedCount / total) * 100) : 0

  const toggleReviewed = (p: Paper) => {
    const key = `${p.id}-${p.url}`
    setState((s) => {
      const reviewed = { ...s.reviewed, [key]: !s.reviewed[key] }
      const activities = [
        { id: crypto.randomUUID?.() || String(Date.now()), type: 'reviewed', sourceId: key, at: Date.now() },
        ...s.activities,
      ]
      return { ...s, reviewed, activities }
    })
  }

  const addNote = (text: string) => {
    const t = text.trim()
    if (!t) return
    setState((s) => {
      const note = { id: crypto.randomUUID?.() || String(Date.now()), text: t, at: Date.now() }
      const activities = [{ id: note.id, type: 'note', text: t, at: note.at }, ...s.activities]
      return { ...s, notes: [note, ...s.notes], activities }
    })
  }

  const topInsights = session.topics.slice(0, 2)

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className="flex-1">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/topics/library" className="text-blue-600 hover:underline">Back to Topics</Link>
              <span>/</span>
              <span className="text-gray-900">{session.query}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-3 py-1 border rounded-md hover:bg-gray-50 inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add Source</button>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Associated Sources */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-3">Associated Sources ({total})</h2>

            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search sources..."
                  className="w-full px-3 py-2 pr-9 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-2 py-2 border rounded-md text-sm">
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
              </select>
            </div>

            <div className="space-y-3">
              {(showAll ? filtered : filtered.slice(0, 10)).map((p) => {
                const key = `${p.id}-${p.url}`
                const isReviewed = !!state.reviewed[key]
                return (
                  <Card key={key} className={isReviewed ? 'border-green-300' : ''}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 flex items-start gap-2">
                          {p.title}
                          <ExternalLink className="w-4 h-4 mt-1 text-gray-400" />
                        </a>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-gray-600">
                      {p.abstract && <p className="line-clamp-2 mb-2">{p.abstract}</p>}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {p.journal && <span>{p.journal}</span>}
                        {p.year && <span>{p.year}</span>}
                        {p.source && <span className="uppercase">{p.source}</span>}
                        {p.url && <span>{safeHostname(p.url)}</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <button onClick={() => toggleReviewed(p)} className={`text-xs inline-flex items-center gap-1 ${isReviewed ? 'text-green-700' : 'text-gray-700'} hover:underline`}>
                          <Eye className="w-3 h-3" /> {isReviewed ? 'Reviewed' : 'Mark Reviewed'}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {filtered.length > 10 && (
              <div className="mt-3">
                <button className="text-sm text-blue-600 hover:underline" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'Show less' : 'Show all sources'}
                </button>
              </div>
            )}

            {/* Notes & Tags */}
            <div className="mt-8">
              <h3 className="text-md font-semibold mb-2">User Notes & Tags</h3>
              <NotesEditor onAdd={addNote} />
              <div className="mt-3 space-y-2">
                {state.notes.length === 0 ? (
                  <div className="text-sm text-gray-500">No notes yet.</div>
                ) : (
                  state.notes.map((n) => (
                    <div key={n.id} className="text-sm text-gray-700">“{n.text}” <span className="text-gray-400">— {new Date(n.at).toLocaleString()}</span></div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Rail */}
          <aside className="lg:col-span-1">
            <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Research Progress</div>
              <div className="text-xs text-gray-600 mb-2">TASK IN PROGRESS</div>
              <Progress value={progressPct} className="h-2" />
              <div className="mt-2 text-sm text-gray-600">You have reviewed {reviewedCount} out of {total} sources for this topic.</div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Key Insights</div>
              {topInsights.length === 0 ? (
                <div className="text-sm text-gray-500">Insights will appear after analysis.</div>
              ) : (
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {topInsights.map((t, i) => (<li key={i}>{t}</li>))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Activity Timeline</div>
              <div className="space-y-2 text-sm text-gray-700">
                {state.activities.length === 0 ? (
                  <div className="text-gray-500">No activity yet.</div>
                ) : (
                  state.activities.slice(0, 10).map((a) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <span>•</span>
                      <div>
                        <div className="text-gray-900">{a.type === 'reviewed' ? 'Source reviewed' : 'Note added'}</div>
                        <div className="text-gray-500 text-xs">{new Date(a.at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function NotesEditor({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("")
  return (
    <div className="border rounded-md p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a note..."
        className="w-full min-h-[80px] resize-y focus:outline-none"
      />
      <div className="flex items-center justify-end mt-2">
        <button
          onClick={() => { onAdd(text); setText("") }}
          className="px-3 py-1 border rounded-md hover:bg-gray-50 text-sm"
        >
          Add Note
        </button>
      </div>
    </div>
  )
}
