import type { AIProvider } from "@/lib/ai-providers"

export type BuilderProject = {
  id: string
  key: string
  title: string
  query: string
  want?: string
  use?: string[]
  make: string[]
  provider?: AIProvider
  model?: string
  html: string
  css: string
  ts: number
}

const STORAGE_KEY = "builderProjects:v1"
const MAX_ITEMS = 20

export function computeKey(input: { query: string; want?: string; use?: string[]; make: string[] }) {
  const useKey = (input.use || []).slice().sort().join("|")
  const makeKey = (input.make || []).slice().sort().join("|")
  return [input.query.trim(), input.want || "", useKey, makeKey].join("::")
}

function safeRead(): BuilderProject[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as BuilderProject[]
    if (!Array.isArray(arr)) return []
    return arr.filter((x) => x && typeof x.key === "string" && typeof x.ts === "number")
  } catch {
    return []
  }
}

function safeWrite(list: BuilderProject[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {}
}

export function getRecentProjects(limit = 10): BuilderProject[] {
  const list = safeRead()
  return list.sort((a, b) => b.ts - a.ts).slice(0, Math.max(1, Math.min(limit, MAX_ITEMS)))
}

export function upsertProject(input: Omit<BuilderProject, "id" | "key" | "ts"> & { ts?: number }) {
  const key = computeKey({ query: input.query, want: input.want, use: input.use, make: input.make })
  const ts = typeof input.ts === "number" ? input.ts : Date.now()
  const list = safeRead()
  const idx = list.findIndex((p) => p.key === key)
  const base: BuilderProject = {
    id: idx >= 0 ? list[idx].id : `${ts}-${Math.random().toString(36).slice(2, 8)}`,
    key,
    title: input.title,
    query: input.query,
    want: input.want,
    use: input.use || [],
    make: input.make,
    provider: input.provider,
    model: input.model,
    html: input.html,
    css: input.css,
    ts,
  }
  if (idx >= 0) {
    list[idx] = base
  } else {
    list.unshift(base)
  }
  safeWrite(list.sort((a, b) => b.ts - a.ts).slice(0, MAX_ITEMS))
  return base
}

export function clearRecentProjects() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function getProjectById(id: string) {
  return safeRead().find((p) => p.id === id) || null
}

export function getProjectByKey(key: string) {
  return safeRead().find((p) => p.key === key) || null
}
