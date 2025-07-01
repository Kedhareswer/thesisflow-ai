"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Search, Brain } from "lucide-react"
import { FormField } from "@/components/forms/FormField"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { SkeletonCard } from "@/components/common/SkeletonCard"
import { ContentFormatter } from "./ContentFormatter"
import { useAsync } from "@/lib/hooks/useAsync"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

// Enhanced research service that uses real AI
class EnhancedResearchService {
  static async exploreTopics(
    topic: string,
    depth = 3,
  ): Promise<{
    content: string
    topic: string
    depth: number
    timestamp: string
  }> {
    try {
      const { enhancedAIService } = await import("@/lib/enhanced-ai-service")
      const { AIProviderService } = await import("@/lib/ai-providers")
      
      const prompt = `Provide a comprehensive research overview for the topic: "${topic}"
      
Depth level: ${depth}/5 (1=basic, 5=comprehensive)

Please provide a detailed analysis covering:
1. Key Concepts and Definitions
2. Current State of Research  
3. Major Methodologies Used
4. Leading Researchers and Institutions
5. Recent Breakthroughs and Trends
6. Research Gaps and Opportunities
7. Practical Applications
8. Future Directions

Format the response in a clear, structured manner with headings and bullet points where appropriate.
The response should be ${depth <= 2 ? "concise" : depth <= 4 ? "detailed" : "comprehensive"}.`

      const response = await AIProviderService.generateResponse(prompt)
      return {
        content: response.content,
        topic,
        depth,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Error exploring topic:", error)
      throw new Error("Failed to explore research topic. Please check your AI provider configuration.")
    }
  }
}

interface TopicExplorerProps {
  className?: string
}

export function TopicExplorer({ className }: TopicExplorerProps) {
  const { toast } = useToast()
  const [topic, setTopic] = useState("")
  const [depth, setDepth] = useState(3)
  
  const topicExploration = useAsync<{
    content: string
    topic: string
    depth: number
    timestamp: string
  }>(EnhancedResearchService.exploreTopics)

  const handleTopicExploration = async () => {
    if (!topic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a research topic to explore.",
        variant: "destructive",
      })
      return
    }

    try {
      await topicExploration.execute(topic, depth)
      toast({
        title: "Topic Explored",
        description: "AI-powered research overview generated successfully.",
      })
    } catch (error) {
      toast({
        title: "Exploration Failed",
        description: error instanceof Error ? error.message : "Failed to explore topic. Please try again.",
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Research Topic Explorer
          </CardTitle>
          <CardDescription>
            Get comprehensive insights into any research topic including key concepts, trends, and leading
            researchers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            label="Research Topic"
            value={topic}
            onChange={setTopic}
            placeholder="e.g., Machine Learning in Healthcare"
            required
          />

          <div className="space-y-3">
            <Label>Exploration Depth</Label>
            <Slider
              value={[depth]}
              onValueChange={(value) => setDepth(value[0])}
              max={5}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>Basic</span>
              <span>Comprehensive</span>
            </div>
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
