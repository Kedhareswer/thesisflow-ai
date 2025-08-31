"use client"

import React from "react"
import { useRouter } from "next/navigation"
import Sidebar from "./components/Sidebar"
import SearchBox, { type SelectionState } from "./components/SearchBox"
import { useAIChat } from "@/lib/hooks/use-ai-chat"

// Chips data
const WANT_OPTIONS: { id: SelectionState["want"]; label: string }[] = [
  { id: "search_papers", label: "Search research papers" },
  { id: "write_report", label: "Write a report" },
  { id: "review_literature", label: "Review literature" },
  { id: "analyse_data", label: "Analyse data" },
  { id: "extract_data", label: "Extract data" },
  { id: "review_writing", label: "Review my writing" },
]

const USE_OPTIONS: { id: string; label: string }[] = [
  { id: "deep_review", label: "Deep Review" },
  { id: "arxiv", label: "arXiv" },
  { id: "pubmed", label: "PubMed" },
  { id: "google_scholar", label: "Google Scholar" },
  { id: "grants_gov", label: "Grants.gov" },
  { id: "python_library", label: "Python library" },
]

const MAKE_OPTIONS: { id: string; label: string }[] = [
  { id: "website", label: "a Website" },
  { id: "latex_manuscript", label: "a LaTeX manuscript" },
  { id: "data_visualisation", label: "a Data visualisation" },
  { id: "ppt_presentation", label: "a PPT presentation" },
  { id: "word_document", label: "a Word document" },
  { id: "pdf_report", label: "a PDF report" },
]

// -------- Helpers to detect and refine paper-search prompts ---------
function ai_stripTrailingSuffix(text: string): string {
  return text.replace(/\s+(using\s+[^.]+)?(\s+and create\s+[^.]+)?\s*\.*\s*$/i, "")
}

function ai_extractSubjectFromPrompt(prompt: string): string {
  const cleaned = ai_stripTrailingSuffix(prompt)
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
    return subject || "__________"
  }
  return "__________"
}

function ai_buildRefinedQuery(want: SelectionState["want"], subject: string): string {
  const s = subject && subject !== "__________" ? subject : "__________"
  if (want === "review_literature") return `Review literature on ${s}.`
  return `Search research papers on ${s}.`
}

function ai_inferQuality(sel: SelectionState): "standard" | "high-quality" | "deep-review" {
  if (sel.use?.includes("deep_review")) return "deep-review"
  if (sel.use?.some((u) => ["arxiv", "pubmed", "google_scholar"].includes(u))) return "high-quality"
  return "standard"
}

function ai_isPaperSearchIntent(q: string, sel: SelectionState): boolean {
  const t = q.toLowerCase()
  if (sel.want === "search_papers" || sel.want === "review_literature") return true
  if (sel.use?.some((u) => ["arxiv", "pubmed", "google_scholar", "deep_review"].includes(u))) return true
  const mentionsPapers = /(paper|papers|study|studies|article|articles)/i.test(t)
  const mentionsSearch = /(search|find|look up|get|discover)/i.test(t)
  const mentionsLitReview = /(literature review|review literature)/i.test(t)
  return (mentionsSearch && mentionsPapers) || mentionsLitReview
}

function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        `whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors ` +
        (active
          ? "border-orange-500 bg-orange-50 text-orange-700"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50")
      }
    >
      {children}
    </button>
  )
}

export default function AIAgentsPage() {
  const router = useRouter()
  const { createSession } = useAIChat()
  const [collapsed, setCollapsed] = React.useState(false)
  const [selection, setSelection] = React.useState<SelectionState>({ want: "", use: [], make: [] })
  const [value, setValue] = React.useState("")

  const handleCreateChat = (query: string, selOverride?: SelectionState) => {
    if (!query.trim()) return
    const q = query.trim()
    const sel = selOverride ?? selection

    // If the user's intent is to search papers / do literature review, redirect to Literature Review
    if (ai_isPaperSearchIntent(q, sel)) {
      const subject = ai_extractSubjectFromPrompt(q)
      const refined = ai_buildRefinedQuery(sel.want, subject)
      const quality = ai_inferQuality(sel)
      const params = new URLSearchParams({ prefill: refined, quality })
      router.push(`/literature-review?${params.toString()}`)
      return
    }

    // Otherwise, create a normal AI Agent chat session
    const sessionId = createSession({
      want: sel.want || "search_papers",
      use: sel.use,
      make: sel.make,
      query: q,
    })
    router.push(`/ai-agents/chat/${sessionId}`)
  }

  const handlePopularTaskClick = (task: string) => {
    // Extract task components and set selection
    let nextSel: SelectionState = { want: "", use: [], make: [] }
    if (task.includes("Deep Research")) {
      // Deep Research is distinct from Deep Review; do not auto-toggle deep_review here
      nextSel = { want: "review_literature", use: [], make: ["pdf_report"] }
    } else if (task.includes("arXiv") && task.includes("Google Scholar")) {
      nextSel = { want: "search_papers", use: ["arxiv", "google_scholar"], make: [] }
    } else if (task.includes("PDF papers")) {
      nextSel = { want: "extract_data", use: [], make: ["word_document"] }
    } else if (task.includes("customer churn")) {
      nextSel = { want: "analyse_data", use: [], make: ["data_visualisation"] }
    }

    setSelection(nextSel)
    setValue(task)
    handleCreateChat(task, nextSel)
  }

  const toggleMulti = (group: "use" | "make", id: string) => {
    setSelection((prev) => {
      const exists = prev[group].includes(id)
      const nextArr = exists ? prev[group].filter((x) => x !== id) : Array.from(new Set([...prev[group], id]))
      return { ...prev, [group]: nextArr }
    })
  }

  const setWant = (id: SelectionState["want"]) => {
    setSelection((prev) => ({ ...prev, want: id }))
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      {/* Sidebar (sticky, collapsible) */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Right column */}
      <div className="flex min-h-screen flex-1 flex-col">

        {/* Main content scrolls */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {/* Hero */}
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
              ✨ Newly Launched
            </span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Everyday Research Tasks</h1>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-gray-600">
              Plan, search, analyze and create with ThesisFlow-AI. Compose your task and run a deep review across arXiv,
              PubMed, Google Scholar and more.
            </p>
          </div>

          {/* Search card */}
          <SearchBox 
            selection={selection} 
            setSelection={setSelection} 
            value={value} 
            setValue={setValue}
            onSubmitQuery={handleCreateChat}
          />

          {/* Builder sections */}
          <section className="mt-10">
            <div className="mb-3 text-sm font-semibold text-gray-800">Build your task</div>
            {/* WANT */}
            <div className="mb-5">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">I WANT TO</div>
              <div className="flex flex-wrap gap-2">
                {WANT_OPTIONS.map((opt) => (
                  <Chip key={opt.id} active={selection.want === opt.id} onClick={() => setWant(opt.id)}>
                    {opt.label}
                  </Chip>
                ))}
              </div>
            </div>

            {/* USE */}
            <div className="mb-5">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">USE</div>
              <div className="flex flex-wrap gap-2">
                {USE_OPTIONS.map((opt) => (
                  <Chip key={opt.id} active={selection.use.includes(opt.id)} onClick={() => toggleMulti("use", opt.id)}>
                    {opt.label}
                  </Chip>
                ))}
              </div>
            </div>

            {/* MAKE */}
            <div className="mb-2">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">MORE / MAKE</div>
              <div className="flex flex-wrap gap-2">
                {MAKE_OPTIONS.map((opt) => (
                  <Chip key={opt.id} active={selection.make.includes(opt.id)} onClick={() => toggleMulti("make", opt.id)}>
                    {opt.label}
                  </Chip>
                ))}
              </div>
            </div>
          </section>

          {/* Popular tasks */}
          <section className="mt-10">
            <div className="mb-3 text-sm font-semibold text-gray-800">Popular Tasks</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                "Review literature on diffusion models using Deep Research and create a PDF report.",
                "Search research papers on LLM evaluation using arXiv and Google Scholar.",
                "Extract data from PDF papers and create a Word document.",
                "Analyse data on customer churn and create a Data visualisation.",
              ].map((t, i) => (
                <div 
                  key={i} 
                  onClick={() => handlePopularTaskClick(t)}
                  className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors hover:border-orange-300"
                >
                  {t}
                </div>
              ))}
            </div>
          </section>
        </main>

      </div>
    </div>
  )
}
