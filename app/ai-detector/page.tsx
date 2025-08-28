"use client"

import React, { useState, useRef } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { FileText, Upload, Loader2, ChevronDown } from "lucide-react"

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
  const [showDropdown, setShowDropdown] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

    setIsAnalyzing(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/ai-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
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
          <h1 className="text-3xl font-bold text-gray-900">Academic AI Detector</h1>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-8 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex mb-8">
              <button
                onClick={() => setActiveTab('input')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'input'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Input Text
                </div>
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload File
                </div>
              </button>
            </div>

            {/* Content Area */}
            {activeTab === 'input' && (
              <div className="space-y-6">
                {/* Type Selector */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Type of Text:
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {textType === 'scientific' ? 'Scientific' : 'Non-Scientific'}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    {showDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            setTextType('scientific')
                            setShowDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                        >
                          Scientific
                        </button>
                        <button
                          onClick={() => {
                            setTextType('non-scientific')
                            setShowDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                        >
                          Non-Scientific
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Text Input */}
                <div className="space-y-4">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Enter text to analyze for AI-generated content..."
                    className="w-full h-80 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {wordCount} words
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={wordCount < 10 || isAnalyzing}
                      className="px-8 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isAnalyzing ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Detecting AI...
                        </div>
                      ) : (
                        'Detect AI'
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-red-600">{error}</div>
                  </div>
                )}

                {/* Results Display */}
                {result && (
                  <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Detection Results</h3>
                    <div className={`p-4 rounded-lg ${result.is_ai ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                      <div className="text-lg font-medium">
                        {result.is_ai ? 'AI-Generated Content Detected' : 'Human-Written Content'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Confidence: {result.confidence}% | 
                        AI Probability: {result.ai_probability}% | 
                        Human Probability: {result.human_probability}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="text-center py-12">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload File</h3>
                <p className="text-gray-500">Drag and drop a file or click to browse</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
