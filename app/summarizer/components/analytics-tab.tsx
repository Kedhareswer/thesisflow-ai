"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Zap
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
}

export interface AnalyticsTabProps {
  currentSummary: EnhancedSummaryResult | null
  summaryHistory: SummaryHistoryItem[]
  usageStatistics: UsageStatistics
  onViewHistoryItem: (item: SummaryHistoryItem) => void
  onDeleteHistoryItem: (id: string) => void
  onExportHistory: () => void
}

export function AnalyticsTab({
  currentSummary,
  summaryHistory,
  usageStatistics,
  onViewHistoryItem,
  onDeleteHistoryItem,
  onExportHistory
}: AnalyticsTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredHistory, setFilteredHistory] = useState(summaryHistory)

  // Filter history based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHistory(summaryHistory)
    } else {
      const filtered = summaryHistory.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredHistory(filtered)
    }
  }, [searchQuery, summaryHistory])

  // Generate detailed analytics for current summary
  const generateDetailedAnalytics = (summary: EnhancedSummaryResult): DetailedAnalytics => {
    const sentences = summary.summary.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const words = summary.summary.split(/\s+/).filter(w => w.length > 0)
    
    return {
      sentimentBreakdown: {
        positive: summary.sentiment === 'positive' ? 1 : 0,
        neutral: summary.sentiment === 'neutral' ? 1 : 0,
        negative: summary.sentiment === 'negative' ? 1 : 0
      },
      topicDistribution: (summary.topics || []).map(topic => ({
        topic,
        relevance: Math.random() * 0.5 + 0.5 // Mock relevance score
      })),
      readabilityScore: Math.min(10, Math.max(1, 10 - (words.length / sentences.length - 10) * 0.5)),
      keywordDensity: [], // Would be calculated from actual content analysis
      paragraphCount: summary.summary.split('\n\n').length,
      sentenceCount: sentences.length,
      averageSentenceLength: words.length / sentences.length,
      coherenceScore: summary.confidence || 0.8,
      completenessScore: Math.min(1, summary.summaryLength / (summary.originalLength * 0.3)),
      accuracyIndicators: summary.warnings || []
    }
  }

  const currentAnalytics = currentSummary ? generateDetailedAnalytics(currentSummary) : null

  // Show empty state when no summary
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
              <p>• View detailed content analysis</p>
              <p>• Track your summarization history</p>
              <p>• Monitor usage statistics and trends</p>
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

            {/* Topics */}
            {currentSummary.topics && currentSummary.topics.length > 0 && (
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-light text-black flex items-center">
                    <Tag className="h-5 w-5 mr-2" />
                    Key Topics
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Usage Statistics */}
        <div className="space-y-6">
          <h3 className="text-2xl font-light text-black tracking-tight">
            Usage Statistics
          </h3>
          
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
                  {usageStatistics.totalTimeSaved} minutes
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
        </div>

        {/* Summary History */}
        {summaryHistory.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-light text-black tracking-tight">
                Summary History
              </h3>
              <Button
                onClick={onExportHistory}
                variant="outline"
                className="border-gray-200 hover:bg-gray-50 text-gray-700 font-light"
              >
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search summaries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

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
                            {item.statistics.readingTime} min
                          </span>
                          <span className="flex items-center">
                            <Zap className="h-3 w-3 mr-1" />
                            {item.statistics.compressionRatio}
                          </span>
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
                          View
                        </Button>
                        <Button
                          onClick={() => onDeleteHistoryItem(item.id)}
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

            {filteredHistory.length === 0 && searchQuery && (
              <div className="text-center py-8">
                <p className="text-gray-500 font-light">
                  No summaries found matching "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}