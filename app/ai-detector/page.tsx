"use client"

import React, { useState, useRef } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle, Brain, TrendingUp, BarChart3, Copy, Download, Loader2, Activity, Zap, Eye, FileText } from "lucide-react"

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
  const [copied, setCopied] = useState(false)
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

  const copyReport = async () => {
    if (!result) return

    const report = `AI Detection Report
Generated: ${new Date(result.timestamp).toLocaleString()}

Analysis Result: ${result.is_ai ? 'AI-Generated' : 'Human-Written'}
AI Probability: ${result.ai_probability}%
Human Probability: ${result.human_probability}%
Confidence: ${result.confidence}%
Reliability Score: ${result.reliability_score}%
Model Used: ${result.model_used}

Detailed Metrics:
- Perplexity Score: ${result.analysis_details.perplexity_score}
- Burstiness Score: ${result.analysis_details.burstiness_score}%
- Vocabulary Complexity: ${result.analysis_details.vocabulary_complexity}%
- Sentence Variance: ${result.analysis_details.sentence_variance}%
- Repetition Score: ${result.analysis_details.repetition_score}%
- Chunks Analyzed: ${result.analysis_details.chunks_analyzed}

Text Analyzed:
${inputText}`

    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadReport = () => {
    if (!result) return

    const report = `AI Detection Report
Generated: ${new Date(result.timestamp).toLocaleString()}

Analysis Result: ${result.is_ai ? 'AI-Generated' : 'Human-Written'}
AI Probability: ${result.ai_probability}%
Human Probability: ${result.human_probability}%
Confidence: ${result.confidence}%
Reliability Score: ${result.reliability_score}%
Model Used: ${result.model_used}

Detailed Metrics:
- Perplexity Score: ${result.analysis_details.perplexity_score}
- Burstiness Score: ${result.analysis_details.burstiness_score}%
- Vocabulary Complexity: ${result.analysis_details.vocabulary_complexity}%
- Sentence Variance: ${result.analysis_details.sentence_variance}%
- Repetition Score: ${result.analysis_details.repetition_score}%
- Chunks Analyzed: ${result.analysis_details.chunks_analyzed}

Text Analyzed:
${inputText}`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-detection-report-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-blue-600'
    if (confidence >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500'
    if (confidence >= 60) return 'bg-blue-500'
    if (confidence >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getResultIcon = () => {
    if (!result) return Shield
    return result.is_ai ? ShieldAlert : ShieldCheck
  }

  const getResultColor = () => {
    if (!result) return 'text-gray-500'
    return result.is_ai ? 'text-red-500' : 'text-green-500'
  }

  const wordCount = inputText.split(/\s+/).filter(w => w.length > 0).length

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-yellow-600 bg-clip-text text-transparent">
              AI Detector
            </h1>
            <p className="mt-2 text-gray-600">
              Advanced AI content detection with confidence scoring and detailed analysis
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-red-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Text to Analyze</h2>
                </div>

                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste the text you want to analyze for AI-generated content..."
                  className="w-full h-64 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm"
                />

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {wordCount} words {wordCount < 10 && '(minimum 10 words required)'}
                  </div>
                  <button
                    onClick={handleAnalyze}
                    disabled={wordCount < 10 || isAnalyzing}
                    className="bg-gradient-to-r from-red-600 to-yellow-600 text-white px-6 py-2 rounded-lg hover:from-red-700 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        <span>Analyze Text</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Detection Results</h2>
                  </div>
                  {result && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyReport}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? 'Copied' : 'Copy Report'}</span>
                      </button>
                      <button
                        onClick={downloadReport}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-red-800">Analysis Failed</div>
                      <div className="text-sm text-red-600">{error}</div>
                    </div>
                  </div>
                )}

                {!result && !isAnalyzing && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                      <Shield className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Analyze</h3>
                    <p className="text-gray-500">Enter text above and click "Analyze Text" to detect AI-generated content</p>
                  </div>
                )}

                {result && (
                  <div className="space-y-6">
                    {/* Main Result */}
                    <div className={`p-6 rounded-lg ${result.is_ai ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border`}>
                      <div className="flex items-center gap-3 mb-4">
                        {React.createElement(getResultIcon(), { className: `w-8 h-8 ${getResultColor()}` })}
                        <div>
                          <h3 className={`text-xl font-bold ${getResultColor()}`}>
                            {result.is_ai ? 'AI-Generated Content Detected' : 'Human-Written Content Detected'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {result.is_ai ? result.ai_probability : result.human_probability}% probability
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Confidence Meters */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Confidence</span>
                          <span className={`text-sm font-bold ${getConfidenceColor(result.confidence)}`}>
                            {result.confidence}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${getConfidenceBg(result.confidence)}`}
                            style={{ width: `${result.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Reliability</span>
                          <span className={`text-sm font-bold ${getConfidenceColor(result.reliability_score)}`}>
                            {result.reliability_score}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${getConfidenceBg(result.reliability_score)}`}
                            style={{ width: `${result.reliability_score}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Analysis */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Detailed Analysis</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-gray-700">Perplexity</span>
                          </div>
                          <span className="font-medium text-gray-900">{result.analysis_details.perplexity_score}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-700">Burstiness</span>
                          </div>
                          <span className="font-medium text-gray-900">{result.analysis_details.burstiness_score}%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-purple-500" />
                            <span className="text-sm text-gray-700">Vocabulary</span>
                          </div>
                          <span className="font-medium text-gray-900">{result.analysis_details.vocabulary_complexity}%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-teal-500" />
                            <span className="text-sm text-gray-700">Sentence Variance</span>
                          </div>
                          <span className="font-medium text-gray-900">{result.analysis_details.sentence_variance}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Model Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">
                        <div><strong>Model Used:</strong> {result.model_used}</div>
                        <div><strong>Chunks Analyzed:</strong> {result.analysis_details.chunks_analyzed}</div>
                        <div><strong>Analysis Time:</strong> {new Date(result.timestamp).toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Probability Breakdown */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Probability Breakdown</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">AI-Generated</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 bg-red-500 rounded-full transition-all duration-500"
                                style={{ width: `${result.ai_probability}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{result.ai_probability}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Human-Written</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 bg-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${result.human_probability}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{result.human_probability}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
