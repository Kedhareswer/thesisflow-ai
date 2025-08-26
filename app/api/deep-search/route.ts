import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { enhancedAIService } from '@/lib/enhanced-ai-service'
import { LiteratureSearchService } from '@/lib/services/literature-search.service'
import { AI_PROVIDERS, type AIProvider } from '@/lib/ai-providers'

// Server-only helpers for external search connectors
async function googleCSE(query: string, limit = 10) {
  const key = process.env.GOOGLE_SEARCH_API_KEY
  const cx = process.env.GOOGLE_SEARCH_CSE_ID
  if (!key || !cx) return [] as any[]
  const url = new URL('https://www.googleapis.com/customsearch/v1')
  url.searchParams.set('key', key)
  url.searchParams.set('cx', cx)
  url.searchParams.set('q', query)
  url.searchParams.set('num', String(Math.min(10, Math.max(1, limit))))
  const res = await fetch(url.toString(), { headers: { 'User-Agent': 'ThesisFlow-AI/1.0' } })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  const items = Array.isArray(data?.items) ? data.items : []
  return items.map((it: any) => ({
    title: it.title || it.link,
    url: it.link,
    snippet: it.snippet || it.htmlSnippet || '',
    source: 'google-cse',
  }))
}

async function duckDuckGo(query: string, limit = 10) {
  const url = new URL('https://api.duckduckgo.com/')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('no_html', '1')
  url.searchParams.set('skip_disambig', '1')
  const res = await fetch(url.toString(), { headers: { 'User-Agent': 'ThesisFlow-AI/1.0' } })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  const results: any[] = []
  // Abstract
  if (data?.AbstractURL && data?.AbstractText) {
    results.push({
      title: data.Heading || data.AbstractURL,
      url: data.AbstractURL,
      snippet: data.AbstractText,
      source: 'duckduckgo'
    })
  }
  // RelatedTopics
  const related = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : []
  for (const r of related) {
    if (r?.FirstURL && r?.Text) {
      results.push({ title: r.Text, url: r.FirstURL, snippet: r.Text, source: 'duckduckgo' })
    } else if (Array.isArray(r?.Topics)) {
      for (const t of r.Topics) {
        if (t?.FirstURL && t?.Text) results.push({ title: t.Text, url: t.FirstURL, snippet: t.Text, source: 'duckduckgo' })
      }
    }
    if (results.length >= limit) break
  }
  return results.slice(0, limit)
}

async function tavilySearch(query: string, limit = 10) {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query, max_results: Math.min(10, Math.max(1, limit)) })
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  const items = Array.isArray(data?.results) ? data.results : []
  return items.map((it: any) => ({
    title: it.title || it.url,
    url: it.url,
    snippet: it.content || '',
    source: 'tavily'
  }))
}

function createSSEStream(
  signal: AbortSignal,
  handler: (send: (data: any) => void, close: () => void, signal: AbortSignal) => Promise<void>
) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (data: any) => {
        const chunk = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(chunk))
      }
      const close = () => controller.close()
      try {
        await handler(send, close, signal)
      } catch (e) {
        // emit error then close
        send({ type: 'error', error: e instanceof Error ? e.message : String(e) })
        controller.close()
      }
    }
  })
  return stream
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, 'deep-search')

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const provider = searchParams.get('provider') as AIProvider | null
    const model = searchParams.get('model') || undefined
    const limit = Number(searchParams.get('limit') || '20')

    if (!q) {
      return new Response(JSON.stringify({ success: false, error: 'Query (q) is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const stream = createSSEStream(request.signal, async (send, close, signal) => {
      send({ type: 'info', message: 'ThesisFlow-AI Deep Search started', ts: Date.now() })

      // Deduplication across all sources
      const seen = new Set<string>()
      const results: Array<{ title: string; url: string; snippet?: string; source: string; score?: number; kind?: 'web' | 'scholar' }> = []

      const addResult = (r: { title?: string; url?: string; snippet?: string; source: string; kind?: 'web' | 'scholar' }) => {
        const url = (r.url || '').trim()
        const title = (r.title || '').trim()
        if (!url && !title) return
        const key = (url || title).toLowerCase()
        if (seen.has(key)) return
        seen.add(key)
        const item = { title: title || url, url, snippet: r.snippet || '', source: r.source, kind: r.kind }
        results.push(item)
        send({ type: 'result', item })
      }

      // Fire searches in parallel
      const scholarly = async () => {
        try {
          const lit = new LiteratureSearchService() // no DB writes; keep server-only
          await lit.streamPapers(
            q,
            Math.min(30, Math.max(10, limit)),
            (p) => addResult({
              title: p.title,
              url: p.url,
              snippet: p.abstract,
              source: p.source,
              kind: 'scholar',
            }),
            (src, err) => send({ type: 'warn', source: src, error: err })
          )
        } catch (e) {
          send({ type: 'warn', source: 'scholarly', error: e instanceof Error ? e.message : String(e) })
        }
      }

      const webGoogle = async () => {
        try {
          const items = await googleCSE(q, Math.min(10, limit))
          for (const it of items) addResult({ ...it, kind: 'web' })
        } catch (e) {
          send({ type: 'warn', source: 'google-cse', error: e instanceof Error ? e.message : String(e) })
        }
      }

      const webDDG = async () => {
        try {
          const items = await duckDuckGo(q, Math.min(10, limit))
          for (const it of items) addResult({ ...it, kind: 'web' })
        } catch (e) {
          send({ type: 'warn', source: 'duckduckgo', error: e instanceof Error ? e.message : String(e) })
        }
      }

      const webTavily = async () => {
        try {
          const items = await tavilySearch(q, Math.min(10, limit))
          for (const it of items) addResult({ ...it, kind: 'web' })
        } catch (e) {
          send({ type: 'warn', source: 'tavily', error: e instanceof Error ? e.message : String(e) })
        }
      }

      // Launch in parallel and wait (bounded time)
      await Promise.allSettled([scholarly(), webGoogle(), webDDG(), webTavily()])

      // Basic ranking: prefer scholarly, then web; within each, by presence of snippet length
      const scored = results.map((r) => ({
        ...r,
        score: (r.kind === 'scholar' ? 2 : 1) + Math.min(1, (r.snippet?.length || 0) / 300)
      }))
      scored.sort((a, b) => (b.score || 0) - (a.score || 0))

      send({ type: 'progress', message: 'Search complete, preparing summary', total: scored.length })

      // Summarization: use selected provider/model if provided; otherwise use fallback across available keys
      let summarySent = false
      try {
        const top = scored.slice(0, Math.min(12, Math.max(5, Math.floor(limit / 2))))
        const prompt = buildSummaryPrompt(q, top)

        let result: any
        if (provider) {
          // Validate provider exists in registry (optional safety)
          if (!AI_PROVIDERS[provider]) {
            send({ type: 'notice', message: `Unknown provider '${provider}', skipping summarization.` })
          } else {
            result = await enhancedAIService.generateText({
              prompt,
              provider,
              model,
              maxTokens: 900,
              temperature: 0.3,
              userId: user.id,
            })
          }
        } else {
          // No provider specified: attempt fallback using user's valid API keys
          result = await enhancedAIService.generateTextWithFallback({
            prompt,
            maxTokens: 900,
            temperature: 0.3,
            userId: user.id,
          })
        }

        if (result && result.success && result.content) {
          // Prefer actual provider/model used (may come from fallback)
          const usedProvider = result.provider || provider || undefined
          const usedModel = result.model || model || undefined
          if (!provider && result.fallbackInfo?.finalProvider) {
            send({ type: 'info', message: `Using ${result.fallbackInfo.finalProvider} for summarization.` })
          }
          send({ type: 'summary', provider: usedProvider, model: usedModel, content: result.content })
          summarySent = true
        } else if (result && !result.success) {
          send({ type: 'notice', message: result.error || 'Summarization failed. Configure API keys in Settings.' })
        }
      } catch (e) {
        send({ type: 'notice', message: e instanceof Error ? e.message : String(e) })
      }

      send({ type: 'done', summary: summarySent, total: results.length })
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Deep Search failed'
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: message.includes('Authentication') ? 401 : 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function buildSummaryPrompt(query: string, items: Array<{ title: string; url: string; snippet?: string; source: string }>) {
  const bullets = items.map((it, i) => `- [${i + 1}] ${it.title}\n  URL: ${it.url}\n  Note: ${it.snippet?.slice(0, 260) || ''}`).join('\n')
  return `You are ThesisFlow-AI's Deep Research assistant. Summarize findings for the query: "${query}".\n\nRules:\n- Provide a concise, accurate synthesis across sources.\n- Use numbered inline citations like [1], [2] that refer to the sources list.\n- Highlight consensus, contradictions, and key takeaways.\n- End with a short "Next steps" list.\n\nSources:\n${bullets}\n\nNow produce the summary with citations.`
}
