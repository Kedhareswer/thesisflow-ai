"use client"

import { useState } from "react"
import { AIDetectionBadge } from "@/components/ai-detection-badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

const AI_SAMPLE_TEXT = `Artificial Intelligence has revolutionized various industries by leveraging cutting-edge technologies and state-of-the-art algorithms. Furthermore, it's worth noting that machine learning models seamlessly integrate with existing infrastructure to deliver robust solutions. In conclusion, organizations can leverage AI to optimize processes and enhance productivity across multiple domains. This comprehensive guide explores how businesses can delve into AI implementation strategies.`

const HUMAN_SAMPLE_TEXT = `So I was working on this project yesterday, and honestly? It was a mess. The code kept breaking in weird ways. Like, one minute everything's fine, then boom - error messages everywhere. I tried debugging for hours. Eventually figured out it was just a missing semicolon. Classic, right? Sometimes I wonder why I chose programming. But then when it finally works... man, that feeling is incredible. Nothing beats seeing your code come to life.`

const MIXED_SAMPLE_TEXT = `The weather today was absolutely beautiful - sunny with a gentle breeze. It's worth noting that climate patterns have been shifting significantly in recent years. Scientists leverage advanced meteorological models to predict these changes. I remember when I was a kid, summers felt different somehow. Maybe it's just nostalgia talking. In conclusion, understanding weather patterns requires both scientific analysis and personal observation.`

export default function TestAIDetectionPage() {
  const [customText, setCustomText] = useState("")
  const [activeText, setActiveText] = useState("")
  const [detectionResult, setDetectionResult] = useState<any>(null)

  const handleSampleText = (text: string) => {
    setCustomText(text)
    setActiveText(text)
    setDetectionResult(null)
  }

  const handleDetectionComplete = (result: any) => {
    setDetectionResult(result)
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>AI Detection Test Page</CardTitle>
          <CardDescription>
            Test the enhanced AI detection system with improved accuracy and reliability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sample Text Buttons */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Quick Test Samples:</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSampleText(AI_SAMPLE_TEXT)}
              >
                AI-Generated Sample
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSampleText(HUMAN_SAMPLE_TEXT)}
              >
                Human-Written Sample
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSampleText(MIXED_SAMPLE_TEXT)}
              >
                Mixed Style Sample
              </Button>
            </div>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Enter or paste text to analyze (minimum 10 words):
            </label>
            <Textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Type or paste your text here..."
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Word count: {customText.trim().split(/\s+/).filter(w => w.length > 0).length}
              </span>
              {customText && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setActiveText(customText)
                    setDetectionResult(null)
                  }}
                >
                  Analyze This Text
                </Button>
              )}
            </div>
          </div>

          {/* AI Detection Badge */}
          {activeText && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Detection Status:</span>
                <AIDetectionBadge
                  text={activeText}
                  onDetectionComplete={handleDetectionComplete}
                  showButton={true}
                />
              </div>

              {/* Detection Results */}
              {detectionResult && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Analysis Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Main Result */}
                    <Alert className={detectionResult.is_ai ? "border-destructive" : "border-green-500"}>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>
                          {detectionResult.is_ai ? "AI-Generated" : "Human-Written"} Content Detected
                        </strong>
                        <br />
                        AI Probability: {detectionResult.ai_probability}% | 
                        Human Probability: {detectionResult.human_probability}%
                      </AlertDescription>
                    </Alert>

                    {/* Detailed Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Confidence Score</p>
                        <p className="text-sm font-medium">{detectionResult.confidence}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Reliability</p>
                        <p className="text-sm font-medium">{detectionResult.reliability_score}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Model Used</p>
                        <p className="text-sm font-medium">{detectionResult.model_used}</p>
                      </div>
                    </div>

                    {/* Analysis Details */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Analysis Details:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <div className="p-2 bg-background rounded">
                          <span className="text-muted-foreground">Perplexity:</span>{" "}
                          <span className="font-medium">{detectionResult.analysis_details.perplexity_score}</span>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <span className="text-muted-foreground">Burstiness:</span>{" "}
                          <span className="font-medium">{detectionResult.analysis_details.burstiness_score}%</span>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <span className="text-muted-foreground">Vocabulary:</span>{" "}
                          <span className="font-medium">{detectionResult.analysis_details.vocabulary_complexity}%</span>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <span className="text-muted-foreground">Variance:</span>{" "}
                          <span className="font-medium">{detectionResult.analysis_details.sentence_variance}%</span>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <span className="text-muted-foreground">Repetition:</span>{" "}
                          <span className="font-medium">{detectionResult.analysis_details.repetition_score}%</span>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <span className="text-muted-foreground">Chunks:</span>{" "}
                          <span className="font-medium">{detectionResult.analysis_details.chunks_analyzed}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground">
                      Analyzed at: {new Date(detectionResult.timestamp).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>How it works:</strong> The enhanced AI detection system analyzes multiple aspects of text including perplexity, burstiness, vocabulary complexity, sentence variance, and repetition patterns. It uses advanced heuristics to provide accurate detection with confidence and reliability scores.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
