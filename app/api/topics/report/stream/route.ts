import { NextRequest, NextResponse } from 'next/server'
import { withTokenValidation, TokenMiddleware } from '@/lib/middleware/token-middleware'
import { tokenService } from '@/lib/services/token.service'
import { enumerateSources, withTimeout, type Paper } from '@/lib/utils/sources'

// Define ChatMessage type
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Server-side Nova AI functionality using hardcoded Groq API
async function callNovaAI(prompt: string): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY
  
  if (!groqApiKey) {
    throw new Error('Groq API key not configured. Please set GROQ_API_KEY environment variable.')
  }
  
  try {
    console.log('[Nova AI] Making request to Groq API...')
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Groq's Llama 3.3 70B model
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 0.9,
        messages: [
          { 
            role: "system", 
            content: "You are Nova, a specialized research collaboration assistant for academic teams and research hubs. You assist with research-related questions, literature reviews, and academic writing. Provide structured, citation-grounded reviews and maintain a professional, scholarly tone appropriate for academic discourse."
          },
          { role: "user", content: prompt }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Groq API error:', response.status, errorData)
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const aiContent = data.choices?.[0]?.message?.content || 'No response generated'
    console.log('[Nova AI] Success! Generated', aiContent.length, 'characters')
    return aiContent
  } catch (error) {
    console.error('Nova AI error:', error)
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

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

        // Check if Nova AI is configured (uses hardcoded Groq)
      const groqApiKey = process.env.GROQ_API_KEY
      console.log('[Topics Report] Groq API Key configured:', !!groqApiKey)
      if (!groqApiKey) {
        console.error('[Topics Report] No Groq API key found')
        return new NextResponse('Nova AI not configured. Please set GROQ_API_KEY environment variable.', { status: 500 })
      }

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
      // Increased stage budgets to prevent premature timeouts, especially for curation
      const totalBudgetMs = 240_000
      const curationBudgetMs = 60_000  // Increased from 30s to 60s for reliable curation
      const analysisBudgetMs = 90_000
      const synthesisBudgetMs = 90_000  // Adjusted to maintain total budget balance

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
            // Progress: curation with retry mechanism
            controller.enqueue(encoder.encode(`event: progress\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: 'Curating trusted sources…' })}\n\n`))
            
            const curatorSystem: ChatMessage = { role: 'system', content: 'You are a meticulous research curator. You only trust reputable, peer‑reviewed or authoritative sources.' }
            const curatorUser: ChatMessage = { role: 'user', content: `Topic: ${query}\n\nBelow is a numbered list of candidate sources (already vetted to be safe).\nMark each as HIGH, MEDIUM, or LOW trust and list 1‑line rationale.\nReturn strictly in markdown table with columns: ID | Trust | Rationale.\n\nSources:\n${sourcesText}` }
            
            // Implement retry logic for curation stage
            let curation = '' // Initialize to prevent TypeScript error
            let curationAttempts = 0
            const maxCurationRetries = 2
            
            while (curationAttempts <= maxCurationRetries) {
              try {
                if (curationAttempts > 0) {
                  controller.enqueue(encoder.encode(`event: progress\n`))
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: `Retrying curation (attempt ${curationAttempts + 1}/${maxCurationRetries + 1})…` })}\n\n`))
                }
                
                const curatorPrompt = `${curatorUser.content}`
                console.log('[Topics Report] Starting curation stage...')
                curation = await withTimeout(callNovaAI(curatorPrompt), curationBudgetMs, 'Curation')
                console.log('[Topics Report] Curation completed successfully')
                break // Success, exit retry loop
                
              } catch (err: any) {
                curationAttempts++
                if (curationAttempts > maxCurationRetries) {
                  // Set fallback content if all retries fail
                  curation = '## Source Curation Failed\n\nUnable to complete automated source curation due to technical difficulties. All sources will be treated with standard academic scrutiny.'
                  break // Exit retry loop with fallback
                }
                // Brief delay before retry
                await new Promise(resolve => setTimeout(resolve, 2000))
              }
            }

            // Progress: analyze each source with Nova (Groq)
            controller.enqueue(encoder.encode(`event: progress\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: 'Analyzing each source…' })}\n\n`))
            
            const analyzerPrompt = `For the topic "${query}", write 2‑3 bullet summaries for EACH numbered source below.\nUse inline citations like [1], [2] to refer to the same numbering.\nReturn as markdown with '## Per‑source Summaries' and subsections like '### [n] Title'.\n\nSources:\n${sourcesText}`
            const perSource = await withTimeout(callNovaAI(analyzerPrompt), analysisBudgetMs, 'Analysis')

            // Progress: synthesizer using Nova (Groq)
            controller.enqueue(encoder.encode(`event: progress\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: 'Synthesizing final report…' })}\n\n`))
            
            const words = (quality === 'Enhanced') ? '1500-2200' : '1000-1500'
            const synthSystem: ChatMessage = { role: 'system', content: 'You are a senior research writer. Produce structured, citation‑grounded reviews.' }
            const synthUser: ChatMessage = { role: 'user', content: `Write a scholarly review on: "${query}". Use ONLY the numbered sources below. Cite inline with [n]. Length ${words} words.\nStructure with clear headings (Title, Abstract, Background, Methods, Findings, Visual Summaries, Limitations, References).\nInclude these visual summaries as Markdown:\n1) Evidence Summary Table (ID | Study/Source | Year | Method | Sample/Scope | Key Finding | Citation).\n2) Key Metrics Table (Metric | Value/Range | Population/Scope | Citation).\n3) Regional Comparison Table (Region | Trend/Direction | Notable Study [n]).\n4) Timeline Table (Period | Milestones | Citations).\n5) ASCII Bar Chart in a \`\`\`text codeblock showing top 5 trends with percentages.\n6) ASCII Line Chart (annual trend) in a \`\`\`text codeblock.\nIf data insufficient, write 'Data not available'.\nAfter body, include a "References" section listing the same numbered items.\n\nSources:\n${sourcesText}` }
            const synthPrompt = `${synthUser.content}`
            const body = await withTimeout(callNovaAI(synthPrompt), synthesisBudgetMs, 'Synthesis')

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
