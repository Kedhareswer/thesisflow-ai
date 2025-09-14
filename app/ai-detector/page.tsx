"use client"

import React, { useState, useRef } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { Upload, Loader2, Info } from "lucide-react"

interface AIDetectionResult {
  is_ai: boolean
  confidence: number
  ai_probability: number
  human_probability: number
  reliability_score: number
  model_used: string
  analysis_details: {
    perplexity_score: number
    burstiness_score: number
    vocabulary_complexity: number
    sentence_variance: number
    repetition_score: number
    chunks_analyzed: number
  }
  timestamp: string
}

export default function AIDetectorPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState<AIDetectionResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'input' | 'upload'>('input')
  const [textType, setTextType] = useState<'scientific' | 'non-scientific'>('scientific')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const wordLimit = 1500
  const examples = [
    { label: 'Chat GPT', text: 'We investigated the impact of climate variability on maize yields using a multi-year dataset and controlled field trials. Results indicate significant correlations between seasonal precipitation anomalies and yield outcomes.' },
    { label: 'Quillbot', text: 'This study explores how fluctuations in climate influence agricultural productivity by examining temporal precipitation patterns and their association with harvest metrics.' },
    { label: 'Jasper', text: 'Our research assesses the role of atmospheric dynamics in shaping crop performance, applying regression models to quantify the sensitivity of yields to drought indices.' },
    { label: 'AI + Human text', text: 'Initial pilot experiments suggested mixed effects; however, our expanded analysis reveals that resilience strategies such as mulching and cultivar selection mitigate adverse conditions.' },
    { label: 'Abstract by AI', text: 'This paper proposes a framework for evaluating climate-yield interactions, demonstrating that context-aware agronomic interventions substantially reduce variance in outcomes.' }
  ]

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError('Please enter text to analyze')
      return
    }

    const wordCount = inputText.split(/\s+/).filter(w => w.length > 0).length
    if (wordCount < 10) {
      setError('Text too short. Please provide at least 10 words for analysis.')
      return
    }

    if (wordCount > wordLimit) {
      setError(`Please limit your input to ${wordLimit} words.`)
      return
    }

    setIsAnalyzing(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/ai-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText,
          type: textType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const analysisResult = await response.json()
      setResult(analysisResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze text')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const wordCount = inputText.split(/\s+/).filter(w => w.length > 0).length

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Academic AI Detector</h1>
            <p className="mt-2 text-sm sm:text-base text-gray-500">Catch GPT-4, ChatGPT, Jasper, and any AI in scholarly content.</p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-8 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Tabs */}
            <div className="mb-5 border-b border-gray-200">
              <nav className="flex gap-6">
                <button
                  onClick={() => setActiveTab('input')}
                  className={`-mb-px pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'input'
                      ? 'border-sky-500 text-sky-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Input Text
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`-mb-px pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'upload'
                      ? 'border-sky-500 text-sky-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Upload PDF
                </button>
              </nav>
            </div>

            {/* Content Area */}
            {activeTab === 'input' && (
              <div className="space-y-4">
                {/* Examples Row */}
                <div className="flex items-center flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 text-sm font-medium">Examples</span>
                  {examples.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => setInputText(ex.text)}
                      className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Textarea Card */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Start writing here or paste some scientific text and click analyse"
                      className="w-full min-h-[360px] p-4 outline-none resize-none text-sm"
                    />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t px-4 py-3 bg-white">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setInputText('')}
                          className="px-3 py-1.5 rounded-md border border-orange-200 bg-orange-50 text-orange-600 text-sm"
                        >
                          New Input
                        </button>
                        <span className="text-sm text-gray-500">{Math.min(wordCount, wordLimit)}/{wordLimit} words</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            className="accent-sky-600"
                            checked={textType === 'scientific'}
                            onChange={() => setTextType('scientific')}
                          />
                          Scientific
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            className="accent-sky-600"
                            checked={textType === 'non-scientific'}
                            onChange={() => setTextType('non-scientific')}
                          />
                          Non-Scientific
                        </label>
                      </div>
                      <button
                        onClick={handleAnalyze}
                        disabled={wordCount < 10 || isAnalyzing || wordCount > wordLimit}
                        className="px-6 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAnalyzing ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analysing...
                          </div>
                        ) : (
                          'Analyse'
                        )}
                      </button>
                    </div>
                    {error && (
                      <div className="mx-4 mb-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                        {error}
                      </div>
                    )}
                  </div>

                  {/* Right: Report Card */}
                  <div className="bg-white border border-gray-200 rounded-lg p-8 min-h-[360px] flex items-center justify-center text-gray-500 text-center">
                    {result ? (
                      <div className="w-full">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detection Results</h3>
                        <div className={`p-4 rounded-lg ${result.is_ai ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                          <div className="text-base font-medium">
                            {result.is_ai ? 'AI-Generated Content Detected' : 'Human-Written Content'}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Confidence: {result.confidence}% | AI Probability: {result.ai_probability}% | Human Probability: {result.human_probability}%
                          </div>
                          <div className="text-xs text-gray-500 mt-2">Model: {result.model_used} • Reliability: {result.reliability_score}%</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Info className="w-10 h-10 text-gray-400" />
                        <p>Once you analyse any text/doc, your report will show up here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Upload area */}
                <div className="bg-white border border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center text-center">
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Upload PDF</h3>
                  <p className="text-gray-500 mb-4">Drag and drop a PDF or click to browse</p>
                  <label className="inline-block">
                    <span className="px-4 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 cursor-pointer">Choose File</span>
                    <input type="file" accept="application/pdf" className="hidden" />
                  </label>
                </div>
                {/* Right: Report placeholder */}
                <div className="bg-white border border-gray-200 rounded-lg p-8 min-h-[360px] flex items-center justify-center text-gray-500 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Info className="w-10 h-10 text-gray-400" />
                    <p>Once you analyse any text/doc, your report will show up here.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
