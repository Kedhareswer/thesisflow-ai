import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import { buildParaphrasePrompt } from "@/lib/services/paraphrase.service"
import type { AIProvider } from "@/lib/ai-providers"

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
    const provider = (url.searchParams.get("provider") || undefined) as AIProvider | undefined
    const model = (url.searchParams.get("model") || undefined) || undefined

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
      provider,
      model,
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
          await enhancedAIService.generateTextStream({
            prompt,
            provider,
            model,
            maxTokens,
            temperature,
            userId: user.id,
            onToken: (token) => send({ type: "token", token }),
            onProgress: (p) => send({ type: "progress", ...p }),
            onError: (err) => {
              const errorPayload = err && typeof err === 'object'
                ? {
                    name: (err as any)?.name || 'Error',
                    message: (err as any)?.message || String(err),
                    stack: (err as any)?.stack || undefined,
                  }
                : { message: String(err) }

              send({ type: "error", error: errorPayload })
            },
            abortSignal: abortController.signal,
          })
          send({ type: "done" })
        } catch (e: any) {
          send({ type: "error", error: e?.message || "Streaming failed" })
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
