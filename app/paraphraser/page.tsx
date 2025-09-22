"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { FileText, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

// Minimal paraphraser page – clean UI focused on input → output

export default function ParaphraserPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [inputText, setInputText] = useState('')
  const [activeTab, setActiveTab] = useState('Academic')
  const [preserveLength, setPreserveLength] = useState(true)
  const [variationLevel, setVariationLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [isLoading, setIsLoading] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [resultText, setResultText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [highlightChanges, setHighlightChanges] = useState(false)
  const [showRemovals, setShowRemovals] = useState(false)
  const [diffMode, setDiffMode] = useState<'word' | 'sentence'>('word')

  // Streaming state (always-on)
  const [streamProgress, setStreamProgress] = useState<number | undefined>(undefined)
  const esRef = useRef<EventSource | null>(null)
  const mountedRef = useRef<boolean>(true)

  // Ensure we don't leak EventSource connections or set state after unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (esRef.current) {
        try { esRef.current.close() } catch {}
        esRef.current = null
      }
    }
  }, [])

  const morePresets = ['Academic', 'Fluent', 'Formal', 'Creative', 'Casual', 'Technical', 'Simple']

  const TAB_TO_MODE: Record<string, 'academic' | 'casual' | 'formal' | 'creative' | 'technical' | 'simple' | 'fluent'> = {
    Academic: 'academic',
    Fluent: 'fluent',
    Formal: 'formal',
    Creative: 'creative',
    Casual: 'casual',
    Technical: 'technical',
    Simple: 'simple',
    Professional: 'formal',
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    // Enforce 500-word limit for better performance and UX
    const parts = text.trim() ? text.trim().split(/\s+/) : []
    const limited = parts.length > 500 ? parts.slice(0, 500).join(' ') : text
    setInputText(limited)
    const words = limited.trim() ? limited.trim().split(/\s+/).length : 0
    setWordCount(words)
  }

  const handleParaphrase = useCallback(async () => {
    if (!inputText.trim()) return
    setIsLoading(true)
    setError(null)
    setResultText('')
    try {
      const mode = TAB_TO_MODE[activeTab] || 'academic'

      // Streaming via SSE (always on)
      setStreamProgress(0)

      // Build EventSource URL (rely on cookie-based auth with withCredentials)
      const params = new URLSearchParams()
      params.set('text', inputText)
      params.set('mode', mode)
      params.set('preserveLength', String(preserveLength))
      params.set('variationLevel', variationLevel)
      // Note: JWTs should never be placed in query params for security reasons
      // Using withCredentials for cookie-based authentication instead

      const url = `/api/paraphraser/stream?${params.toString()}`
      const es = new EventSource(url, { withCredentials: true })
      esRef.current = es

      es.onmessage = (ev) => {
        if (!mountedRef.current || esRef.current !== es) return
        try {
          const payload = JSON.parse(ev.data)
          const type = payload?.type
          if (type === 'token') {
            if (!mountedRef.current) return
            setResultText((prev) => (prev || '') + (payload.token || ''))
          } else if (type === 'progress') {
            if (!mountedRef.current) return
            if (typeof payload.percentage === 'number') setStreamProgress(payload.percentage)
          } else if (type === 'error') {
            // Handle error object properly to avoid React error #31
            const errorMessage = payload.error && typeof payload.error === 'object' 
              ? payload.error.message || String(payload.error)
              : payload.error || 'Streaming error'
            if (!mountedRef.current) return
            setError(errorMessage)
          } else if (type === 'done') {
            if (!mountedRef.current) return
            setIsLoading(false)
            setStreamProgress(100)
            try { es.close() } catch {}
            esRef.current = null
          }
        } catch {}
      }

      es.onerror = () => {
        if (!mountedRef.current || esRef.current !== es) return
        setIsLoading(false)
        setError('Streaming connection error')
        try { es.close() } catch {}
        esRef.current = null
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to paraphrase')
      setIsLoading(false)
    }
  }, [inputText, activeTab, preserveLength, variationLevel])

  const stopStreaming = () => {
    if (esRef.current) {
      try { esRef.current.close() } catch {}
      esRef.current = null
    }
    setIsLoading(false)
    setStreamProgress(undefined)
  }

  const trySampleText = () => {
    const sampleText = "The rapid advancement of artificial intelligence has transformed various industries and continues to shape the future of technology. Machine learning algorithms and neural networks have enabled computers to perform complex tasks that were once thought to be exclusively human capabilities."
    setInputText(sampleText)
    setWordCount(sampleText.split(/\s+/).length)
  }

  const handleCopyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text) } catch {}
  }

  const handleClearInput = () => {
    setInputText('')
    setWordCount(0)
  }

  const handleUseOutputAsInput = () => {
    const text = resultText
    if (!text) return
    setInputText(text)
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    setWordCount(words)
    setResultText('')
  }

  const getDisplayedText = () => resultText

  // Simple word-level diff (LCS) to highlight additions and removals in output
  const renderDiff = (a: string, b: string) => {
    const aTokens = (a || '').trim().split(/\s+/).filter(Boolean)
    const bTokens = (b || '').trim().split(/\s+/).filter(Boolean)
    const n = aTokens.length, m = bTokens.length
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        dp[i][j] = aTokens[i - 1] === bTokens[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
    const ops: Array<{ token: string; type: 'same' | 'add' | 'remove' }> = []
    let i = n, j = m
    while (i > 0 && j > 0) {
      if (aTokens[i - 1] === bTokens[j - 1]) {
        ops.push({ token: bTokens[j - 1], type: 'same' }); i--; j--
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        ops.push({ token: aTokens[i - 1], type: 'remove' }); i--
      } else {
        ops.push({ token: bTokens[j - 1], type: 'add' }); j--
      }
    }
    while (j > 0) { ops.push({ token: bTokens[j - 1], type: 'add' }); j-- }
    while (i > 0) { ops.push({ token: aTokens[i - 1], type: 'remove' }); i-- }
    ops.reverse()

    return (
      <span>
        {ops.map((op, idx) => (
          op.type === 'remove' && !showRemovals ? null : (
            <span
              key={idx}
              className={
                op.type === 'add'
                  ? 'bg-yellow-100 rounded px-0.5'
                  : op.type === 'remove'
                  ? 'line-through text-red-600/80'
                  : undefined
              }
            >
              {op.token}
              {idx < ops.length - 1 ? ' ' : ''}
            </span>
          )
        ))}
      </span>
    )
  }

  // Sentence-level diff: align sentences and show per-sentence changes
  const renderSentenceDiff = (a: string, b: string) => {
    const splitSentences = (t: string) => t
      .replace(/\r\n/g, '\n')
      .split(/(?<=[\.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)

    const aS = splitSentences(a)
    const bS = splitSentences(b)
    const maxLen = Math.max(aS.length, bS.length)
    const rows: Array<{ a?: string; b?: string }> = []
    for (let k = 0; k < maxLen; k++) {
      rows.push({ a: aS[k], b: bS[k] })
    }
    return (
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="">
            {row.a && row.b && row.a === row.b ? (
              <div className="text-gray-800">{row.b}</div>
            ) : (
              <div className="">
                <div className="text-xs text-gray-500 mb-1">Sentence {idx + 1}</div>
                <div className="whitespace-pre-wrap">
                  {renderDiff(row.a || '', row.b || '')}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex-1">
        {/* Main Content */}
        <div className="px-6 py-8">
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Paraphraser</h1>
            <p className="text-sm text-gray-600">Rewrite text clearly and originally.</p>
          </div>

          {/* Using default "Auto" provider/model selection */}

          {/* Content Container */}
          <div className="mx-auto w-full max-w-5xl rounded-lg border border-gray-200 bg-white">
            {/* Controls row */}
            <div className="border-b border-gray-200 px-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-3 py-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={preserveLength}
                    onChange={(e) => setPreserveLength(e.target.checked)}
                    className="h-4 w-4"
                    aria-label="Preserve length"
                  />
                  Preserve length
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <span>Variation</span>
                  <select
                    value={variationLevel}
                    onChange={(e) => setVariationLevel(e.target.value as 'low' | 'medium' | 'high')}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                    aria-label="Variation"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                {/* Changes dropdown */}
                <DropdownMenu
                  trigger={
                    <Button variant="outline" size="sm">Changes</Button>
                  }
                >
                  <div className="w-56 p-2">
                    <DropdownMenuLabel>Highlighting</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => setHighlightChanges(!highlightChanges)}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={highlightChanges}
                        onChange={() => {}}
                        className="h-4 w-4"
                        readOnly
                      />
                      Enable highlighting
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowRemovals(!showRemovals)}
                      className={`flex items-center gap-2 ${!highlightChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={showRemovals}
                        onChange={() => {}}
                        className="h-4 w-4"
                        disabled={!highlightChanges}
                        readOnly
                      />
                      Show removals
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Diff granularity</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => setDiffMode('word')}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="radio"
                        checked={diffMode === 'word'}
                        onChange={() => {}}
                        className="h-4 w-4"
                        readOnly
                      />
                      Word
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDiffMode('sentence')}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="radio"
                        checked={diffMode === 'sentence'}
                        onChange={() => {}}
                        className="h-4 w-4"
                        readOnly
                      />
                      Sentence
                    </DropdownMenuItem>
                  </div>
                </DropdownMenu>
              </div>
            </div>

            {/* Tone presets (moved all into More) */}
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 sm:px-6 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">More</span>
              <div className="flex flex-wrap items-center gap-2">
                {morePresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setActiveTab(preset)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      activeTab === preset ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-pressed={activeTab === preset}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Two-pane content */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left: input */}
              <div className="p-4 sm:p-6">
                <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
                  <span>Input</span>
                  <div className="flex items-center gap-3">
                    <button onClick={handleClearInput} className="text-gray-500 hover:text-gray-700">Clear</button>
                    {inputText && (
                      <button onClick={() => handleCopyToClipboard(inputText)} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700">
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative rounded-md border border-gray-200">
                  <textarea
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Write here or try a sample text"
                    className="h-[380px] w-full resize-none p-4 text-gray-800 placeholder-gray-400 focus:outline-none"
                    aria-label="Input text"
                  />
                  {!inputText && (
                    <button
                      onClick={trySampleText}
                      className="absolute top-14 left-6 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      try a sample text
                    </button>
                  )}
                </div>
              </div>

              {/* Right: results */}
              <div className="border-t border-gray-200 p-4 sm:p-6 md:border-t-0 md:border-l">
                <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
                  <span>Output</span>
                  <div className="flex items-center gap-3">
                    {getDisplayedText() && (
                      <>
                        <button onClick={() => handleCopyToClipboard(getDisplayedText())} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700">
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                        <button onClick={handleUseOutputAsInput} className="text-gray-500 hover:text-gray-700">Use as input</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="h-[380px] w-full overflow-auto rounded-md border border-gray-200 p-4">
                  {isLoading && !getDisplayedText() ? (
                    // shadcn Skeletons while initial tokens load
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-11/12" />
                      <Skeleton className="h-3 w-10/12" />
                      <Skeleton className="h-3 w-9/12" />
                      <Skeleton className="h-3 w-8/12" />
                    </div>
                  ) : isLoading ? (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">Streaming… {typeof streamProgress === 'number' ? `${streamProgress}%` : ''}</div>
                      <div className="whitespace-pre-wrap text-gray-800">{getDisplayedText()}</div>
                    </div>
                  ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                  ) : getDisplayedText() ? (
                    <div className="whitespace-pre-wrap text-gray-800">
                      {highlightChanges
                        ? (diffMode === 'sentence'
                            ? renderSentenceDiff(inputText, getDisplayedText())
                            : renderDiff(inputText, getDisplayedText())
                          )
                        : getDisplayedText()}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">Paraphrased text will appear here</div>
                  )}
                </div>
              </div>
              {/* Close grid container */}
            </div>
            {/* Close content container */}
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between border-t border-gray-200 px-4 sm:px-6 py-4">
            <div className="text-sm text-gray-500">{wordCount}/500 words</div>
            <div className="flex-1 flex justify-center">
              <button
                onClick={handleParaphrase}
                disabled={!inputText.trim() || isLoading}
                className="rounded-md bg-gray-900 px-6 py-2 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Processing…' : 'Paraphrase'}
              </button>
            </div>
            <div className="w-[180px] flex items-center justify-end gap-2">
              {isLoading && (
                <button onClick={stopStreaming} className="text-sm text-gray-600 hover:text-gray-800">Stop</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
