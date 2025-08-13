"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Clock, 
  FileText, 
  TrendingUp, 
  Target, 
  Brain, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Zap
} from "lucide-react"

interface SummaryStatisticsProps {
  result: {
    summary: string
    keyPoints: string[]
    readingTime: number
    sentiment?: "positive" | "neutral" | "negative"
    originalLength: number
    summaryLength: number
    compressionRatio: string
    topics?: string[]
    difficulty?: "beginner" | "intermediate" | "advanced"
    confidence?: number
    processingMethod?: "direct" | "chunked" | "fallback"
    warnings?: string[]
    suggestions?: string[]
    metadata?: {
      totalChunks?: number
      totalProcessingTime?: number
      chunkingStrategy?: string
    }
  }
  getWordCount: (text: string) => number
  className?: string
}

export function SummaryStatistics({ result, getWordCount, className }: SummaryStatisticsProps) {
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800 border-green-300"
      case "negative":
        return "bg-red-100 text-red-800 border-red-300"
      case "neutral":
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-300"
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "advanced":
        return "bg-red-100 text-red-800 border-red-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "bg-gray-100 text-gray-800"
    if (confidence > 0.8) return "bg-green-100 text-green-800"
    if (confidence > 0.6) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getProcessingMethodIcon = (method?: string) => {
    switch (method) {
      case "chunked":
        return <FileText className="h-4 w-4" />
      case "fallback":
        return <AlertTriangle className="h-4 w-4" />
      case "direct":
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  const formatTime = (ms?: number) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Core Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <TrendingUp className="h-5 w-5" />
            Summary Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-semibold text-gray-900">{result.readingTime}</div>
              <div className="text-sm text-gray-600">Minutes to read</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-semibold text-gray-900">{result.compressionRatio}</div>
              <div className="text-sm text-gray-600">Compression</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-2xl font-semibold text-gray-900">{result.summaryLength}</div>
              <div className="text-sm text-gray-600">Summary words</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-2xl font-semibold text-gray-900">{result.originalLength}</div>
              <div className="text-sm text-gray-600">Original words</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <Brain className="h-5 w-5" />
            Quality Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Confidence Score */}
            {result.confidence !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confidence Score</span>
                  <Badge className={getConfidenceColor(result.confidence)}>
                    {Math.round(result.confidence * 100)}%
                  </Badge>
                </div>
                <Progress value={result.confidence * 100} className="h-2" />
                <p className="text-xs text-gray-600">
                  {result.confidence > 0.8 
                    ? "High confidence - Summary accurately represents the content"
                    : result.confidence > 0.6
                    ? "Medium confidence - Summary is generally accurate"
                    : "Low confidence - Consider reviewing or regenerating"
                  }
                </p>
              </div>
            )}

            {/* Processing Method */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Processing Method</span>
              <Badge variant="outline" className="flex items-center gap-1">
                {getProcessingMethodIcon(result.processingMethod)}
                {result.processingMethod || 'direct'}
              </Badge>
            </div>

            {/* Content Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.sentiment && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sentiment</span>
                  <Badge className={getSentimentColor(result.sentiment)}>
                    {result.sentiment}
                  </Badge>
                </div>
              )}

              {result.difficulty && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Difficulty</span>
                  <Badge className={getDifficultyColor(result.difficulty)}>
                    {result.difficulty}
                  </Badge>
                </div>
              )}

              {result.keyPoints && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Key Points</span>
                  <Badge variant="outline">
                    {result.keyPoints.length}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Details */}
      {result.metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <Info className="h-5 w-5" />
              Processing Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {result.metadata.totalChunks && result.metadata.totalChunks > 1 && (
                <div>
                  <span className="text-gray-600">Chunks processed:</span>
                  <div className="font-medium">{result.metadata.totalChunks}</div>
                </div>
              )}

              {result.metadata.chunkingStrategy && (
                <div>
                  <span className="text-gray-600">Strategy:</span>
                  <div className="font-medium capitalize">{result.metadata.chunkingStrategy}</div>
                </div>
              )}

              {result.metadata.totalProcessingTime && (
                <div>
                  <span className="text-gray-600">Processing time:</span>
                  <div className="font-medium">{formatTime(result.metadata.totalProcessingTime)}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings and Suggestions */}
      {((result.warnings && result.warnings.length > 0) || (result.suggestions && result.suggestions.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <CheckCircle className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-yellow-800 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings
                </h4>
                {result.warnings.map((warning, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">{warning}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-800 flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  Suggestions
                </h4>
                {result.suggestions.map((suggestion, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800">{suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Topics */}
      {result.topics && result.topics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <Target className="h-5 w-5" />
              Identified Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.topics.map((topic, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}