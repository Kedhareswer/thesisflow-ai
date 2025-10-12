import { EventEmitter } from 'events'

// Lightweight per-job event bus for SSE bridge
// In prod, back this with Redis Pub/Sub or database notifications

const emitters = new Map<string, EventEmitter>()

export type TrendsEventType =
  | 'init'
  | 'progress'
  | 'collector'
  | 'item'
  | 'metrics'
  | 'clusters'
  | 'trends'
  | 'timeline'
  | 'report'
  | 'error'
  | 'done'
  | 'ping'

export function getEmitter(jobId: string) {
  let e = emitters.get(jobId)
  if (!e) {
    e = new EventEmitter()
    e.setMaxListeners(50)
    emitters.set(jobId, e)
  }
  return e
}

export function emitEvent(jobId: string, type: TrendsEventType, payload: any) {
  const e = getEmitter(jobId)
  e.emit(type, payload)
}

export function subscribe(jobId: string, handler: (type: TrendsEventType, payload: any) => void) {
  const e = getEmitter(jobId)
  const listener = (t: TrendsEventType) => (data: any) => handler(t, data)
  const listeners = {
    init: listener('init'),
    progress: listener('progress'),
    collector: listener('collector'),
    item: listener('item'),
    metrics: listener('metrics'),
    clusters: listener('clusters'),
    trends: listener('trends'),
    timeline: listener('timeline'),
    report: listener('report'),
    error: listener('error'),
    done: listener('done'),
    ping: listener('ping'),
  }
  for (const [k, fn] of Object.entries(listeners)) e.on(k, fn as any)
  return () => {
    for (const [k, fn] of Object.entries(listeners)) e.off(k, fn as any)
  }
}
