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

// Context7 MCP: docs/dev search (server-only; optional)
async function context7Docs(query: string, limit = 10) {
  const base = process.env.CONTEXT7_API_URL || process.env.CONTEXT7_MCP_URL
  if (!base) return [] as any[]
  const apiKey = process.env.CONTEXT7_API_KEY
  try {
    const url = new URL((base.endsWith('/') ? base.slice(0, -1) : base) + '/search')
    url.searchParams.set('q', query)
    url.searchParams.set('type', 'docs')
    url.searchParams.set('limit', String(Math.min(10, Math.max(1, limit))))
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'ThesisFlow-AI/1.0',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json().catch(() => null)
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.results) ? data.results : []
    return items.map((it: any) => ({
      title: it.title || it.name || it.url,
      url: it.url || it.link || '',
      snippet: it.snippet || it.summary || it.description || '',
      source: 'context7',
      kind: 'docs' as const,
    }))
  } catch {
    return []
  }
}

// LangSearch: web / scholar / news (server-only; optional)
const LANGSEARCH_BASE = process.env.LANGSEARCH_API_URL || 'https://api.langsearch.io/v1'

async function langSearch(query: string, endpoint: 'web' | 'scholar' | 'news', limit = 10) {
  const key = process.env.LANGSEARCH_API_KEY
  if (!key) return [] as any[]
  try {
    const res = await fetch(`${LANGSEARCH_BASE}/${endpoint}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ query, limit: Math.min(10, Math.max(1, limit)) }),
    })
    if (!res.ok) return []
    const data = await res.json().catch(() => null)
    const items = Array.isArray(data?.results) ? data.results : []
    return items.map((it: any) => ({
      title: it.title || it.url,
      url: it.url,
      snippet: it.snippet || it.description || '',
      source: 'langsearch',
      kind: endpoint === 'scholar' ? ('scholar' as const) : endpoint === 'news' ? ('news' as const) : ('web' as const),
    }))
  } catch {
    return []
  }
}

// GNews fallback (optional)
async function gnewsSearch(query: string, limit = 10) {
  const key = process.env.GNEWS_API_KEY
  if (!key) return [] as any[]
  try {
    const url = new URL('https://gnews.io/api/v4/search')
    url.searchParams.set('q', query)
    url.searchParams.set('lang', 'en')
    url.searchParams.set('max', String(Math.min(10, Math.max(1, limit))))
    url.searchParams.set('apikey', key)
    const res = await fetch(url.toString(), { headers: { 'User-Agent': 'ThesisFlow-AI/1.0' } })
    if (!res.ok) return []
    const data = await res.json().catch(() => null)
    const articles = Array.isArray(data?.articles) ? data.articles : []
    return articles.map((it: any) => ({
      title: it.title || it.url,
      url: it.url,
      snippet: it.description || '',
      source: 'gnews',
      kind: 'news' as const,
    }))
  } catch {
    return []
  }
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
      const results: Array<{ title: string; url: string; snippet?: string; source: string; score?: number; kind?: 'web' | 'scholar' | 'docs' | 'news' }> = []

      const addResult = (r: { title?: string; url?: string; snippet?: string; source: string; kind?: 'web' | 'scholar' | 'docs' | 'news' }) => {
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

      const docsContext7 = async () => {
        try {
          const items = await context7Docs(q, Math.min(10, limit))
          for (const it of items) addResult({ ...it, kind: 'docs' })
        } catch (e) {
          send({ type: 'warn', source: 'context7', error: e instanceof Error ? e.message : String(e) })
        }
      }

      const webLangSearch = async () => {
        try {
          const items = await langSearch(q, 'web', Math.min(10, limit))
          for (const it of items) addResult({ ...it, kind: 'web' })
        } catch (e) {
          send({ type: 'warn', source: 'langsearch-web', error: e instanceof Error ? e.message : String(e) })
        }
      }

      const scholarLangSearch = async () => {
        try {
          const items = await langSearch(q, 'scholar', Math.min(10, limit))
          for (const it of items) addResult({ ...it, kind: 'scholar' })
        } catch (e) {
          send({ type: 'warn', source: 'langsearch-scholar', error: e instanceof Error ? e.message : String(e) })
        }
      }

      const newsLangSearch = async () => {
        try {
          const items = await langSearch(q, 'news', Math.min(10, limit))
          for (const it of items) addResult({ ...it, kind: 'news' })
        } catch (e) {
          send({ type: 'warn', source: 'langsearch-news', error: e instanceof Error ? e.message : String(e) })
        }
      }

      const newsGNews = async () => {
        try {
          const items = await gnewsSearch(q, Math.min(10, limit))
          for (const it of items) addResult({ ...it, kind: 'news' })
        } catch (e) {
          send({ type: 'warn', source: 'gnews', error: e instanceof Error ? e.message : String(e) })
        }
      }

      // Launch in parallel and wait (bounded time)
      await Promise.allSettled([
        scholarly(),
        webGoogle(),
        webDDG(),
        webTavily(),
        docsContext7(),
        webLangSearch(),
        scholarLangSearch(),
        newsLangSearch(),
        newsGNews(),
      ])

      // Improved ranking: per-kind weights + domain authority + title/snippet quality
      const kindWeight = (k?: 'web' | 'scholar' | 'docs' | 'news') =>
        k === 'scholar' ? 3 : k === 'docs' ? 2.5 : k === 'web' ? 1.5 : 1

      const domainAuthority: Record<string, number> = {
        'arxiv.org': 1.0,
        'nature.com': 0.95,
        'science.org': 0.95,
        'sciencedirect.com': 0.95,
        'ieee.org': 0.95,
        'dl.acm.org': 0.95,
        'springer.com': 0.9,
        'link.springer.com': 0.9,
        'nih.gov': 0.95,
        'nasa.gov': 0.9,
        'stanford.edu': 0.95,
        'mit.edu': 0.95,
        'harvard.edu': 0.95,
        'ox.ac.uk': 0.9,
        'cam.ac.uk': 0.9,
        'developer.mozilla.org': 0.95,
        'mdn.mozilla.org': 0.95,
        'docs.microsoft.com': 0.9,
        'readthedocs.io': 0.8,
        'wikipedia.org': 0.6,
        'github.com': 0.7,
        'gitlab.com': 0.6,
      }

      const getDomain = (u?: string) => {
        if (!u) return ''
        try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' }
      }

      const queryTokens = q.toLowerCase().split(/\s+/).filter(t => t.length > 2)
      const titleMatchScore = (title?: string) => {
        if (!title || queryTokens.length === 0) return 0
        const t = title.toLowerCase()
        const matches = queryTokens.reduce((acc, tok) => acc + (t.includes(tok) ? 1 : 0), 0)
        return Math.min(1, matches / Math.min(5, queryTokens.length))
      }

      const scored = results.map((r) => {
        const base = kindWeight(r.kind)
        const dom = domainAuthority[getDomain(r.url)] || 0.2
        const snippetScore = Math.min(1, (r.snippet?.length || 0) / 400)
        const titleScore = titleMatchScore(r.title)
        const score = base + 0.8 * dom + 0.7 * snippetScore + 0.5 * titleScore
        return { ...r, score }
      })
      scored.sort((a, b) => (b.score || 0) - (a.score || 0))

      send({ type: 'progress', message: 'Search complete, preparing summary', total: scored.length })

      // Summarization via user's selected provider/model (no env fallback)
      let summarySent = false
      if (provider) {
        try {
          // Validate provider exists in registry (optional safety)
          if (!AI_PROVIDERS[provider]) {
            send({ type: 'notice', message: `Unknown provider '${provider}', skipping summarization.` })
          } else {
            const top = scored.slice(0, Math.min(12, Math.max(5, Math.floor(limit / 2))))
            const prompt = buildSummaryPrompt(q, top)
            const result = await enhancedAIService.generateText({
              prompt,
              maxTokens: 900,
              temperature: 0.3,
              userId: user.id,
            })
            if (result.success && result.content) {
              send({ type: 'summary', provider, model, content: result.content })
              summarySent = true
            } else {
              send({ type: 'notice', message: result.error || 'Summarization failed. Configure API keys in Settings.' })
            }
          }
        } catch (e) {
          send({ type: 'notice', message: e instanceof Error ? e.message : String(e) })
        }
      } else {
        send({ type: 'notice', message: 'No provider selected; streaming raw results only.' })
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
