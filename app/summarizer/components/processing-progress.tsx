"use client"

import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, FileText, Zap, CheckCircle } from "lucide-react"
import type { ProcessingProgress } from "@/lib/utils/chunked-processor"

interface ProcessingProgressProps {
  progress: ProcessingProgress
  className?: string
}

export function ProcessingProgressIndicator({ progress, className }: ProcessingProgressProps) {
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'chunking':
        return <FileText className="h-4 w-4" />
      case 'processing':
        return <Zap className="h-4 w-4" />
      case 'synthesizing':
        return <FileText className="h-4 w-4" />
      case 'complete':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStageColor = (stage: string) => {
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

  const formatTime = (ms?: number) => {
    if (!ms) return ''
    const seconds = Math.ceil(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatSpeed = (speed?: number) => {
    if (!speed) return ''
    return `${speed.toFixed(1)} chunks/sec`
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Stage and Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStageIcon(progress.stage)}
              <span className="font-medium capitalize">{progress.stage}</span>
              <Badge variant="secondary" className={getStageColor(progress.stage)}>
                {Math.round(progress.progress)}%
              </Badge>
            </div>
            
            {progress.estimatedTimeRemaining && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTime(progress.estimatedTimeRemaining)} remaining
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <Progress 
            value={progress.progress} 
            className="w-full"
          />

          {/* Progress Message */}
          <p className="text-sm text-muted-foreground">
            {progress.message}
          </p>

          {/* Chunk Progress */}
          {progress.currentChunk && progress.totalChunks && (
            <div className="flex items-center justify-between text-sm">
              <span>
                Chunk {progress.currentChunk} of {progress.totalChunks}
              </span>
              
              {progress.processingSpeed && (
                <span className="text-muted-foreground">
                  {formatSpeed(progress.processingSpeed)}
                </span>
              )}
            </div>
          )}

          {/* Stage-specific Information */}
          {progress.stage === 'chunking' && (
            <div className="text-xs text-muted-foreground">
              Analyzing document structure and creating intelligent chunks...
            </div>
          )}

          {progress.stage === 'processing' && progress.totalChunks && progress.totalChunks > 1 && (
            <div className="text-xs text-muted-foreground">
              Processing large document in {progress.totalChunks} chunks for better accuracy
            </div>
          )}

          {progress.stage === 'synthesizing' && (
            <div className="text-xs text-muted-foreground">
              Combining results from all chunks into a coherent summary...
            </div>
          )}

          {progress.stage === 'complete' && (
            <div className="text-xs text-green-600">
              ✓ Processing completed successfully
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface ChunkingStatsProps {
  metadata?: {
    originalLength: number
    totalChunks?: number
    averageChunkSize?: number
    totalProcessingTime?: number
    chunkingStrategy?: string
  }
  confidence?: number
  warnings?: string[]
  suggestions?: string[]
  className?: string
}

export function ChunkingStats({ 
  metadata, 
  confidence, 
  warnings = [], 
  suggestions = [],
  className 
}: ChunkingStatsProps) {
  if (!metadata) return null

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} chars`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K chars`
    return `${(bytes / (1024 * 1024)).toFixed(1)}M chars`
  }

  const formatTime = (ms?: number) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Processing Statistics</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Original Size:</span>
              <div className="font-medium">{formatBytes(metadata.originalLength)}</div>
            </div>
            
            {metadata.totalChunks && metadata.totalChunks > 1 && (
              <>
                <div>
                  <span className="text-muted-foreground">Chunks:</span>
                  <div className="font-medium">{metadata.totalChunks}</div>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Avg Chunk Size:</span>
                  <div className="font-medium">{formatBytes(metadata.averageChunkSize || 0)}</div>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Strategy:</span>
                  <div className="font-medium capitalize">{metadata.chunkingStrategy || 'auto'}</div>
                </div>
              </>
            )}
            
            <div>
              <span className="text-muted-foreground">Processing Time:</span>
              <div className="font-medium">{formatTime(metadata.totalProcessingTime)}</div>
            </div>
            
            {confidence !== undefined && (
              <div>
                <span className="text-muted-foreground">Confidence:</span>
                <div className="font-medium">
                  {Math.round(confidence * 100)}%
                  <Badge 
                    variant={confidence > 0.8 ? "default" : confidence > 0.6 ? "secondary" : "destructive"}
                    className="ml-2 text-xs"
                  >
                    {confidence > 0.8 ? "High" : confidence > 0.6 ? "Medium" : "Low"}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-xs font-medium text-yellow-600">Warnings:</h5>
              {warnings.map((warning, index) => (
                <div key={index} className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                  ⚠️ {warning}
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-xs font-medium text-blue-600">Suggestions:</h5>
              {suggestions.map((suggestion, index) => (
                <div key={index} className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  💡 {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}