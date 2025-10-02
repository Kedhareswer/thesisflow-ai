"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { listSessions, deleteSession, type TopicsSession } from "@/lib/services/topics-session.store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Trash2, ExternalLink } from "lucide-react"

export default function TopicsLibraryPage() {
  const [q, setQ] = useState("")
  const [sessions, setSessions] = useState<TopicsSession[]>(() => listSessions())

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return sessions
    return sessions.filter((s) =>
      s.query.toLowerCase().includes(term) ||
      s.topics.some((t) => t.toLowerCase().includes(term))
    )
  }, [q, sessions])

  const onDelete = (id: string) => {
    deleteSession(id)
    setSessions(listSessions())
  }

  const pct = (n?: number) => `${Math.round((n || 0) * 100)}%`

  return (
    <div className="min-h-screen bg-white px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Topics & Sources</h1>
        <div className="flex items-center gap-3">
          <Link href="/topics" className="px-3 py-2 border rounded-md hover:bg-gray-50">+ New Research</Link>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative max-w-xl w-full">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search topics or sources..."
            className="w-full px-4 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-gray-500">No saved research sessions. Run a search on the Find Topics page.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base leading-6">{s.query}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Link href={`/topics/${s.id}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      View <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-gray-600">
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                  <span>{s.metrics?.sources ?? s.results.length} Sources</span>
                  <span>{pct(s.metrics?.relevance)} Relevance</span>
                </div>
                {s.topics.length > 0 && (
                  <div className="text-sm text-gray-700 line-clamp-2 mb-2">
                    Key themes: {s.topics.slice(0, 3).join(", ")}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {s.topics.slice(0, 2).map((t) => (
                    <Badge key={t} variant="secondary" className="rounded-full">{t}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <button
                    className="text-xs text-red-600 hover:underline inline-flex items-center gap-1"
                    onClick={() => onDelete(s.id)}
                    title="Delete session"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
