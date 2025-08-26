"use client"

import React from "react"
import SearchBox, { type SelectionState } from "./SearchBox"
import TaskSection from "./TaskSection"
import PopularTasks from "./PopularTasks"

const wantOptions = [
  { id: "search_papers", label: "Search research papers" },
  { id: "write_report", label: "Write a report" },
  { id: "review_literature", label: "Review literature" },
  { id: "analyse_data", label: "Analyse data" },
  { id: "find_grants", label: "Find grants" },
  { id: "extract_data", label: "Extract data" },
  { id: "review_writing", label: "Review my writing" },
  { id: "search_patents", label: "Search patents" },
]

const useOptions = [
  { id: "deep_review", label: "Deep Review" },
  { id: "arxiv", label: "arXiv" },
  { id: "pubmed", label: "PubMed" },
  { id: "google_scholar", label: "Google Scholar" },
  { id: "grants_gov", label: "Grants.gov" },
  { id: "clinical_trials", label: "ClinicalTrials" },
  { id: "python_library", label: "Python library" },
  { id: "google_patents", label: "Google Patents" },
]

const makeOptions = [
  { id: "website", label: "a Website" },
  { id: "latex_manuscript", label: "a LaTeX manuscript" },
  { id: "data_visualisation", label: "a Data visualisation" },
  { id: "ppt_presentation", label: "a PPT presentation" },
  { id: "latex_poster", label: "a LaTeX poster" },
  { id: "word_document", label: "a Word document" },
  { id: "pdf_report", label: "a PDF report" },
  { id: "interactive_app", label: "an Interactive app" },
]

export default function MainContent() {
  const [selection, setSelection] = React.useState<SelectionState>({
    want: "search_papers",
    use: [],
    make: [],
  })
  const [value, setValue] = React.useState("")

  const toggleWant = (id: string) => {
    setSelection((prev) => ({ ...prev, want: id }))
  }
  const toggleUse = (id: string) => {
    setSelection((prev) => {
      const has = prev.use.includes(id)
      return { ...prev, use: has ? prev.use.filter((x) => x !== id) : [...prev.use, id] }
    })
  }
  const toggleMake = (id: string) => {
    setSelection((prev) => {
      const has = prev.make.includes(id)
      return { ...prev, make: has ? prev.make.filter((x) => x !== id) : [...prev.make, id] }
    })
  }

  const onPickPopular = (wantId: string, subject: string, useIds: string[] = [], makeIds: string[] = []) => {
    setSelection({ want: wantId, use: useIds, make: makeIds })
    // Clear to resume auto-sync; SearchBox will rebuild composed value
    setValue("")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 pt-10 pb-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 mx-auto">
            <span>✨</span>
            <span>Newly Launched</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Everyday Research Tasks</h1>
          <p className="mt-2 max-w-2xl mx-auto text-gray-600">
            Compose, search, and build outputs for your academic work with ThesisFlow-AI.
          </p>
        </section>

        {/* Search box */}
        <section className="pb-8">
          <SearchBox selection={selection} setSelection={setSelection} value={value} setValue={setValue} />
        </section>

        {/* Build your task */}
        <div className="mx-auto w-full max-w-3xl px-4 pb-3 text-center text-sm font-semibold uppercase tracking-wider text-gray-600">
          Build your task
        </div>

        <div className="space-y-6 pb-10">
          <TaskSection title="I WANT TO" options={wantOptions} selected={selection.want} onToggle={toggleWant} singleSelect />
          <TaskSection title="USE" options={useOptions} selected={selection.use} onToggle={toggleUse} />
          <TaskSection title="MORE/MAKE" options={makeOptions} selected={selection.make} onToggle={toggleMake} />
        </div>

        <div className="pb-12">
          <PopularTasks onPick={onPickPopular} />
        </div>
      </main>
    </div>
  )
}
