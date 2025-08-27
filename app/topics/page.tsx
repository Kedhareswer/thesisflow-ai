"use client"

import React, { useState } from "react"
import { Search, Link, Circle, Heart, TrendingUp, BarChart3 } from "lucide-react"

export default function FindTopicsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const topicSuggestions = [
    {
      id: 1,
      text: "Benchmarks for evaluation of large language models",
      icon: Link,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100"
    },
    {
      id: 2,
      text: "Efficient materials for solar panels",
      icon: Circle,
      iconColor: "text-orange-500",
      bgColor: "bg-orange-50",
      hoverColor: "hover:bg-orange-100"
    },
    {
      id: 3,
      text: "Effective interventions for treating depression",
      icon: Heart,
      iconColor: "text-pink-500",
      bgColor: "bg-pink-50",
      hoverColor: "hover:bg-pink-100"
    },
    {
      id: 4,
      text: "Renewable energy trends for the next decade",
      icon: TrendingUp,
      iconColor: "text-green-500",
      bgColor: "bg-green-50",
      hoverColor: "hover:bg-green-100"
    },
    {
      id: 5,
      text: "Main causes of economic recessions",
      icon: BarChart3,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-50",
      hoverColor: "hover:bg-purple-100"
    }
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle search functionality here
    console.log("Searching for:", searchQuery)
  }

  const handleTopicClick = (topic: string) => {
    setSearchQuery(topic)
    console.log("Selected topic:", topic)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold text-gray-900 mb-4">
            Find Topics
          </h1>
          <p className="text-lg text-gray-600 font-normal">
            Go deeper within research papers to extract insightful topics.
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto mb-16">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for topics across research papers..."
              className="w-full px-6 py-4 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Suggestions Section */}
        <div className="max-w-3xl mx-auto">
          <p className="text-base text-gray-700 mb-6 font-medium">
            Try asking or searching for:
          </p>
          
          <div className="space-y-4">
            {topicSuggestions.map((suggestion) => {
              const IconComponent = suggestion.icon
              return (
                <button
                  key={suggestion.id}
                  onClick={() => handleTopicClick(suggestion.text)}
                  className={`group w-full flex items-center gap-4 p-4 rounded-lg border border-gray-100 ${suggestion.bgColor} ${suggestion.hoverColor} transition-colors duration-200 text-left`}
                >
                  <div className={`flex-shrink-0 w-5 h-5 ${suggestion.iconColor}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-base text-blue-600 hover:text-blue-700 font-medium group-hover:underline">
                    {suggestion.text}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
