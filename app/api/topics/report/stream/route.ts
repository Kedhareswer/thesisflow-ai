import { NextRequest, NextResponse } from 'next/server'
import { withTokenValidation, TokenMiddleware } from '@/lib/middleware/token-middleware'
import { tokenService } from '@/lib/services/token.service'
import { enumerateSources, withTimeout, type Paper } from '@/lib/utils/sources'
import { enhancedAIService } from '@/lib/enhanced-ai-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
      const curationBudgetMs = 90_000  // Increased to 90s to handle slow AI API responses
      const analysisBudgetMs = 75_000  // Reduced to 75s
      const synthesisBudgetMs = 75_000  // Reduced to 75s to keep total under 240s

      let interval: NodeJS.Timeout
      let abort: () => void
      let streamController: ReadableStreamDefaultController<Uint8Array>

      // Centralized cleanup function
      const cleanup = async (reason: 'client_abort' | 'consumer_cancel' | 'stream_error' | 'success') => {
        if (closed) return
        closed = true
        
        // Clear heartbeat interval
        if (interval) clearInterval(interval)
        
        // Remove abort listener
        if (abort) request.signal.removeEventListener('abort', abort)
        
        // Close controller safely
        if (streamController) {
          try { streamController.close() } catch {}
        }
        
        // Issue refund if needed (not for success)
        if (reason !== 'success') {
          await maybeRefund(reason)
        }
      }

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          streamController = controller
          
          // Init event
          controller.enqueue(encoder.encode(`event: init\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`))

          // Heartbeat
          interval = setInterval(() => {
            if (closed) return
            controller.enqueue(encoder.encode(`event: ping\n`))
            controller.enqueue(encoder.encode(`data: {}\n\n`))
          }, 15000)

          abort = () => cleanup('client_abort')
          request.signal.addEventListener('abort', abort)

          try {
            // Progress: curation using Nova (Groq)
            controller.enqueue(encoder.encode(`event: progress\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: 'Curating trusted sources…' })}\n\n`))
            
            const curatorPrompt = `You are a meticulous research curator. You only trust reputable, peer‑reviewed or authoritative sources.

Topic: ${query}

Below is a numbered list of candidate sources (already vetted to be safe).
Mark each as HIGH, MEDIUM, or LOW trust and list 1‑line rationale.
Return strictly in markdown table with columns: ID | Trust | Rationale.

Sources:
${sourcesText}`

            let curation = 'Curation unavailable'
            try {
              // Use automatic provider fallback (don't specify provider for resilience)
              const curationResult = await withTimeout(
                enhancedAIService.generateText({
                  prompt: curatorPrompt,
                  // No provider specified - will use fallback mechanism with all available providers
                  maxTokens: 2000,
                  temperature: 0.2,
                  userId
                }),
                curationBudgetMs,
                'Curation'
              )
              curation = curationResult.success ? (curationResult.content || 'Curation unavailable') : 'Curation unavailable'
            } catch (curationError: any) {
              // Fallback: Simple trust ratings if AI curation times out or rate limited
              if (curationError?.message?.includes('timed out') || curationError?.message?.includes('rate limit')) {
                curation = '| ID | Trust | Rationale |\n|---|---|---|\n' + 
                  limited.map((p, i) => `| ${i+1} | MEDIUM | ${p.source || 'Academic'} source |`).join('\n')
              } else {
                curation = 'Curation unavailable due to API error'
              }
            }

            // Progress: analyzer using Nova (Groq)
            controller.enqueue(encoder.encode(`event: progress\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: 'Analyzing each source…' })}\n\n`))
            
            const analyzerPrompt = `You are a precise literature analyst. Summarize without hallucinations.

For the topic "${query}", write 2‑3 bullet summaries for EACH numbered source below.
Use inline citations like [1], [2] to refer to the same numbering.
Return as markdown with '## Per‑source Summaries' and subsections like '### [n] Title'.

Sources:
${sourcesText}`

            const perSourceResult = await withTimeout(
              enhancedAIService.generateText({
                prompt: analyzerPrompt,
                // Use automatic provider fallback for resilience
                maxTokens: 3000,
                temperature: 0.2,
                userId
              }),
              analysisBudgetMs,
              'Analysis'
            )
            const perSource = perSourceResult.success ? (perSourceResult.content || 'Analysis unavailable') : 'Analysis unavailable'

            // Progress: synthesizer using Nova (Groq)
            controller.enqueue(encoder.encode(`event: progress\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: 'Synthesizing final report…' })}\n\n`))
            
            const words = (quality === 'Enhanced') ? '1500-2200' : '1000-1500'
            const synthPrompt = `You are a senior research writer. Produce structured, citation‑grounded reviews.

Write a scholarly review on: "${query}". Use ONLY the numbered sources below. Cite inline with [n]. Length ${words} words.
Structure with clear headings (Title, Abstract, Background, Methods, Findings, Visual Summaries, Limitations, References).
Include these visual summaries as Markdown:
1) Evidence Summary Table (ID | Study/Source | Year | Method | Sample/Scope | Key Finding | Citation).
2) Key Metrics Table (Metric | Value/Range | Population/Scope | Citation).
3) Regional Comparison Table (Region | Trend/Direction | Notable Study [n]).
4) Timeline Table (Period | Milestones | Citations).
5) ASCII Bar Chart in a \`\`\`text codeblock showing top 5 trends with percentages.
6) ASCII Line Chart (annual trend) in a \`\`\`text codeblock.
If data insufficient, write 'Data not available'.
After body, include a "References" section listing the same numbered items.

Sources:
${sourcesText}`

            const bodyResult = await withTimeout(
              enhancedAIService.generateText({
                prompt: synthPrompt,
                // Use automatic provider fallback for resilience
                maxTokens: quality === 'Enhanced' ? 3000 : 2500,
                temperature: 0.3,
                userId
              }),
              synthesisBudgetMs,
              'Synthesis'
            )
            const body = bodyResult.success ? (bodyResult.content || 'Synthesis unavailable') : 'Synthesis unavailable'

            const finalDoc = [
              `# ${query} — Evidence‑Grounded Review`,
              '',
              '## Source Curation',
              (curation || 'Curation unavailable').trim(),
              '',
              (perSource || 'Analysis unavailable').trim(),
              '',
              (body || 'Synthesis unavailable').trim(),
            ].join('\n')

            // Stream content as tokens
            // Convert to array of Unicode code points to avoid splitting surrogate pairs
            const codePoints = Array.from(finalDoc)
            const chunkSize = 48
            for (let i = 0; i < codePoints.length; i += chunkSize) {
              if (closed) break
              const chunk = codePoints.slice(i, i + chunkSize)
              const piece = chunk.join('')
              controller.enqueue(encoder.encode(`event: token\n`))
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: piece })}\n\n`))
              // Small delay for smoother UX
              await new Promise(r => setTimeout(r, 12))
            }

            // Done event
            controller.enqueue(encoder.encode(`event: done\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ processingTime: Date.now() - startTime })}\n\n`))
            succeeded = true
            await cleanup('success')

          } catch (err: any) {
            if (closed) return
            controller.enqueue(encoder.encode(`event: error\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err?.message || 'Stream error' })}\n\n`))
            await cleanup('stream_error')
          }
        },
        cancel() { 
          void cleanup('consumer_cancel')
        },
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
