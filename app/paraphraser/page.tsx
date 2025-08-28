"use client"

import React, { useState, useCallback } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { Copy, RefreshCw, Check, ChevronDown, Sparkles, BookOpen, Coffee, Briefcase, Lightbulb, Code, Users } from "lucide-react"

interface ParaphraseResult {
  paraphrased: string
  confidence: number
  wordCount: number
  changes: number
}

const paraphraseModes = [
  { id: 'academic', label: 'Academic', icon: BookOpen, description: 'Scholarly and formal tone' },
  { id: 'casual', label: 'Casual', icon: Coffee, description: 'Relaxed and conversational' },
  { id: 'formal', label: 'Formal', icon: Briefcase, description: 'Professional and official' },
  { id: 'creative', label: 'Creative', icon: Lightbulb, description: 'Imaginative and unique' },
  { id: 'technical', label: 'Technical', icon: Code, description: 'Precise and specialized' },
  { id: 'simple', label: 'Simple', icon: Users, description: 'Clear and accessible' },
]

export default function ParaphraserPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [selectedMode, setSelectedMode] = useState('academic')
  const [preserveLength, setPreserveLength] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<Array<{input: string, output: string, mode: string}>>([])
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [stats, setStats] = useState<{wordCount: number, charCount: number}>({ wordCount: 0, charCount: 0 })

  const handleParaphrase = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to paraphrase')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/paraphraser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          mode: selectedMode,
          preserveLength,
          variations: 1
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to paraphrase text')
      }

      const data = await response.json()
      const paraphrased = data.variations?.[0] || data.paraphrased || data.text || ''
      
      setOutputText(paraphrased)
      setHistory(prev => [...prev.slice(-4), { input: inputText, output: paraphrased, mode: selectedMode }])
      
      // Calculate stats
      const words = paraphrased.split(/\s+/).filter(Boolean).length
      const chars = paraphrased.length
      setStats({ wordCount: words, charCount: chars })
    } catch (err) {
      console.error('Paraphrase error:', err)
      setError(err instanceof Error ? err.message : 'Failed to paraphrase text')
    } finally {
      setIsLoading(false)
    }
  }, [inputText, selectedMode, preserveLength])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(outputText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [outputText])

  const handleClear = useCallback(() => {
    setInputText('')
    setOutputText('')
    setError('')
    setStats({ wordCount: 0, charCount: 0 })
  }, [])

  const selectedModeInfo = paraphraseModes.find(m => m.id === selectedMode)!

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
            <div className="mx-auto max-w-7xl px-6 py-12">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    Paraphraser
                  </h1>
                  <p className="mt-3 text-purple-100 max-w-2xl text-lg">
                    Transform your text with AI-powered paraphrasing. Choose from multiple writing styles to match your needs.
                  </p>
                </div>
                
                {/* Mode Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowModeDropdown(!showModeDropdown)}
                    className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-5 py-3 hover:bg-white/20 transition-colors"
                  >
                    <selectedModeInfo.icon className="h-5 w-5" />
                    <span className="font-medium">{selectedModeInfo.label}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  
                  {showModeDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-purple-100 overflow-hidden z-50">
                      {paraphraseModes.map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => {
                            setSelectedMode(mode.id)
                            setShowModeDropdown(false)
                          }}
                          className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-purple-50 transition-colors ${
                            selectedMode === mode.id ? 'bg-purple-100' : ''
                          }`}
                        >
                          <mode.icon className="h-5 w-5 text-purple-600 mt-0.5" />
                          <div className="text-left">
                            <div className="font-medium text-gray-900">{mode.label}</div>
                            <div className="text-sm text-gray-500">{mode.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="mx-auto max-w-7xl px-6 py-8">
            {/* Options Bar */}
            <div className="mb-6 flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-purple-100">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preserveLength}
                    onChange={(e) => setPreserveLength(e.target.checked)}
                    className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Preserve text length</span>
                </label>
                
                {stats.wordCount > 0 && (
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{stats.wordCount} words</span>
                    <span>•</span>
                    <span>{stats.charCount} characters</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleParaphrase}
                  disabled={isLoading || !inputText.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Paraphrase
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
                <svg className="h-5 w-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Text Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Panel */}
              <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3">
                  <h3 className="font-semibold text-white">Original Text</h3>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter your text here to paraphrase..."
                  className="w-full h-96 p-4 resize-none focus:outline-none text-gray-700"
                  maxLength={5000}
                />
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                  {inputText.length} / 5000 characters
                </div>
              </div>

              {/* Output Panel */}
              <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Paraphrased Text</h3>
                  {outputText && (
                    <button
                      onClick={handleCopy}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-300" />
                      ) : (
                        <Copy className="h-4 w-4 text-white" />
                      )}
                    </button>
                  )}
                </div>
                <div className="h-96 p-4 overflow-y-auto">
                  {outputText ? (
                    <p className="text-gray-700 whitespace-pre-wrap">{outputText}</p>
                  ) : (
                    <p className="text-gray-400 italic">
                      Your paraphrased text will appear here...
                    </p>
                  )}
                </div>
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                  Mode: {selectedModeInfo.label}
                </div>
              </div>
            </div>

            {/* History Section */}
            {history.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Paraphrases</h3>
                <div className="space-y-3">
                  {history.slice().reverse().map((item, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-purple-600">
                          {paraphraseModes.find(m => m.id === item.mode)?.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Original</p>
                          <p className="text-sm text-gray-700 line-clamp-2">{item.input}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Paraphrased</p>
                          <p className="text-sm text-gray-700 line-clamp-2">{item.output}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
