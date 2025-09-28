import { useCallback, useMemo, useRef, useState } from 'react'

export type TopicsFindEvent = 'init' | 'progress' | 'sources' | 'metrics' | 'insights' | 'clusters' | 'done' | 'error' | 'ping'

export interface TopicsFindItem {
  title: string
  url: string
  snippet?: string
  source: string
  year?: number | string
}

export interface TopicsFindMetrics {
  relevance: number
  diversity: number
  coverage: number
  sources: number
}

export interface TopicsCluster {
  id: string
  label: string
  size: number
  indices: number[]
}

export interface UseTopicsFindState {
  query?: string
  items: TopicsFindItem[]
  metrics?: TopicsFindMetrics
  topics: string[]
  clusters?: TopicsCluster[]
  progress?: { message?: string; total?: number }
  isLoading: boolean
  error: string | null
  startedAt?: number
  finishedAt?: number
  done: boolean
}

export interface StartTopicsFindParams {
  q: string
  limit?: number
  quality?: 'Standard' | 'Enhanced'
}

export interface UseTopicsFindOptions {
  onEvent?: (event: { type: TopicsFindEvent; payload: any }) => void
}

export function useTopicsFind(options: UseTopicsFindOptions = {}) {
  const { onEvent } = options

  const [state, setState] = useState<UseTopicsFindState>({
    query: undefined,
    items: [],
    metrics: undefined,
    topics: [],
    clusters: [],
    progress: undefined,
    isLoading: false,
    error: null,
    startedAt: undefined,
    finishedAt: undefined,
    done: false,
  })

  const esRef = useRef<EventSource | null>(null)

  const closeCurrent = useCallback(() => {
    if (esRef.current) {
      try { esRef.current.close() } catch {}
      esRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    closeCurrent()
    setState({
      query: undefined,
      items: [],
      metrics: undefined,
      topics: [],
      clusters: [],
      progress: undefined,
      isLoading: false,
      error: null,
      startedAt: undefined,
      finishedAt: undefined,
      done: false,
    })
  }, [closeCurrent])

  const start = useCallback(async ({ q, limit = 20, quality = 'Standard' }: StartTopicsFindParams) => {
    const query = (q || '').trim()
    if (query.length < 3) {
      setState((s) => ({ ...s, error: 'Query must be at least 3 characters', isLoading: false }))
      return
    }

    closeCurrent()

    setState({
      query,
      items: [],
      metrics: undefined,
      topics: [],
      progress: { message: 'Starting…' },
      isLoading: true,
      error: null,
      startedAt: Date.now(),
      finishedAt: undefined,
      done: false,
    })

    const params = new URLSearchParams()
    params.set('q', query)
    params.set('limit', String(Math.max(10, Math.min(30, limit))))
    params.set('quality', quality)

    // Attach access_token for SSE auth (EventSource limitation)
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      const sess = await supabase.auth.getSession()
      const token = sess.data.session?.access_token
      if (token) params.set('access_token', token)
    } catch {}

    const url = `/api/topics/find/stream?${params.toString()}`
    const es = new EventSource(url, { withCredentials: true })
    esRef.current = es

    const handleEvent = (type: TopicsFindEvent, payload: any) => {
      if (onEvent) {
        try { onEvent({ type, payload }) } catch {}
      }

      setState((prev) => {
        switch (type) {
          case 'init':
            return { ...prev, progress: { message: 'Finding sources…' } }
          case 'progress':
            return { ...prev, progress: { message: payload?.message, total: payload?.total } }
          case 'sources': {
            const item = payload?.item as TopicsFindItem
            return item ? { ...prev, items: [...prev.items, item] } : prev
          }
          case 'metrics':
            return { ...prev, metrics: payload as TopicsFindMetrics }
          case 'insights': {
            const topics = Array.isArray(payload?.topics) ? (payload.topics as string[]) : []
            return { ...prev, topics }
          }
          case 'clusters': {
            const clusters = Array.isArray(payload?.clusters) ? (payload.clusters as TopicsCluster[]) : []
            return { ...prev, clusters }
          }
          case 'error':
            return { ...prev, isLoading: false, error: payload?.error || 'Streaming error', done: true, finishedAt: Date.now() }
          case 'done':
            return { ...prev, isLoading: false, done: true, finishedAt: Date.now(), progress: { message: 'Completed', total: payload?.total } }
          default:
            return prev
        }
      })

      if (type === 'done' || type === 'error') {
        try { es.close() } catch {}
        esRef.current = null
      }
    }

    // Named listeners
    es.addEventListener('init', (e) => handleEvent('init', safeParse((e as MessageEvent).data)))
    es.addEventListener('progress', (e) => handleEvent('progress', safeParse((e as MessageEvent).data)))
    es.addEventListener('sources', (e) => handleEvent('sources', safeParse((e as MessageEvent).data)))
    es.addEventListener('metrics', (e) => handleEvent('metrics', safeParse((e as MessageEvent).data)))
    es.addEventListener('insights', (e) => handleEvent('insights', safeParse((e as MessageEvent).data)))
    es.addEventListener('clusters', (e) => handleEvent('clusters', safeParse((e as MessageEvent).data)))
    es.addEventListener('done', (e) => handleEvent('done', safeParse((e as MessageEvent).data)))
    es.addEventListener('error', (e) => handleEvent('error', safeParse((e as MessageEvent).data)))
    es.addEventListener('ping', (e) => handleEvent('ping', safeParse((e as MessageEvent).data)))

    // Fallback
    es.onmessage = (e) => {
      const data = safeParse(e.data)
      const type = data?.type as TopicsFindEvent | undefined
      if (type) handleEvent(type, data)
    }

    es.onerror = () => {
      setState((prev) => ({ ...prev, isLoading: false, error: prev.error || 'Connection error', done: true, finishedAt: Date.now() }))
      try { es.close() } catch {}
      esRef.current = null
    }
  }, [closeCurrent, onEvent])

  const stop = useCallback(() => {
    closeCurrent()
    setState((prev) => ({ ...prev, isLoading: false, done: true, finishedAt: Date.now() }))
  }, [closeCurrent])

  const elapsedMs = useMemo(() => (state.startedAt ? (state.finishedAt || Date.now()) - state.startedAt : 0), [state.startedAt, state.finishedAt])

  return {
    ...state,
    start,
    stop,
    reset,
    isStreaming: state.isLoading && !state.done,
    elapsedMs,
  }
}

function safeParse(s: string) {
  try { return s ? JSON.parse(s) : null } catch { return null }
}
