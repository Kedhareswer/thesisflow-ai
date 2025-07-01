"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lightbulb, TrendingUp } from "lucide-react"
import { FormField, TextareaField } from "@/components/forms/FormField"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useAsync } from "@/lib/hooks/useAsync"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

// Enhanced research service for idea generation
class IdeaGenerationService {
  static async generateIdeas(
    topic: string,
    context = "",
    count = 5,
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
      const researchResults = await enhancedAIService.generateResearchIdeas(topic, context)
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
      throw new Error("Failed to generate research ideas. Please check your AI provider configuration.")
    }
  }
}

interface IdeaGeneratorProps {
  className?: string
}

export function IdeaGenerator({ className }: IdeaGeneratorProps) {
  const { toast } = useToast()
  const [ideaTopic, setIdeaTopic] = useState("")
  const [ideaContext, setIdeaContext] = useState("")
  const [ideaCount, setIdeaCount] = useState(5)
  
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
      await ideaGeneration.execute(ideaTopic, ideaContext, ideaCount)
      toast({
        title: "Ideas Generated",
        description: `Generated ${ideaCount} AI-powered research ideas successfully.`,
      })
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate ideas. Please try again.",
        variant: "destructive",
      })
    }
  }

  const extractContent = (data: any): string => {
    if (typeof data === "string") {
      return data
    } else if (data && typeof data === "object") {
      if ("content" in data) {
        return data.content as string
      } else if ("ideas" in data && Array.isArray(data.ideas)) {
        return data.ideas.join("\n\n")
      } else {
        return JSON.stringify(data, null, 2)
      }
    }
    return ""
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Research Idea Generator
          </CardTitle>
          <CardDescription>
            Generate innovative research ideas with AI assistance based on your topic and context.
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

          <Button onClick={handleIdeaGeneration} disabled={ideaGeneration.loading} className="w-full">
            {ideaGeneration.loading ? (
              <LoadingSpinner size="sm" text="Generating..." />
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                Generate Ideas
              </>
            )}
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
                <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {extractContent(ideaGeneration.data)}
                </pre>
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