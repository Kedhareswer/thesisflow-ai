"use client"

import React from "react"
import Sidebar from "./components/Sidebar"
import SearchBox, { type SelectionState } from "./components/SearchBox"

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
  const [collapsed, setCollapsed] = React.useState(false)
  const [selection, setSelection] = React.useState<SelectionState>({ want: "", use: [], make: [] })
  const [value, setValue] = React.useState("")

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
          <SearchBox selection={selection} setSelection={setSelection} value={value} setValue={setValue} />

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
                <div key={i} className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 hover:bg-gray-50">
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
