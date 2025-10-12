// Server-side in-memory store for Trends jobs.
// Note: Works reliably in a single process (dev). For production, back with Supabase/Redis.

export type TrendsJobStatus = 'queued' | 'running' | 'failed' | 'completed' | 'canceled'

export interface TrendsItem {
  id?: string
  title: string
  url: string
  source: string
  abstract?: string
  year?: number | string
  publishedAt?: string
  authors?: string[]
  doi?: string
}

export interface TrendsMetrics {
  coverage: number
  diversity: number
  relevance: number
  sources: number
  velocity?: number
  acceleration?: number
}

export interface TrendsCluster {
  id: string
  label: string
  size: number
  indices: number[]
  score?: number
}

export interface TrendsJob {
  id: string
  userId: string
  query: string
  timeframeMonths: number
  quality: 'Standard' | 'Enhanced'
  status: TrendsJobStatus
  stage?: string
  progress?: number
  createdAt: number
  startedAt?: number
  finishedAt?: number
  error?: string
  items: TrendsItem[]
  clusters?: TrendsCluster[]
  metrics?: TrendsMetrics
  timeline?: Array<{ period: string; count: number }>
  report?: { markdown?: string; html?: string; wordCount?: number }
}

const jobs = new Map<string, TrendsJob>()

function makeId() {
  // crypto.randomUUID in Node 18+
  try { return (global as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}` } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}` }
}

export function createTrendsJob(params: { userId: string; query: string; timeframeMonths?: number; quality?: 'Standard' | 'Enhanced' }): TrendsJob {
  const id = makeId()
  const job: TrendsJob = {
    id,
    userId: params.userId,
    query: params.query.trim(),
    timeframeMonths: Math.max(1, Math.min(24, params.timeframeMonths || 12)),
    quality: params.quality || 'Standard',
    status: 'queued',
    createdAt: Date.now(),
    items: [],
  }
  jobs.set(id, job)
  return job
}

export function getTrendsJob(id: string): TrendsJob | undefined {
  return jobs.get(id)
}

export function updateTrendsJob(id: string, patch: Partial<TrendsJob>) {
  const j = jobs.get(id)
  if (!j) return
  const next = { ...j, ...patch }
  jobs.set(id, next)
}

export function appendJobItem(id: string, item: TrendsItem) {
  const j = jobs.get(id)
  if (!j) return
  j.items.push(item)
}

export function listJobsByUser(userId: string): TrendsJob[] {
  return Array.from(jobs.values()).filter(j => j.userId === userId).sort((a,b) => (b.createdAt - a.createdAt))
}
