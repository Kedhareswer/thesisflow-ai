import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import { buildParaphrasePrompt } from "@/lib/services/paraphrase.service"
import { OpenRouterClient } from "@/lib/services/openrouter.service"

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
          // Preferred path: Use OpenRouter with fallback model order (same spirit as Planner)
          const client = new OpenRouterClient()
          const modelsToTry = [
            "z-ai/glm-4.5-air:free",
            "agentica-org/deepcoder-14b-preview:free",
            "nousresearch/deephermes-3-llama-3-8b-preview:free",
            "nvidia/nemotron-nano-9b-v2:free",
            "deepseek/deepseek-chat-v3.1:free",
            "openai/gpt-oss-120b:free",
          ]

          let content = ""
          let lastErr: any
          for (const m of modelsToTry) {
            try {
              // Use a single user message containing our composed prompt
              content = await client.chatCompletion(m, [{ role: "user", content: prompt }], abortController.signal)
              if (content) break
            } catch (err) {
              lastErr = err
              continue
            }
          }

          if (!content) {
            throw new Error(lastErr?.message || "OpenRouter returned no content")
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
          // Fallback to existing enhanced streaming path for resilience
          try {
            await enhancedAIService.generateTextStream({
              prompt,
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
          } catch (fallbackErr: any) {
            send({ type: "error", error: fallbackErr?.message || e?.message || "Streaming failed" })
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
