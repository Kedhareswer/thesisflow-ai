"use client"

import React from "react"

export type SelectionState = {
  want: string
  use: string[]
  make: string[]
}

const wantTemplates: Record<string, string> = {
  search_papers: "Search research papers on __________",
  write_report: "Write a report on __________",
  review_literature: "Review literature on __________",
  extract_data: "Extract data from __________",
  review_writing: "Review my writing about __________",
  search_patents: "Search patents related to __________",
}

const useLabels: Record<string, string> = {
  deep_review: "Deep Review",
  arxiv: "arXiv",
  pubmed: "PubMed",
  google_scholar: "Google Scholar",
  grants_gov: "Grants.gov",
  clinical_trials: "ClinicalTrials",
  python_library: "Python library",
  google_patents: "Google Patents",
}

const makeLabels: Record<string, string> = {
  website: "a Website",
  latex_manuscript: "a LaTeX manuscript",
  data_visualisation: "a Data visualisation",
  ppt_presentation: "a PPT presentation",
  word_document: "a Word document",
  pdf_report: "a PDF report",
}

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
  return parts.length ? " " + parts.join(" ") + "." : "."
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
  const tmpl = wantTemplates[want] ?? wantTemplates.search_papers
  return tmpl.replace("__________", subject || "__________")
}

function replaceSuffixKeepingBase(current: string, newSuffix: string): string {
  // Remove any trailing generated suffix and trailing periods from current
  const baseOnly = stripTrailingSuffix(current).replace(/\.+\s*$/, "")
  return baseOnly + newSuffix
}

export default function SearchBox({
  selection,
  setSelection,
  value,
  setValue,
}: {
  selection: SelectionState
  setSelection: (s: SelectionState) => void
  value: string
  setValue: React.Dispatch<React.SetStateAction<string>>
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const [userEdited, setUserEdited] = React.useState(false)

  // Compute composed value
  const subject = React.useMemo(() => extractSubjectFromPrompt(value || buildBase(selection.want, "__________")), [value, selection.want])
  const composed = React.useMemo(() => {
    const base = buildBase(selection.want, subject)
    const suffix = composeSuffix(selection.use, selection.make)
    return base + suffix
  }, [selection.want, selection.use, selection.make, subject])

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

  // Deep Review pill sync
  const deepOn = selection.use.includes("deep_review")
  const toggleDeep = () => {
    const nextUse = deepOn
      ? selection.use.filter((u) => u !== "deep_review")
      : Array.from(new Set([...(selection.use || []), "deep_review"]))
    const nextSel = { ...selection, use: nextUse }
    setSelection(nextSel)
    // Update trailing parts even when user edited
    const suffix = composeSuffix(nextUse, selection.make)
    setValue((prev) => replaceSuffixKeepingBase(prev || composed, suffix))
  }

  const onSubmit = () => {
    // For now, just console log; wire to your flow as needed
    // You can replace this with navigation or API call
    console.log("Submit query:", value)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

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
          placeholder="Type your research task..."
          className="min-h-[88px] w-full resize-none rounded-md p-3 text-[15px] leading-relaxed text-gray-800 outline-none placeholder:text-gray-400"
        />

        {/* bottom bar */}
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md border-t border-gray-100 px-2 py-2">
          {/* left: paperclip */}
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50" title="Attach files">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 11-8.49-8.49l9.19-9.19a4 4 0 115.66 5.66L9.88 17.94a2 2 0 11-2.83-2.83l8.49-8.49" />
            </svg>
          </button>

          {/* center-left: Deep Search pill */}
          <button
            onClick={toggleDeep}
            className={`ml-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
              deepOn ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            title="Deep Review"
          >
            <span className={`h-2 w-2 rounded-full ${deepOn ? "bg-orange-500" : "bg-gray-300"}`} />
            Deep Search
          </button>

          {/* right: submit */}
          <button
            onClick={onSubmit}
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-gradient-to-br from-orange-400 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow hover:from-orange-500 hover:to-orange-700"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
