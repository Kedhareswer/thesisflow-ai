"use client"

import React, { useState } from 'react'
import { Search, TestTube, Sun, Pill, Zap, TrendingUp } from 'lucide-react'
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

export default function FindTopicsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // TODO: Implement actual search functionality
      console.log('Searching for:', searchQuery)
    }
  }

  const handleTopicClick = (topic: string) => {
    setSearchQuery(topic)
    // TODO: Trigger search with the selected topic
    console.log('Selected topic:', topic)
  }

  return (
    <div className="flex-1 bg-white">
      {/* Main Content Container */}
      <div className="min-h-screen flex flex-col">
        {/* Header Section */}
        <div className="flex-1 flex flex-col items-center justify-start px-6 py-12">
          {/* Title and Subtitle */}
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-semibold text-gray-900 mb-4">
              Find Topics
            </h1>
            <p className="text-lg text-gray-600 font-normal">
              Go deeper within research papers to extract insightful topics.
            </p>
          </div>

          {/* Search Container */}
          <div className="w-full max-w-2xl mx-auto mb-12">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for topics across research papers..."
                  className="w-full px-4 py-4 pr-12 text-base text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>

          {/* Suggested Topics Section */}
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
        </div>
      </div>
    </div>
  )
}
