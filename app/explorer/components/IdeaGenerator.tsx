"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Lightbulb, TrendingUp, Info, Save } from "lucide-react"
import { FormField, TextareaField } from "@/components/forms/FormField"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useAsync } from "@/lib/hooks/useAsync"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useResearchIdeas, useResearchContext, useResearchTopics } from "@/components/research-session-provider"
import type { AIProvider } from "@/lib/ai-providers"
import MinimalAIProviderSelector from "@/components/ai-provider-selector-minimal"

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
    if (currentTopic && currentTopic !== ideaTopic && !ideaGeneration.loading) {
      setIdeaTopic(currentTopic)
    }
  }, [currentTopic])
  
  const ideaGeneration = useAsync<{
    content: string
    ideas: string[]
    topic: string
    context: string
    count: number
    timestamp: string
  }>(IdeaGenerationService.generateIdeas)

  const handleIdeaGeneration = async () => {
    if (!ideaTopic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a topic for idea generation.",
        variant: "destructive",
      })
      return
    }

    try {
      // Build enhanced context if using session context
      const enhancedContext = useSessionContext ? 
        `${ideaContext}\n\nResearch Session Context:\n${buildContext()}` : 
        ideaContext

      await ideaGeneration.execute(ideaTopic, enhancedContext, ideaCount, selectedProvider, selectedModel)
      
      // Ideas will be added to session via useEffect when data is available
      
      toast({
        title: "Ideas Generated",
        description: `Generated ${ideaCount} AI-powered research ideas and saved to your research session.`,
      })
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate ideas. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Add ideas to session when generation data is available
  useEffect(() => {
    if (ideaGeneration.data && ideaGeneration.data.ideas) {
      const newIdeas = ideaGeneration.data.ideas.map((ideaText: string) => {
        // Parse the idea text to extract title and description
        const lines = ideaText.split('\n')
        const title = lines[0].replace(/^\d+\.\s*/, '').trim()
        const description = lines.slice(1).join('\n').trim() || title
        
        return {
          title,
          description,
          topic: ideaTopic,
          source: 'generated' as const
        }
      })
      
      addIdeas(newIdeas)
    }
  }, [ideaGeneration.data, ideaTopic, addIdeas])

  const extractContent = (data: any): string => {
    if (typeof data === "string") {
      return data
    } else if (data && typeof data === "object") {
      if ("content" in data) {
        return data.content as string
      } else if ("ideas" in data && Array.isArray(data.ideas)) {
        // Format ideas nicely with titles and descriptions
        return data.ideas.map((idea: string, index: number) => {
          const lines = idea.split('\n')
          const title = lines[0].replace(/^\d+\.\s*/, '').trim()
          const description = lines.slice(1).join('\n').trim()
          
          return `${index + 1}. **${title}**\n${description || title}`
        }).join("\n\n")
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
      {/* AI Provider/Model Selector (now below Research Context) */}
      <div className="mb-4 flex justify-center">
        <MinimalAIProviderSelector
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          variant="inline"
        />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Research Idea Generator
          </CardTitle>
          <CardDescription>
            Generate innovative research ideas with AI assistance based on your topic and context. Ideas are automatically saved to your research session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            label="Research Topic"
            value={ideaTopic}
            onChange={setIdeaTopic}
            placeholder="e.g., Sustainable Energy, Digital Education"
            required
          />

          <TextareaField
            label="Context (Optional)"
            value={ideaContext}
            onChange={setIdeaContext}
            placeholder="Provide additional context, constraints, or focus areas..."
            rows={3}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">Number of Ideas</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="3"
                max="10"
                value={ideaCount}
                onChange={(e) => setIdeaCount(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium w-8">{ideaCount}</span>
            </div>
          </div>

          {hasContext && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-session-context"
                checked={useSessionContext}
                onCheckedChange={(checked) => setUseSessionContext(checked as boolean)}
              />
              <label htmlFor="use-session-context" className="text-sm font-medium">
                Use research session context for enhanced idea generation
              </label>
            </div>
          )}

          <Button
            type="button"
            onClick={handleIdeaGeneration}
            disabled={ideaGeneration.loading}
            className="w-full"
          >
            {ideaGeneration.loading ? <LoadingSpinner className="mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
            Generate Ideas
          </Button>

          {ideaGeneration.error && (
            <div className="text-red-500 mt-2">
              {ideaGeneration.error.includes("AI provider configuration") ? (
                <>
                  No AI providers are configured. Please add at least one API key in{" "}
                  <Link href="/settings" className="underline">
                    Settings
                  </Link>
                  .
                </>
              ) : (
                ideaGeneration.error
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {ideaGeneration.data && (
        <Card className="mt-6">
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
                  {ideaGeneration.data.ideas.map((idea: string, index: number) => {
                    const lines = idea.split('\n')
                    const title = lines[0].replace(/^\d+\.\s*/, '').trim()
                    const description = lines.slice(1).join('\n').trim()
                    
                    return (
                      <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {index + 1}. {title}
                        </h4>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {description || title}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {ideaGeneration.error && (
        <Card className="border-red-200 mt-6">
          <CardContent className="pt-6">
            <p className="text-red-600">{ideaGeneration.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
