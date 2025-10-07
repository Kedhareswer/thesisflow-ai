import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import { buildParaphrasePrompt } from "@/lib/services/paraphrase.service"

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
          // Primary path: Use Nova (Groq) for fast, reliable paraphrasing
          await enhancedAIService.generateTextStream({
            prompt,
            provider: "groq",
            model: "llama-3.1-8b-instant",
            maxTokens,
            temperature,
            userId: user.id,
            onToken: (token) => send({ type: "token", token }),
            onProgress: (p) => send({ type: "progress", ...p }),
            onError: (err) => {
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
        } catch (e: any) {
          // Fallback: Try enhanced AI service with any available provider
          try {
            await enhancedAIService.generateTextStream({
              prompt,
              maxTokens,
              temperature,
              userId: user.id,
              onToken: (token) => send({ type: "token", token }),
              onProgress: (p) => send({ type: "progress", ...p }),
              onError: (err) => {
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
