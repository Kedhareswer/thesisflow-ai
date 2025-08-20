"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  FileText, 
  Search, 
  Download, 
  Trash2,
  Calendar,
  Tag,
  Brain,
  Target,
  Zap,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  Heart,
  Frown,
  Meh,
  Smile,
  BookOpen,
  Users,
  Globe,
  Upload,
  Link,
  Type,
  AlertCircle,
  CheckCircle,
  Info,
  TrendingDown
} from "lucide-react"
import type { EnhancedSummaryResult } from "./summary-tab"

// Types for analytics data
export interface SummaryHistoryItem {
  id: string
  title: string
  originalSource: 'file' | 'url' | 'text' | 'search'
  sourceDetails: string
  summary: string
  keyPoints: string[]
  statistics: {
    originalLength: number
    summaryLength: number
    compressionRatio: string
    readingTime: number
    confidence?: number
  }
  timestamp: Date
  tags: string[]
  // Enhanced analytics data
  sentiment?: 'positive' | 'neutral' | 'negative'
  topics?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  provider?: string
  model?: string
  processingMethod?: 'direct' | 'chunked' | 'fallback'
}

export interface UsageStatistics {
  totalSummaries: number
  averageCompressionRatio: number
  mostUsedInputMethod: string
  mostUsedProvider: string
  totalWordsProcessed: number
  totalTimeSaved: number // in minutes
  summariesByMonth: { month: string; count: number }[]
  topTopics: { topic: string; count: number }[]
  // Enhanced statistics
  averageConfidence: number
  successRate: number
  mostUsedDifficulty: string
  averageProcessingTime: number
  inputMethodBreakdown: { method: string; count: number; percentage: number }[]
  providerBreakdown: { provider: string; count: number; percentage: number }[]
  sentimentBreakdown: { sentiment: string; count: number; percentage: number }[]
}

export interface DetailedAnalytics {
  // Current summary analysis
  sentimentBreakdown: {
    positive: number
    neutral: number
    negative: number
  }
  topicDistribution: { topic: string; relevance: number }[]
  readabilityScore: number
  keywordDensity: { keyword: string; density: number }[]
  
  // Content structure
  paragraphCount: number
  sentenceCount: number
  averageSentenceLength: number
  
  // Quality metrics
  coherenceScore: number
  completenessScore: number
  accuracyIndicators: string[]
  
  // Enhanced analytics
  complexityScore: number
  structureScore: number
  clarityScore: number
  comprehensivenessScore: number
}

// Local storage utilities for summary history
const STORAGE_KEYS = {
  SUMMARY_HISTORY: 'summarizer_history',
  USAGE_STATISTICS: 'summarizer_usage_stats',
  ANALYTICS_PREFERENCES: 'summarizer_analytics_prefs'
}

// Utility functions for localStorage management
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

// Safe Date helper
function toDate(value: any): Date {
  return value instanceof Date ? value : new Date(value)
}

// Generate detailed analytics data from actual summary content
function generateMockAnalytics(summary: EnhancedSummaryResult): DetailedAnalytics {
  const sentences = summary.summary.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = summary.summary.split(/\s+/).filter(w => w.length > 0)
  const paragraphs = summary.summary.split('\n\n').filter(p => p.trim().length > 0)
  
  // Calculate actual sentiment distribution
  const sentimentWeight = {
    positive: summary.sentiment === 'positive' ? 0.8 : summary.sentiment === 'neutral' ? 0.1 : 0.1,
    neutral: summary.sentiment === 'neutral' ? 0.8 : 0.15,
    negative: summary.sentiment === 'negative' ? 0.8 : summary.sentiment === 'neutral' ? 0.1 : 0.05
  }
  
  // Extract keyword density from topics and content
  const keywordDensity = (summary.topics || []).map(topic => ({
    keyword: topic,
    density: (summary.summary.toLowerCase().split(topic.toLowerCase()).length - 1) / words.length * 100
  })).filter(kw => kw.density > 0)
  
  return {
    sentimentBreakdown: sentimentWeight,
    topicDistribution: (summary.topics || []).map(topic => ({
      topic,
      relevance: Math.min(0.95, 0.5 + (summary.summary.toLowerCase().split(topic.toLowerCase()).length - 1) * 0.1)
    })),
    readabilityScore: Math.min(10, Math.max(1, 10 - Math.abs(words.length / sentences.length - 15) * 0.2)),
    keywordDensity,
    paragraphCount: Math.max(1, paragraphs.length),
    sentenceCount: sentences.length,
    averageSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
    coherenceScore: summary.confidence || 0.85,
    completenessScore: Math.min(1, Math.max(0.3, summary.summaryLength / (summary.originalLength * 0.25))),
    accuracyIndicators: summary.warnings || [],
    complexityScore: summary.difficulty === 'advanced' ? 0.9 : summary.difficulty === 'intermediate' ? 0.65 : 0.35,
    structureScore: paragraphs.length > 2 ? 0.9 : paragraphs.length > 1 ? 0.7 : 0.5,
    clarityScore: Math.min(0.95, (summary.confidence || 0.8) * 0.95),
    comprehensivenessScore: Math.min(1, Math.max(0.2, (summary.keyPoints?.length || 0) / 5))
  }
}

export interface AnalyticsTabProps {
  currentSummary: EnhancedSummaryResult | null
  summaryHistory: SummaryHistoryItem[]
  usageStatistics: UsageStatistics
  onViewHistoryItem: (item: SummaryHistoryItem) => void
  onDeleteHistoryItem: (id: string) => void
  onExportHistory: () => void
  // Enhanced functionality
  onSaveCurrentSummary?: (summary: EnhancedSummaryResult) => void
  onClearHistory?: () => void
}

export function AnalyticsTab({
  currentSummary,
  summaryHistory: propSummaryHistory,
  usageStatistics: propUsageStatistics,
  onViewHistoryItem,
  onDeleteHistoryItem,
  onExportHistory,
  onSaveCurrentSummary,
  onClearHistory
}: AnalyticsTabProps) {
  // Local state for enhanced functionality
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'compression' | 'confidence'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterBy, setFilterBy] = useState<'all' | 'file' | 'url' | 'text' | 'search'>('all')
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('all')
  
  // Enhanced state management with localStorage
  const [summaryHistory, setSummaryHistory] = useState<SummaryHistoryItem[]>([])
  const [usageStatistics, setUsageStatistics] = useState<UsageStatistics>(propUsageStatistics)
  const [filteredHistory, setFilteredHistory] = useState<SummaryHistoryItem[]>([])

  // Load data from localStorage on mount
  useEffect(() => {
    const storedHistory = loadFromStorage<SummaryHistoryItem[]>(STORAGE_KEYS.SUMMARY_HISTORY, [])
    const storedStats = loadFromStorage<UsageStatistics>(STORAGE_KEYS.USAGE_STATISTICS, propUsageStatistics)
    
    // Normalize timestamps that may have been stringified in localStorage
    const normalizedHistory = (storedHistory || []).map((item) => ({
      ...item,
      timestamp: toDate((item as any).timestamp),
    }))
    setSummaryHistory(normalizedHistory)
    setUsageStatistics(storedStats)
  }, [propUsageStatistics])

  // Save current summary to history when it changes
  useEffect(() => {
    if (currentSummary) {
      // Generate a more descriptive title
      let title = 'Summary'
      if (currentSummary.summary.length > 20) {
        // Try to extract the first meaningful sentence or phrase
        const firstSentence = currentSummary.summary.split(/[.!?]/)[0].trim()
        if (firstSentence.length > 10 && firstSentence.length < 80) {
          title = firstSentence
        } else {
          title = currentSummary.summary.slice(0, 50).trim()
        }
      }
      
      // Determine source type based on available data
      let sourceType: 'file' | 'url' | 'text' | 'search' = 'text'
      let sourceDetails = ''
      
      // This would ideally come from the parent component
      // For now, we'll use a heuristic based on the summary content
      if (currentSummary.metadata?.source) {
        sourceType = currentSummary.metadata.source
        sourceDetails = currentSummary.metadata.sourceDetails || ''
      }

      const historyItem: SummaryHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title + (title.endsWith('...') ? '' : '...'),
        originalSource: sourceType,
        sourceDetails,
        summary: currentSummary.summary,
        keyPoints: currentSummary.keyPoints || [],
        statistics: {
          originalLength: currentSummary.originalLength,
          summaryLength: currentSummary.summaryLength,
          compressionRatio: currentSummary.compressionRatio,
          readingTime: currentSummary.readingTime,
          confidence: currentSummary.confidence
        },
        timestamp: new Date(),
        tags: currentSummary.topics || [],
        sentiment: currentSummary.sentiment,
        topics: currentSummary.topics,
        difficulty: currentSummary.difficulty,
        processingMethod: currentSummary.processingMethod || 'direct'
      }

      // Add to history if not already present (check by summary content and recent timestamp)
      setSummaryHistory(prev => {
        const exists = prev.some(item => {
          const summaryMatch = item.summary.slice(0, 100) === historyItem.summary.slice(0, 100)
          const timeMatch = Math.abs(toDate(item.timestamp).getTime() - toDate(historyItem.timestamp).getTime()) < 30000 // 30 seconds
          return summaryMatch && timeMatch
        })
        
        if (!exists) {
          const updated = [historyItem, ...prev].slice(0, 100) // Keep last 100 summaries
          saveToStorage(STORAGE_KEYS.SUMMARY_HISTORY, updated)
          
          // Update usage statistics
          const updatedStats = calculateUsageStatistics(updated)
          setUsageStatistics(updatedStats)
          saveToStorage(STORAGE_KEYS.USAGE_STATISTICS, updatedStats)
          
          return updated
        }
        return prev
      })
      
      // Call the optional callback
      if (onSaveCurrentSummary) {
        onSaveCurrentSummary(currentSummary)
      }
    }
  }, [currentSummary, onSaveCurrentSummary])

  // Calculate usage statistics from history with proper data
  const calculateUsageStatistics = (history: SummaryHistoryItem[]): UsageStatistics => {
    if (history.length === 0) {
      // Return meaningful default stats instead of all zeros
      return {
        ...propUsageStatistics,
        totalSummaries: 0,
        averageCompressionRatio: 0,
        totalWordsProcessed: 0,
        totalTimeSaved: 0,
        averageConfidence: 0,
        inputMethodBreakdown: [
          { method: 'text', count: 0, percentage: 0 },
          { method: 'file', count: 0, percentage: 0 },
          { method: 'url', count: 0, percentage: 0 },
          { method: 'search', count: 0, percentage: 0 }
        ],
        providerBreakdown: [
          { provider: 'openai', count: 0, percentage: 0 },
          { provider: 'gemini', count: 0, percentage: 0 },
          { provider: 'groq', count: 0, percentage: 0 },
          { provider: 'anthropic', count: 0, percentage: 0 }
        ],
        sentimentBreakdown: [
          { sentiment: 'positive', count: 0, percentage: 0 },
          { sentiment: 'neutral', count: 0, percentage: 0 },
          { sentiment: 'negative', count: 0, percentage: 0 }
        ]
      }
    }

    const totalSummaries = history.length
    const totalWordsProcessed = history.reduce((acc, item) => acc + item.statistics.originalLength, 0)
    const totalTimeSaved = history.reduce((acc, item) => acc + item.statistics.readingTime, 0)
    const averageCompressionRatio = totalSummaries > 0 ? history.reduce((acc, item) => {
      const ratio = parseFloat(item.statistics.compressionRatio.replace('%', ''))
      return acc + (isNaN(ratio) ? 0 : ratio)
    }, 0) / totalSummaries : 0

    // Input method breakdown
    const inputMethods = history.reduce((acc, item) => {
      acc[item.originalSource] = (acc[item.originalSource] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const inputMethodBreakdown = Object.entries(inputMethods).map(([method, count]) => ({
      method,
      count,
      percentage: (count / totalSummaries) * 100
    }))

    // Provider breakdown (mock data for now)
    const providerBreakdown = [
      { provider: 'openai', count: Math.floor(totalSummaries * 0.4), percentage: 40 },
      { provider: 'gemini', count: Math.floor(totalSummaries * 0.3), percentage: 30 },
      { provider: 'groq', count: Math.floor(totalSummaries * 0.2), percentage: 20 },
      { provider: 'anthropic', count: Math.floor(totalSummaries * 0.1), percentage: 10 }
    ]

    // Sentiment breakdown
    const sentiments = history.reduce((acc, item) => {
      const sentiment = item.sentiment || 'neutral'
      acc[sentiment] = (acc[sentiment] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const sentimentBreakdown = Object.entries(sentiments).map(([sentiment, count]) => ({
      sentiment,
      count,
      percentage: (count / totalSummaries) * 100
    }))

    return {
      totalSummaries,
      averageCompressionRatio: Math.round(averageCompressionRatio),
      mostUsedInputMethod: inputMethodBreakdown.sort((a, b) => b.count - a.count)[0]?.method || 'text',
      mostUsedProvider: 'openai', // Mock
      totalWordsProcessed,
      totalTimeSaved,
      summariesByMonth: [], // Would be calculated from timestamps
      topTopics: [], // Would be calculated from topics
      averageConfidence: history.reduce((acc, item) => acc + (item.statistics.confidence || 0.8), 0) / totalSummaries,
      successRate: 95, // Mock
      mostUsedDifficulty: 'intermediate', // Mock
      averageProcessingTime: 2.5, // Mock
      inputMethodBreakdown,
      providerBreakdown,
      sentimentBreakdown
    }
  }

  // Enhanced filtering and sorting
  useEffect(() => {
    let filtered = [...summaryHistory]

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.topics && item.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase())))
      )
    }

    // Apply source filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(item => item.originalSource === filterBy)
    }

    // Apply time range filter
    if (selectedTimeRange !== 'all') {
      const now = new Date()
      const timeRanges = {
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        quarter: 90 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000
      }
      const cutoff = new Date(now.getTime() - timeRanges[selectedTimeRange])
      filtered = filtered.filter(item => toDate(item.timestamp).getTime() >= cutoff.getTime())
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = toDate(a.timestamp).getTime() - toDate(b.timestamp).getTime()
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'compression':
          const aRatio = parseFloat(a.statistics.compressionRatio.replace('%', ''))
          const bRatio = parseFloat(b.statistics.compressionRatio.replace('%', ''))
          comparison = aRatio - bRatio
          break
        case 'confidence':
          comparison = (a.statistics.confidence || 0) - (b.statistics.confidence || 0)
          break
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })

    setFilteredHistory(filtered)
  }, [summaryHistory, searchQuery, filterBy, selectedTimeRange, sortBy, sortOrder])

  // Enhanced delete function
  const handleDeleteHistoryItem = (id: string) => {
    setSummaryHistory(prev => {
      const updated = prev.filter(item => item.id !== id)
      saveToStorage(STORAGE_KEYS.SUMMARY_HISTORY, updated)
      
      // Update usage statistics
      const updatedStats = calculateUsageStatistics(updated)
      setUsageStatistics(updatedStats)
      saveToStorage(STORAGE_KEYS.USAGE_STATISTICS, updatedStats)
      
      return updated
    })
    onDeleteHistoryItem(id)
  }

  // Clear all history with confirmation
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all summary history? This action cannot be undone.')) {
      setSummaryHistory([])
      saveToStorage(STORAGE_KEYS.SUMMARY_HISTORY, [])
      
      // Reset usage statistics
      const resetStats = {
        ...propUsageStatistics,
        totalSummaries: 0,
        totalWordsProcessed: 0,
        totalTimeSaved: 0,
        inputMethodBreakdown: [],
        providerBreakdown: [],
        sentimentBreakdown: []
      }
      setUsageStatistics(resetStats)
      saveToStorage(STORAGE_KEYS.USAGE_STATISTICS, resetStats)
      
      if (onClearHistory) {
        onClearHistory()
      }
    }
  }

  // Export enhanced history data
  const handleExportHistory = () => {
    const exportData = {
      summaryHistory,
      usageStatistics,
      exportDate: new Date().toISOString(),
      totalItems: summaryHistory.length
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `summarizer-analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    onExportHistory()
  }

  // Generate detailed analytics for current summary
  const currentAnalytics = currentSummary ? generateMockAnalytics(currentSummary) : null

  // Get sentiment icon
  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return <Smile className="h-4 w-4 text-green-600" />
      case 'negative': return <Frown className="h-4 w-4 text-red-600" />
      default: return <Meh className="h-4 w-4 text-gray-600" />
    }
  }

  // Get difficulty color
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700'
      case 'advanced': return 'bg-red-100 text-red-700'
      default: return 'bg-yellow-100 text-yellow-700'
    }
  }

  // Get source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'file': return <Upload className="h-4 w-4" />
      case 'url': return <Link className="h-4 w-4" />
      case 'search': return <Search className="h-4 w-4" />
      default: return <Type className="h-4 w-4" />
    }
  }

  // Show empty state when no summary and no history
  if (!currentSummary && summaryHistory.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="text-center">
              <h2 className="text-3xl font-light tracking-tight text-black mb-3">
                Analytics & History
              </h2>
              <p className="text-gray-600 text-lg font-light max-w-2xl mx-auto">
                Track your summarization patterns and analyze content insights
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-light text-gray-900 mb-2">
              No Analytics Data Yet
            </h3>
            <p className="text-gray-600 font-light mb-6">
              Generate summaries to see detailed analytics and usage patterns.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• View detailed content analysis with sentiment and topics</p>
              <p>• Track your summarization history with search and filters</p>
              <p>• Monitor usage statistics and performance trends</p>
              <p>• Export your data for external analysis</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h2 className="text-3xl font-light tracking-tight text-black mb-3">
              Analytics & History
            </h2>
            <p className="text-gray-600 text-lg font-light max-w-2xl mx-auto">
              Detailed insights into your content and summarization patterns
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Current Summary Analytics */}
        {currentSummary && currentAnalytics && (
          <div className="space-y-6">
            <h3 className="text-2xl font-light text-black tracking-tight">
              Current Summary Analysis
            </h3>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Sentiment */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-light text-gray-600 flex items-center">
                    <Brain className="h-4 w-4 mr-2" />
                    Sentiment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-light text-black mb-1">
                    {currentSummary.sentiment || 'Neutral'}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      currentSummary.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                      currentSummary.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {currentSummary.sentiment === 'positive' ? 'Positive tone' :
                     currentSummary.sentiment === 'negative' ? 'Negative tone' :
                     'Neutral tone'}
                  </Badge>
                </CardContent>
              </Card>

              {/* Difficulty */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-light text-gray-600 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Difficulty
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-light text-black mb-1 capitalize">
                    {currentSummary.difficulty || 'Intermediate'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Readability: {currentAnalytics.readabilityScore.toFixed(1)}/10
                  </div>
                </CardContent>
              </Card>

              {/* Structure */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-light text-gray-600 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Structure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-light text-black mb-1">
                    {currentAnalytics.paragraphCount}
                  </div>
                  <div className="text-xs text-gray-500">
                    {currentAnalytics.sentenceCount} sentences
                  </div>
                </CardContent>
              </Card>

              {/* Quality */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-light text-gray-600 flex items-center">
                    <Zap className="h-4 w-4 mr-2" />
                    Quality
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-light text-black mb-1">
                    {Math.round((currentSummary.confidence || 0.8) * 100)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    Confidence score
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Content Analysis */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Topics and Keywords */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-light text-black flex items-center">
                    <Tag className="h-5 w-5 mr-2" />
                    Content Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentSummary.topics && currentSummary.topics.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Key Topics</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentSummary.topics.map((topic, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="bg-blue-100 text-blue-700 font-light"
                          >
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Sentiment Analysis */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Sentiment Analysis</h4>
                    <div className="flex items-center gap-2">
                      {getSentimentIcon(currentSummary.sentiment)}
                      <span className="text-sm text-gray-700 capitalize">
                        {currentSummary.sentiment || 'Neutral'} tone detected
                      </span>
                    </div>
                  </div>

                  {/* Content Structure */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Content Structure</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Paragraphs:</span>
                        <span className="ml-2 font-medium">{currentAnalytics.paragraphCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Sentences:</span>
                        <span className="ml-2 font-medium">{currentAnalytics.sentenceCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg Sentence:</span>
                        <span className="ml-2 font-medium">{Math.round(currentAnalytics.averageSentenceLength)} words</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Readability:</span>
                        <span className="ml-2 font-medium">{currentAnalytics.readabilityScore.toFixed(1)}/10</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quality Metrics */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-light text-black flex items-center">
                    <Brain className="h-5 w-5 mr-2" />
                    Quality Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quality Scores */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Coherence</span>
                      <div className="flex items-center gap-2">
                        <Progress value={currentAnalytics.coherenceScore * 100} className="w-20 h-2" />
                        <span className="text-sm font-medium">{Math.round(currentAnalytics.coherenceScore * 100)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Completeness</span>
                      <div className="flex items-center gap-2">
                        <Progress value={currentAnalytics.completenessScore * 100} className="w-20 h-2" />
                        <span className="text-sm font-medium">{Math.round(currentAnalytics.completenessScore * 100)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Clarity</span>
                      <div className="flex items-center gap-2">
                        <Progress value={currentAnalytics.clarityScore * 100} className="w-20 h-2" />
                        <span className="text-sm font-medium">{Math.round(currentAnalytics.clarityScore * 100)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Comprehensiveness</span>
                      <div className="flex items-center gap-2">
                        <Progress value={currentAnalytics.comprehensivenessScore * 100} className="w-20 h-2" />
                        <span className="text-sm font-medium">{Math.round(currentAnalytics.comprehensivenessScore * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Processing Information */}
                  <div className="pt-3 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Processing Details</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Method:</span>
                        <Badge variant="outline" className="text-xs">
                          {currentSummary.processingMethod || 'direct'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Difficulty:</span>
                        <Badge className={`text-xs ${getDifficultyColor(currentSummary.difficulty)}`}>
                          {currentSummary.difficulty || 'intermediate'}
                        </Badge>
                      </div>
                      {currentSummary.confidence && (
                        <div className="flex justify-between">
                          <span>Confidence:</span>
                          <span className="font-medium">{Math.round(currentSummary.confidence * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Enhanced Usage Statistics */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-light text-black tracking-tight">
              Usage Statistics
            </h3>
            <Button
              onClick={handleClearHistory}
              variant="outline"
              size="sm"
              className="border-red-200 hover:bg-red-50 text-red-600 font-light"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </div>
          
          {/* Main Statistics Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-light text-gray-600 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Total Summaries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light text-black">
                  {usageStatistics.totalSummaries}
                </div>
                <div className="text-xs text-gray-500">
                  {usageStatistics.averageConfidence ? `${Math.round(usageStatistics.averageConfidence * 100)}% avg confidence` : 'All time'}
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-light text-gray-600 flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Avg Compression
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light text-black">
                  {Math.round(usageStatistics.averageCompressionRatio)}%
                </div>
                <div className="text-xs text-gray-500">
                  {usageStatistics.successRate}% success rate
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-light text-gray-600 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Time Saved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light text-black">
                  {Math.round(usageStatistics.totalTimeSaved / 60)}h
                </div>
                <div className="text-xs text-gray-500">
                  {usageStatistics.averageProcessingTime}s avg processing
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-light text-gray-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Words Processed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light text-black">
                  {Math.round(usageStatistics.totalWordsProcessed / 1000)}K
                </div>
                <div className="text-xs text-gray-500">
                  {usageStatistics.totalWordsProcessed.toLocaleString()} words
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends */}
          {summaryHistory.length > 5 && (
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-light text-black flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Recent Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-light text-green-600">
                      {summaryHistory.slice(0, 5).filter(item => (item.statistics.confidence || 0.8) > 0.8).length}
                    </div>
                    <div className="text-xs text-gray-500">High quality (last 5)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-light text-blue-600">
                      {Math.round(summaryHistory.slice(0, 10).reduce((acc, item) => {
                        const ratio = parseFloat(item.statistics.compressionRatio.replace('%', ''))
                        return acc + ratio
                      }, 0) / Math.min(10, summaryHistory.length))}%
                    </div>
                    <div className="text-xs text-gray-500">Avg compression (last 10)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-light text-purple-600">
                      {summaryHistory.slice(0, 7).reduce((acc, item) => acc + item.statistics.readingTime, 0)}
                    </div>
                    <div className="text-xs text-gray-500">Minutes saved (last 7 days)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-light text-orange-600">
                      {summaryHistory.slice(0, 5).filter(item => item.processingMethod === 'direct').length}
                    </div>
                    <div className="text-xs text-gray-500">Direct processing (last 5)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Breakdowns */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Input Method Breakdown */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-light text-black flex items-center">
                  <Upload className="h-5 w-5 mr-2" />
                  Input Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {usageStatistics.inputMethodBreakdown?.map((method, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSourceIcon(method.method)}
                        <span className="text-sm text-gray-700 capitalize">{method.method}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={method.percentage} className="w-16 h-2" />
                        <span className="text-xs text-gray-500 w-8">{Math.round(method.percentage)}%</span>
                      </div>
                    </div>
                  )) || (
                    <div className="text-sm text-gray-500">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Provider Breakdown */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-light text-black flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  AI Providers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {usageStatistics.providerBreakdown?.map((provider, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-sm text-gray-700 capitalize">{provider.provider}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={provider.percentage} className="w-16 h-2" />
                        <span className="text-xs text-gray-500 w-8">{Math.round(provider.percentage)}%</span>
                      </div>
                    </div>
                  )) || (
                    <div className="text-sm text-gray-500">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sentiment Breakdown */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-light text-black flex items-center">
                  <Heart className="h-5 w-5 mr-2" />
                  Content Sentiment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {usageStatistics.sentimentBreakdown?.map((sentiment, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSentimentIcon(sentiment.sentiment)}
                        <span className="text-sm text-gray-700 capitalize">{sentiment.sentiment}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={sentiment.percentage} className="w-16 h-2" />
                        <span className="text-xs text-gray-500 w-8">{Math.round(sentiment.percentage)}%</span>
                      </div>
                    </div>
                  )) || (
                    <div className="text-sm text-gray-500">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Summary History */}
        {summaryHistory.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-light text-black tracking-tight">
                Summary History
                <span className="text-lg text-gray-500 font-light ml-2">
                  ({filteredHistory.length} {filteredHistory.length === 1 ? 'item' : 'items'})
                </span>
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportHistory}
                  variant="outline"
                  className="border-gray-200 hover:bg-gray-50 text-gray-700 font-light"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export All
                </Button>
                {summaryHistory.length > 0 && (
                  <Button
                    onClick={handleClearHistory}
                    variant="outline"
                    className="border-red-200 hover:bg-red-50 text-red-600 font-light"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Enhanced Search and Filter Controls */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search summaries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>
              
              <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                <SelectTrigger className="border-gray-200">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="file">Files</SelectItem>
                  <SelectItem value="url">URLs</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="search">Web Search</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
                <SelectTrigger className="border-gray-200">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Past Week</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                  <SelectItem value="quarter">Past Quarter</SelectItem>
                  <SelectItem value="year">Past Year</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [newSortBy, newSortOrder] = value.split('-') as [typeof sortBy, typeof sortOrder]
                setSortBy(newSortBy)
                setSortOrder(newSortOrder)
              }}>
                <SelectTrigger className="border-gray-200">
                  {sortOrder === 'desc' ? <SortDesc className="h-4 w-4 mr-2" /> : <SortAsc className="h-4 w-4 mr-2" />}
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="title-asc">Title A-Z</SelectItem>
                  <SelectItem value="title-desc">Title Z-A</SelectItem>
                  <SelectItem value="compression-desc">Best Compression</SelectItem>
                  <SelectItem value="compression-asc">Worst Compression</SelectItem>
                  <SelectItem value="confidence-desc">Highest Confidence</SelectItem>
                  <SelectItem value="confidence-asc">Lowest Confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Summary */}
            {(searchQuery || filterBy !== 'all' || selectedTimeRange !== 'all') && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Showing {filteredHistory.length} of {summaryHistory.length} summaries</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setFilterBy('all')
                    setSelectedTimeRange('all')
                    setSortBy('date')
                    setSortOrder('desc')
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear filters
                </Button>
              </div>
            )}

            {/* History List */}
            <div className="space-y-4">
              {filteredHistory.map((item) => (
                <Card key={item.id} className="border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-black">
                            {item.title}
                          </h4>
                          <Badge 
                            variant="secondary" 
                            className="text-xs bg-gray-100 text-gray-600 font-light"
                          >
                            {item.originalSource.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 font-light mb-3 line-clamp-2">
                          {item.summary.slice(0, 150)}...
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {item.timestamp.toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.statistics.readingTime} min read
                          </span>
                          <span className="flex items-center">
                            <Zap className="h-3 w-3 mr-1" />
                            {item.statistics.compressionRatio} compression
                          </span>
                          {item.statistics.confidence && (
                            <span className="flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {Math.round(item.statistics.confidence * 100)}% confidence
                            </span>
                          )}
                          {item.sentiment && (
                            <span className="flex items-center">
                              {getSentimentIcon(item.sentiment)}
                              <span className="ml-1 capitalize">{item.sentiment}</span>
                            </span>
                          )}
                        </div>

                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags.slice(0, 3).map((tag, index) => (
                              <Badge 
                                key={index} 
                                variant="secondary" 
                                className="text-xs bg-blue-50 text-blue-600 font-light"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs bg-gray-50 text-gray-500">
                                +{item.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => onViewHistoryItem(item)}
                          variant="outline"
                          size="sm"
                          className="border-gray-200 hover:bg-gray-50 text-gray-700 font-light"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-200 hover:bg-red-50 text-red-600 font-light"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty States */}
            {filteredHistory.length === 0 && summaryHistory.length > 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-light text-gray-900 mb-2">No Results Found</h4>
                <p className="text-gray-600 font-light mb-4">
                  {searchQuery ? `No summaries found matching "${searchQuery}"` : 'No summaries match the current filters'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setFilterBy('all')
                    setSelectedTimeRange('all')
                  }}
                  className="border-gray-200 hover:bg-gray-50 text-gray-700 font-light"
                >
                  Clear Filters
                </Button>
              </div>
            )}

            {filteredHistory.length === 0 && summaryHistory.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-light text-gray-900 mb-2">No Summary History</h4>
                <p className="text-gray-600 font-light mb-6">
                  Your summarization history will appear here as you create summaries.
                </p>
                <div className="space-y-2 text-sm text-gray-500 max-w-md mx-auto">
                  <p>• Summaries are automatically saved to your local history</p>
                  <p>• Search and filter through your past summaries</p>
                  <p>• Export your data for backup or analysis</p>
                  <p>• Track your productivity and usage patterns</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}