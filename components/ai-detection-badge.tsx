"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Loader2, Shield, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { aiDetectionService, AIDetectionResult, AIDetectionError } from "@/lib/services/ai-detection.service"
import { useToast } from "@/hooks/use-toast"

interface AIDetectionBadgeProps {
  text: string
  onDetectionComplete?: (result: AIDetectionResult) => void
  className?: string
  showButton?: boolean
  autoDetect?: boolean
}

export function AIDetectionBadge({ 
  text, 
  onDetectionComplete,
  className = "",
  showButton = true,
  autoDetect = false
}: AIDetectionBadgeProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [result, setResult] = useState<AIDetectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleDetection = async () => {
    if (!text || !aiDetectionService.isTextLongEnough(text)) {
      toast({
        title: "Text too short",
        description: "Please provide at least 10 words for meaningful AI detection.",
        variant: "destructive"
      })
      return
    }

    setIsDetecting(true)
    setError(null)
    
    try {
      const detectionResult = await aiDetectionService.detectAI(text)
      setResult(detectionResult)
      onDetectionComplete?.(detectionResult)
      
      toast({
        title: "AI Detection Complete",
        description: aiDetectionService.formatMessage(detectionResult),
        variant: detectionResult.is_ai ? "destructive" : "default"
      })
    } catch (err) {
      const error = err as Error | AIDetectionError
      const errorMessage = error instanceof AIDetectionError ? error.message : "Detection failed"
      setError(errorMessage)
      
      if (error instanceof AIDetectionError) {
        if (error.statusCode === 429) {
          toast({
            title: "Rate Limited",
            description: "Too many requests. Please wait a few seconds and try again.",
            variant: "destructive"
          })
        } else if (error.statusCode === 503) {
          toast({
            title: "Service Unavailable",
            description: "Service temporarily unavailable. Please try again later.",
            variant: "destructive"
          })
        } else if (error.statusCode === 408) {
          toast({
            title: "Request Timeout",
            description: "Request took too long. Try with shorter text or try again later.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Detection Failed",
            description: errorMessage,
            variant: "destructive"
          })
        }
      } else {
        toast({
          title: "Detection Failed",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } finally {
      setIsDetecting(false)
    }
  }

  const getIcon = () => {
    if (isDetecting) return <Loader2 className="h-3 w-3 animate-spin" />
    if (error) return <AlertTriangle className="h-3 w-3" />
    if (!result) return <Shield className="h-3 w-3" />
    
    return result.is_ai ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />
  }

  const getBadgeContent = () => {
    if (isDetecting) return "Analyzing..."
    if (error) return "Detection Error"
    if (!result) return showButton ? null : "Not Analyzed"
    
    const badge = aiDetectionService.getConfidenceBadge(result.confidence, result.reliability_score)
    return badge.label
  }

  const getBadgeVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (isDetecting) return "secondary"
    if (error) return "destructive"
    if (!result) return "outline"
    
    const badge = aiDetectionService.getConfidenceBadge(result.confidence, result.reliability_score)
    // Map badge colors to Badge component variants
    switch (badge.color) {
      case 'red':
      case 'orange':
        return 'destructive'
      case 'yellow':
        return 'outline'
      case 'blue':
      case 'green':
      default:
        return 'secondary'
    }
  }

  const getTooltipContent = () => {
    if (isDetecting) return "Analyzing text for AI-generated content..."
    if (error) return `Error: ${error}`
    if (!result) return "Click to analyze text for AI-generated content"
    
    const message = aiDetectionService.formatMessage(result)
    const details = [
      `Model: ${result.model_used}`,
      `Confidence: ${result.confidence}`,
      `Word count: ${aiDetectionService.getWordCount(text)}`
    ].join('\n')
    
    return `${message}\n\n${details}`
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        {showButton && !result && !isDetecting ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDetection}
            disabled={isDetecting}
            className="h-8"
          >
            <Shield className="h-3 w-3 mr-1" />
            Detect AI
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={getBadgeVariant()}
                className={`cursor-pointer transition-all hover:scale-105 ${
                  result ? `bg-${aiDetectionService.getConfidenceBadge(result.confidence, result.reliability_score).color}-100 border-${aiDetectionService.getConfidenceBadge(result.confidence, result.reliability_score).color}-200` : ''
                }`}
                onClick={!isDetecting && !result ? handleDetection : undefined}
              >
                {getIcon()}
                <span className="ml-1">{getBadgeContent()}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-sm">
              <p className="whitespace-pre-line">{getTooltipContent()}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {result && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDetection}
            disabled={isDetecting}
            className="h-8 px-2"
          >
            <Info className="h-3 w-3" />
            <span className="sr-only">Re-analyze</span>
          </Button>
        )}
      </div>
    </TooltipProvider>
  )
}

export default AIDetectionBadge
