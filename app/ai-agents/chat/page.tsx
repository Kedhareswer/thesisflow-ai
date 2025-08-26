"use client"

import React from "react"
import { Bot, ChevronUp, Loader2, Paperclip, Image as ImageIcon, Smile } from "lucide-react"
import { useDeepSearch } from "@/hooks/use-deep-search"
import { Skeleton } from "@/components/ui/skeleton"
import { useSearchParams } from "next/navigation"
import type { AIProvider } from "@/lib/ai-providers"
import { addRecentChat } from "@/lib/services/recent-chats"

// Helpers to derive a friendly title/tag from the query (same logic style as SearchBox)
function stripTrailingSuffix(text: string): string {
  return text.replace(/\s+(using\s+[^.]+)?(\s+and create\s+[^.]+)?\s*\.*\s*$/i, "")
}
function extractSubjectFromPrompt(prompt: string): string {
  const cleaned = stripTrailingSuffix(prompt || "")
  const preps = [" on ", " for ", " from ", " about ", " related to "]
  let idx = -1
  let found = ""
  for (const p of preps) {
    const i = cleaned.toLowerCase().lastIndexOf(p)
    if (i > idx) {
      idx = i
      found = p
    }
  }
  if (idx >= 0) {
    const after = cleaned.slice(idx + found.length)
    const nextUsing = after.toLowerCase().indexOf(" using ")
    const nextCreate = after.toLowerCase().indexOf(" and create ")
    const nextDot = after.indexOf(".")
    const stops = [nextUsing, nextCreate, nextDot].filter((n) => n >= 0)
    const stopAt = stops.length ? Math.min(...stops) : -1
    const subject = (stopAt >= 0 ? after.slice(0, stopAt) : after).trim()
    return subject || "Topic"
  }
  return cleaned.trim() || "Topic"
}
function toTitleCase(input: string) {
  return (input || "").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const [deepOn, setDeepOn] = React.useState(true)
  const [input, setInput] = React.useState("")
  const startedRef = React.useRef(false)
  const providerParam = React.useMemo(() => (searchParams?.get("provider") || undefined) as AIProvider | undefined, [searchParams])
  const modelParam = React.useMemo(() => searchParams?.get("model") || undefined, [searchParams])
  const {
    items,
    summary,
    progress,
    warnings,
    notices,
    infos,
    isLoading,
    error,
    provider,
    model,
    start,
    stop,
    reset,
    isStreaming,
  } = useDeepSearch()

  // Simple chat generation state (when Deep Search is off)
  const [simpleLoading, setSimpleLoading] = React.useState(false)
  const [simpleError, setSimpleError] = React.useState<string | null>(null)
  const [simpleContent, setSimpleContent] = React.useState<string | null>(null)
  const [simpleProvider, setSimpleProvider] = React.useState<AIProvider | undefined>(undefined)
  const [simpleModel, setSimpleModel] = React.useState<string | undefined>(undefined)

  const generateSimple = React.useCallback(async (prompt: string) => {
    setSimpleLoading(true)
    setSimpleError(null)
    setSimpleContent(null)
    setSimpleProvider(undefined)
    setSimpleModel(undefined)
    try {
      let headers: Record<string, string> = { "Content-Type": "application/json" }
      try {
        const { supabase } = await import("@/integrations/supabase/client")
        const sess = await supabase.auth.getSession()
        const token = sess.data.session?.access_token
        if (token) headers["Authorization"] = `Bearer ${token}`
      } catch {}

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt, maxTokens: 1800, temperature: 0.7, provider: providerParam, model: modelParam }),
      })
      if (res.status === 401) {
        setSimpleError("Please sign in to use AI chat.")
        return
      }
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || "Generation failed")
      }
      setSimpleContent(data.content || data.response || "")
      setSimpleProvider((data.provider || providerParam) as AIProvider | undefined)
      setSimpleModel((data.model || modelParam) as string | undefined)
    } catch (e: any) {
      setSimpleError(e?.message || "Something went wrong")
    } finally {
      setSimpleLoading(false)
    }
  }, [modelParam, providerParam])

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) return
    if (deepOn) {
      try { addRecentChat({ query: input, provider: providerParam, model: modelParam, deep: true }) } catch {}
      start({ query: input, provider: providerParam, model: modelParam, limit: 20 })
    } else {
      // Non-deep: call simple generation using authorized user's providers with fallback
      try { addRecentChat({ query: input, provider: providerParam, model: modelParam, deep: false }) } catch {}
      generateSimple(input)
    }
  }

  // stop streaming if Deep Search toggled off
  React.useEffect(() => {
    if (!deepOn) {
      stop()
    }
  }, [deepOn, stop])

  // Read query from URL and optionally auto-start deep search
  React.useEffect(() => {
    if (!searchParams) return
    const q = (searchParams.get("query") || "").trim()
    const deep = searchParams.get("deep") === "1"
    if (q) setInput((prev) => (prev?.trim() ? prev : q))
    if (typeof deep === "boolean") setDeepOn(deep)
    if (q && deep && !startedRef.current) {
      startedRef.current = true
      try { addRecentChat({ query: q, provider: providerParam, model: modelParam, deep: true }) } catch {}
      start({ query: q, provider: providerParam, model: modelParam, limit: 20 })
    }
  }, [searchParams, start, providerParam, modelParam])

  // Derive dynamic title/tag from current input or URL query
  const topicBase = input?.trim() || searchParams?.get("query") || "Topic"
  const subject = React.useMemo(() => extractSubjectFromPrompt(topicBase), [topicBase])
  const topicTitle = React.useMemo(() => toTitleCase(subject), [subject])
  const topicTag = React.useMemo(() => {
    const words = (subject || "").split(/\s+/).filter(Boolean)
    return words.slice(0, 2).join(" ").toLowerCase() || "topic"
  }, [subject])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top toolbar area */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <h1 className="text-[15px] font-semibold text-gray-900">{topicTitle}</h1>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Outputs</button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-5">
        <div className="mx-auto max-w-3xl pb-36 pt-5">
          {/* Topic pill, right aligned similar to screenshot */}
          <div className="mb-4 flex justify-end">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">{topicTag}</span>
          </div>

          {/* Assistant preamble card */}
          <div className="relative">
            <div className="mb-3 text-gray-500">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white">🧩</span>
            </div>
            <div className="space-y-4 leading-relaxed text-[15px] text-gray-800">
              <p>
                I understand you’re interested in deep learning research! Since you’ve mentioned preferring deep
                review, I’d like to ask some clarifying questions to help me provide the most valuable and focused
                assistance for your deep learning inquiry.
              </p>
              <p>Here are a few questions to help narrow down your research focus:</p>
              <ol className="list-decimal space-y-3 pl-6">
                <li>
                  <span className="font-semibold">What specific aspect of deep learning interests you most?</span>{" "}
                  Are you looking for technical fundamentals (neural network architectures, optimization algorithms),
                  practical applications (computer vision, NLP, robotics), or emerging trends (transformer models,
                  generative AI, federated learning)?
                </li>
                <li>
                  <span className="font-semibold">What’s your primary goal with this research?</span> Are you seeking to
                  understand the field for academic purposes, looking to implement solutions for a specific project, or
                  trying to stay current with the latest developments in the field?
                </li>
                <li>
                  <span className="font-semibold">Which application domains or use cases are most relevant to you?</span>{" "}
                  For example, are you focusing on healthcare, finance, education, autonomous systems, or another area?
                </li>
              </ol>
            </div>
          </div>

          {/* Simple chat response panel (when Deep Search is off) */}
          {!deepOn && (simpleLoading || simpleError || simpleContent) && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="text-[18px] font-semibold leading-6 text-gray-900">Response</h2>
                <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">chat</span>
              </div>

              {simpleLoading && (
                <div className="mb-3 flex items-center gap-2 text-sm text-gray-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </div>
              )}

              {simpleError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{simpleError}</div>
              )}

              {simpleContent && (
                <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
                  <div className="mb-1 text-sm font-semibold text-orange-800">Answer</div>
                  {(simpleProvider || simpleModel || providerParam || modelParam) && (
                    <div className="mb-2 flex flex-wrap gap-2 text-xs text-orange-800">
                      {(simpleProvider || providerParam) && (
                        <span className="rounded-full border border-orange-200 bg-white/60 px-2 py-0.5">
                          Provider: {simpleProvider || providerParam}
                        </span>
                      )}
                      {(simpleModel || modelParam) && (
                        <span className="rounded-full border border-orange-200 bg-white/60 px-2 py-0.5">
                          Model: {simpleModel || modelParam}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none text-orange-900" dangerouslySetInnerHTML={{ __html: (simpleContent || '').replace(/\n/g, '<br/>') }} />
                </div>
              )}
            </div>
          )}

          {/* Streaming results panel */}
          {(deepOn && (isLoading || error || items.length > 0 || summary || warnings.length || notices.length)) && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              {/* Header: Topic + Tag */}
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="text-[18px] font-semibold leading-6 text-gray-900">{topicTitle}</h2>
                <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">{topicTag}</span>
              </div>

              {/* Executing Plan preamble while loading and before results */}
              {isLoading && items.length === 0 && !summary && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Bot className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">Executing Plan...</span>
                  </div>
                  <div className="mt-3 text-[15px] leading-relaxed text-gray-800">
                    <p>I understand you're interested in deep review for <span className="font-semibold">Deep Learning</span>. To provide the most valuable and focused assistance, here are a few quick questions to narrow down your research focus:</p>
                    <ol className="mt-3 list-decimal space-y-2 pl-5">
                      <li><span className="font-semibold">What specific aspect</span> of this topic interests you most?</li>
                      <li><span className="font-semibold">What's your primary goal</span> with this research (learn, build, evaluate, stay current)?</li>
                      <li><span className="font-semibold">Which application domains</span> are most relevant to you?</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Agent running card */}
              {isLoading && (
                <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Agent is running...
                  </div>
                  <div className="mt-2 rounded-xl border border-gray-200 bg-white/90 p-3 text-sm text-gray-600">
                    You can step in with instructions while the task runs...
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    {isStreaming && <span className="text-xs text-orange-700">Streaming…</span>}
                    <button onClick={stop} className="text-xs rounded-md border border-gray-200 px-2 py-1 hover:bg-gray-100">Cancel</button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              {/* Progress small note */}
              {progress?.message && (
                <div className="mb-2 text-xs text-gray-600">{progress.message}{progress.total ? ` • ${progress.total} items` : ""}</div>
              )}

              {/* Loading skeletons before first results */}
              {isLoading && items.length === 0 && !summary && (
                <div className="mb-4 space-y-2">
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="h-4 w-3/6" />
                </div>
              )}

              {items.length > 0 && (
                <div className="mb-4">
                  <div className="mb-1 text-sm font-semibold text-gray-800">Results</div>
                  <ul className="space-y-2">
                    {items.map((it, idx) => (
                      <li key={`${it.url || it.title}-${idx}`} className="rounded-md border border-gray-100 p-2 hover:bg-gray-50">
                        <a href={it.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-700 hover:underline">
                          {it.title}
                        </a>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                          <span className="rounded-full border border-gray-200 px-2 py-0.5">{it.source}</span>
                          {it.kind && <span className="rounded-full border border-gray-200 px-2 py-0.5 capitalize">{it.kind}</span>}
                        </div>
                        {it.snippet && <p className="mt-1 line-clamp-2 text-xs text-gray-600">{it.snippet}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary && (
                <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
                  <div className="mb-1 text-sm font-semibold text-orange-800">Summary</div>
                  {(provider || model || providerParam || modelParam) && (
                    <div className="mb-2 flex flex-wrap gap-2 text-xs text-orange-800">
                      {(provider || providerParam) && (
                        <span className="rounded-full border border-orange-200 bg-white/60 px-2 py-0.5">
                          Provider: {provider || providerParam}
                        </span>
                      )}
                      {(model || modelParam) && (
                        <span className="rounded-full border border-orange-200 bg-white/60 px-2 py-0.5">
                          Model: {model || modelParam}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none text-orange-900" dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>') }} />
                </div>
              )}

              {(warnings.length > 0 || notices.length > 0 || infos.length > 0) && (
                <div className="mt-3 space-y-1">
                  {infos.map((m, i) => (
                    <div key={`i-${i}`} className="text-xs text-gray-500">ℹ️ {m}</div>
                  ))}
                  {notices.map((m, i) => (
                    <div key={`n-${i}`} className="text-xs text-blue-700">🔔 {m}</div>
                  ))}
                  {warnings.map((w, i) => (
                    <div key={`w-${i}`} className="text-xs text-yellow-700">⚠️ {w.source ? `[${w.source}] ` : ''}{w.error}</div>
                  ))}
                </div>
              )}

              {/* Empty state after completion with no content */}
              {!isLoading && !error && items.length === 0 && !summary && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  No findings yet. Try refining your topic or enabling a provider for summarization.
                </div>
              )}

              {/* Footer controls when finished */}
              <div className="mt-3 flex items-center justify-end gap-2">
                {!isLoading && (items.length > 0 || summary) && (
                  <button onClick={reset} className="text-xs rounded-md border border-gray-200 px-2 py-1 hover:bg-gray-50">Clear</button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sticky bottom chat composer */}
      <form onSubmit={onSubmit} className="sticky bottom-0 z-10 w-full bg-transparent">
        <div className="mx-auto max-w-3xl px-4 py-3">
          {/* container */}
          <div className="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or give follow up task..."
              className="min-h-[88px] w-full resize-none rounded-md p-3 text-[15px] leading-relaxed text-[#ee691a] caret-[#ee691a] outline-none placeholder:text-gray-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  onSubmit()
                }
              }}
            />

            {/* bottom controls */}
            <div className="mt-2 flex items-center gap-2 border-t border-gray-100 px-2 pt-2">
              {/* left accessories */}
              <div className="flex items-center gap-1 text-gray-500">
                <button type="button" className="rounded-md p-1 hover:bg-gray-100" title="Attach">
                  <Paperclip className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-md p-1 hover:bg-gray-100" title="Insert image">
                  <ImageIcon className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-md p-1 hover:bg-gray-100" title="Emoji">
                  <Smile className="h-4 w-4" />
                </button>
              </div>

              {/* Deep Search pill */}
              <button
                type="button"
                onClick={() => setDeepOn((v) => !v)}
                className={`ml-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
                  deepOn ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
                title="Deep Search"
              >
                <span className={`h-2 w-2 rounded-full ${deepOn ? "bg-orange-500" : "bg-gray-300"}`} />
                Deep Search
              </button>

              {/* grow */}
              <div className="flex-1" />

              {/* right side counters and submit */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-gray-200 bg-gray-50">🗎</span>
                  76
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-md bg-gradient-to-br from-orange-400 to-orange-600 px-3 py-2 text-sm font-semibold text-white shadow hover:from-orange-500 hover:to-orange-700"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
