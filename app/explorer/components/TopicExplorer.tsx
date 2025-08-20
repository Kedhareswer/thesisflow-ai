"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Brain, Info } from "lucide-react"
import { FormField } from "@/components/forms/FormField"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { SkeletonCard } from "@/components/common/SkeletonCard"
import { ContentFormatter } from "./ContentFormatter"
import { useAsync } from "@/lib/hooks/useAsync"
import { useToast } from "@/hooks/use-toast"
import type { AIProvider } from "@/lib/ai-providers"
import Link from "next/link"
import { useResearchTopics, useResearchContext } from "@/components/research-session-provider"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import MinimalAIProviderSelector from "@/components/ai-provider-selector-minimal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ui/reasoning"

// Enhanced research service that uses real AI
class EnhancedResearchService {
  static async exploreTopics(
    topic: string,
    depth = 3,
    additionalContext?: string,
    selectedProvider?: AIProvider,
    selectedModel?: string,
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

      // Use the enhanced AI service with fallback and retry logic
      const response = await enhancedAIService.generateText({
        prompt,
        provider: selectedProvider,
        model: selectedModel,
        temperature: 0.7,
        maxTokens: Math.min(depth * 600, 2000), // Adjust tokens based on depth, max 2000
      })

      if (!response.success) {
        throw new Error(response.error || "Failed to generate research overview")
      }

      return {
        content: response.content || "",
        topic,
        depth,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Error exploring topic:", error)

      let errorMessage = "Failed to explore research topic"

      if (error instanceof Error) {
        if (error.message.includes("No AI providers") || error.message.includes("No valid API keys")) {
          errorMessage = "No AI providers are configured. Please add at least one API key in Settings."
        } else if (error.message.includes("All AI providers failed")) {
          errorMessage = "All AI providers are currently unavailable. Please try again in a few minutes."
        } else if (error.message.includes("authentication") || error.message.includes("sign in")) {
          errorMessage = "Authentication error. Please sign in again to access AI features."
        } else if (error.message.includes("API key")) {
          errorMessage = "API key error. Please check your AI provider configuration in Settings."
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
  selectedProvider?: AIProvider
  selectedModel?: string
}

export function TopicExplorer({ className, selectedProvider, selectedModel }: TopicExplorerProps) {
  const { toast } = useToast()
  const { topics, currentTopic, addTopic, updateTopic } = useResearchTopics()
  const { hasContext, contextSummary } = useResearchContext()

  const [topic, setTopic] = useState(() => currentTopic || "")
  const [depth, setDepth] = useState("3")
  const [additionalContext, setAdditionalContext] = useState("")
  const [localProvider, setLocalProvider] = useState<AIProvider | undefined>(selectedProvider)
  const [localModel, setLocalModel] = useState<string | undefined>(selectedModel)
  const [reasoningText, setReasoningText] = useState("")

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

  const handleTopicExploration = useCallback(() => {
    if (!topic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a research topic to explore.",
        variant: "destructive",
      })
      return
    }

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
        setReasoningText(prompt)
        await topicExploration.execute(topic, depthNumber, additionalContext, localProvider, localModel)

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
  }, [topic, depth, additionalContext, localProvider, localModel, topicExploration.execute, addTopic, toast])

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

  return (
    <div className={className}>
      {/* Research Context Status */}
      {hasContext && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Research Context:</strong> {contextSummary}
          </AlertDescription>
        </Alert>
      )}

      {/* AI Provider Selector - Inline variant for Explorer */}
      <div className="mb-6">
        <MinimalAIProviderSelector
          selectedProvider={localProvider}
          onProviderChange={setLocalProvider}
          selectedModel={localModel}
          onModelChange={setLocalModel}
          variant="inline"
          showModelSelector={true}
          showConfigLink={true}
          className="justify-center"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Research Topic Explorer
          </CardTitle>
          <CardDescription>
            Get comprehensive insights into any research topic including key concepts, trends, and leading researchers.
            Explorations are automatically saved to your research session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Research Topic and Number of Ideas in a row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topic" className="font-semibold">Research Topic *</Label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., AI and ML"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="depth" className="font-semibold">Exploration Depth</Label>
              <Select value={depth} onValueChange={setDepth}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select depth" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Simple</SelectItem>
                  <SelectItem value="3">Detailed</SelectItem>
                  <SelectItem value="5">Comprehensive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <Label htmlFor="context" className="font-semibold">Additional Context (Optional)</Label>
            <Textarea
              id="context"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Provide any additional context, constraints, or focus areas..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <Button onClick={handleTopicExploration} disabled={topicExploration.loading} className="w-full">
            {topicExploration.loading ? (
              <LoadingSpinner size="sm" text="Exploring..." />
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Explore Topic
              </>
            )}
          </Button>

          {/* Reasoning UI: shows the exact prompt sent to the AI and auto-expands while generating */}
          <Reasoning isStreaming={topicExploration.loading} className="mt-2">
            <ReasoningTrigger>Show reasoning</ReasoningTrigger>
            <ReasoningContent className="ml-2 border-l-2 border-l-slate-200 px-2 pb-1 dark:border-l-slate-700">
              {reasoningText}
            </ReasoningContent>
          </Reasoning>

          {topicExploration.error && (
            <div className="text-red-500 mt-2">
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

      {topicExploration.loading && <SkeletonCard lines={6} />}

      {topicExploration.data && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Exploration Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <ContentFormatter content={extractContent(topicExploration.data)} />
            </div>
          </CardContent>
        </Card>
      )}

      {topicExploration.error && (
        <Card className="border-red-200 mt-6">
          <CardContent className="pt-6">
            <p className="text-red-600">{topicExploration.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
