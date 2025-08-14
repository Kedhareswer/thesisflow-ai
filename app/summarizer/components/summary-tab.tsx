"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Download, Share2, RefreshCw, Clock, Zap, Target, Loader2 } from "lucide-react"
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
  processingMethod?: string
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
          {/* Quick Stats Bar */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Badge variant="secondary" className="px-3 py-1 bg-gray-100 text-gray-700 font-light">
              <Clock className="h-3 w-3 mr-1" />
              {result.readingTime} min read
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 bg-gray-100 text-gray-700 font-light">
              <Zap className="h-3 w-3 mr-1" />
              {result.compressionRatio} compression
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 bg-gray-100 text-gray-700 font-light">
              <Target className="h-3 w-3 mr-1" />
              {result.summaryLength} words
            </Badge>
            {result.confidence && (
              <Badge variant="secondary" className="px-3 py-1 bg-gray-100 text-gray-700 font-light">
                {Math.round(result.confidence * 100)}% confidence
              </Badge>
            )}
          </div>

          {/* Summary Output - Primary Focus */}
          <div className="space-y-6">
            <SummaryOutputPanel
              result={result}
              loading={false}
              copied={copied}
              onCopyToClipboard={onCopyToClipboard}
              onDownloadSummary={onDownloadSummary}
              onShareSummary={onShareSummary}
              getWordCount={getWordCount}
              showAdvancedStats={false}
              summaryStyle={summaryStyle}
              summaryLength={summaryLength}
            />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={() => onCopyToClipboard(result.summary)}
                variant="outline"
                className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-light"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? "Copied!" : "Copy"}
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
          </div>

          {/* Enhanced Statistics and Quality Assessment */}
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

          {/* Chunking Statistics */}
          {result?.metadata && (result.metadata.totalChunks || 0) > 1 && (
            <ChunkingStats
              metadata={result.metadata}
              confidence={result.confidence}
              warnings={result.warnings}
              suggestions={result.suggestions}
              className="max-w-4xl mx-auto"
            />
          )}

          {/* Processing Method Info */}
          {result.processingMethod && (
            <Card className="max-w-2xl mx-auto border-gray-200 bg-gray-50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-600 font-light">
                  Processed using <span className="font-medium">{result.processingMethod}</span> method
                  {result.metadata?.totalChunks && result.metadata.totalChunks > 1 && 
                    ` with ${result.metadata.totalChunks} content chunks`
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}