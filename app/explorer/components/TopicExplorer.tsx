"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Brain, Info, Zap, Globe, GraduationCap, FileText, Newspaper } from "lucide-react"
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
import { useDeepSearch, DeepSearchItem, DeepSearchWarning } from "@/hooks/use-deep-search"
import MinimalAIProviderSelector from "@/components/ai-provider-selector-minimal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ui/reasoning"
import { Response as AIDisplayResponse } from "@/src/components/ai-elements/response"

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
  
  // Deep Research state
  const [showDeepResearch, setShowDeepResearch] = useState(false)
  const { start: startSearch, stop: stopSearch, isLoading: isSearching, items: results, warnings, summary, progress } = useDeepSearch()

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

  const handleDeepResearch = useCallback(async () => {
    if (!topic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a research topic for deep research.",
        variant: "destructive",
      })
      return
    }

    setShowDeepResearch(true)
    await startSearch({
      query: topic,
      limit: 20,
      provider: localProvider,
      model: localModel
    })
  }, [topic, localProvider, localModel, startSearch, toast])

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

  // Deep Research helpers
  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'scholar': return GraduationCap
      case 'docs': return FileText
      case 'news': return Newspaper
      case 'web': 
      default: return Globe
    }
  }

  const getKindColor = (kind: string) => {
    switch (kind) {
      case 'scholar': return 'text-indigo-600 bg-indigo-50 border-indigo-200'
      case 'docs': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'news': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'web':
      default: return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  // Safe URL helpers to avoid runtime errors when result URLs are missing/invalid
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
            Use Deep Research to find real-time sources from web, scholar, news, and documentation.
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            
            <Button 
              onClick={handleDeepResearch} 
              disabled={isSearching} 
              variant="outline" 
              className="w-full"
            >
              {isSearching ? (
                <LoadingSpinner size="sm" text="Researching..." />
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Deep Research
                </>
              )}
            </Button>
          </div>

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

      {/* Deep Research Results */}
      {showDeepResearch && (
        <Card className="mt-6 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Deep Research Results
              {isSearching && (
                <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                  <LoadingSpinner size="sm" />
                  {progress?.total ? `${progress.total}%` : progress?.message}
                </div>
              )}
            </CardTitle>
            {isSearching && (
              <div className="flex items-center gap-2">
                <Button onClick={stopSearch} size="sm" variant="outline">
                  Stop Search
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4 overflow-x-hidden">
            {/* Warnings */}
            {warnings.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Search Warnings:</strong>
                    {warnings.map((warning: DeepSearchWarning, i: number) => (
                      <div key={i} className="text-sm">
                        • {warning.source}: {warning.error}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Summary */}
            {summary && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 overflow-x-auto">
                <h4 className="font-medium text-blue-900 mb-2">Research Summary</h4>
                <AIDisplayResponse
                  className="size-full whitespace-pre-wrap break-words text-gray-800 leading-relaxed
                    [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
                    [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mb-3 [&_h1]:text-gray-900
                    [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-gray-900
                    [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:text-gray-800
                    [&_p]:mb-2 [&_p]:text-gray-800
                    [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                    [&_li]:mb-1
                    [&_a]:text-blue-600 hover:[&_a]:underline [&_a]:underline-offset-2 [&_a]:break-words
                    [&_blockquote]:border-l-4 [&_blockquote]:border-blue-200 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-700
                    [&_hr]:my-4 [&_hr]:border-gray-200
                    [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto
                    [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
                    [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300
                    [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
                    [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
                    [&_tr:nth-child(even)]:bg-gray-50"
                >
                  {summary}
                </AIDisplayResponse>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    Found {results.length} results from multiple sources
                  </h4>
                </div>
                
                <div className="grid gap-4 grid-cols-1 overflow-x-hidden">
                  {results.map((result: DeepSearchItem, i: number) => {
                    const KindIcon = getKindIcon(result.kind || 'web')
                    const kindColor = getKindColor(result.kind || 'web')
                    
                    return (
                      <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 overflow-hidden break-words">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${kindColor}`}>
                                <KindIcon className="h-3 w-3" />
                                {result.kind || 'web'}
                              </span>
                              {result.score && (
                                <span className="text-xs text-gray-500">
                                  Score: {Math.round(result.score * 100)}
                                </span>
                              )}
                            </div>
                            
                            <h5 className="font-medium text-gray-900 mb-1 break-words">
                              {isValidUrl(result.url) ? (
                                <a 
                                  href={result.url as string}
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="hover:text-blue-600 break-words line-clamp-2"
                                >
                                  {result.title}
                                </a>
                              ) : (
                                <span className="text-gray-800" title="No valid URL">
                                  {result.title}
                                </span>
                              )}
                            </h5>
                            
                            {result.snippet && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2 break-words">
                                {result.snippet}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500 overflow-hidden">
                              <span>{getHostname(result.url) || 'unknown'}</span>
                              {result.publishedDate && (
                                <span>{new Date(result.publishedDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!isSearching && results.length === 0 && showDeepResearch && (
              <div className="text-center py-8 text-gray-500">
                <Zap className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No results found. Try a different query or check your search terms.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
