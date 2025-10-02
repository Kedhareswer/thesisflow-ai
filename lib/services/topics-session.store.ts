"use client"

// Lightweight client-side session store for Topics v2
// Persists the latest sessions in localStorage for the Library and Detail views.

import type { Paper } from "@/hooks/use-literature-search"

export interface TopicsSession {
  id: string
  query: string
  createdAt: number
  quality: "Standard" | "Enhanced" | "Deep" | string
  results: Paper[]
  topics: string[]
  metrics?: {
    relevance: number
    diversity: number
    coverage: number
    sources: number
  }
}

const KEY = "thesisflow_topics_sessions_v2"

function readAll(): TopicsSession[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeAll(sessions: TopicsSession[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, 50))) // cap to last 50
  } catch {}
}

export function upsertSession(session: TopicsSession) {
  const all = readAll()
  const idx = all.findIndex((s) => s.id === session.id)
  if (idx >= 0) all[idx] = session
  else all.unshift(session)
  writeAll(all)
}

export function listSessions(): TopicsSession[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt)
}

export function getSession(id: string): TopicsSession | undefined {
  return readAll().find((s) => s.id === id)
}

export function deleteSession(id: string) {
  const filtered = readAll().filter((s) => s.id !== id)
  writeAll(filtered)
}

export function clearSessions() {
  writeAll([])
}

// Helpers to compute lightweight metrics from available client data
export function computeMetrics(query: string, results: Paper[]) {
  const sources = results.length
  const diversity = (() => {
    const domains = new Set(
      results
        .map((r) => safeHostname(r.url))
        .filter(Boolean)
    )
    if (sources === 0) return 0
    return Math.min(1, domains.size / Math.max(5, Math.floor(sources / 2)))
  })()

  const relevance = (() => {
    const tokens = (query || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2)
    if (tokens.length === 0 || sources === 0) return 0.6
    const per = results.map((r) => {
      const t = (r.title || "").toLowerCase()
      const m = tokens.reduce((acc, tok) => acc + (t.includes(tok) ? 1 : 0), 0)
      return Math.min(1, m / Math.min(5, tokens.length))
    })
    const avg = per.reduce((a, b) => a + b, 0) / per.length
    return 0.6 + 0.4 * avg // bias to mid-high to avoid pessimism
  })()

  const coverage = Math.min(1, sources / 20)

  return { relevance, diversity, coverage, sources }
}

export function safeHostname(u?: string) {
  try {
    if (!u) return ""
    const h = new URL(u).hostname.replace(/^www\./, "")
    return h
  } catch {
    return ""
  }
}
