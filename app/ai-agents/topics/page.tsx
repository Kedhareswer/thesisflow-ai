"use client"

import React, { useState } from 'react'
import { Search, TestTube, Sun, Pill, Zap, TrendingUp, FileText, BookOpen, Brain, Users, Lightbulb, Settings, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const suggestedTopics = [
  {
    id: 1,
    text: "Benchmarks for evaluation of large language models",
    icon: TestTube,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200"
  },
  {
    id: 2,
    text: "Efficient materials for solar panels",
    icon: Sun,
    iconColor: "text-yellow-600",
    bgColor: "bg-yellow-50 border-yellow-200"
  },
  {
    id: 3,
    text: "Effective interventions for treating depression",
    icon: Pill,
    iconColor: "text-pink-600",
    bgColor: "bg-pink-50 border-pink-200"
  },
  {
    id: 4,
    text: "Renewable energy trends for the next decade",
    icon: Zap,
    iconColor: "text-green-600",
    bgColor: "bg-green-50 border-green-200"
  },
  {
    id: 5,
    text: "Main causes of economic recessions",
    icon: TrendingUp,
    iconColor: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200"
  }
]

const citationStyles = [
  { value: 'apa', label: 'APA' },
  { value: 'mla', label: 'MLA' },
  { value: 'ieee', label: 'IEEE' },
  { value: 'chicago', label: 'Chicago' },
  { value: 'bibtex', label: 'BibTeX' }
]

const writingTones = [
  { value: 'academic', label: 'Academic' },
  { value: 'journalistic', label: 'Journalistic' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' }
]

export default function FindTopicsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [citationStyle, setCitationStyle] = useState('apa')
  const [writingTone, setWritingTone] = useState('academic')
  const [focusAreas, setFocusAreas] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [researchResults, setResearchResults] = useState<any>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setIsResearching(true)
      setResearchResults(null)
      
      try {
        // TODO: Integrate with your research services
        const response = await fetch('/api/research-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            citationStyle,
            writingTone,
            focusAreas: focusAreas.split(',').map(s => s.trim()).filter(Boolean)
          })
        })
        
        const data = await response.json()
        setResearchResults(data)
      } catch (error) {
        console.error('Research error:', error)
        // Mock results for demo
        setResearchResults({
          executiveSummary: "Comprehensive analysis of your research topic...",
          detailedAnalysis: "Detailed findings and analysis...",
          sources: [],
          keyInsights: [],
          relatedTopics: [],
          limitations: "Research limitations and considerations..."
        })
      } finally {
        setIsResearching(false)
      }
    }
  }

  const handleTopicClick = (topic: string) => {
    setSearchQuery(topic)
  }

  return (
    <div className="flex-1 bg-white">
      {/* Main Content Container */}
      <div className="min-h-screen flex flex-col">
        {/* Header Section */}
        <div className="flex-1 flex flex-col items-center justify-start px-6 py-12">
          {/* Title and Subtitle */}
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-semibold text-gray-900 mb-4">
              AI Research Assistant
            </h1>
            <p className="text-lg text-gray-600 font-normal mb-6">
              Comprehensive research analysis with multi-source synthesis, proper citations, and academic rigor.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Multi-Source Research</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>Proper Citations</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span>Academic Analysis</span>
              </div>
            </div>
          </div>

          {/* Research Form */}
          <div className="w-full max-w-4xl mx-auto mb-12">
            <form onSubmit={handleSearch} className="space-y-6">
              {/* Main Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter your research query (e.g., 'Impact of large language models on academic writing')..."
                  className="w-full px-4 py-4 pr-12 text-base text-[#ee691a] caret-[#ee691a] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
                  required
                />
                <button
                  type="submit"
                  disabled={isResearching}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  {isResearching ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Research Configuration */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Research Configuration
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
                </button>
                
                {showAdvanced && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    {/* Citation Style */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Citation Style</label>
                      <select
                        value={citationStyle}
                        onChange={(e) => setCitationStyle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {citationStyles.map(style => (
                          <option key={style.value} value={style.value}>{style.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Writing Tone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Writing Tone</label>
                      <select
                        value={writingTone}
                        onChange={(e) => setWritingTone(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {writingTones.map(tone => (
                          <option key={tone.value} value={tone.value}>{tone.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Focus Areas */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Focus Areas (optional)</label>
                      <input
                        type="text"
                        value={focusAreas}
                        onChange={(e) => setFocusAreas(e.target.value)}
                        placeholder="e.g., methodology, ethics, trends"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isResearching || !searchQuery.trim()}
                  className={cn(
                    "px-8 py-3 rounded-lg font-medium transition-all duration-200",
                    "bg-gradient-to-br from-blue-500 to-blue-600 text-white",
                    "hover:from-blue-600 hover:to-blue-700 hover:shadow-lg",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center gap-2"
                  )}
                >
                  {isResearching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Researching...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4" />
                      Start Research Analysis
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Research Results */}
          {researchResults && (
            <div className="w-full max-w-6xl mx-auto mb-12">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                {/* Results Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Research Analysis Results</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Comprehensive analysis for: "{searchQuery}"
                  </p>
                </div>
                
                {/* Results Content */}
                <div className="p-6 space-y-8">
                  {/* Executive Summary */}
                  <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      📋 Executive Summary
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-gray-700">{researchResults.executiveSummary}</p>
                    </div>
                  </section>
                  
                  {/* Detailed Analysis */}
                  <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-green-600" />
                      📚 Detailed Analysis
                    </h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-gray-700">{researchResults.detailedAnalysis}</p>
                    </div>
                  </section>
                  
                  {/* Key Insights */}
                  <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      💡 Key Insights
                    </h3>
                    <div className="grid gap-3">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Analysis complete. Detailed insights will be populated from research services.</p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Source Analysis */}
                  <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      🔍 Source Analysis & Citations
                    </h3>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Citation Style: <span className="font-medium uppercase">{citationStyle}</span></p>
                      <p className="text-gray-700">Source evaluation and citations will be integrated with your research services.</p>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
          
          {/* Suggested Topics Section */}
          {!researchResults && (
            <div className="w-full max-w-4xl mx-auto">
              <div className="mb-8">
                <p className="text-base text-gray-600 font-normal">
                  Try asking or searching for:
                </p>
              </div>

              {/* Topics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestedTopics.map((topic) => {
                  const IconComponent = topic.icon
                  return (
                    <button
                      key={topic.id}
                      onClick={() => handleTopicClick(topic.text)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:scale-[1.02] text-left group",
                        topic.bgColor
                      )}
                    >
                      <div className={cn("flex-shrink-0", topic.iconColor)}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                        {topic.text}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
