"use client"

import React, { useMemo, useState, useCallback } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { Search, Copy, Check, Download, Trash2, Plus, BookOpen, Upload, FolderPlus } from "lucide-react"
import type { Citation, FormattedCitation } from "@/lib/services/citation.service"
import { citationService } from "@/lib/services/citation.service"
import { useToast } from "@/components/ui/use-toast"
import { useDropzone } from "react-dropzone"

export default function CitationsPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [input, setInput] = useState("")
  const [style, setStyle] = useState<
    "apa" | "mla" | "chicago" | "harvard" | "ieee" | "vancouver" | "bibtex"
  >("apa")
  const [manualMode, setManualMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultCitation, setResultCitation] = useState<Citation | null>(null)
  const [formatted, setFormatted] = useState<FormattedCitation | null>(null)
  const [copied, setCopied] = useState(false)
  const [bibliography, setBibliography] = useState<
    { citation: Citation; formatted: FormattedCitation }[]
  >([])
  const [manual, setManual] = useState<Citation>({
    type: "article",
    title: "",
    authors: [],
    year: undefined,
    journal: undefined,
    volume: undefined,
    issue: undefined,
    pages: undefined,
    doi: undefined,
    url: undefined,
    publisher: undefined,
    accessDate: undefined,
  })

  const { toast } = useToast()

  // Simple PDF import placeholder using react-dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles?.length) return
    // Placeholder UX: acknowledge upload; parsing can be added later
    toast({ title: "Import received", description: `${acceptedFiles.length} file(s) uploaded. Metadata extraction coming soon.` })
  }, [toast])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { "application/pdf": [".pdf"] },
  })

  function getFormattedString(
    f: FormattedCitation,
    s: "apa" | "mla" | "chicago" | "harvard" | "ieee" | "vancouver" | "bibtex",
  ): string {
    switch (s) {
      case "apa":
        return f.apa
      case "mla":
        return f.mla
      case "chicago":
        return f.chicago
      case "harvard":
        return f.harvard
      case "ieee":
        return f.ieee
      case "vancouver":
        return f.vancouver
      case "bibtex":
        return f.bibtex
      default:
        return f.apa
    }
  }

  const currentText = useMemo(() => {
    if (!formatted) return ""
    return getFormattedString(formatted, style)
  }, [formatted, style])

  async function fetchCitation() {
    const value = input.trim()
    if (!value) return
    setLoading(true)
    setError(null)
    setFormatted(null)
    setResultCitation(null)
    try {
      const res = await fetch("/api/citation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: value, type: "auto" }),
      })
      if (!res.ok) {
        let msg = "Failed to fetch citation"
        try {
          const j = await res.json()
          msg = j?.error || msg
        } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      setResultCitation(data.citation as Citation)
      setFormatted(data.formatted as FormattedCitation)
    } catch (e: any) {
      setError(e?.message || "Failed to generate citation. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function formatManualCitation() {
    setError(null)
    try {
      const cleaned: Citation = {
        ...manual,
        authors: (manual.authors || []).filter(Boolean),
        year: manual.year ? String(manual.year) : undefined,
      }
      const f = citationService.formatCitation(cleaned)
      setResultCitation(cleaned)
      setFormatted(f)
    } catch {
      setError("Failed to format manual citation.")
    }
  }

  function handleGenerate() {
    if (manualMode) formatManualCitation()
    else fetchCitation()
  }

  function handleCopy(text: string) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  function addCurrentToBibliography() {
    if (!resultCitation || !formatted) return
    setBibliography((prev) => {
      const exists = prev.some(
        (it) =>
          (resultCitation.doi && it.citation.doi === resultCitation.doi) ||
          (it.citation.title === resultCitation.title && it.citation.year === resultCitation.year),
      )
      if (exists) return prev
      return [...prev, { citation: resultCitation, formatted }]
    })
  }

  function removeFromBibliography(index: number) {
    setBibliography((prev) => prev.filter((_, i) => i !== index))
  }

  function exportBibliographyAs(
    fmt: "apa" | "mla" | "chicago" | "harvard" | "ieee" | "vancouver" | "bibtex",
  ) {
    if (bibliography.length === 0) return
    const content = bibliography
      .map((it) => getFormattedString(it.formatted, fmt))
      .join("\n\n")
    const filename = `bibliography-${fmt}.${fmt === "bibtex" ? "bib" : "txt"}`
    const mime = fmt === "bibtex" ? "application/x-bibtex" : "text/plain"
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {/* Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Citation Generator
            </h1>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-gray-600">
              Generate accurate citations in APA, MLA, Chicago, Harvard, IEEE, Vancouver, or BibTeX with ThesisFlow-AI.
            </p>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
            {/* Library Sidebar (left) */}
            <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm h-fit">
              <button className="mb-4 inline-flex items-center gap-2 rounded-md bg-[#ee691a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#d85f18]">
                <Plus className="h-4 w-4" /> Add references
              </button>
              <div
                {...getRootProps({
                  className: `mb-4 border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition ${isDragActive ? 'border-[#ee691a] bg-orange-50' : 'border-gray-300 bg-gray-50/60 hover:border-[#ee691a]'} `,
                })}
                aria-label="Upload PDFs"
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2 text-gray-600">
                  <Upload className="h-5 w-5" />
                  <p className="text-xs">Drop PDFs here or click to upload</p>
                </div>
              </div>
              <nav aria-label="Library Navigation" className="space-y-2 text-sm">
                <div className="font-medium text-gray-700">All References</div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Bibliography</span>
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-[#ee691a]">{bibliography.length}</span>
                </div>
                <div className="text-gray-600">Recently Added</div>
                <div className="text-gray-600">Favorites</div>
                <div className="mt-3 border-t pt-3 text-gray-700 font-medium">Collections</div>
                <button className="inline-flex items-center gap-2 text-[#ee691a] hover:underline">
                  <FolderPlus className="h-4 w-4" /> Create collection
                </button>
              </nav>
            </aside>

            {/* Workspace (right) */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Input Panel */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              {/* Mode Toggle */}
              <div className="mb-5 flex items-center gap-2">
                <button
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    !manualMode
                      ? "bg-[#ee691a] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => setManualMode(false)}
                >
                  DOI / URL
                </button>
                <button
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    manualMode
                      ? "bg-[#ee691a] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => setManualMode(true)}
                >
                  Manual Entry
                </button>
              </div>

              {!manualMode ? (
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-700">DOI or URL</label>
                  <div className="flex items-center gap-2">
                    <div className="relative w-full">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleGenerate()
                        }}
                        placeholder="e.g., 10.1038/s41586-020-2649-2 or https://doi.org/..."
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                      />
                    </div>
                    <button
                      onClick={handleGenerate}
                      disabled={loading || !input.trim()}
                      className="inline-flex items-center rounded-lg bg-[#ee691a] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d85f18] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Generating..." : "Generate"}
                    </button>
                  </div>

                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Tip: Paste a DOI, arXiv, PubMed, or any article URL. We'll fetch metadata and format it for you.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={manual.type}
                        onChange={(e) => setManual({ ...manual, type: e.target.value as Citation["type"] })}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                      >
                        <option value="article">Article</option>
                        <option value="book">Book</option>
                        <option value="website">Website</option>
                        <option value="conference">Conference</option>
                        <option value="thesis">Thesis</option>
                        <option value="report">Report</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Year</label>
                      <input
                        value={manual.year || ""}
                        onChange={(e) => setManual({ ...manual, year: e.target.value || undefined })}
                        placeholder="2024"
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Title</label>
                    <input
                      value={manual.title}
                      onChange={(e) => setManual({ ...manual, title: e.target.value })}
                      placeholder="Title of the work"
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Authors</label>
                    <input
                      value={(manual.authors || []).join(", ")}
                      onChange={(e) =>
                        setManual({ ...manual, authors: e.target.value.split(",").map((a) => a.trim()) })
                      }
                      placeholder="Author 1, Author 2, Author 3"
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Journal / Source</label>
                      <input
                        value={manual.journal || ""}
                        onChange={(e) => setManual({ ...manual, journal: e.target.value || undefined })}
                        placeholder="Journal or website"
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Volume</label>
                        <input
                          value={manual.volume || ""}
                          onChange={(e) => setManual({ ...manual, volume: e.target.value || undefined })}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Issue</label>
                        <input
                          value={manual.issue || ""}
                          onChange={(e) => setManual({ ...manual, issue: e.target.value || undefined })}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Pages</label>
                      <input
                        value={manual.pages || ""}
                        onChange={(e) => setManual({ ...manual, pages: e.target.value || undefined })}
                        placeholder="12-34"
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Publisher</label>
                      <input
                        value={manual.publisher || ""}
                        onChange={(e) => setManual({ ...manual, publisher: e.target.value || undefined })}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">DOI</label>
                      <input
                        value={manual.doi || ""}
                        onChange={(e) => setManual({ ...manual, doi: e.target.value || undefined })}
                        placeholder="10.xxxx/xxxx"
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">URL</label>
                      <input
                        value={manual.url || ""}
                        onChange={(e) => setManual({ ...manual, url: e.target.value || undefined })}
                        placeholder="https://..."
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={formatManualCitation}
                      className="inline-flex items-center rounded-lg bg-[#ee691a] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d85f18]"
                    >
                      Format Citation
                    </button>
                  </div>
                </div>
              )}
              </div>

              {/* Result Panel */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Style</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as any)}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-[#ee691a] focus:ring-1 focus:ring-[#ee691a]"
                  >
                    <option value="apa">APA</option>
                    <option value="mla">MLA</option>
                    <option value="chicago">Chicago</option>
                    <option value="harvard">Harvard</option>
                    <option value="ieee">IEEE</option>
                    <option value="vancouver">Vancouver</option>
                    <option value="bibtex">BibTeX</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(currentText)}
                    disabled={!currentText}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={addCurrentToBibliography}
                    disabled={!resultCitation || !formatted}
                    className="inline-flex items-center gap-1 rounded-md bg-[#ee691a] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#d85f18] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Add to Bibliography
                  </button>
                </div>
              </div>

              <div className="min-h-[160px] rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                {currentText ? (
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">{currentText}</pre>
                ) : (
                  <div className="flex h-[120px] flex-col items-center justify-center text-center text-gray-500">
                    <BookOpen className="mb-2 h-6 w-6 text-gray-400" />
                    <p className="text-sm">No citation yet. Generate or format a citation to see it here.</p>
                  </div>
                )}
              </div>

              {/* Source snippet */}
              {resultCitation && (
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-2">
                  <div>
                    <span className="font-medium text-gray-700">Title:</span> {resultCitation.title || "—"}
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-gray-700">Authors:</span> {(resultCitation.authors || []).join(", ") || "—"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Year:</span> {resultCitation.year || "—"}
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-gray-700">Source:</span> {resultCitation.journal || resultCitation.publisher || resultCitation.url || "—"}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Bibliography */}
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Bibliography</h2>
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-[#ee691a]">
                  {bibliography.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportBibliographyAs(style === "bibtex" ? "apa" : style)}
                  disabled={bibliography.length === 0}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> Export ({style === "bibtex" ? "APA" : style.toUpperCase()})
                </button>
                <button
                  onClick={() => exportBibliographyAs("bibtex")}
                  disabled={bibliography.length === 0}
                  className="inline-flex items-center gap-1 rounded-md bg-[#ee691a] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#d85f18] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> Export BibTeX
                </button>
              </div>
            </div>

            {bibliography.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                <BookOpen className="mb-2 h-6 w-6 text-gray-400" />
                <p className="text-sm">No items yet. Add citations to your bibliography and export when ready.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {bibliography.map((item, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
                        {getFormattedString(item.formatted, style === "bibtex" ? "apa" : style)}
                      </pre>
                    </div>
                    <div className="mt-1 flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => handleCopy(getFormattedString(item.formatted, style === "bibtex" ? "apa" : style))}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </button>
                      <button
                        onClick={() => removeFromBibliography(idx)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

