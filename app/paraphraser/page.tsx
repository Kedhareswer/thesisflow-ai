"use client"

import React, { useState, useCallback, useRef } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { FileText, Copy } from "lucide-react"
import type { AIProvider } from "@/lib/ai-providers"
import CompactAIProviderSelector from "@/components/compact-ai-provider-selector"

// Minimal paraphraser page – clean UI focused on input → output

export default function ParaphraserPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [inputText, setInputText] = useState('')
  const [activeTab, setActiveTab] = useState('Academic')
  const [preserveLength, setPreserveLength] = useState(true)
  const [variationLevel, setVariationLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [altCount, setAltCount] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [resultText, setResultText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [alternatives, setAlternatives] = useState<string[]>([])
  const [variantIndex, setVariantIndex] = useState(0) // 0 = main, 1..N = alternatives
  const [highlightChanges, setHighlightChanges] = useState(false)
  const [showRemovals, setShowRemovals] = useState(false)
  const [diffMode, setDiffMode] = useState<'word' | 'sentence'>('word')

  // Streaming state
  const [streamMode, setStreamMode] = useState(false)
  const [streamProgress, setStreamProgress] = useState<number | undefined>(undefined)
  const esRef = useRef<EventSource | null>(null)

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false)
  const [batchInput, setBatchInput] = useState("")
  const [batchResults, setBatchResults] = useState<Array<{ original: string; paraphrased?: string; error?: string }>>([])

  // Provider / Model selection (optional)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>(undefined)
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined)

  const tabs = ['Academic', 'Fluent', 'Formal', 'Creative']
  const morePresets = ['Casual', 'Technical', 'Simple']

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

      if (batchMode) {
        // Batch call
        const texts = batchInput
          .split(/\n+/)
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 50)
        if (texts.length === 0) throw new Error('No valid lines in batch input')
        const res = await fetch('/api/paraphraser/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texts,
            mode,
            preserveLength,
            variationLevel,
            provider: selectedProvider,
            model: selectedModel,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Batch paraphrase failed')
        setBatchResults(Array.isArray(data?.results) ? data.results : [])
      } else if (streamMode) {
        // Streaming via SSE
        setResultText('')
        setAlternatives([])
        setVariantIndex(0)
        setStreamProgress(0)

        // Build EventSource URL with auth token
        const params = new URLSearchParams()
        params.set('text', inputText)
        params.set('mode', mode)
        params.set('preserveLength', String(preserveLength))
        params.set('variationLevel', variationLevel)
        if (selectedProvider) params.set('provider', selectedProvider)
        if (selectedModel) params.set('model', selectedModel)
        try {
          const { supabase } = await import('@/integrations/supabase/client')
          const sess = await supabase.auth.getSession()
          const token = sess.data.session?.access_token
          if (token) params.set('access_token', token)
        } catch {}

        const url = `/api/paraphraser/stream?${params.toString()}`
        const es = new EventSource(url, { withCredentials: true })
        esRef.current = es

        es.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data)
            const type = payload?.type
            if (type === 'token') {
              setResultText((prev) => (prev || '') + (payload.token || ''))
            } else if (type === 'progress') {
              if (typeof payload.percentage === 'number') setStreamProgress(payload.percentage)
            } else if (type === 'error') {
              setError(payload.error || 'Streaming error')
            } else if (type === 'done') {
              setIsLoading(false)
              setStreamProgress(100)
              try { es.close() } catch {}
              esRef.current = null
            }
          } catch {}
        }

        es.onerror = () => {
          setIsLoading(false)
          setError('Streaming connection error')
          try { es.close() } catch {}
          esRef.current = null
        }

        return // do not proceed to normal POST
      } else {
        // Normal POST
        const res = await fetch('/api/paraphraser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: inputText,
            mode,
            preserveLength,
            variationLevel,
            variations: altCount,
            provider: selectedProvider,
            model: selectedModel,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to paraphrase')
        setResultText(data?.paraphrased || '')
        setAlternatives(Array.isArray(data?.alternatives) ? data.alternatives : [])
        setVariantIndex(0)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to paraphrase')
    } finally {
      if (!streamMode) setIsLoading(false)
    }
  }, [inputText, activeTab, preserveLength, variationLevel, altCount, selectedProvider, selectedModel, streamMode, batchMode, batchInput])

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
    const text = variantIndex === 0 ? resultText : (alternatives[variantIndex - 1] || '')
    if (!text) return
    setInputText(text)
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    setWordCount(words)
    setResultText('')
  }

  const getDisplayedText = () => (variantIndex === 0 ? resultText : (alternatives[variantIndex - 1] || ''))

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

          {/* Provider / Model selector */}
          <div className="mb-4">
            <CompactAIProviderSelector
              selectedProvider={selectedProvider}
              onProviderChange={(provider) => setSelectedProvider(provider)}
              selectedModel={selectedModel}
              onModelChange={(model) => setSelectedModel(model)}
            />
          </div>

          {/* Content Container */}
          <div className="mx-auto w-full max-w-5xl rounded-lg border border-gray-200 bg-white">
            {/* Top row: Mode + minimal controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 px-4 sm:px-6">
              <div className="flex items-center overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 py-3">
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
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <span>Alternatives</span>
                  <select
                    value={altCount}
                    onChange={(e) => setAltCount(Number(e.target.value))}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                    aria-label="Number of alternatives"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={streamMode}
                    onChange={(e) => setStreamMode(e.target.checked)}
                    className="h-4 w-4"
                    aria-label="Stream"
                  />
                  Stream
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={batchMode}
                    onChange={(e) => setBatchMode(e.target.checked)}
                    className="h-4 w-4"
                    aria-label="Batch mode"
                  />
                  Batch
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={highlightChanges}
                    onChange={(e) => setHighlightChanges(e.target.checked)}
                    className="h-4 w-4"
                    aria-label="Highlight changes"
                  />
                  Highlight changes
                </label>
                {highlightChanges && (
                  <>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={showRemovals}
                        onChange={(e) => setShowRemovals(e.target.checked)}
                        className="h-4 w-4"
                        aria-label="Show removals"
                      />
                      Show removals
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <span>Diff</span>
                      <select
                        value={diffMode}
                        onChange={(e) => setDiffMode(e.target.value as 'word' | 'sentence')}
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                        aria-label="Diff mode"
                      >
                        <option value="word">Word</option>
                        <option value="sentence">Sentence</option>
                      </select>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* More tone presets */}
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
                  {!batchMode ? (
                    <textarea
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder="Write here or try a sample text"
                      className="h-[380px] w-full resize-none p-4 text-gray-800 placeholder-gray-400 focus:outline-none"
                      aria-label="Input text"
                    />
                  ) : (
                    <textarea
                      value={batchInput}
                      onChange={(e) => setBatchInput(e.target.value)}
                      placeholder="Batch mode: one entry per line (max 50 lines)"
                      className="h-[380px] w-full resize-none p-4 text-gray-800 placeholder-gray-400 focus:outline-none"
                      aria-label="Batch input"
                    />
                  )}
                  {!inputText && !batchMode && (
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
                    {getDisplayedText() && !batchMode && alternatives.length > 0 && (
                      <label className="flex items-center gap-2">
                        <span className="text-gray-500">Alternative</span>
                        <select
                          value={variantIndex}
                          onChange={(e) => setVariantIndex(Number(e.target.value))}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                          aria-label="Choose alternative"
                        >
                          <option value={0}>Main</option>
                          {alternatives.map((_, i) => (
                            <option key={i + 1} value={i + 1}>Alt {i + 1}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {getDisplayedText() && !batchMode && (
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
                  {batchMode ? (
                    batchResults.length > 0 ? (
                      <div className="space-y-4">
                        {batchResults.map((r, idx) => (
                          <div key={idx} className="rounded border border-gray-200 p-3">
                            <div className="text-xs text-gray-500 mb-1">Item {idx + 1}</div>
                            {r.error ? (
                              <div className="text-sm text-red-600">{r.error}</div>
                            ) : (
                              <div className="whitespace-pre-wrap text-gray-800">
                                {highlightChanges
                                  ? (diffMode === 'sentence'
                                      ? renderSentenceDiff(r.original || '', r.paraphrased || '')
                                      : renderDiff(r.original || '', r.paraphrased || '')
                                    )
                                  : (r.paraphrased || '')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : isLoading ? (
                      <div className="flex h-full items-center justify-center text-sm text-gray-500">Processing…</div>
                    ) : error ? (
                      <div className="text-sm text-red-600">{error}</div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">Batch results will appear here</div>
                    )
                  ) : (
                    isLoading && streamMode ? (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-500">Streaming… {typeof streamProgress === 'number' ? `${streamProgress}%` : ''}</div>
                        <div className="whitespace-pre-wrap text-gray-800">{getDisplayedText()}</div>
                      </div>
                    ) : isLoading ? (
                      <div className="flex h-full items-center justify-center text-sm text-gray-500">Processing…</div>
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
                    )
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
                disabled={!inputText.trim() && !batchMode || isLoading}
                className="rounded-md bg-gray-900 px-6 py-2 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Processing…' : (batchMode ? 'Paraphrase Batch' : 'Paraphrase')}
              </button>
            </div>
            <div className="w-[180px] flex items-center justify-end gap-2">
              {streamMode && isLoading && (
                <button onClick={stopStreaming} className="text-sm text-gray-600 hover:text-gray-800">Stop</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
