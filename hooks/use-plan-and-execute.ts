"use client"

import { useCallback, useMemo, useRef, useState } from "react"

export type PlanExecuteEventType =
  | "init"
  | "plan"
  | "progress"
  | "done"
  | "error"
  | "ping"
  | "deep_progress"
  | "deep_research_complete"

export interface PlanProgress {
  message?: string
  overallProgress?: number
  isComplete?: boolean
  totalTasks?: number
}

export interface UsePlanAndExecuteState {
  plan: any | null
  infos: string[]
  warnings: string[]
  logs: string[]
  lastEvent?: PlanExecuteEventType
  progress?: PlanProgress
  isStreaming: boolean
  error: string | null
  startedAt?: number
  finishedAt?: number
}

export interface StartPlanParams {
  userQuery: string
  selectedTools?: string[]
  useDeepResearch?: boolean
  maxIterations?: number
  description?: string
  maxTasks?: number
}

export interface UsePlanAndExecuteOptions {
  onEvent?: (event: { type: PlanExecuteEventType; payload: any }) => void
}

export function usePlanAndExecute(options: UsePlanAndExecuteOptions = {}) {
  const { onEvent } = options

  const [state, setState] = useState<UsePlanAndExecuteState>({
    plan: null,
    infos: [],
    warnings: [],
    logs: [],
    lastEvent: undefined,
    progress: undefined,
    isStreaming: false,
    error: null,
    startedAt: undefined,
    finishedAt: undefined,
  })

  const abortRef = useRef<AbortController | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const reset = useCallback(() => {
    if (abortRef.current) {
      try { abortRef.current.abort() } catch {}
      abortRef.current = null
    }
    if (esRef.current) {
      try { esRef.current.close() } catch {}
      esRef.current = null
    }
    setState({
      plan: null,
      infos: [],
      warnings: [],
      logs: [],
      lastEvent: undefined,
      progress: undefined,
      isStreaming: false,
      error: null,
      startedAt: undefined,
      finishedAt: undefined,
    })
  }, [])

  const stop = useCallback(() => {
    if (abortRef.current) {
      try { abortRef.current.abort() } catch {}
      abortRef.current = null
    }
    if (esRef.current) {
      try { esRef.current.close() } catch {}
      esRef.current = null
    }
    setState((s) => ({ ...s, isStreaming: false, finishedAt: Date.now() }))
  }, [])

  const start = useCallback(async ({
    userQuery,
    selectedTools = [],
    useDeepResearch = false,
    maxIterations = 4,
    description,
    maxTasks,
  }: StartPlanParams) => {
    const q = (userQuery || "").trim()
    if (q.length < 3) {
      setState((s) => ({ ...s, error: "Query must be at least 3 characters", isStreaming: false }))
      return
    }

    // Abort any previous stream
    if (abortRef.current) {
      try { abortRef.current.abort() } catch {}
      abortRef.current = null
    }

    const controller = new AbortController()
    abortRef.current = controller

    setState({
      plan: null,
      infos: [],
      warnings: [],
      logs: ["Starting plan-and-execute stream…"],
      lastEvent: undefined,
      progress: { message: "Initializing…", overallProgress: 0 },
      isStreaming: true,
      error: null,
      startedAt: Date.now(),
      finishedAt: undefined,
    })

    try {
      // Try GET + EventSource first for robust streaming
      let token: string | undefined
      try {
        const { supabase } = await import("@/integrations/supabase/client")
        const sess = await supabase.auth.getSession()
        token = sess.data.session?.access_token || undefined
      } catch {}

      const usp = new URLSearchParams()
      usp.set('userQuery', q)
      if (description) usp.set('description', String(description))
      if (typeof maxTasks === 'number') usp.set('maxTasks', String(maxTasks))
      if (selectedTools && selectedTools.length) usp.set('selectedTools', selectedTools.join(','))
      usp.set('useDeepResearch', String(!!useDeepResearch))
      usp.set('maxIterations', String(maxIterations))
      if (token) usp.set('access_token', token)

      let usingEventSource = false
      try {
        const es = new EventSource(`/api/plan-and-execute/stream?${usp.toString()}`, { withCredentials: true })
        esRef.current = es
        usingEventSource = true

        const handlePayload = (type: PlanExecuteEventType, payload: any) => {
          if (onEvent) { try { onEvent({ type, payload }) } catch {} }
          setState((prev) => {
            const nextLogs = [...prev.logs]
            const addLog = (msg?: string) => { if (msg) nextLogs.push(msg) }

            switch (type) {
              case "init":
                addLog(`Tokens charged: ${payload?.tokensCharged ?? "?"} (feature: ${payload?.tokenFeature ?? "n/a"})`)
                return { ...prev, lastEvent: type, logs: nextLogs, progress: { message: "Initialized", overallProgress: 0 } }
              case "plan":
                addLog("Plan skeleton received.")
                return { ...prev, lastEvent: type, logs: nextLogs, plan: payload, progress: { ...prev.progress, message: "Plan received" } }
              case "progress":
                addLog(payload?.message || `Progress: ${payload?.overallProgress ?? ""}%`)
                return { ...prev, lastEvent: type, logs: nextLogs, progress: { message: payload?.message, overallProgress: payload?.overallProgress, isComplete: payload?.isComplete, totalTasks: payload?.totalTasks } }
              case "deep_progress":
                addLog(payload?.message || "Deep research…")
                return { ...prev, lastEvent: type, logs: nextLogs }
              case "deep_research_complete":
                addLog("Deep research complete.")
                return { ...prev, lastEvent: type, logs: nextLogs }
              case "done":
                addLog("Done.")
                try { es.close() } catch {}
                esRef.current = null
                return { ...prev, lastEvent: type, logs: nextLogs, isStreaming: false, finishedAt: Date.now(), progress: { message: "Completed", overallProgress: payload?.overallProgress, isComplete: payload?.isComplete, totalTasks: payload?.totalTasks } }
              case "error":
                addLog(`Error: ${payload?.message || "Unknown error"}`)
                try { es.close() } catch {}
                esRef.current = null
                return { ...prev, lastEvent: type, logs: nextLogs, isStreaming: false, error: payload?.message || "Unknown error", finishedAt: Date.now() }
              case "ping":
              default:
                return prev
            }
          })
        }

        es.addEventListener('init', (ev: MessageEvent) => { try { handlePayload('init', JSON.parse(ev.data)) } catch {} })
        es.addEventListener('plan', (ev: MessageEvent) => { try { handlePayload('plan', JSON.parse(ev.data)) } catch {} })
        es.addEventListener('progress', (ev: MessageEvent) => { try { handlePayload('progress', JSON.parse(ev.data)) } catch {} })
        es.addEventListener('deep_progress', (ev: MessageEvent) => { try { handlePayload('deep_progress', JSON.parse(ev.data)) } catch {} })
        es.addEventListener('deep_research_complete', (ev: MessageEvent) => { try { handlePayload('deep_research_complete', JSON.parse(ev.data)) } catch {} })
        es.addEventListener('done', (ev: MessageEvent) => { try { handlePayload('done', JSON.parse(ev.data)) } catch {} })
        es.addEventListener('error', (ev: MessageEvent) => { try { handlePayload('error', JSON.parse((ev as any).data || '{}')) } catch {} })
        es.onmessage = (ev: MessageEvent) => { // default event (e.g., deep_progress without event name)
          try {
            const payload = ev.data ? JSON.parse(ev.data) : null
            const type = (payload?.type || 'progress') as PlanExecuteEventType
            handlePayload(type, payload)
          } catch {}
        }

        // If EventSource setup succeeds, return and let events drive state
        return
      } catch {
        // If EventSource is not available or errors during setup, fall back to POST streaming
        if (usingEventSource && esRef.current) {
          try { esRef.current.close() } catch {}
          esRef.current = null
        }
      }

      // Fallback: POST + fetch streaming (existing implementation)
      let authHeader: Record<string, string> | undefined
      if (token) authHeader = { Authorization: `Bearer ${token}` }

      const res = await fetch("/api/plan-and-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeader || {}) },
        body: JSON.stringify({ userQuery: q, description, maxTasks, selectedTools, useDeepResearch, maxIterations }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed with status ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      const flushBlock = (block: string) => {
        // Parse a single SSE block (separated by \n\n)
        const lines = block.split(/\r?\n/)
        let eventName: PlanExecuteEventType | undefined
        let dataParts: string[] = []

        for (const line of lines) {
          if (!line) continue
          if (line.startsWith("event:")) {
            const v = line.slice(6).trim() as PlanExecuteEventType
            eventName = v
          } else if (line.startsWith("data:")) {
            dataParts.push(line.slice(5).trim())
          } else if (line.startsWith("retry:")) {
            // ignore here; handled by EventSource normally
          }
        }

        const dataRaw = dataParts.join("\n")
        let payload: any = null
        try {
          payload = dataRaw ? JSON.parse(dataRaw) : null
        } catch {
          // If JSON parse fails, store raw text as log
          setState((s) => ({ ...s, logs: [...s.logs, dataRaw] }))
          return
        }

        // Some server messages (deep_progress) are emitted without explicit event name
        const typeFromData = payload?.type as PlanExecuteEventType | undefined
        const type: PlanExecuteEventType | undefined = eventName || typeFromData
        if (!type) return

        if (onEvent) {
          try { onEvent({ type, payload }) } catch {}
        }

        setState((prev) => {
          const nextLogs = [...prev.logs]
          const addLog = (msg?: string) => { if (msg) nextLogs.push(msg) }

          switch (type) {
            case "init":
              addLog(`Tokens charged: ${payload?.tokensCharged ?? "?"} (feature: ${payload?.tokenFeature ?? "n/a"})`)
              return { ...prev, lastEvent: type, logs: nextLogs, progress: { message: "Initialized", overallProgress: 0 } }
            case "plan":
              addLog("Plan skeleton received.")
              return { ...prev, lastEvent: type, logs: nextLogs, plan: payload, progress: { ...prev.progress, message: "Plan received" } }
            case "progress":
              addLog(payload?.message || `Progress: ${payload?.overallProgress ?? ""}%`)
              return {
                ...prev,
                lastEvent: type,
                logs: nextLogs,
                progress: {
                  message: payload?.message,
                  overallProgress: payload?.overallProgress,
                  isComplete: payload?.isComplete,
                  totalTasks: payload?.totalTasks,
                },
              }
            case "deep_progress":
              addLog(payload?.message || "Deep research…")
              return { ...prev, lastEvent: type, logs: nextLogs }
            case "deep_research_complete":
              addLog("Deep research complete.")
              return { ...prev, lastEvent: type, logs: nextLogs }
            case "done":
              addLog("Done.")
              return { ...prev, lastEvent: type, logs: nextLogs, isStreaming: false, finishedAt: Date.now(), progress: { message: "Completed", overallProgress: payload?.overallProgress, isComplete: payload?.isComplete, totalTasks: payload?.totalTasks } }
            case "error":
              addLog(`Error: ${payload?.message || "Unknown error"}`)
              return { ...prev, lastEvent: type, logs: nextLogs, isStreaming: false, error: payload?.message || "Unknown error", finishedAt: Date.now() }
            case "ping":
              // heartbeat, ignore
              return prev
            default:
              return prev
          }
        })
      }

      // Read the stream
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // Split on double newlines for complete SSE events
        const parts = buffer.split(/\n\n/)
        buffer = parts.pop() || ""
        for (const part of parts) {
          flushBlock(part)
        }
      }

      // Flush any remaining block
      if (buffer.trim().length > 0) {
        flushBlock(buffer)
      }

      setState((s) => ({ ...s, isStreaming: false, finishedAt: Date.now() }))
    } catch (err: any) {
      if (controller.signal.aborted) return
      setState((s) => ({ ...s, isStreaming: false, error: err?.message || String(err), finishedAt: Date.now(), logs: [...s.logs, `Error: ${err?.message || String(err)}`] }))
    } finally {
      abortRef.current = null
    }
  }, [onEvent])

  const elapsedMs = useMemo(() => (state.startedAt ? (state.finishedAt || Date.now()) - state.startedAt : 0), [state.startedAt, state.finishedAt])

  return {
    ...state,
    start,
    stop,
    reset,
    elapsedMs,
  }
}
