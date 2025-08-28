"use client"

import React, { useState } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { Search, Loader2, Check, BarChart3, Sun, Heart, Leaf, TrendingDown } from "lucide-react"

interface TopicSuggestion {
  id: string
  text: string
  icon: React.ComponentType<any>
  bgColor: string
  textColor: string
}

interface SearchProgress {
  step: string
  status: 'completed' | 'current' | 'pending'
}

export default function FindTopicsPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchMode, setSearchMode] = useState<'search' | 'results'>('search')
  const [qualityMode, setQualityMode] = useState<'Standard' | 'High Quality'>('Standard')
  const [timeLeft, setTimeLeft] = useState(6)

  const topicSuggestions: TopicSuggestion[] = [
    {
      id: '1',
      text: 'Benchmarks for evaluation of large language models',
      icon: BarChart3,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      id: '2', 
      text: 'Efficient materials for solar panels',
      icon: Sun,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      id: '3',
      text: 'Effective interventions for treating depression', 
      icon: Heart,
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      id: '4',
      text: 'Renewable energy trends for the next decade',
      icon: Leaf,
      bgColor: 'bg-green-50', 
      textColor: 'text-green-600'
    },
    {
      id: '5',
      text: 'Main causes of economic recessions',
      icon: TrendingDown,
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600'
    }
  ]

  const searchProgress: SearchProgress[] = [
    { step: 'Finding relevant papers', status: 'completed' },
    { step: 'Finding topics in papers', status: 'completed' },
    { step: 'Finding topics from external sources', status: 'current' },
    { step: 'Extracting unique topics', status: 'pending' },
    { step: 'Preparing final results', status: 'pending' }
  ]

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setIsSearching(true)
    setSearchMode('results')
    
    // Simulate countdown
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setIsSearching(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSuggestionClick = (suggestion: TopicSuggestion) => {
    handleSearch(suggestion.text)
  }

  if (searchMode === 'results') {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        
        <div className="flex-1">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Topics</span>
                <span>/</span>
                <span className="text-gray-900">{searchQuery}</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setQualityMode('Standard')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      qualityMode === 'Standard' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setQualityMode('High Quality')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      qualityMode === 'High Quality' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    High Quality
                  </button>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <span>🌐</span>
                  <span>en</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-6 py-8">
            <div className="max-w-2xl">
              <p className="text-gray-700 mb-4">
                Getting topics and sources for '{searchQuery}'. Please wait.
              </p>
              
              <div className="text-sm text-gray-600 mb-6">
                Time left: {timeLeft} secs
              </div>

              {/* Progress Steps */}
              <div className="space-y-3">
                {searchProgress.map((step, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    {step.status === 'completed' && (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {step.status === 'current' && (
                      <div className="w-5 h-5 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      </div>
                    )}
                    {step.status === 'pending' && (
                      <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                    )}
                    <span className={`text-sm ${
                      step.status === 'completed' ? 'text-gray-900' : 
                      step.status === 'current' ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex-1">
        {/* Main Content */}
        <div className="px-6 py-16">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Find Topics
            </h1>
            <p className="text-gray-600 text-lg">
              Go deeper within research papers to extract insightful topics.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchQuery.trim() && handleSearch(searchQuery)}
                placeholder="Search for topics across research papers."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              />
              <button 
                onClick={() => searchQuery.trim() && handleSearch(searchQuery)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Suggestions */}
          <div className="max-w-4xl mx-auto">
            <p className="text-gray-600 mb-6 text-center">
              Try asking or searching for:
            </p>
            
            <div className="flex flex-wrap gap-3 justify-center">
              {topicSuggestions.map((suggestion) => {
                const IconComponent = suggestion.icon
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300 transition-colors ${suggestion.bgColor}`}
                  >
                    <IconComponent className={`w-4 h-4 ${suggestion.textColor}`} />
                    <span className="text-sm text-gray-700">{suggestion.text}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
