"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Copy, 
  Download, 
  Share2, 
  RefreshCw, 
  Clock, 
  Brain,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Star,
  Target,
  CheckCircle,
} from "lucide-react"
import { SummaryOutputPanel } from "./summary-output-panel"
import { SummaryStatistics } from "./summary-statistics"
import { QualityAssessment } from "./quality-assessment"
import { ProcessingProgressIndicator, ChunkingStats } from "./processing-progress"
import { EnhancedLoading, SummaryLoadingSkeleton } from "./enhanced-loading"
import type { ProcessingProgress } from "@/lib/utils/chunked-processor"

// Enhanced SummaryResult interface to match the current implementation
export interface EnhancedSummaryResult {
  summary: string
  keyPoints: string[]
  readingTime: number
  sentiment?: "positive" | "neutral" | "negative"
  originalLength: number
  summaryLength: number
  compressionRatio: string
  topics?: string[]
  difficulty?: "beginner" | "intermediate" | "advanced"
  tables?: any[]
  graphs?: any[]
  confidence?: number
  warnings?: string[]
  suggestions?: string[]
  processingMethod?: "direct" | "chunked" | "fallback"
  metadata?: any
}

export interface SummaryTabProps {
  // Summary data
  result: EnhancedSummaryResult | null
  
  // Processing state
  isProcessing: boolean
  processingProgress?: ProcessingProgress | null
  
  // Actions
  onRetry: (options?: any) => void
  onCopyToClipboard: (text: string) => void
  onDownloadSummary: () => void
  onShareSummary: () => void
  
  // State
  copied: boolean
  
  // Utilities
  getWordCount: (text: string) => number
  
  // Configuration (for retry)
  summaryStyle: "academic" | "executive" | "bullet-points" | "detailed"
  summaryLength: "brief" | "medium" | "comprehensive"
}

export function SummaryTab({
  result,
  isProcessing,
  processingProgress,
  onRetry,
  onCopyToClipboard,
  onDownloadSummary,
  onShareSummary,
  copied,
  getWordCount,
  summaryStyle,
  summaryLength
}: SummaryTabProps) {
  
  const handleQualityFeedback = (rating: "good" | "poor", feedback?: string) => {
    // Log feedback for analytics (could be sent to backend)
    console.log('Quality feedback:', { rating, feedback, resultId: result?.summary.slice(0, 50) })
  }

  // Show loading state when processing
  if (isProcessing) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="text-center">
              <h2 className="text-3xl font-light tracking-tight text-black mb-3">
                Generating Summary
              </h2>
              <p className="text-gray-600 text-lg font-light max-w-2xl mx-auto">
                Processing your content to create an intelligent summary
              </p>
            </div>
          </div>
        </div>

        {/* Processing Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Enhanced Loading State with Progress */}
            <EnhancedLoading
              progress={processingProgress}
              operation="summarize"
              className="max-w-2xl mx-auto"
            />

            {/* Show skeleton while processing */}
            {processingProgress?.stage === 'processing' && (
              <SummaryLoadingSkeleton className="max-w-4xl mx-auto" />
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show empty state when no result
  if (!result) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="text-center">
              <h2 className="text-3xl font-light tracking-tight text-black mb-3">
                Summary Results
              </h2>
              <p className="text-gray-600 text-lg font-light max-w-2xl mx-auto">
                Your generated summaries will appear here
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-light text-gray-900 mb-2">
              No Summary Yet
            </h3>
            <p className="text-gray-600 font-light mb-6">
              Generate a summary from the Input tab to see results here.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• Upload files, enter URLs, or paste text</p>
              <p>• Configure your preferred settings</p>
              <p>• Click "Generate Summary" to begin</p>
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
              Summary Results
            </h2>
            <p className="text-gray-600 text-lg font-light max-w-2xl mx-auto">
              Your AI-generated summary with key insights and statistics
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Enhanced Key Statistics Display */}
          <Card className="border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-semibold text-blue-900">{result.readingTime}</div>
                  <div className="text-sm text-blue-700 font-light">Minutes to read</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Brain className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-semibold text-green-900">{result.compressionRatio}</div>
                  <div className="text-sm text-green-700 font-light">Compression ratio</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-semibold text-purple-900">{result.summaryLength}</div>
                  <div className="text-sm text-purple-700 font-light">Summary words</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Star className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-2xl font-semibold text-orange-900">
                    {result.confidence ? `${Math.round(result.confidence * 100)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-orange-700 font-light">Confidence score</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Summary Content Display */}
          <Card className="border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-light text-black tracking-tight">
                  Generated Summary
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-light">
                    {summaryStyle} • {summaryLength}
                  </Badge>
                  {result.processingMethod && (
                    <Badge variant="secondary" className="text-xs font-light">
                      {result.processingMethod}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="prose prose-lg max-w-none">
                <div className="text-gray-900 leading-relaxed font-light text-lg space-y-4">
                  {result.summary.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <p key={index} className="mb-4 last:mb-0">
                        {paragraph}
                      </p>
                    )
                  ))}
                </div>
              </div>
              
              <Separator className="my-6" />
              
              {/* Enhanced Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  onClick={() => onCopyToClipboard(result.summary)}
                  variant="outline"
                  className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-light"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? "Copied!" : "Copy Summary"}
                </Button>
                
                <Button
                  onClick={onDownloadSummary}
                  variant="outline"
                  className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-light"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                
                <Button
                  onClick={onShareSummary}
                  variant="outline"
                  className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-light"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                
                <Button
                  onClick={() => onRetry()}
                  variant="outline"
                  className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-light"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Key Points Section */}
          {result.keyPoints && result.keyPoints.length > 0 && (
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-light text-black tracking-tight flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Key Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2.5 flex-shrink-0" />
                      <span className="text-gray-900 leading-relaxed font-light">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Statistics */}
          <div className="grid gap-6 lg:grid-cols-2">
            <SummaryStatistics
              result={result}
              getWordCount={getWordCount}
            />

            <QualityAssessment
              result={result}
              onRetry={onRetry}
              onFeedback={handleQualityFeedback}
            />
          </div>

          {/* Processing Details */}
          {result?.metadata && (result.metadata.totalChunks || 0) > 1 && (
            <ChunkingStats
              metadata={result.metadata}
              confidence={result.confidence}
              warnings={result.warnings}
              suggestions={result.suggestions}
              className="max-w-4xl mx-auto"
            />
          )}

          {/* Success Indicator for High Quality */}
          {result.confidence && result.confidence >= 0.8 && (
            <Card className="border-green-200 bg-green-50 max-w-2xl mx-auto">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="font-medium text-green-800">Excellent Summary Generated!</h4>
                    <p className="text-sm text-green-700">
                      High-quality summary with {Math.round(result.confidence * 100)}% confidence score.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}