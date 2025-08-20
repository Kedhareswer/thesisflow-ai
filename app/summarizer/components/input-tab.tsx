"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Loader2,
  Upload,
  Link,
  Type,
  Search,
  ChevronDown,
  Settings,
  FileText
} from "lucide-react"
import { FileUploader } from "../components/FileUploader"
import MinimalAIProviderSelector from "@/components/ai-provider-selector-minimal"
import type { AIProvider } from "@/lib/ai-providers"
import type { ProcessingProgress } from "@/lib/utils/chunked-processor"
import { SmartWebSearchPanel, type SearchResult } from "./smart-web-search-panel"

// Types for input data and user preferences
export interface InputData {
  uploadedFile: File | null
  fileContent: string
  url: string
  urlContent: string
  pastedText: string
  searchQuery: string
  selectedSearchResult: SearchResult | null
  activeInputMethod: 'file' | 'url' | 'text' | 'search'
}

export interface ProcessingSettings {
  aiProvider?: AIProvider
  model?: string
  summaryStyle: 'academic' | 'executive' | 'bullet-points' | 'detailed'
  summaryLength: 'brief' | 'medium' | 'comprehensive'
  focusAreas: string[]
  outputFormat: 'text' | 'markdown' | 'structured'
  includeKeyPoints: boolean
  includeSentiment: boolean
  includeTopics: boolean
}

export interface UserPreferences {
  defaultProvider?: AIProvider
  defaultModel?: string
  defaultSummaryStyle: string
  defaultSummaryLength: string
  saveHistory: boolean
  autoSaveSettings: boolean
  preferredInputMethod: string
  theme: 'light' | 'dark' | 'auto'
}

// SearchResult interface is now imported from SmartWebSearchPanel

export interface InputTabProps {
  // Content state
  content: string
  url: string
  onContentChange: (content: string) => void
  onUrlChange: (url: string) => void

  // File handling
  onFileProcessed: (content: string, metadata: any) => void
  onFileError: (error: string) => void

  // URL handling
  onUrlFetch: () => void
  urlFetching: boolean

  // Processing settings
  selectedProvider?: AIProvider
  onProviderChange: (provider: AIProvider | undefined) => void
  selectedModel?: string
  onModelChange: (model: string | undefined) => void
  summaryStyle: "academic" | "executive" | "bullet-points" | "detailed"
  onSummaryStyleChange: (style: "academic" | "executive" | "bullet-points" | "detailed") => void
  summaryLength: "brief" | "medium" | "comprehensive"
  onSummaryLengthChange: (length: "brief" | "medium" | "comprehensive") => void

  // Processing state
  isProcessing: boolean
  processingProgress?: ProcessingProgress | null
  onStartProcessing: () => void

  // Utilities
  getWordCount: (text: string) => number
  currentTab: "file" | "url" | "text"
  onTabChange: (tab: "file" | "url" | "text") => void
}

// Local storage utilities for user preferences
const STORAGE_KEYS = {
  USER_PREFERENCES: 'summarizer_user_preferences',
  PROCESSING_SETTINGS: 'summarizer_processing_settings',
  INPUT_HISTORY: 'summarizer_input_history'
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultSummaryStyle: 'academic',
  defaultSummaryLength: 'medium',
  saveHistory: true,
  autoSaveSettings: true,
  preferredInputMethod: 'text',
  theme: 'light'
}

const DEFAULT_PROCESSING_SETTINGS: ProcessingSettings = {
  summaryStyle: 'academic',
  summaryLength: 'medium',
  focusAreas: [],
  outputFormat: 'text',
  includeKeyPoints: true,
  includeSentiment: false,
  includeTopics: false
}

// Utility functions for localStorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

export function InputTab({
  content,
  url,
  onContentChange,
  onUrlChange,
  onFileProcessed,
  onFileError,
  onUrlFetch,
  urlFetching,
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
  summaryStyle,
  onSummaryStyleChange,
  summaryLength,
  onSummaryLengthChange,
  isProcessing,
  processingProgress,
  onStartProcessing,
  getWordCount,
  currentTab,
  onTabChange
}: InputTabProps) {

  // Local state for enhanced input management
  const [inputData, setInputData] = useState<InputData>({
    uploadedFile: null,
    fileContent: '',
    url: '',
    urlContent: '',
    pastedText: '',
    searchQuery: '',
    selectedSearchResult: null,
    activeInputMethod: 'text'
  })

  // User preferences state
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [processingSettings, setProcessingSettings] = useState<ProcessingSettings>(DEFAULT_PROCESSING_SETTINGS)

  // Advanced settings state
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [focusAreas] = useState<string[]>([]) // Read-only for now, can be extended later
  const [outputFormat, setOutputFormat] = useState<'text' | 'markdown' | 'structured'>('text')
  const [includeKeyPoints, setIncludeKeyPoints] = useState(true)
  const [includeSentiment, setIncludeSentiment] = useState(false)
  const [includeTopics, setIncludeTopics] = useState(false)

  // Smart Web Search state is now handled by SmartWebSearchPanel component

  // Load user preferences on mount
  useEffect(() => {
    const loadedPreferences = loadFromStorage(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_PREFERENCES)
    const loadedSettings = loadFromStorage(STORAGE_KEYS.PROCESSING_SETTINGS, DEFAULT_PROCESSING_SETTINGS)

    setUserPreferences(loadedPreferences)
    setProcessingSettings(loadedSettings)

    // Apply loaded preferences to current state
    if (loadedPreferences.defaultProvider && !selectedProvider) {
      onProviderChange(loadedPreferences.defaultProvider)
    }
    if (loadedPreferences.defaultModel && !selectedModel) {
      onModelChange(loadedPreferences.defaultModel)
    }
    if (loadedSettings.summaryStyle !== summaryStyle) {
      onSummaryStyleChange(loadedSettings.summaryStyle)
    }
    if (loadedSettings.summaryLength !== summaryLength) {
      onSummaryLengthChange(loadedSettings.summaryLength)
    }

    // Set preferred input method
    if (loadedPreferences.preferredInputMethod !== currentTab) {
      onTabChange(loadedPreferences.preferredInputMethod as "file" | "url" | "text")
    }
  }, [])

  // Save preferences when they change
  useEffect(() => {
    if (userPreferences.autoSaveSettings) {
      saveToStorage(STORAGE_KEYS.USER_PREFERENCES, userPreferences)
    }
  }, [userPreferences])

  useEffect(() => {
    if (userPreferences.autoSaveSettings) {
      const updatedSettings: ProcessingSettings = {
        aiProvider: selectedProvider,
        model: selectedModel,
        summaryStyle,
        summaryLength,
        focusAreas,
        outputFormat,
        includeKeyPoints,
        includeSentiment,
        includeTopics
      }
      setProcessingSettings(updatedSettings)
      saveToStorage(STORAGE_KEYS.PROCESSING_SETTINGS, updatedSettings)
    }
  }, [selectedProvider, selectedModel, summaryStyle, summaryLength, focusAreas, outputFormat, includeKeyPoints, includeSentiment, includeTopics, userPreferences.autoSaveSettings])

  // Update input data when external props change
  useEffect(() => {
    setInputData(prev => ({
      ...prev,
      url,
      pastedText: content,
      activeInputMethod: currentTab
    }))
  }, [content, url, currentTab])

  // Smart Web Search functionality is now handled by SmartWebSearchPanel component

  const handleSelectSearchResult = (result: SearchResult) => {
    setInputData(prev => ({
      ...prev,
      selectedSearchResult: result
    }))

    // Integrate with URL processing pipeline
    onUrlChange(result.url)
    onUrlFetch()
  }

  // Input method switching with visual indicators
  const inputMethods = [
    {
      id: 'file' as const,
      label: 'File Upload',
      icon: Upload,
      description: 'Upload PDF, DOCX, or TXT files'
    },
    {
      id: 'url' as const,
      label: 'URL Input',
      icon: Link,
      description: 'Extract content from web pages'
    },
    {
      id: 'text' as const,
      label: 'Text Input',
      icon: Type,
      description: 'Paste text content directly'
    },
    {
      id: 'search' as const,
      label: 'Web Search',
      icon: Search,
      description: 'Search and select content from the web'
    }
  ]

  const activeMethod = inputMethods.find(method => method.id === currentTab) || inputMethods[2]
  const hasContent = content.trim().length > 0

  // Handle input method change and save preference
  const handleInputMethodChange = (method: "file" | "url" | "text" | "search") => {
    // For search, we use URL tab but set search as active method
    if (method === "search") {
      onTabChange("url")
      setInputData(prev => ({
        ...prev,
        activeInputMethod: 'search'
      }))
    } else {
      onTabChange(method)
      setInputData(prev => ({
        ...prev,
        activeInputMethod: method
      }))
    }

    // Save preferred input method
    if (userPreferences.autoSaveSettings) {
      const updatedPreferences = {
        ...userPreferences,
        preferredInputMethod: method === "search" ? "url" : method
      }
      setUserPreferences(updatedPreferences)
      saveToStorage(STORAGE_KEYS.USER_PREFERENCES, updatedPreferences)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h2 className="text-3xl font-light tracking-tight text-black mb-3">
              Content Input
            </h2>
            <p className="text-gray-600 text-lg font-light max-w-2xl mx-auto">
              Upload files, enter URLs, paste text, or search the web for content to summarize
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Input Method Selector */}
              <Card className="border-gray-200 bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-light text-black tracking-tight flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Input Methods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Method Selection Tabs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {inputMethods.slice(0, 3).map((method) => {
                      const Icon = method.icon
                      const isActive = currentTab === method.id
                      return (
                        <button
                          key={method.id}
                          onClick={() => handleInputMethodChange(method.id)}
                          className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${isActive
                            ? 'border-black bg-gray-50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          <Icon className={`h-5 w-5 mb-2 ${isActive ? 'text-black' : 'text-gray-600'}`} />
                          <div className={`text-sm font-medium ${isActive ? 'text-black' : 'text-gray-700'}`}>
                            {method.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {method.description}
                          </div>
                        </button>
                      )
                    })}

                    {/* Smart Web Search - Special handling */}
                    <button
                      onClick={() => {
                        handleInputMethodChange('url')
                        setInputData(prev => ({ ...prev, activeInputMethod: 'search' }))
                      }}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${inputData.activeInputMethod === 'search'
                        ? 'border-black bg-gray-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <Search className={`h-5 w-5 mb-2 ${inputData.activeInputMethod === 'search' ? 'text-black' : 'text-gray-600'}`} />
                      <div className={`text-sm font-medium ${inputData.activeInputMethod === 'search' ? 'text-black' : 'text-gray-700'}`}>
                        Web Search
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Search and select content from the web
                      </div>
                    </button>
                  </div>

                  {/* Active Input Method Content */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center mb-4">
                      <activeMethod.icon className="h-5 w-5 mr-2 text-black" />
                      <h3 className="text-lg font-medium text-black">
                        {activeMethod.label}
                      </h3>
                    </div>

                    {/* File Upload Section */}
                    {currentTab === 'file' && (
                      <div className="space-y-4">
                        <FileUploader onFileProcessed={onFileProcessed} onError={onFileError} />
                        <p className="text-sm text-gray-600 font-light">
                          Supported formats: PDF, DOCX, TXT. Maximum file size: 10MB.
                        </p>
                      </div>
                    )}

                    {/* URL Input Section */}
                    {currentTab === 'url' && inputData.activeInputMethod !== 'search' && (
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <Input
                            placeholder="https://example.com/article"
                            value={url}
                            onChange={(e) => onUrlChange(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !urlFetching && onUrlFetch()}
                            className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black text-gray-900 placeholder:text-gray-400 h-10 font-light"
                          />
                          <Button
                            onClick={onUrlFetch}
                            disabled={urlFetching || !url.trim()}
                            variant="outline"
                            className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 px-5 bg-white h-10 font-light"
                          >
                            {urlFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 font-light">
                            Enter a URL to automatically extract and summarize its content.
                          </p>
                          <div className="text-xs text-gray-500 bg-gray-50 rounded-sm p-3 border border-gray-200">
                            <p className="font-medium text-gray-700 mb-1">Note about URL extraction:</p>
                            <p>Some websites may block automated content extraction. If extraction fails, try copying the content directly or using the Text Input method.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Text Input Section */}
                    {currentTab === 'text' && (
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Paste your text content here to summarize..."
                          value={content}
                          onChange={(e) => onContentChange(e.target.value)}
                          className="min-h-[200px] border-gray-200 focus:border-black focus:ring-1 focus:ring-black text-gray-900 placeholder:text-gray-400 font-light resize-y"
                        />
                        {content && (
                          <div className="flex justify-between items-center text-sm text-gray-500">
                            <span>{getWordCount(content)} words</span>
                            <span>~{Math.ceil(getWordCount(content) / 200)} min read</span>
                          </div>
                        )}
                        <p className="text-sm text-gray-600 font-light">
                          Paste text content directly for summarization. This is useful when URL extraction fails or for content from restricted websites.
                        </p>
                      </div>
                    )}

                    {/* Smart Web Search Section */}
                    {currentTab === 'url' && inputData.activeInputMethod === 'search' && (
                      <SmartWebSearchPanel
                        onResultSelect={handleSelectSearchResult}
                        placeholder="Search for topics, articles, research papers..."
                        maxResults={8}
                        showHistory={true}
                        showSavedSearches={true}
                        className="border-0 shadow-none bg-transparent p-0"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Content Preview */}
              {hasContent && (
                <Card className="border-gray-200 bg-white">
                  <CardContent className="p-6">
                    <h4 className="text-lg font-light text-black mb-3 tracking-tight">
                      Content Preview
                    </h4>
                    <div className="bg-gray-50 rounded-sm p-4 border border-gray-200">
                      <p className="text-sm text-gray-700 font-light line-clamp-4">
                        {content.slice(0, 300)}
                        {content.length > 300 && "..."}
                      </p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-500">
                          {getWordCount(content)} words
                        </span>
                        <span className="text-sm text-gray-500">
                          ~{Math.ceil(getWordCount(content) / 200)} min read
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Processing Settings and Action Panel */}
            <div className="space-y-6">
              {/* AI Provider Selector */}
              <Card className="border-gray-200 bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-light text-black tracking-tight flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    AI Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MinimalAIProviderSelector
                    selectedProvider={selectedProvider}
                    onProviderChange={onProviderChange}
                    selectedModel={selectedModel}
                    onModelChange={onModelChange}
                    variant="inline"
                    showModelSelector={true}
                    showConfigLink={false}
                  />

                  {/* Provider Impact Indicator */}
                  {selectedProvider ? (
                    <div className="p-3 bg-blue-50 rounded-sm border border-blue-200">
                      <p className="text-sm text-blue-800 font-light">
                        <span className="font-medium">Using {selectedProvider}:</span>
                        {selectedProvider === "groq" && " Fast, efficient summaries with high accuracy"}
                        {selectedProvider === "openai" && " Advanced reasoning and detailed analysis"}
                        {selectedProvider === "gemini" && " Balanced analysis with comprehensive coverage"}
                        {selectedProvider === "anthropic" && " High-quality reasoning and detailed insights"}
                        {selectedProvider === "mistral" && " Fast and efficient AI processing"}
                        {selectedProvider === "aiml" && " Specialized AI analysis and insights"}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-green-50 rounded-sm border border-green-200">
                      <p className="text-sm text-green-800 font-light">
                        <span className="font-medium">Auto Mode:</span> Intelligently selects the best available AI provider with automatic fallback for optimal reliability
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Processing Settings */}
              <Card className="border-gray-200 bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-light text-black tracking-tight">
                    Summary Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Settings Indicator */}
                  <div className="p-3 bg-gray-50 rounded-sm">
                    <p className="text-sm text-gray-600 font-light">
                      <span className="font-medium text-black">Current:</span> {summaryStyle} • {summaryLength}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {summaryStyle === "academic" && "Formal, scholarly analysis with citations"}
                      {summaryStyle === "executive" && "Business-focused with strategic insights"}
                      {summaryStyle === "bullet-points" && "Structured bullet-point format"}
                      {summaryStyle === "detailed" && "Comprehensive analysis with deep insights"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-light text-gray-700 mb-2 block">Summary Style</Label>
                    <Select value={summaryStyle} onValueChange={onSummaryStyleChange}>
                      <SelectTrigger className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-10 bg-white font-light">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="academic" className="hover:bg-gray-50 font-light">
                          Academic
                        </SelectItem>
                        <SelectItem value="executive" className="hover:bg-gray-50 font-light">
                          Executive
                        </SelectItem>
                        <SelectItem value="bullet-points" className="hover:bg-gray-50 font-light">
                          Bullet Points
                        </SelectItem>
                        <SelectItem value="detailed" className="hover:bg-gray-50 font-light">
                          Detailed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-light text-gray-700 mb-2 block">Summary Length</Label>
                    <Select value={summaryLength} onValueChange={onSummaryLengthChange}>
                      <SelectTrigger className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-10 bg-white font-light">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="brief" className="hover:bg-gray-50 font-light">
                          Brief
                        </SelectItem>
                        <SelectItem value="medium" className="hover:bg-gray-50 font-light">
                          Medium
                        </SelectItem>
                        <SelectItem value="comprehensive" className="hover:bg-gray-50 font-light">
                          Comprehensive
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Advanced Options */}
                  <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-left pt-2">
                      <span className="text-sm font-medium text-gray-700">Advanced Options</span>
                      <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-4">
                      <div>
                        <Label className="text-sm font-light text-gray-700 mb-2 block">Output Format</Label>
                        <Select value={outputFormat} onValueChange={(value: 'text' | 'markdown' | 'structured') => setOutputFormat(value)}>
                          <SelectTrigger className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-10 bg-white font-light">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem value="text" className="hover:bg-gray-50 font-light">
                              Plain Text
                            </SelectItem>
                            <SelectItem value="markdown" className="hover:bg-gray-50 font-light">
                              Markdown
                            </SelectItem>
                            <SelectItem value="structured" className="hover:bg-gray-50 font-light">
                              Structured
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-light text-gray-700">Include Additional Analysis</Label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={includeKeyPoints}
                              onChange={(e) => setIncludeKeyPoints(e.target.checked)}
                              className="rounded border-gray-300 text-black focus:ring-black"
                            />
                            <span className="text-sm text-gray-700">Key Points</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={includeSentiment}
                              onChange={(e) => setIncludeSentiment(e.target.checked)}
                              className="rounded border-gray-300 text-black focus:ring-black"
                            />
                            <span className="text-sm text-gray-700">Sentiment Analysis</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={includeTopics}
                              onChange={(e) => setIncludeTopics(e.target.checked)}
                              className="rounded border-gray-300 text-black focus:ring-black"
                            />
                            <span className="text-sm text-gray-700">Topic Extraction</span>
                          </label>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>

              {/* Generate Summary Button */}
              <Button
                onClick={() => onStartProcessing()}
                disabled={isProcessing || !hasContent}
                className="w-full h-12 bg-black hover:bg-gray-800 text-white border-0 font-light tracking-wide"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {processingProgress?.stage === 'chunking' && 'Analyzing Structure...'}
                    {processingProgress?.stage === 'processing' && `Processing (${processingProgress.currentChunk || 1}/${processingProgress.totalChunks || 1})...`}
                    {processingProgress?.stage === 'synthesizing' && 'Creating Summary...'}
                    {!processingProgress && 'Initializing...'}
                  </>
                ) : (
                  "Generate Summary"
                )}
              </Button>

              {/* User Preferences */}
              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    User Preferences
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={userPreferences.autoSaveSettings}
                        onChange={(e) => setUserPreferences(prev => ({ ...prev, autoSaveSettings: e.target.checked }))}
                        className="rounded border-gray-300 text-black focus:ring-black"
                      />
                      <span className="text-xs text-gray-600">Auto-save settings</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={userPreferences.saveHistory}
                        onChange={(e) => setUserPreferences(prev => ({ ...prev, saveHistory: e.target.checked }))}
                        className="rounded border-gray-300 text-black focus:ring-black"
                      />
                      <span className="text-xs text-gray-600">Save summary history</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Getting Started Tips */}
              {!hasContent && (
                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Getting Started
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Upload PDF, DOCX, or TXT files</li>
                      <li>• Enter URLs for web articles</li>
                      <li>• Paste text directly for quick summaries</li>
                      <li>• Use web search to find relevant content</li>
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Subtle QuantumPDF Note */}
              <p className="text-xs text-gray-500 text-center font-light">
                For advanced PDF analysis, visit{' '}
                <a
                  href="https://quantumn-pdf-chatapp.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-700"
                >
                  QuantumPDF
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}