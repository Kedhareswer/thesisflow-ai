import { NextRequest, NextResponse } from 'next/server'
import { withTokenValidation } from '@/lib/middleware/token-middleware'
import { getTrendsJob } from '@/lib/services/trends-job.store'
import { getEmitter } from '@/lib/services/trends-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = withTokenValidation(
  'trends_job_events',
  async (userId: string, request: NextRequest): Promise<NextResponse> => {
    try {
      const url = new URL(request.url)
      const id = url.pathname.split('/').filter(Boolean).slice(-2, -1)[0] // /api/trends/jobs/:id/events
      if (!id) return new NextResponse('Missing job id', { status: 400 })
      const job = getTrendsJob(id)
      if (!job) return new NextResponse('Job not found', { status: 404 })
      if (job.userId !== userId) return new NextResponse('Forbidden', { status: 403 })

      const encoder = new TextEncoder()
      let closed = false

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const send = (event: string, data: any) => {
            if (closed) return
            controller.enqueue(encoder.encode(`event: ${event}\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          }

          // Initial snapshot events
          send('init', { jobId: job.id, status: job.status, stage: job.stage, progress: job.progress })
          if (job.metrics) send('metrics', job.metrics)
          if (Array.isArray(job.clusters)) send('clusters', { clusters: job.clusters })
          if (Array.isArray(job.timeline)) send('timeline', { timeline: job.timeline })
          if (Array.isArray(job.items)) {
            for (const it of job.items.slice(0, 50)) send('item', { item: it })
          }

          const emitter = getEmitter(id)
          const on = (type: string) => (payload: any) => send(type, payload)
          const listeners: Array<[string, any]> = [
            ['init', on('init')],
            ['progress', on('progress')],
            ['collector', on('collector')],
            ['item', on('item')],
            ['metrics', on('metrics')],
            ['clusters', on('clusters')],
            ['trends', on('trends')],
            ['timeline', on('timeline')],
            ['report', on('report')],
            ['error', on('error')],
            ['done', on('done')],
          ]
          for (const [evt, fn] of listeners) emitter.on(evt, fn)

          const interval = setInterval(() => { send('ping', { ts: Date.now() }) }, 15000)

          const abort = () => {
            if (closed) return
            closed = true
            clearInterval(interval)
            for (const [evt, fn] of listeners) emitter.off(evt, fn)
            try { controller.close() } catch {}
          }

          request.signal.addEventListener('abort', abort)
        },
        cancel() {
          closed = true
        }
      })

      return new NextResponse(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      })
    } catch (e) {
      return new NextResponse('Server error', { status: 500 })
    }
  },
  { context: { origin: 'trends', feature: 'events' }, requiredTokens: 0, skipDeduction: true }
)
