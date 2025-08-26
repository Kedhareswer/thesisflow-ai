import type { AIProvider } from "@/lib/ai-providers"

export type RecentChat = {
  id: string
  query: string
  provider?: AIProvider
  model?: string
  deep?: boolean
  ts: number
}

const STORAGE_KEY = "recentChats:v1"
const MAX_CHATS = 20

function safeRead(): RecentChat[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as RecentChat[]
    if (!Array.isArray(arr)) return []
    return arr.filter((x) => x && typeof x.query === "string" && typeof x.ts === "number")
  } catch {
    return []
  }
}

function safeWrite(list: RecentChat[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_CHATS)))
  } catch {}
}

export function getRecentChats(limit = 10): RecentChat[] {
  const list = safeRead()
  return list
    .sort((a, b) => b.ts - a.ts)
    .slice(0, Math.max(1, Math.min(limit, MAX_CHATS)))
}

export function addRecentChat(entry: { query: string; provider?: AIProvider; model?: string; deep?: boolean; ts?: number }) {
  const ts = typeof entry.ts === "number" ? entry.ts : Date.now()
  const id = `${ts}-${Math.random().toString(36).slice(2, 8)}`
  const next: RecentChat = { id, query: entry.query.trim(), provider: entry.provider, model: entry.model, deep: entry.deep, ts }
  if (!next.query) return

  const list = safeRead()
  // de-dup by same query+provider+model (keep latest)
  const filtered = list.filter(
    (c) => !(c.query === next.query && c.provider === next.provider && c.model === next.model && c.deep === next.deep)
  )
  const merged = [next, ...filtered].sort((a, b) => b.ts - a.ts).slice(0, MAX_CHATS)
  safeWrite(merged)
}

export function clearRecentChats() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
