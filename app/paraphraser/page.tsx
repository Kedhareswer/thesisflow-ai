"use client"

import React, { useState, useCallback } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { ChevronDown, Share, FileText, RotateCcw } from "lucide-react"

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

  const tabs = ['Academic', 'Fluent', 'Formal', 'Creative']
  const moreOptions = ['Casual', 'Technical', 'Simple', 'Professional']

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setInputText(text)
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    setWordCount(words)
  }

  const handleParaphrase = useCallback(async () => {
    if (!inputText.trim()) return
    
    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
    }, 2000)
  }, [inputText])

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
          <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-lg">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                    className="flex items-center px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    More
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </button>
                  {showMoreDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                      {moreOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setActiveTab(option)
                            setShowMoreDropdown(false)
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                {/* Left side - Sliders */}
                <div className="flex items-center space-x-8">
                  {/* Length Slider */}
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600 min-w-[50px]">Length:</span>
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                        {lengthValue}
                      </span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={lengthValue}
                        onChange={(e) => setLengthValue(Number(e.target.value))}
                        className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      {[1, 2, 3, 4, 5].map((num) => (
                        <span
                          key={num}
                          className={`w-2 h-2 rounded-full ${
                            num <= lengthValue ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Variation Slider */}
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600 min-w-[60px]">Variation:</span>
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                        {variationValue}
                      </span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={variationValue}
                        onChange={(e) => setVariationValue(Number(e.target.value))}
                        className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      {[1, 2, 3, 4, 5].map((num) => (
                        <span
                          key={num}
                          className={`w-2 h-2 rounded-full ${
                            num <= variationValue ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right side - Locale */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">🌐 Locale</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Text Input Area */}
            <div className="p-6">
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="Write here or try a sample text"
                  className="w-full h-64 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-700 placeholder-gray-400"
                />
                {!inputText && (
                  <button
                    onClick={trySampleText}
                    className="absolute top-16 left-8 text-blue-500 hover:text-blue-600 text-sm underline"
                  >
                    📄 try a sample text
                  </button>
                )}
              </div>

              {/* Bottom Bar */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  {wordCount}/500 words
                </div>
                <button
                  onClick={handleParaphrase}
                  disabled={!inputText.trim() || isLoading}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? 'Processing...' : 'Paraphrase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
