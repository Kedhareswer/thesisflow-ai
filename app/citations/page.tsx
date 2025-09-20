"use client"

import React, { useMemo, useState, useCallback, useEffect } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { Search, Copy, Check, Download, Trash2, Plus, BookOpen, FolderPlus, Edit3, CheckSquare, Square } from "lucide-react"
import type { Citation, FormattedCitation } from "@/lib/services/citation.service"
import { citationService } from "@/lib/services/citation.service"
import { useToast } from "@/components/ui/use-toast"
import { bibliographyService } from "@/lib/services/bibliography.service"

// Removed PDF import/upload UI from this page per request

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
    { id?: string; citation: Citation; formatted: FormattedCitation }[]
  >([])
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [selectedBib, setSelectedBib] = useState<Record<number, boolean>>({})
  const [moveTarget, setMoveTarget] = useState<string | null>(null)
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

  // PDF upload/import UI has been removed

  // Load collections and bibliography from Supabase
  useEffect(() => {
    async function load() {
      try {
        const cols = await bibliographyService.listCollections()
        setCollections(cols)
      } catch {}
      try {
        const rows = await bibliographyService.listItems(selectedCollection)
        const mapped = (rows as any[]).map((row) => {
          const csl = row.csl_json || {}
          const authors = Array.isArray(csl.author)
            ? csl.author.map((a: any) => [a.given, a.family].filter(Boolean).join(" ")).filter(Boolean)
            : []
          const c: Citation = {
            type: (csl.type === 'article-journal' ? 'article' : csl.type) || 'article',
            title: row.title || csl.title || '',
            authors,
            year: row.year || csl.issued?.['date-parts']?.[0]?.[0]?.toString(),
            journal: row.journal || csl['container-title'],
            volume: csl.volume,
            issue: csl.issue,
            pages: csl.page,
            doi: row.doi,
            url: row.url,
            publisher: csl.publisher,
            isbn: csl.ISBN,
            issn: csl.ISSN,
            accessDate: undefined,
            conference: undefined,
            edition: undefined,
            editors: undefined,
            chapter: undefined,
            institution: undefined,
          }
          const f: FormattedCitation = row.styles || citationService.formatCitation(c)
          return { id: row.id, citation: c, formatted: f }
        })
        setBibliography(mapped)
      } catch {}
    }
    load()
  }, [selectedCollection])

  // Collections management
  async function handleCreateCollection() {
    const name = prompt("Collection name")?.trim()
    if (!name) return
    try {
      const col = await bibliographyService.createCollection(name)
      if (col) {
        setCollections((prev) => [...prev, { id: col.id, name: col.name }])
        setSelectedCollection(col.id)
      }
    } catch (e: any) {
      toast({ title: "Create failed", description: e?.message || "Could not create collection", variant: "destructive" })
    }
  }

  async function handleRenameCollection(id: string) {
    const current = collections.find((c) => c.id === id)?.name || ""
    const name = prompt("Rename collection", current)?.trim()
    if (!name) return
    try {
      await bibliographyService.renameCollection(id, name)
      setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
    } catch (e: any) {
      toast({ title: "Rename failed", description: e?.message || "Could not rename collection", variant: "destructive" })
    }
  }

  async function handleDeleteCollection(id: string) {
    if (!confirm("Delete this collection? Items will remain unassigned.")) return
    try {
      await bibliographyService.deleteCollection(id)
      setCollections((prev) => prev.filter((c) => c.id !== id))
      if (selectedCollection === id) setSelectedCollection(null)
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Could not delete collection", variant: "destructive" })
    }
  }

  async function handleMoveSelected(targetId: string | null) {
    const indices = Object.entries(selectedBib).filter(([, v]) => v).map(([k]) => Number(k))
    await Promise.all(indices.map(async (i) => {
      const item = bibliography[i]
      if (item?.id) await bibliographyService.moveItem(item.id, targetId)
    }))
    toast({ title: "Moved", description: `${indices.length} item(s) moved.` })
  }

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

  function exportCSLJSON() {
    if (bibliography.length === 0) return
    const items = bibliography.map((it) => citationService.toCSLJSON(it.citation))
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "bibliography.csl.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function exportRIS() {
    if (bibliography.length === 0) return
    const content = bibliography.map((it) => citationService.toRIS(it.citation)).join("\n\n")
    const blob = new Blob([content], { type: "application/x-research-info-systems" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "bibliography.ris"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Drag-and-drop helpers removed along with upload/import UI


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
    ;(async () => {
      try {
        const row = await bibliographyService.addItem(resultCitation, formatted, selectedCollection)
        setBibliography((prev) => {
          const exists = prev.some(
            (it) =>
              (resultCitation.doi && it.citation.doi === resultCitation.doi) ||
              (it.citation.title === resultCitation.title && it.citation.year === resultCitation.year),
          )
          if (exists) return prev
          return [...prev, { id: row?.id, citation: resultCitation, formatted }]
        })
        toast({ title: "Added to bibliography" })
      } catch (e: any) {
        toast({ title: "Save failed", description: e?.message || "Could not save to library", variant: "destructive" })
      }
    })()
  }

  function removeFromBibliography(index: number) {
    const item = bibliography[index]
    setBibliography((prev) => prev.filter((_, i) => i !== index))
    if (item?.id) {
      bibliographyService.removeItem(item.id).catch(() => {})
    }
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
            {/* Library Sidebar (left) - simplified (upload removed) */}
            <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm h-fit">
              {/* Upload/Add References UI removed */}
              <nav aria-label="Library Navigation" className="space-y-2 text-sm">
                <div className="font-medium text-gray-700">All References</div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Bibliography</span>
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-[#ee691a]">{bibliography.length}</span>
                </div>
                <div className="text-gray-600">Recently Added</div>
                <div className="text-gray-600">Favorites</div>
                <div className="mt-3 border-t pt-3 text-gray-700 font-medium flex items-center justify-between">
                  <span>Collections</span>
                  <button onClick={handleCreateCollection} className="inline-flex items-center gap-1 text-[#ee691a] hover:underline text-xs">
                    <FolderPlus className="h-4 w-4" /> New
                  </button>
                </div>
                <ul className="space-y-1">
                  {collections.map((c) => (
                    <li key={c.id} className={`flex items-center justify-between rounded px-2 py-1 ${selectedCollection===c.id? 'bg-orange-50 text-[#ee691a]' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <button onClick={() => setSelectedCollection(c.id)} className="flex-1 text-left truncate">{c.name}</button>
                      <button onClick={() => handleRenameCollection(c.id)} className="ml-2 text-gray-500 hover:text-gray-700" title="Rename"><Edit3 className="h-4 w-4"/></button>
                      <button onClick={() => handleDeleteCollection(c.id)} className="ml-1 text-gray-500 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4"/></button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <label className="text-xs text-gray-600">Move selected to</label>
                  <div className="mt-1 flex items-center gap-2">
                    <select value={moveTarget ?? ''} onChange={(e)=>setMoveTarget(e.target.value||null)} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
                      <option value="">Unassigned</option>
                      {collections.map(c=> (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                    <button onClick={()=>handleMoveSelected(moveTarget)} className="rounded bg-gray-800 px-2 py-1 text-xs text-white">Move</button>
                  </div>
                </div>
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
                    <span className="font-medium text-gray-700">Title:</span> {resultCitation?.title || "—"}
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-gray-700">Authors:</span> {(resultCitation?.authors || []).join(", ") || "—"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Year:</span> {resultCitation?.year || "—"}
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-gray-700">Source:</span> {resultCitation?.journal || resultCitation?.publisher || resultCitation?.url || "—"}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Imported results UI removed */}

          {/* Bibliography */}
          <div
            className={`mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm`}
            aria-label="Bibliography"
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Bibliography</h2>
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-[#ee691a]">
                  {bibliography.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportCSLJSON}
                  disabled={bibliography.length === 0}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> Export CSL-JSON
                </button>
                <button
                  onClick={exportRIS}
                  disabled={bibliography.length === 0}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> Export RIS
                </button>
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
                    <button
                      onClick={()=> setSelectedBib(prev=> ({...prev, [idx]: !prev[idx]}))}
                      className="mt-0.5 text-gray-600 hover:text-gray-900">
                      {selectedBib[idx] ? <CheckSquare className="h-4 w-4"/> : <Square className="h-4 w-4"/>}
                    </button>
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

