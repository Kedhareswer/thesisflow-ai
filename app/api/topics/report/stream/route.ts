import { NextRequest, NextResponse } from 'next/server'
import { withTokenValidation, TokenMiddleware } from '@/lib/middleware/token-middleware'
import { OpenRouterClient, type ChatMessage } from '@/lib/services/openrouter.service'
import { tokenService } from '@/lib/services/token.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Paper {
  id: string
  title: string
  authors: string[]
  abstract: string
  year: string
  journal: string
  url: string
  citations: number
  source: string
  doi?: string
}

function enumerateSources(papers: Paper[]): string {
  return papers.map((p, idx) => {
    const authors = (p.authors || []).join(', ')
    const year = p.year || 'n.d.'
    const journal = p.journal || ''
    const doi = p.doi || ''
    const locator = doi ? `doi:${doi}` : (p.url || '')
    return `${idx + 1}. ${authors ? authors + '. ' : ''}${year}. ${p.title}${journal ? `. ${journal}` : ''}${locator ? `. ${locator}` : ''}`
  }).join('\n')
}

async function tryModels(models: string[], messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const client = new OpenRouterClient()
  let lastErr: any
  for (const model of models) {
    try {
      const content = await client.chatCompletion(model, messages, signal)
      if (content) return content
    } catch (e) {
      lastErr = e
      continue
    }
  }
  throw new Error(lastErr?.message || 'All OpenRouter models failed')
}

// Timeout wrapper for stage-level time limits
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    promise
      .then((val) => {
        clearTimeout(timer)
        resolve(val)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

export const POST = withTokenValidation(
  'topics_report',
  async (userId: string, request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    const encoder = new TextEncoder()

    try {
      const { query, papers, quality } = await request.json()
      if (!query || !Array.isArray(papers) || papers.length === 0) {
        return new NextResponse('Bad Request', { status: 400 })
      }

      const limited: Paper[] = papers.slice(0, Math.min(20, Math.max(8, papers.length)))
      const sourcesText = enumerateSources(limited)

      const models = [
        'z-ai/glm-4.5-air:free',
        'agentica-org/deepcoder-14b-preview:free',
        'nousresearch/deephermes-3-llama-3-8b-preview:free',
        'nvidia/nemotron-nano-9b-v2:free',
        'deepseek/deepseek-chat-v3.1:free',
        'openai/gpt-oss-120b:free',
      ]

      // Compute the same dynamic token cost context used by middleware for accurate refunds
      const ctx = { ...TokenMiddleware.parseRequestContext(request), origin: 'topics', feature: 'report', stream: true }
      const tokensNeeded = await tokenService.getFeatureCost('topics_report', ctx)

      let closed = false
      let refunded = false
      let succeeded = false

      const maybeRefund = async (reason: string) => {
        if (refunded || succeeded) return
        refunded = true
        try {
          await tokenService.refundTokens(userId, 'topics_report', tokensNeeded, { ...ctx, refund_reason: reason })
        } catch {
          // ignore refund errors
        }
      }

      // Overall timeout budget (align with client 4-minute AbortController)
      // Use explicit per-stage budgets so later stages don't starve
      const totalBudgetMs = 240_000
      const curationBudgetMs = 30_000
      const analysisBudgetMs = 90_000
      const synthesisBudgetMs = 120_000

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          // Init event
          controller.enqueue(encoder.encode(`event: init\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`))

          // Heartbeat
          const interval = setInterval(() => {
            if (closed) return
            controller.enqueue(encoder.encode(`event: ping\n`))
            controller.enqueue(encoder.encode(`data: {}\n\n`))
          }, 15000)

          const abort = () => {
            if (closed) return
            closed = true
            clearInterval(interval)
            // Refund on client abort (no completion)
            void maybeRefund('client_abort')
            try { controller.close() } catch {}
          }
          request.signal.addEventListener('abort', abort)

          try {
            // Progress: curation
            controller.enqueue(encoder.encode(`event: progress\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: 'Curating trusted sources…' })}\n\n`))
            const curatorSystem: ChatMessage = { role: 'system', content: 'You are a meticulous research curator. You only trust reputable, peer‑reviewed or authoritative sources.' }
            const curatorUser: ChatMessage = { role: 'user', content: `Topic: ${query}\n\nBelow is a numbered list of candidate sources (already vetted to be safe).\nMark each as HIGH, MEDIUM, or LOW trust and list 1‑line rationale.\nReturn strictly in markdown table with columns: ID | Trust | Rationale.\n\nSources:\n${sourcesText}` }
            const curation = await withTimeout(tryModels(models, [curatorSystem, curatorUser], request.signal), curationBudgetMs, 'Curation')

            // Progress: analyzer
            controller.enqueue(encoder.encode(`event: progress\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: 'Analyzing each source…' })}\n\n`))
            const analyzerSystem: ChatMessage = { role: 'system', content: 'You are a precise literature analyst. Summarize without hallucinations.' }
            const analyzerUser: ChatMessage = { role: 'user', content: `For the topic "${query}", write 2‑3 bullet summaries for EACH numbered source below.\nUse inline citations like [1], [2] to refer to the same numbering.\nReturn as markdown with '## Per‑source Summaries' and subsections like '### [n] Title'.\n\nSources:\n${sourcesText}` }
            const perSource = await withTimeout(tryModels(models, [analyzerSystem, analyzerUser], request.signal), analysisBudgetMs, 'Analysis')

            // Progress: synthesizer
            controller.enqueue(encoder.encode(`event: progress\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: 'Synthesizing final report…' })}\n\n`))
            const words = (quality === 'Enhanced') ? '1500-2200' : '1000-1500'
            const synthSystem: ChatMessage = { role: 'system', content: 'You are a senior research writer. Produce structured, citation‑grounded reviews.' }
            const synthUser: ChatMessage = { role: 'user', content: `Write a scholarly review on: "${query}". Use ONLY the numbered sources below. Cite inline with [n]. Length ${words} words.\nStructure with clear headings (Title, Abstract, Background, Methods, Findings, Visual Summaries, Limitations, References).\nInclude these visual summaries as Markdown:\n1) Evidence Summary Table (ID | Study/Source | Year | Method | Sample/Scope | Key Finding | Citation).\n2) Key Metrics Table (Metric | Value/Range | Population/Scope | Citation).\n3) Regional Comparison Table (Region | Trend/Direction | Notable Study [n]).\n4) Timeline Table (Period | Milestones | Citations).\n5) ASCII Bar Chart in a \`\`\`text codeblock showing top 5 trends with percentages.\n6) ASCII Line Chart (annual trend) in a \`\`\`text codeblock.\nIf data insufficient, write 'Data not available'.\nAfter body, include a "References" section listing the same numbered items.\n\nSources:\n${sourcesText}` }
            const body = await withTimeout(tryModels(models, [synthSystem, synthUser], request.signal), synthesisBudgetMs, 'Synthesis')

            const finalDoc = [
              `# ${query} — Evidence‑Grounded Review`,
              '',
              '## Source Curation',
              curation.trim(),
              '',
              perSource.trim(),
              '',
              body.trim(),
            ].join('\n')

            // Stream content as tokens
            const chunkSize = 48
            for (let i = 0; i < finalDoc.length; i += chunkSize) {
              if (closed) break
              const piece = finalDoc.slice(i, i + chunkSize)
              controller.enqueue(encoder.encode(`event: token\n`))
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: piece })}\n\n`))
              // Small delay for smoother UX
              await new Promise(r => setTimeout(r, 12))
            }

            // Done event
            controller.enqueue(encoder.encode(`event: done\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ processingTime: Date.now() - startTime })}\n\n`))
            clearInterval(interval)
            succeeded = true
            try { controller.close() } catch {}
            closed = true

          } catch (err: any) {
            if (closed) return
            controller.enqueue(encoder.encode(`event: error\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err?.message || 'Stream error' })}\n\n`))
            // Attempt token refund on error
            await maybeRefund('stream_error')
            clearInterval(interval)
            try { controller.close() } catch {}
            closed = true
          }
        },
        cancel() { closed = true },
      })

      return new NextResponse(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      })

    } catch (error) {
      return new NextResponse('Internal server error', { status: 500 })
    }
  },
  {
    context: { origin: 'topics', feature: 'report', stream: true },
  }
)
