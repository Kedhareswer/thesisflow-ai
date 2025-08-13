"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  TrendingUp,
  Brain,
  Target,
  Lightbulb
} from "lucide-react"

interface QualityAssessmentProps {
  result: {
    summary: string
    confidence?: number
    processingMethod?: "direct" | "chunked" | "fallback"
    warnings?: string[]
    suggestions?: string[]
    keyPoints?: string[]
    originalLength: number
    summaryLength: number
  }
  onRetry?: (options?: RetryOptions) => void
  onFeedback?: (rating: "good" | "poor", feedback?: string) => void
  className?: string
}

interface RetryOptions {
  style?: "academic" | "executive" | "bullet-points" | "detailed"
  length?: "brief" | "medium" | "comprehensive"
  provider?: string
  model?: string
}

export function QualityAssessment({ 
  result, 
  onRetry, 
  onFeedback, 
  className 
}: QualityAssessmentProps) {
  const [showRetryOptions, setShowRetryOptions] = useState(false)
  const [userFeedback, setUserFeedback] = useState<"good" | "poor" | null>(null)

  // Calculate quality score based on various factors
  const calculateQualityScore = () => {
    let score = 0.7 // Base score

    // Confidence factor
    if (result.confidence) {
      score = score * 0.3 + result.confidence * 0.7
    }

    // Processing method factor
    if (result.processingMethod === "direct") {
      score += 0.1
    } else if (result.processingMethod === "fallback") {
      score -= 0.2
    }

    // Length appropriateness factor
    const compressionRatio = 1 - (result.summaryLength / result.originalLength)
    if (compressionRatio > 0.7 && compressionRatio < 0.95) {
      score += 0.1
    } else if (compressionRatio < 0.5 || compressionRatio > 0.98) {
      score -= 0.1
    }

    // Key points factor
    if (result.keyPoints && result.keyPoints.length >= 3 && result.keyPoints.length <= 8) {
      score += 0.05
    }

    // Warnings penalty
    if (result.warnings && result.warnings.length > 0) {
      score -= result.warnings.length * 0.05
    }

    return Math.max(0, Math.min(1, score))
  }

  const qualityScore = calculateQualityScore()

  const getQualityLevel = (score: number) => {
    if (score >= 0.8) return { level: "Excellent", color: "bg-green-500", textColor: "text-green-800" }
    if (score >= 0.6) return { level: "Good", color: "bg-blue-500", textColor: "text-blue-800" }
    if (score >= 0.4) return { level: "Fair", color: "bg-yellow-500", textColor: "text-yellow-800" }
    return { level: "Poor", color: "bg-red-500", textColor: "text-red-800" }
  }

  const quality = getQualityLevel(qualityScore)

  const getRecommendations = () => {
    const recommendations = []

    if (qualityScore < 0.6) {
      recommendations.push({
        type: "retry",
        icon: <RefreshCw className="h-4 w-4" />,
        title: "Try Different Settings",
        description: "Consider using a different summary style or length for better results.",
        action: () => setShowRetryOptions(true)
      })
    }

    if (result.processingMethod === "fallback") {
      recommendations.push({
        type: "provider",
        icon: <Settings className="h-4 w-4" />,
        title: "Check AI Provider",
        description: "Summary was generated using fallback method. Check your AI provider settings.",
        action: () => window.location.href = '/settings'
      })
    }

    if (result.confidence && result.confidence < 0.6) {
      recommendations.push({
        type: "content",
        icon: <AlertTriangle className="h-4 w-4" />,
        title: "Content Quality",
        description: "The source content may be unclear or poorly formatted. Consider preprocessing the text.",
        action: undefined
      })
    }

    const compressionRatio = 1 - (result.summaryLength / result.originalLength)
    if (compressionRatio < 0.5) {
      recommendations.push({
        type: "length",
        icon: <Target className="h-4 w-4" />,
        title: "Summary Too Long",
        description: "Try using 'brief' length setting for more concise results.",
        action: () => onRetry?.({ length: "brief" })
      })
    } else if (compressionRatio > 0.95) {
      recommendations.push({
        type: "length",
        icon: <Target className="h-4 w-4" />,
        title: "Summary Too Short",
        description: "Try using 'comprehensive' length setting for more detailed results.",
        action: () => onRetry?.({ length: "comprehensive" })
      })
    }

    return recommendations
  }

  const recommendations = getRecommendations()

  const handleFeedback = (rating: "good" | "poor") => {
    setUserFeedback(rating)
    onFeedback?.(rating)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quality Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <Brain className="h-5 w-5" />
            Summary Quality Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quality Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Quality</span>
              <Badge className={`${quality.color} text-white`}>
                {quality.level}
              </Badge>
            </div>
            <Progress value={qualityScore * 100} className="h-2" />
            <div className="flex justify-between text-xs text-gray-600">
              <span>Score: {Math.round(qualityScore * 100)}%</span>
              <span>
                {qualityScore >= 0.8 ? "Excellent summary quality" :
                 qualityScore >= 0.6 ? "Good summary quality" :
                 qualityScore >= 0.4 ? "Fair summary quality" :
                 "Consider regenerating"}
              </span>
            </div>
          </div>

          {/* Quality Factors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {result.confidence !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">AI Confidence:</span>
                <span className="font-medium">{Math.round(result.confidence * 100)}%</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Processing:</span>
              <span className="font-medium capitalize">{result.processingMethod || 'direct'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Compression:</span>
              <span className="font-medium">
                {Math.round((1 - result.summaryLength / result.originalLength) * 100)}%
              </span>
            </div>
          </div>

          {/* User Feedback */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">How is this summary?</span>
              <div className="flex items-center gap-2">
                <Button
                  variant={userFeedback === "good" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFeedback("good")}
                  className="flex items-center gap-1"
                >
                  <ThumbsUp className="h-3 w-3" />
                  Good
                </Button>
                <Button
                  variant={userFeedback === "poor" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleFeedback("poor")}
                  className="flex items-center gap-1"
                >
                  <ThumbsDown className="h-3 w-3" />
                  Poor
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
                <div className="text-gray-600 mt-0.5">
                  {rec.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{rec.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                </div>
                {rec.action && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rec.action}
                    className="flex-shrink-0"
                  >
                    Fix
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Retry Options */}
      {onRetry && qualityScore < 0.7 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <RefreshCw className="h-5 w-5" />
              Quick Improvements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry({ style: "academic" })}
                className="text-xs"
              >
                Academic Style
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry({ style: "executive" })}
                className="text-xs"
              >
                Executive Style
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry({ length: "brief" })}
                className="text-xs"
              >
                Shorter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry({ length: "comprehensive" })}
                className="text-xs"
              >
                More Detailed
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Indicator for High Quality */}
      {qualityScore >= 0.8 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium text-green-800">Excellent Summary Generated!</h4>
                <p className="text-sm text-green-700">
                  This summary meets high quality standards with good compression, clarity, and confidence.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}