import { useCallback, useMemo, useRef, useState } from 'react'
import type { AIProvider } from '@/lib/ai-providers'

export type DeepSearchEventType = 'info' | 'result' | 'warn' | 'progress' | 'summary' | 'notice' | 'done' | 'error'

export interface DeepSearchItem {
  title: string
  url: string
  snippet?: string
  source: string
  kind?: 'web' | 'scholar' | 'docs' | 'news'
  score?: number
  publishedDate?: string
}

export interface DeepSearchProgress {
  message?: string
  total?: number
}

export interface DeepSearchWarning {
  source?: string
  error: string
}

export interface UseDeepSearchState {
  items: DeepSearchItem[]
  summary?: string
  notices: string[]
  warnings: DeepSearchWarning[]
  infos: string[]
  progress?: DeepSearchProgress
  isLoading: boolean
  error: string | null
  startedAt?: number
  finishedAt?: number
  done: boolean
  provider?: AIProvider
  model?: string
}

export interface StartDeepSearchParams {
  query: string
  provider?: AIProvider
  model?: string
  limit?: number
}

export interface UseDeepSearchOptions {
  onEvent?: (event: { type: DeepSearchEventType; payload: any }) => void
}

export function useDeepSearch(options: UseDeepSearchOptions = {}) {
  const { onEvent } = options

  const [state, setState] = useState<UseDeepSearchState>({
    items: [],
    summary: undefined,
    notices: [],
    warnings: [],
    infos: [],
    progress: undefined,
    isLoading: false,
    error: null,
    startedAt: undefined,
    finishedAt: undefined,
    done: false,
    provider: undefined,
    model: undefined,
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
      items: [],
      summary: undefined,
      notices: [],
      warnings: [],
      infos: [],
      progress: undefined,
      isLoading: false,
      error: null,
      startedAt: undefined,
      finishedAt: undefined,
      done: false,
      provider: undefined,
      model: undefined,
    })
  }, [closeCurrent])

  const start = useCallback(async ({ query, provider, model, limit = 20 }: StartDeepSearchParams) => {
    const q = (query || '').trim()
    if (q.length < 3) {
      setState((s) => ({ ...s, error: 'Query must be at least 3 characters', isLoading: false }))
      return
    }

    // Abort/close any existing stream
    closeCurrent()

    // Initialize state
    setState({
      items: [],
      summary: undefined,
      notices: [],
      warnings: [],
      infos: [],
      progress: { message: 'Starting ThesisFlow-AI Deep Search…' },
      isLoading: true,
      error: null,
      startedAt: Date.now(),
      finishedAt: undefined,
      done: false,
      provider,
      model,
    })

    const params = new URLSearchParams()
    params.set('q', q)
    params.set('limit', String(Math.max(5, Math.min(50, limit || 20))))
    if (provider) params.set('provider', provider)
    if (model) params.set('model', model)

    // Attach access_token for SSE auth. We cannot set custom headers on EventSource
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      const sess = await supabase.auth.getSession()
      const token = sess.data.session?.access_token
      if (token) params.set('access_token', token)
    } catch {}

    const url = `/api/deep-search?${params.toString()}`
    const es = new EventSource(url, { withCredentials: true })
    esRef.current = es

    es.onmessage = (e: MessageEvent) => {
      let data: any
      try {
        data = JSON.parse(e.data)
      } catch {
        // Unknown payload, ignore
        return
      }

      const type = data?.type as DeepSearchEventType | undefined
      if (!type) return

      if (onEvent) {
        try { onEvent({ type, payload: data }) } catch {}
      }

      setState((prev) => {
        switch (type) {
          case 'info':
            return { ...prev, infos: [...prev.infos, data.message || ''] }
          case 'result': {
            const item = data.item as DeepSearchItem
            return { ...prev, items: item ? [...prev.items, item] : prev.items }
          }
          case 'warn': {
            const w: DeepSearchWarning = { source: data.source, error: data.error || 'Warning' }
            return { ...prev, warnings: [...prev.warnings, w] }
          }
          case 'progress':
            return { ...prev, progress: { message: data.message, total: data.total } }
          case 'summary':
            return { ...prev, summary: data.content as string }
          case 'notice':
            return { ...prev, notices: [...prev.notices, data.message || ''] }
          case 'done': {
            return {
              ...prev,
              isLoading: false,
              done: true,
              finishedAt: Date.now(),
              progress: { message: 'Completed', total: data.total },
            }
          }
          case 'error':
            return { ...prev, isLoading: false, error: data.error || 'Deep Search error', done: true, finishedAt: Date.now() }
          default:
            return prev
        }
      })

      // Auto-close on done
      if (type === 'done' || type === 'error') {
        try { es.close() } catch {}
        esRef.current = null
      }
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
