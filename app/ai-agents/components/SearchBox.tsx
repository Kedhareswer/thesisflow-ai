"use client"

import React from "react"
import MinimalAIProviderSelector from "@/components/ai-provider-selector-minimal"
import type { AIProvider } from "@/lib/ai-providers"
import { useDeepSearch } from "@/hooks/use-deep-search"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Bot } from "lucide-react"

export type SelectionState = {
  want: string
  use: string[]
  make: string[]
}

const wantTemplates: Record<string, string> = {
  search_papers: "Search research papers on __________",
  write_report: "Write a report on __________",
  review_literature: "Review literature on __________",
  analyse_data: "Analyse data on __________",
  extract_data: "Extract data from __________",
  review_writing: "Review my writing about __________",
}

const useLabels: Record<string, string> = {
  deep_review: "Deep Review",
  arxiv: "arXiv",
  pubmed: "PubMed",
  google_scholar: "Google Scholar",
  grants_gov: "Grants.gov",
  python_library: "Python library",
}

const makeLabels: Record<string, string> = {
  website: "a Website",
  latex_manuscript: "a LaTeX manuscript",
  data_visualisation: "a Data visualisation",
  ppt_presentation: "a PPT presentation",
  word_document: "a Word document",
  pdf_report: "a PDF report",
}

// Placeholder prompts to quickly get users started
const PLACEHOLDER_PROMPTS: string[] = [
  "Review literature on diffusion models using Deep Research.",
  "Search research papers on LLM evaluation using arXiv and Google Scholar.",
  "Extract data from PDF papers and create a Word document.",
  "Analyse data on customer churn and create a Data visualisation.",
  "Write a report on AI safety benchmarks and create a PDF report.",
]

function composeSuffix(use: string[], make: string[]) {
  const parts: string[] = []
  if (use.length) {
    const useText = use.map((id) => useLabels[id] ?? id).join(", ")
    parts.push(`using ${useText}`)
  }
  if (make.length) {
    const makeText = make.map((id) => makeLabels[id] ?? id).join(", ")
    parts.push(`and create ${makeText}`)
  }
  // Only add a period if there's actual content
  return parts.length ? ` ${parts.join(" ")}.` : ""
}

// Remove any trailing " using ..." and/or " and create ..." segments (plus the trailing period)
function stripTrailingSuffix(text: string): string {
  // Example matches:
  //  " ... using Google Scholar." 
  //  " ... and create a PDF report." 
  //  " ... using Google Scholar and create a PDF report."
  // Also tolerates accidental extra spaces and multiple dots at the end.
  return text.replace(/\s+(using\s+[^.]+)?(\s+and create\s+[^.]+)?\s*\.*\s*$/i, "")
}

function extractSubjectFromPrompt(prompt: string): string {
  // Work on a version without any trailing generated suffix
  const cleaned = stripTrailingSuffix(prompt)
  // Find the last occurrence of common prepositions and take the trailing part
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
    // Stop at the earliest of a period or any suffix introducer (" using ", " and create ")
    const nextUsing = after.toLowerCase().indexOf(" using ")
    const nextCreate = after.toLowerCase().indexOf(" and create ")
    const nextDot = after.indexOf(".")
    const stops = [nextUsing, nextCreate, nextDot].filter((n) => n >= 0)
    const stopAt = stops.length ? Math.min(...stops) : -1
    const subject = (stopAt >= 0 ? after.slice(0, stopAt) : after).trim()
    return subject || "__________"
  }
  return "__________"
}

function buildBase(want: string, subject: string): string {
  // If no explicit WANT is selected, do not prefill any base text
  if (!want) return ""
  const tmpl = wantTemplates[want] ?? wantTemplates.search_papers
  return tmpl.replace("__________", subject || "__________")
}

function replaceSuffixKeepingBase(current: string, newSuffix: string): string {
  // Remove any trailing generated suffix and trailing periods from current
  const baseOnly = stripTrailingSuffix(current).replace(/\.+\s*$/, "")
  return baseOnly + newSuffix
}

function toTitleCase(input: string) {
  return (input || "").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

export default function SearchBox({
  selection,
  setSelection,
  value,
  setValue,
  onSubmitQuery,
}: {
  selection: SelectionState
  setSelection: React.Dispatch<React.SetStateAction<SelectionState>>
  value: string
  setValue: React.Dispatch<React.SetStateAction<string>>
  onSubmitQuery?: (query: string) => void
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const [userEdited, setUserEdited] = React.useState(false)
  const [provider, setProvider] = React.useState<AIProvider | undefined>(undefined)
  const [model, setModel] = React.useState<string | undefined>(undefined)
  const [placeholderIndex, setPlaceholderIndex] = React.useState(0)
  const [isFocused, setIsFocused] = React.useState(false)
  const [deepResearchOn, setDeepResearchOn] = React.useState(false)

  // Deep Research hook
  const {
    items,
    summary,
    progress,
    warnings,
    notices,
    infos,
    isLoading,
    error,
    start,
    stop,
    reset,
    isStreaming,
  } = useDeepSearch()

  // Compute composed value
  const subject = React.useMemo(() => extractSubjectFromPrompt(value || buildBase(selection.want, "__________")), [value, selection.want])
  const composed = React.useMemo(() => {
    const base = buildBase(selection.want, subject)
    const suffix = composeSuffix(selection.use, selection.make)
    // Avoid rendering a lone trailing period when no base/suffix parts are present
    if (!base && suffix.trim() === ".") return ""
    return base + suffix
  }, [selection.want, selection.use, selection.make, subject])

  // Topic extraction for header/tag
  const topicTitle = React.useMemo(() => toTitleCase(subject), [subject])
  const topicTag = React.useMemo(() => {
    const words = (subject || "").split(/\s+/).filter(Boolean)
    return words.slice(0, 2).join(" ").toLowerCase() || "topic"
  }, [subject])

  // Sync rules
  React.useEffect(() => {
    if (!userEdited) {
      setValue(composed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composed, userEdited])

  const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value
    setValue(next)
    if (next.trim().length === 0) {
      setUserEdited(false)
      return
    }
    // If diverges from composed, mark as edited
    if (next !== composed) setUserEdited(true)
  }

  // Deep Research toggle (independent from Deep Review)
  const deepOn = deepResearchOn
  const toggleDeep = () => {
    const next = !deepResearchOn
    setDeepResearchOn(next)
    if (!next) {
      // Stop any running deep research stream
      stop()
    } else {
      // Start deep research with the current input
      const q = (value || composed || "").trim()
      start({ query: q, provider, model })
    }
  }

  const handleSubmit = () => {
    if (!value.trim()) return
    
    if (onSubmitQuery) {
      onSubmitQuery(value.trim())
    } else {
      console.log("Submit query:", value)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Infer selections from the user's freeform prompt when nothing is selected yet
  React.useEffect(() => {
    const text = (value || "").toLowerCase()
    if (!text.trim()) return
    setSelection((prev) => {
      if (prev.want || (prev.use && prev.use.length) || (prev.make && prev.make.length)) return prev

      let want = ""
      if ((/(paper|papers)/.test(text) && /(search|get|find|help)/.test(text)) || /search\s+.*(paper|papers)/.test(text)) {
        want = "search_papers"
      } else if (/\bwrite\b|\breport\b/.test(text)) {
        want = "write_report"
      } else if (/(literature review|review literature)/.test(text)) {
        want = "review_literature"
      } else if (/(analyse|analyze).+data/.test(text)) {
        want = "analyse_data"
      } else if (/extract.+data/.test(text)) {
        want = "extract_data"
      } else if (/review.+writing|improve.+writing/.test(text)) {
        want = "review_writing"
      }

      const useSet = new Set<string>()
      if (text.includes("arxiv")) useSet.add("arxiv")
      if (text.includes("pubmed")) useSet.add("pubmed")
      if (text.includes("google scholar") || /\bscholar\b/.test(text)) useSet.add("google_scholar")
      if (text.includes("deep review")) useSet.add("deep_review")
      if (text.includes("grants.gov")) useSet.add("grants_gov")
      if (text.includes("python")) useSet.add("python_library")

      const makeSet = new Set<string>()
      if (/\bwebsite\b|\bweb site\b/.test(text)) makeSet.add("website")
      if (/latex/.test(text) && /(manuscript|paper)/.test(text)) makeSet.add("latex_manuscript")
      if (/(visualization|visualisation|chart|graph)/.test(text)) makeSet.add("data_visualisation")
      if (/(ppt|presentation)/.test(text)) makeSet.add("ppt_presentation")
      if (/\bword\b/.test(text)) makeSet.add("word_document")
      if (/\bpdf\b/.test(text) || /\breport\b/.test(text)) makeSet.add("pdf_report")

      if (!want && useSet.size === 0 && makeSet.size === 0) return prev
      return {
        ...prev,
        want: want || prev.want,
        use: useSet.size ? Array.from(useSet) : prev.use,
        make: makeSet.size ? Array.from(makeSet) : prev.make,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // When USE/MAKE change while user edited, update only suffix
  React.useEffect(() => {
    if (userEdited && value.trim().length > 0) {
      const suffix = composeSuffix(selection.use, selection.make)
      setValue((prev) => replaceSuffixKeepingBase(prev, suffix))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.use, selection.make])

  // When WANT changes, rebuild base while preserving subject at the end
  React.useEffect(() => {
    const suffix = composeSuffix(selection.use, selection.make)
    setValue((prev) => {
      const current = prev && prev.trim().length > 0 ? prev : composed
      const subj = extractSubjectFromPrompt(current)
      const newBase = buildBase(selection.want, subj)
      return newBase + suffix
    })
    // keep userEdited state as-is per spec
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.want])

  // Cleanup deep search on unmount
  React.useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  // Rotate placeholder prompts when input is empty and not focused
  React.useEffect(() => {
    if (isFocused || (value && value.trim().length > 0)) return
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_PROMPTS.length)
    }, 3000)
    return () => window.clearInterval(id)
  }, [isFocused, value])

  const currentPlaceholder = PLACEHOLDER_PROMPTS[placeholderIndex] || ""

  return (
    <div className="relative mx-auto w-full max-w-3xl px-4">
      {/* Soft glow */}
      <div className="pointer-events-none absolute inset-x-6 -bottom-6 h-8 rounded-full bg-white opacity-70 blur-2xl" />

      <div className="relative rounded-[16px] border border-gray-200 bg-white p-3 shadow-xl min-h-[132px]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onTextChange}
          onKeyDown={onKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={currentPlaceholder}
          className="min-h-[88px] w-full resize-none rounded-md p-3 text-[15px] leading-relaxed text-gray-800 outline-none placeholder:text-gray-400"
        />

        {/* bottom bar */}
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md border-t border-gray-100 px-2 py-2">
          {/* left: provider selector */}
          <div className="hidden sm:flex items-center gap-2">
            <MinimalAIProviderSelector
              selectedProvider={provider}
              onProviderChange={(p) => {
                setProvider(p)
                // Reset model if provider changes
                setModel(undefined)
              }}
              selectedModel={model}
              onModelChange={setModel}
              variant="inline"
              showConfigLink={false}
              className=""
            />
          </div>

          {/* center-left: Deep Research pill */}
          <button
            onClick={toggleDeep}
            className={`ml-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
              deepOn ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            title="Deep Research"
          >
            <span className={`h-2 w-2 rounded-full ${deepOn ? "bg-orange-500" : "bg-gray-300"}`} />
            Deep Research
          </button>

          {/* right: submit */}
          <button
            onClick={handleSubmit}
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-gradient-to-br from-orange-400 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow hover:from-orange-500 hover:to-orange-700"
          >
            Submit
          </button>
        </div>
      </div>

      {/* Streaming results panel */}
      {(deepOn && (isLoading || !!error || items.length > 0 || !!summary || warnings.length > 0 || notices.length > 0)) && (
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
                <p>I understand you're interested in deep research for <span className="font-semibold">{topicTitle}</span>. To provide the most valuable and focused assistance, here are a few quick questions to narrow down your research focus:</p>
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
  )
}
