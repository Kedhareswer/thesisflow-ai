import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { LiteratureSearchService } from '@/lib/services/literature-search.service'
import { enhancedAIService } from '@/lib/enhanced-ai-service'
import { embedText, kmeans, topTokens, densityClusters } from '@/lib/utils/simple-embed-cluster'

function sseStream(signal: AbortSignal, handler: (send: (event: string, data: any) => void, close: () => void) => Promise<void>) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }
      const close = () => controller.close()

      const ping = setInterval(() => {
        try { send('ping', { ts: Date.now() }) } catch {}
      }, 15000)

      const onAbort = () => {
        clearInterval(ping)
        try { controller.close() } catch {}
      }
      signal.addEventListener('abort', onAbort)

      try {
        await handler(send, close)
      } catch (e) {
        send('error', { error: e instanceof Error ? e.message : String(e) })
      } finally {
        clearInterval(ping)
        signal.removeEventListener('abort', onAbort)
        try { controller.close() } catch {}
      }
    }
  })
  return stream
}

function computeMetrics(query: string, items: Array<{ title?: string; url?: string; snippet?: string }>) {
  const sources = items.length
  const domains = new Set<string>()
  for (const it of items) {
    try {
      if (it.url) domains.add(new URL(it.url).hostname.replace(/^www\./, ''))
    } catch {}
  }
  const diversity = sources > 0 ? Math.min(1, domains.size / Math.max(5, Math.floor(sources / 2))) : 0
  const tokens = (query || '').toLowerCase().split(/\s+/).filter(t => t.length > 2)
  const relevance = (() => {
    if (tokens.length === 0 || sources === 0) return 0.6
    const per = items.map((r) => {
      const t = (r.title || '').toLowerCase()
      const m = tokens.reduce((acc, tok) => acc + (t.includes(tok) ? 1 : 0), 0)
      return Math.min(1, m / Math.min(5, tokens.length))
    })
    const avg = per.reduce((a, b) => a + b, 0) / per.length
    return 0.6 + 0.4 * avg
  })()
  const coverage = Math.min(1, sources / 20)
  return { relevance, diversity, coverage, sources }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, 'topics-find')
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(30, Math.max(10, parseInt(searchParams.get('limit') || '20', 10) || 20))
    const quality = (searchParams.get('quality') || 'Standard') as 'Standard' | 'Enhanced'

    if (!q) {
      return new Response('Missing q', { status: 400 })
    }

    const stream = sseStream(request.signal, async (send, close) => {
      send('init', { ok: true, ts: Date.now(), query: q, limit, quality })

      const items: Array<{ title: string; url: string; snippet?: string; source: string; year?: number | string }> = []
      const lit = new LiteratureSearchService()

      await lit.streamPapers(
        q,
        limit,
        (p) => {
          const it = { title: p.title || p.url || 'Untitled', url: p.url, snippet: p.abstract || '', source: p.source, year: (p as any).year }
          items.push(it)
          send('sources', { item: it })
          if (items.length % 5 === 0) send('progress', { message: `Collected ${items.length} sources…`, total: items.length })
        },
        (src, err) => send('progress', { message: `Warning from ${src}: ${err}` })
      )

      // Compute metrics and emit
      const metrics = computeMetrics(q, items)
      send('metrics', metrics)

      // Compute clusters (lightweight, no external deps)
      try {
        const vectors = items.map((it) => embedText(it.title, it.snippet))
        const n = vectors.length
        if (n >= 6) {
          const k = Math.max(2, Math.min(8, Math.round(Math.sqrt(n / 2)) || 2))
          const { labels } = kmeans(vectors, k)
          const groups: number[][] = Array.from({ length: k }, () => [])
          for (let i = 0; i < labels.length; i++) groups[labels[i]].push(i)
          let clusters = groups
            .filter((g) => g.length >= 2)
            .map((idxs, i) => {
              const texts = idxs.map((ix) => items[ix].title)
              const tokens = topTokens(texts, 3)
              const label = tokens.length ? tokens.join(', ') : `Cluster ${i + 1}`
              return { id: `c${i}`, label, size: idxs.length, indices: idxs }
            })

          // Fallback density-based clustering if k-means groups are insufficient
          if (clusters.length < 2) {
            const comps = densityClusters(vectors, 0.84, 2)
            clusters = comps.map((idxs, i) => {
              const texts = idxs.map((ix) => items[ix].title)
              const tokens = topTokens(texts, 3)
              const label = tokens.length ? tokens.join(', ') : `Group ${i + 1}`
              return { id: `d${i}`, label, size: idxs.length, indices: idxs }
            })
          }
          if (clusters.length) {
            send('clusters', { clusters })
            send('progress', { message: `Clustering complete (${clusters.length} groups)`, total: n })
          }
        }
      } catch (e) {
        // Best-effort; silently continue on clustering failure
      }

      // Extract topics (best-effort) using user-configured providers via EnhancedAIService
      try {
        const top = items.slice(0, Math.min(30, items.length))
        const mini = top.map((p) => ({ title: p.title, abstract: p.snippet || '' }))
        const prompt = `Extract 10-20 concise research topics from the following papers.\nReturn as a JSON array of strings.\n\n${mini.map((m, i) => `[${i + 1}] ${m.title}\n${m.abstract.slice(0, 500)}`).join('\n\n')}`
        const result = await enhancedAIService.generateText({ prompt, maxTokens: 2000, temperature: 0.2, userId: user.id })
        if (result.success && result.content) {
          let topics: string[] = []
          try {
            const firstJson = result.content.match(/\[[\s\S]*\]/)
            topics = firstJson ? JSON.parse(firstJson[0]) : []
          } catch {
            topics = []
          }
          if (Array.isArray(topics) && topics.length) {
            send('insights', { topics: topics.slice(0, 20) })
          } else {
            send('insights', { topics: [] })
          }
        } else {
          send('insights', { topics: [] })
        }
      } catch (e) {
        send('insights', { topics: [] })
      }

      send('done', { total: items.length })
      close()
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e: any) {
    const message = e instanceof Error ? e.message : 'Server error'
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: message.includes('Authentication') ? 401 : 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
