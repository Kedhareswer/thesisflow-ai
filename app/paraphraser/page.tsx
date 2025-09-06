"use client"

import React, { useState, useCallback } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { FileText, Copy } from "lucide-react"

// Minimal paraphraser page – clean UI focused on input → output

export default function ParaphraserPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [inputText, setInputText] = useState('')
  const [activeTab, setActiveTab] = useState('Academic')
  const [preserveLength, setPreserveLength] = useState(true)
  const [variationValue, setVariationValue] = useState(3)
  const [isLoading, setIsLoading] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [resultText, setResultText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const tabs = ['Academic', 'Fluent', 'Formal', 'Creative']

  const TAB_TO_MODE: Record<string, 'academic' | 'casual' | 'formal' | 'creative' | 'technical' | 'simple'> = {
    Academic: 'academic',
    Fluent: 'casual',
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
      const res = await fetch('/api/paraphraser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          mode,
          preserveLength,
          variations: variationValue,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to paraphrase')
      setResultText(data?.paraphrased || '')
    } catch (e: any) {
      setError(e?.message || 'Failed to paraphrase')
    } finally {
      setIsLoading(false)
    }
  }, [inputText, activeTab, preserveLength, variationValue])

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
    if (!resultText) return
    setInputText(resultText)
    const words = resultText.trim() ? resultText.trim().split(/\s+/).length : 0
    setWordCount(words)
    setResultText('')
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
                    value={variationValue}
                    onChange={(e) => setVariationValue(Number(e.target.value))}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                    aria-label="Variation"
                  >
                    <option value={1}>Low</option>
                    <option value={3}>Medium</option>
                    <option value={5}>High</option>
                  </select>
                </label>
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
                    {resultText && (
                      <>
                        <button onClick={() => handleCopyToClipboard(resultText)} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700">
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                        <button onClick={handleUseOutputAsInput} className="text-gray-500 hover:text-gray-700">Use as input</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="h-[380px] w-full overflow-auto rounded-md border border-gray-200 p-4">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">Processing…</div>
                  ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                  ) : resultText ? (
                    <div className="whitespace-pre-wrap text-gray-800">{resultText}</div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">Paraphrased text will appear here</div>
                  )}
                </div>
              </div>
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
              <div className="w-[80px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
