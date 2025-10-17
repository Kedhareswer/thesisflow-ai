import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import { buildParaphrasePrompt } from "@/lib/services/paraphrase.service"

// Server-side Nova AI functionality using hardcoded Groq API
async function callNovaAI(prompt: string, signal?: AbortSignal): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY
  
  if (!groqApiKey) {
    throw new Error('Groq API key not configured. Please set GROQ_API_KEY environment variable.')
  }
  
  console.log('[Paraphraser] Making request to Groq API...')
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqApiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 3000,
      temperature: 0.7,
      top_p: 0.9,
      messages: [
        { 
          role: "system", 
          content: "You are Nova, a specialized research collaboration assistant. You help with paraphrasing and rewriting academic content while maintaining scholarly tone and accuracy."
        },
        { role: "user", content: prompt }
      ]
    }),
    signal
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Groq API error:', response.status, errorData)
    throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  const aiContent = data.choices?.[0]?.message?.content || 'No response generated'
  console.log('[Paraphraser] Success! Generated', aiContent.length, 'characters')
  return aiContent
}

function sse(headers?: Record<string, string>) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: any) => {
        const chunk = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(chunk))
      }
      return { send, controller }
    },
  }) as any

  const response = new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      ...(headers || {}),
    },
  })

  // Monkey-patch to expose send inside handler
  ;(response as any).stream = stream
  return response as Response & { stream: ReadableStream<Uint8Array> }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, "paraphraser-stream")

    const url = new URL(request.url)
    const text = (url.searchParams.get("text") || "").toString()
    const mode = (url.searchParams.get("mode") || "academic") as
      | "academic"
      | "fluent"
      | "formal"
      | "creative"
      | "casual"
      | "technical"
      | "simple"
    const variationLevel = (url.searchParams.get("variationLevel") || "medium") as
      | "low"
      | "medium"
      | "high"
    const preserveLength = (url.searchParams.get("preserveLength") || "false") === "true"
    // Provider/model are intentionally ignored to keep UI provider-agnostic.

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { prompt, temperature, maxTokens } = buildParaphrasePrompt({
      text,
      tone: mode as any,
      variation: variationLevel as any,
      preserveLength,
      userId: user.id,
    })

    const encoder = new TextEncoder()
    const heartbeatMs = 15000
    let heartbeat: any

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (data: any) => {
          const chunk = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(chunk))
        }

        send({ type: "init", ts: Date.now() })

        const abortController = new AbortController()
        const onAbort = () => {
          try { controller.close() } catch {}
          clearInterval(heartbeat)
        }
        request.signal.addEventListener("abort", onAbort)

        heartbeat = setInterval(() => {
          send({ type: "ping", ts: Date.now() })
        }, heartbeatMs)

        try {
          // Check if Groq API key is configured
          const groqApiKey = process.env.GROQ_API_KEY
          if (!groqApiKey) {
            throw new Error('Nova AI not configured. Please set GROQ_API_KEY environment variable.')
          }

          // Use Nova AI (Groq) for paraphrasing
          const content = await callNovaAI(prompt, abortController.signal)

          if (!content) {
            throw new Error("Nova AI returned no content")
          }

          // Simulate token streaming by chunking the content
          const chunks = content.split(/(\s+)/) // keep spaces
          const total = chunks.length
          for (let i = 0; i < chunks.length; i++) {
            if (abortController.signal.aborted) break
            const token = chunks[i]
            if (token) {
              send({ type: "token", token })
            }
            // lightweight progress signal
            if (i % 20 === 0) {
              const pct = Math.round((i / Math.max(1, total)) * 100)
              send({ type: "progress", percentage: pct })
            }
            await new Promise((r) => setTimeout(r, 15))
          }
          send({ type: "done" })
        } catch (e: any) {
          // Fallback: Try enhanced AI service with any available provider
          try {
            await enhancedAIService.generateTextStream({
              prompt,
              maxTokens,
              temperature,
              userId: user.id,
              onToken: (token: string) => send({ type: "token", token }),
              onProgress: (p: { message?: string; percentage?: number }) => send({ type: "progress", ...p }),
              onError: (err: string) => {
                // Sanitize error payload to prevent leaking internal details
                const errorPayload = err && typeof err === 'object'
                  ? {
                      name: (err as any)?.name || 'Error',
                      message: (err as any)?.message || 'An error occurred during processing',
                      // Only include stack trace in development mode
                      ...(process.env.NODE_ENV === 'development' && (err as any)?.stack ? { stack: (err as any).stack } : {}),
                    }
                  : { message: String(err) || 'An error occurred during processing' }

                send({ type: "error", error: errorPayload })
              },
              abortSignal: abortController.signal,
            })
            send({ type: "done" })
          } catch (fallbackErr: any) {
            // Sanitize fallback error to prevent leaking internal details
            const sanitizedError = fallbackErr?.message || e?.message || "Streaming failed"
            send({ type: "error", error: sanitizedError })
          }
        } finally {
          clearInterval(heartbeat)
          try { controller.close() } catch {}
          request.signal.removeEventListener("abort", onAbort)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Paraphraser streaming failed"
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: message.includes("Authentication") ? 401 : 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
