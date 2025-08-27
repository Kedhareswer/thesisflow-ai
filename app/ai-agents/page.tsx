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
  { id: "find_grants", label: "Find grants" },
  { id: "extract_data", label: "Extract data" },
  { id: "review_writing", label: "Review my writing" },
  { id: "search_patents", label: "Search patents" },
]

const USE_OPTIONS: { id: string; label: string }[] = [
  { id: "deep_review", label: "Deep Review" },
  { id: "arxiv", label: "arXiv" },
  { id: "pubmed", label: "PubMed" },
  { id: "google_scholar", label: "Google Scholar" },
  { id: "grants_gov", label: "Grants.gov" },
  { id: "clinical_trials", label: "ClinicalTrials" },
  { id: "python_library", label: "Python library" },
  { id: "google_patents", label: "Google Patents" },
]

const MAKE_OPTIONS: { id: string; label: string }[] = [
  { id: "website", label: "a Website" },
  { id: "latex_manuscript", label: "a LaTeX manuscript" },
  { id: "data_visualisation", label: "a Data visualisation" },
  { id: "ppt_presentation", label: "a PPT presentation" },
  { id: "latex_poster", label: "a LaTeX poster" },
  { id: "word_document", label: "a Word document" },
  { id: "pdf_report", label: "a PDF report" },
  { id: "interactive_app", label: "an Interactive app" },
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
  const [selection, setSelection] = React.useState<SelectionState>({ want: "search_papers", use: [], make: [] })
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
        {/* Top header within page (below global nav) */}
        <div className="sticky top-16 z-10 border-b border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-end px-4">
            <a
              href="/plan"
              className="inline-flex items-center rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-orange-600"
            >
              Pricing
            </a>
          </div>
        </div>

        {/* Main content scrolls */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {/* Hero */}
          <div className="mb-6">
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
                "Review literature on diffusion models using Deep Review and create a PDF report.",
                "Search research papers on LLM evaluation using arXiv and Google Scholar.",
                "Find grants for climate adaptation and create a PPT presentation.",
                "Analyse data on customer churn and create a Data visualisation.",
              ].map((t, i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 hover:bg-gray-50">
                  {t}
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <div className="text-sm font-semibold text-gray-900">Tools</div>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                <li>AI Agent</li>
                <li>AI Writer</li>
                <li>Chat with PDF</li>
                <li>Literature Review</li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">ThesisFlow-AI</div>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                <li>Pricing</li>
                <li>Docs</li>
                <li>Blog</li>
                <li>Careers</li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Directories</div>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                <li>arXiv</li>
                <li>PubMed</li>
                <li>Scholar</li>
                <li>Patents</li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Extensions & Apps</div>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                <li>Chrome</li>
                <li>VS Code</li>
                <li>iOS</li>
                <li>Android</li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Contact</div>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                <li>hello@thesisflow.ai</li>
                <li>Support</li>
                <li>Status</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-orange-500 text-white">T</span>
                ThesisFlow-AI
              </div>
              <div className="text-xs text-gray-500">© {new Date().getFullYear()} ThesisFlow-AI. All rights reserved.</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
