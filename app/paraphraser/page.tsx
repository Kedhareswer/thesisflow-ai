"use client"

import React, { useState, useCallback } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { ChevronDown, Share, FileText, Globe } from "lucide-react"

interface ParaphraseResult {
  paraphrased: string
  confidence: number
  wordCount: number
  changes: number
}

export default function ParaphraserPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [inputText, setInputText] = useState('')
  const [activeTab, setActiveTab] = useState('Academic')
  const [lengthValue, setLengthValue] = useState(3)
  const [variationValue, setVariationValue] = useState(3)
  const [showMoreDropdown, setShowMoreDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [resultText, setResultText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const tabs = ['Academic', 'Fluent', 'Formal', 'Creative']
  const moreOptions = ['Casual', 'Technical', 'Simple', 'Professional']

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
    setInputText(text)
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
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
          preserveLength: lengthValue >= 3,
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
  }, [inputText, activeTab, lengthValue, variationValue])

  const trySampleText = () => {
    const sampleText = "The rapid advancement of artificial intelligence has transformed various industries and continues to shape the future of technology. Machine learning algorithms and neural networks have enabled computers to perform complex tasks that were once thought to be exclusively human capabilities."
    setInputText(sampleText)
    setWordCount(sampleText.split(/\s+/).length)
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex-1">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                <span>Home</span>
                <span className="mx-2">/</span>
                <span>Paraphraser</span>
              </div>
            </div>
            <button className="flex items-center space-x-2 text-gray-500 hover:text-gray-700">
              <Share className="h-4 w-4" />
              <span className="text-sm">Share</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-8">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI Paraphraser Tool | Get started free
            </h1>
            <p className="text-gray-600">
              Make your academic writing clear and original.
            </p>
          </div>

          {/* Content Container */}
          <div className="mx-auto w-full max-w-5xl rounded-lg border border-gray-200 bg-white">
            {/* Top row: Tabs + Controls (teal accent) */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6">
              <div className="flex items-center">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-[#199EBD] text-[#147C97]'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                    className="flex items-center px-4 sm:px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    More
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </button>
                  {showMoreDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                      {moreOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setActiveTab(option)
                            setShowMoreDropdown(false)
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-8">
                {/* Length Slider */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Length:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={lengthValue}
                      onChange={(e) => setLengthValue(Number(e.target.value))}
                      className="w-28 cursor-pointer accent-[#199EBD]"
                    />
                    {[1,2,3,4,5].map((i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= lengthValue ? 'bg-[#199EBD]' : 'bg-gray-300'}`} />
                    ))}
                  </div>
                </div>
                {/* Variation Slider */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Variation:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={variationValue}
                      onChange={(e) => setVariationValue(Number(e.target.value))}
                      className="w-28 cursor-pointer accent-[#199EBD]"
                    />
                    {[1,2,3,4,5].map((i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= variationValue ? 'bg-[#199EBD]' : 'bg-gray-300'}`} />
                    ))}
                  </div>
                </div>
                {/* Locale */}
                <button className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span>Locale</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Two-pane content */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left: input */}
              <div className="p-4 sm:p-6">
                <div className="relative">
                  <textarea
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Write here or try a sample text"
                    className="h-[380px] w-full resize-none p-4 text-gray-800 placeholder-gray-400 focus:outline-none"
                  />
                  {!inputText && (
                    <button
                      onClick={trySampleText}
                      className="absolute top-14 left-6 inline-flex items-center gap-2 text-sm text-[#199EBD] hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      try a sample text
                    </button>
                  )}
                </div>
              </div>

              {/* Right: results */}
              <div className="border-t border-gray-200 p-4 sm:p-6 md:border-t-0 md:border-l">
                <div className="h-[380px] w-full overflow-auto">
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
                  className="rounded-md bg-orange-500 px-6 py-2 font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
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
