"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Brain, Info } from "lucide-react"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { SkeletonCard } from "@/components/common/SkeletonCard"
import { ContentFormatter } from "./ContentFormatter"
import { useAsync } from "@/lib/hooks/useAsync"
import { useToast } from "@/hooks/use-toast"
import type { AIProvider } from "@/lib/ai-providers"
import Link from "next/link"
import { useResearchTopics, useResearchContext } from "@/components/research-session-provider"
// Removed AI provider selector - using Nova AI exclusively
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"

// Enhanced research service using Nova AI (Groq) exclusively
class EnhancedResearchService {
  static async exploreTopics(
    topic: string,
    depth = 3,
    additionalContext?: string,
  ): Promise<{
    content: string
    topic: string
    depth: number
    timestamp: string
  }> {
    try {
      console.log("EnhancedResearchService: Starting topic exploration for:", topic)

      const contextPrompt = additionalContext ? `\n\nAdditional Context: ${additionalContext}` : ""

      const prompt = `Research overview: "${topic}" | Depth: ${depth}/5${contextPrompt}

## Key Concepts
[Core definitions, terminology]

## Current Research State
[Active areas, methodologies, leading institutions]

## Breakthroughs & Trends
[Recent advances, emerging directions]

## Research Gaps
[Underexplored areas, opportunities]

## Applications
[Current uses, future potential]

## Future Directions
[Promising research paths]

${depth <= 2 ? "Brief overview" : depth <= 4 ? "Detailed analysis" : "Comprehensive deep-dive"} required.`

      // Call server-side API route
      const response = await fetch('/api/ai/explore-topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          maxTokens: 1800,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to explore topic' }))
        throw new Error(errorData.error || "Failed to explore research topic. Please check your AI provider configuration.")
      }

      const result = await response.json()

      if (!result.success || !result.content) {
        throw new Error(result.error || "Failed to explore research topic. Please check your AI provider configuration.")
      }

      return {
        content: result.content,
        topic,
        depth,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Error exploring topic:", error)

      let errorMessage = "Failed to explore research topic"

      if (error instanceof Error) {
        if (error.message.includes("No AI providers") || error.message.includes("No valid API keys") || error.message.includes("AI service not configured")) {
          errorMessage = "AI service is not configured. Please contact administrator or check your API keys."
        } else if (error.message.includes("authentication") || error.message.includes("sign in")) {
          errorMessage = "Authentication error. Please sign in again to access AI features."
        } else if (error.message.includes("rate limit")) {
          errorMessage = "Rate limit exceeded. Please try again in a few minutes."
        } else if (error.message.includes("quota") || error.message.includes("billing")) {
          errorMessage = "API quota exceeded. Please check your billing status with your AI provider."
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again."
        } else {
          errorMessage = error.message
        }
      }

      throw new Error(errorMessage)
    }
  }
}

interface TopicExplorerProps {
  className?: string
}

export function TopicExplorer({ className }: TopicExplorerProps) {
  const { toast } = useToast()
  const { topics, currentTopic, addTopic, updateTopic } = useResearchTopics()
  const { hasContext, contextSummary } = useResearchContext()

  const [topic, setTopic] = useState(() => currentTopic || "")
  const [depth, setDepth] = useState("3")
  const [additionalContext, setAdditionalContext] = useState("")
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Quantum Computing applications in finance",
    "CRISPR-Cas9 gene editing ethics",
    "Impact of social media on adolescent mental health",
    "Machine Learning for Drug Discovery",
    "Renewable Energy Storage Solutions"
  ])


  const topicExploration = useAsync<{
    content: string
    topic: string
    depth: number
    timestamp: string
  }>(EnhancedResearchService.exploreTopics)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (currentTopic && currentTopic !== topic && !topicExploration.loading) {
      setTopic(currentTopic)
    }
  }, [currentTopic, topic, topicExploration.loading])

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  // Deep Research removed per requirements

  const handleTopicExploration = useCallback(() => {
    if (!topic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a research topic to explore.",
        variant: "destructive",
      })
      return
    }

    // Add to recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== topic)
      return [topic, ...filtered].slice(0, 5)
    })

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new debounce timeout
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const depthNumber = parseInt(depth, 10)
        const contextPrompt = additionalContext ? `\n\nAdditional Context: ${additionalContext}` : ""
        const prompt = `Research overview: "${topic}" | Depth: ${depthNumber}/5${contextPrompt}

## Key Concepts
[Core definitions, terminology]

## Current Research State
[Active areas, methodologies, leading institutions]

## Breakthroughs & Trends
[Recent advances, emerging directions]

## Research Gaps
[Underexplored areas, opportunities]

## Applications
[Current uses, future potential]

## Future Directions
[Promising research paths]

${depthNumber <= 2 ? "Brief overview" : depthNumber <= 4 ? "Detailed analysis" : "Comprehensive deep-dive"} required.`
        await topicExploration.execute(topic, depthNumber, additionalContext)

        // Add topic to research session after successful execution
        addTopic({
          name: topic,
          description: `Explored at depth ${depthNumber}/5`,
          confidence: depthNumber / 5, // Convert depth to confidence score
        })

        toast({
          title: "Topic Explored",
          description: "AI-powered research overview generated and saved to your research session.",
        })
      } catch (error) {
        toast({
          title: "Exploration Failed",
          description: error instanceof Error ? error.message : "Failed to explore topic. Please try again.",
          variant: "destructive",
        })
      }
    }, 500) // 500ms debounce
  }, [topic, depth, additionalContext, topicExploration.execute, addTopic, toast])

  // Update topic with insights when exploration data is available
  useEffect(() => {
    if (topicExploration.data && topic) {
      const topicData = topicExploration.data
      const insights = extractContent(topicData)

      // Find and update the topic with insights
      const existingTopic = topics.find((t) => t.name === topic)
      if (existingTopic && insights && !existingTopic.insights) {
        // Only update if insights don't already exist to prevent loops
        updateTopic(existingTopic.id, { insights })
      }
    }
  }, [topicExploration.data, topic]) // Removed topics and updateTopic from dependencies

  const extractContent = (data: any): string => {
    if (typeof data === "string") {
      return data
    } else if (data && typeof data === "object") {
      if ("content" in data) {
        return data.content as string
      } else if ("data" in data) {
        const dataValue = (data as any).data
        return typeof dataValue === "string" ? dataValue : JSON.stringify(dataValue, null, 2)
      } else {
        return JSON.stringify(data, null, 2)
      }
    }
    return ""
  }

  const isValidUrl = (u?: string) => {
    try {
      if (!u) return false
      const parsed = new URL(u)
      return /^https?:/i.test(parsed.protocol)
    } catch {
      return false
    }
  }

  const getHostname = (u?: string) => {
    try {
      return u ? new URL(u).hostname : ''
    } catch {
      return ''
    }
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Research Explorer</h1>
        <p className="text-sm md:text-base text-gray-600">AI-powered tools to discover research papers, generate ideas, and explore topics.</p>
      </div>

      {/* Research Context Status */}
      {hasContext && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            <strong>Research Context:</strong> {contextSummary}
          </AlertDescription>
        </Alert>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 md:gap-6">
        {/* Left Column - Form */}
        <div className="space-y-4 md:space-y-6">
          <Card className="border-gray-200">
            <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Research Topic */}
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-xs sm:text-sm font-medium text-gray-900">Research Topic *</Label>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Artificial Intelligence in Healthcare"
                  className="w-full px-3 py-2 text-sm md:text-base bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              {/* Exploration Depth */}
              <div className="space-y-2">
                <Label htmlFor="depth" className="text-xs sm:text-sm font-medium text-gray-900">Exploration Depth</Label>
                <Select value={depth} onValueChange={setDepth}>
                  <SelectTrigger className="w-full bg-gray-50">
                    <SelectValue placeholder="Select depth" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Simple</SelectItem>
                    <SelectItem value="3">Detailed</SelectItem>
                    <SelectItem value="5">Comprehensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Explore Button */}
              <Button
                onClick={handleTopicExploration}
                disabled={topicExploration.loading}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {topicExploration.loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Exploring Topic</span>
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Explore Topic
                  </>
                )}
              </Button>

              {topicExploration.error && (
                <div className="text-red-500 text-sm">
                  {topicExploration.error.includes("AI provider configuration") ? (
                    <>
                      No AI providers are configured. Please add at least one API key in{" "}
                      <Link href="/settings" className="underline">
                        Settings
                      </Link>
                      .
                    </>
                  ) : (
                    topicExploration.error
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* What is the Research Topic Explorer */}
          <Card className="border-gray-200 bg-gray-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                What is the Research Topic Explorer?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-2">
              <p>
                This tool helps you dive deep into any research area. Simply enter a topic and select an exploration depth
                to get a comprehensive overview, including key concepts, influential papers, and emerging trends.
              </p>
              <p>
                It's designed to kickstart your research journey and uncover new avenues for investigation.
              </p>
            </CardContent>
          </Card>

          {/* Additional Context - Collapsible */}
          {!topicExploration.loading && !topicExploration.data && (
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Additional Context (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="context"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Provide any additional context, constraints, or focus areas..."
                  className="min-h-[100px] resize-none bg-gray-50"
                />
              </CardContent>
            </Card>
          )}

          {/* Nova AI Status */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Powered by Nova AI</span>
          </div>
        </div>

        {/* Right Column - Recent Searches */}
        <div className="space-y-4">
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Recent Searches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => setTopic(search)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors text-sm text-gray-700 border border-gray-200"
                >
                  {search}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Loading State */}
      {topicExploration.loading && <SkeletonCard lines={6} />}

      {/* Exploration Results */}
      {topicExploration.data && (
        <Card className="mt-6 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Exploration Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <ContentFormatter content={extractContent(topicExploration.data)} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {topicExploration.error && !topicExploration.loading && (
        <Card className="border-red-200 bg-red-50 mt-6">
          <CardContent className="pt-6">
            <p className="text-red-600">{topicExploration.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
