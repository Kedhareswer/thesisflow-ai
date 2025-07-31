"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Lightbulb, TrendingUp, Info } from "lucide-react"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useResearchIdeas, useResearchContext, useResearchTopics } from "@/components/research-session-provider"
import type { AIProvider } from "@/lib/ai-providers"
import MinimalAIProviderSelector from "@/components/ai-provider-selector-minimal"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// Enhanced research service for idea generation
class IdeaGenerationService {
  static async generateIdeas(
    topic: string,
    context = "",
    count = 5,
    provider?: AIProvider,
    model?: string,
  ): Promise<{
    content: string
    ideas: string[]
    topic: string
    context: string
    count: number
    timestamp: string
  }> {
    try {
      const { enhancedAIService } = await import("@/lib/enhanced-ai-service")

      const researchResults = await enhancedAIService.generateResearchIdeas(topic, context, count, provider, model)
      const ideaObjects = researchResults.ideas

      // Convert idea objects to strings
      const ideas = ideaObjects.map((idea, index) => `${index + 1}. ${idea.title}\n${idea.description}`)

      // Format the ideas nicely for display
      const formattedIdeas = ideas.join("\n\n")

      return {
        content: formattedIdeas,
        ideas,
        topic,
        context,
        count,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Error generating ideas:", error)
      if (error instanceof Error && error.message.includes("No AI providers")) {
        throw new Error("No AI providers are configured. Please add at least one API key in Settings.")
      }
      throw new Error("Failed to generate research ideas. Please check your AI provider configuration.")
    }
  }
}

interface IdeaGeneratorProps {
  className?: string
}

export function IdeaGenerator({ className }: IdeaGeneratorProps) {
  const { toast } = useToast()
  const { ideas: sessionIdeas, selectedIdeas, addIdeas, selectIdea } = useResearchIdeas()
  const { hasContext, contextSummary, buildContext, currentTopic } = useResearchContext()
  const { topics } = useResearchTopics()

  const [ideaTopic, setIdeaTopic] = useState(() => currentTopic || "")
  const [ideaContext, setIdeaContext] = useState("")
  const [ideaCount, setIdeaCount] = useState(5)
  const [useSessionContext, setUseSessionContext] = useState(hasContext)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>(undefined)
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined)

  // Update topic field when currentTopic changes, but only if different and not currently generating
  useEffect(() => {
    if (currentTopic && currentTopic !== ideaTopic && !ideaGenerationLoading) {
      setIdeaTopic(currentTopic)
    }
  }, [currentTopic])

  const [ideaGenerationData, setIdeaGenerationData] = useState<{
    content: string
    ideas: string[]
    topic: string
    context: string
    count: number
    timestamp: string
  } | null>(null)
  const [ideaGenerationLoading, setIdeaGenerationLoading] = useState(false)
  const [ideaGenerationError, setIdeaGenerationError] = useState<string | null>(null)

  const handleIdeaGeneration = async () => {
    if (!ideaTopic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a topic for idea generation.",
        variant: "destructive",
      })
      return
    }

    setIdeaGenerationLoading(true)
    setIdeaGenerationError(null)

    try {
      // Build enhanced context if using session context
      const enhancedContext = useSessionContext
        ? `${ideaContext}\n\nResearch Session Context:\n${buildContext()}`
        : ideaContext

      const generatedData = await IdeaGenerationService.generateIdeas(
        ideaTopic,
        enhancedContext,
        ideaCount,
        selectedProvider,
        selectedModel,
      )
      setIdeaGenerationData(generatedData)

      // Ideas will be added to session via useEffect when data is available

      toast({
        title: "Ideas Generated",
        description: `Generated ${ideaCount} AI-powered research ideas and saved to your research session.`,
      })
    } catch (error) {
      setIdeaGenerationError(error instanceof Error ? error.message : "Failed to generate ideas. Please try again.")
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate ideas. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIdeaGenerationLoading(false)
    }
  }

  // Add ideas to session when generation data is available
  useEffect(() => {
    if (ideaGenerationData && ideaGenerationData.ideas) {
      const newIdeas = ideaGenerationData.ideas.map((ideaText: string) => {
        // Parse the idea text to extract title and description
        const lines = ideaText.split("\n")
        const title = lines[0].replace(/^\d+\.\s*/, "").trim()
        const description = lines.slice(1).join("\n").trim() || title

        return {
          title,
          description,
          topic: ideaTopic,
          source: "generated" as const,
        }
      })

      addIdeas(newIdeas)
    }
  }, [ideaGenerationData, ideaTopic, addIdeas])

  const extractContent = (data: any): string => {
    if (typeof data === "string") {
      return data
    } else if (data && typeof data === "object") {
      if ("content" in data) {
        return data.content as string
      } else if ("ideas" in data && Array.isArray(data.ideas)) {
        // Format ideas nicely with titles and descriptions
        return data.ideas
          .map((idea: string, index: number) => {
            const lines = idea.split("\n")
            const title = lines[0].replace(/^\d+\.\s*/, "").trim()
            const description = lines.slice(1).join("\n").trim()

            return `${index + 1}. **${title}**\n${description || title}`
          })
          .join("\n\n")
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
            <br />
            <span className="text-sm text-blue-600">
              Context will be automatically included in idea generation to provide more relevant suggestions.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* AI Provider/Model Selector */}
      <div className="mb-4 flex justify-center">
        <MinimalAIProviderSelector
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          variant="inline"
        />
      </div>

      {/* Redesigned Form Card */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardContent className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Research Idea Generation</h2>
            <p className="text-gray-600 text-sm">Generate innovative research ideas for your topic</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Research Topic and Number of Ideas - Side by Side */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="research-topic" className="text-sm font-semibold text-gray-900 mb-2 block">
                  Research Topic
                </Label>
                <Input
                  id="research-topic"
                  value={ideaTopic}
                  onChange={(e) => setIdeaTopic(e.target.value)}
                  placeholder="e.g., Quantum Computing"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="idea-count" className="text-sm font-semibold text-gray-900 mb-2 block">
                  Number of Ideas
                </Label>
                <Select value={ideaCount.toString()} onValueChange={(value) => setIdeaCount(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Ideas</SelectItem>
                    <SelectItem value="5">5 Ideas</SelectItem>
                    <SelectItem value="7">7 Ideas</SelectItem>
                    <SelectItem value="10">10 Ideas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Context */}
            <div>
              <Label htmlFor="additional-context" className="text-sm font-semibold text-gray-900 mb-2 block">
                Additional Context (Optional)
              </Label>
              <Textarea
                id="additional-context"
                value={ideaContext}
                onChange={(e) => setIdeaContext(e.target.value)}
                placeholder="Provide any additional context, constraints, or focus areas..."
                className="w-full resize-none"
                rows={4}
              />
            </div>

            {/* Session Context Checkbox */}
            {hasContext && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-session-context"
                  checked={useSessionContext}
                  onCheckedChange={(checked) => setUseSessionContext(checked as boolean)}
                />
                <label htmlFor="use-session-context" className="text-sm text-gray-700">
                  Use research session context for enhanced idea generation
                </label>
              </div>
            )}

            {/* Generate Button */}
            <Button
              type="button"
              onClick={handleIdeaGeneration}
              disabled={ideaGenerationLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
            >
              {ideaGenerationLoading ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Generating Ideas...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate Ideas
                </>
              )}
            </Button>

            {/* Error Display */}
            {ideaGenerationError && (
              <div className="text-red-600 text-sm mt-2">
                {ideaGenerationError.includes("AI provider configuration") ? (
                  <>
                    No AI providers are configured. Please add at least one API key in{" "}
                    <Link href="/settings" className="underline">
                      Settings
                    </Link>
                    .
                  </>
                ) : (
                  ideaGenerationError
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated Ideas Display */}
      {ideaGenerationData && (
        <Card className="mt-6 bg-white shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Generated Research Ideas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="space-y-4">
                  {ideaGenerationData.ideas.map((idea: string, index: number) => {
                    const lines = idea.split("\n")
                    const title = lines[0].replace(/^\d+\.\s*/, "").trim()
                    const description = lines.slice(1).join("\n").trim()

                    return (
                      <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {index + 1}. {title}
                        </h4>
                        <p className="text-gray-700 text-sm leading-relaxed">{description || title}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {ideaGenerationError && (
        <Card className="border-red-200 mt-6">
          <CardContent className="pt-6">
            <p className="text-red-600">{ideaGenerationError}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
