"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  FileText, 
  Zap, 
  Brain, 
  CheckCircle, 
  Clock,
  TrendingUp,
  AlertCircle
} from "lucide-react"
import type { ProcessingProgress } from "@/lib/utils/chunked-processor"

interface EnhancedLoadingProps {
  progress?: ProcessingProgress | null
  operation?: "summarize" | "extract" | "fetch"
  className?: string
}

export function EnhancedLoading({ progress, operation = "summarize", className }: EnhancedLoadingProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  const getOperationIcon = (op: string) => {
    switch (op) {
      case "extract":
        return <FileText className="h-5 w-5" />
      case "fetch":
        return <TrendingUp className="h-5 w-5" />
      case "summarize":
      default:
        return <Brain className="h-5 w-5" />
    }
  }

  const getStageIcon = (stage?: string) => {
    switch (stage) {
      case 'chunking':
        return <FileText className="h-4 w-4" />
      case 'processing':
        return <Zap className="h-4 w-4" />
      case 'synthesizing':
        return <Brain className="h-4 w-4" />
      case 'complete':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />
    }
  }

  const getStageColor = (stage?: string) => {
    switch (stage) {
      case 'chunking':
        return 'bg-blue-500'
      case 'processing':
        return 'bg-yellow-500'
      case 'synthesizing':
        return 'bg-purple-500'
      case 'complete':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getOperationMessage = (op: string, stage?: string) => {
    if (stage) {
      switch (stage) {
        case 'chunking':
          return 'Analyzing document structure and creating intelligent chunks...'
        case 'processing':
          return 'Processing content with AI to generate summary...'
        case 'synthesizing':
          return 'Combining results into a coherent summary...'
        case 'complete':
          return 'Processing completed successfully!'
        default:
          return 'Processing...'
      }
    }

    switch (op) {
      case "extract":
        return "Extracting content from file..."
      case "fetch":
        return "Fetching content from URL..."
      case "summarize":
      default:
        return "Generating summary..."
    }
  }

  return (
    <Card className={`border-blue-200 bg-blue-50 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with operation type */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getOperationIcon(operation)}
              <div>
                <h3 className="font-medium text-blue-900">
                  {operation === "extract" ? "Processing File" : 
                   operation === "fetch" ? "Fetching Content" : 
                   "Generating Summary"}
                </h3>
                {progress?.stage && (
                  <div className="flex items-center gap-2 mt-1">
                    {getStageIcon(progress.stage)}
                    <span className="text-sm text-blue-700 capitalize">{progress.stage}</span>
                    <Badge 
                      variant="secondary" 
                      className={`${getStageColor(progress.stage)} text-white text-xs`}
                    >
                      {Math.round(progress.progress || 0)}%
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Clock className="h-4 w-4" />
              <span>{formatTime(elapsedTime)}</span>
            </div>
          </div>

          {/* Progress bar */}
          {progress && (
            <div className="space-y-2">
              <Progress 
                value={progress.progress || 0} 
                className="h-2"
              />
              
              {/* Estimated time remaining */}
              {progress.estimatedTimeRemaining && (
                <div className="flex justify-between text-xs text-blue-600">
                  <span>Progress: {Math.round(progress.progress || 0)}%</span>
                  <span>~{formatTime(progress.estimatedTimeRemaining)} remaining</span>
                </div>
              )}
            </div>
          )}

          {/* Status message */}
          <div className="text-sm text-blue-700">
            {progress?.message || getOperationMessage(operation, progress?.stage)}
          </div>

          {/* Chunk progress for large documents */}
          {progress?.currentChunk && progress?.totalChunks && progress.totalChunks > 1 && (
            <div className="bg-blue-100 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-800">
                  Processing chunk {progress.currentChunk} of {progress.totalChunks}
                </span>
                {progress.processingSpeed && (
                  <span className="text-blue-600">
                    {progress.processingSpeed.toFixed(1)} chunks/sec
                  </span>
                )}
              </div>
              
              <div className="text-xs text-blue-600">
                Large document detected - processing in chunks for better accuracy
              </div>
            </div>
          )}

          {/* Stage-specific tips */}
          {progress?.stage && (
            <div className="bg-white rounded-md p-3 border border-blue-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700">
                  {progress.stage === 'chunking' && 
                    "Breaking down your document into manageable sections while preserving context and meaning."
                  }
                  {progress.stage === 'processing' && 
                    "Analyzing each section with AI to extract key information and insights."
                  }
                  {progress.stage === 'synthesizing' && 
                    "Combining all processed sections into a coherent, comprehensive summary."
                  }
                  {!['chunking', 'processing', 'synthesizing'].includes(progress.stage) &&
                    "Processing your content to create the best possible summary."
                  }
                </div>
              </div>
            </div>
          )}

          {/* Simple loading animation for basic operations */}
          {!progress && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-3 text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-medium">
                  {operation === "extract" ? "Processing file..." : 
                   operation === "fetch" ? "Fetching content..." : 
                   "Initializing..."}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton loading component for summary results
export function SummaryLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key points skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/5 animate-pulse"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-200 rounded-full mt-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center space-y-2">
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}