"use client"

import { useState } from "react"
import { BookOpen, Brain, Lightbulb, MessageCircle, Database } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import type { AIProvider } from "@/lib/ai-providers"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { ResearchChatbot } from "@/components/research-chatbot"
import { EnhancedLiteratureSearch } from "./components/EnhancedLiteratureSearch"
import { TopicExplorer } from "./components/TopicExplorer"
import { IdeaGenerator } from "./components/IdeaGenerator"
import { RouteGuard } from "@/components/route-guard"
import CompactAIProviderSelector from "@/components/compact-ai-provider-selector"
import { ResearchSessionProvider } from "@/components/research-session-provider"
import { ResearchSessionManager } from "@/components/research-session-manager"

// Enhanced research service that uses real AI
class EnhancedResearchService {
  static async exploreTopics(
    topic: string,
    depth = 3,
    provider?: AIProvider,
    model?: string,
  ): Promise<{
    content: string
    topic: string
    depth: number
    timestamp: string
  }> {
    try {
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

      // Use the enhanced AI service instead of the old provider service
      await enhancedAIService.loadUserApiKeys() // Load latest keys

      const response = await enhancedAIService.chatCompletion([{ role: "user", content: prompt }], {
        temperature: 0.7,
        maxTokens: 2048,
        preferredProvider: provider,
        model: model,
      })

      return {
        content: response.content,
        topic,
        depth,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Error exploring topic:", error)
      if (error instanceof Error && error.message.includes("No AI providers")) {
        throw new Error("No AI providers are configured. Please add at least one API key in Settings.")
      }
      throw new Error("Failed to explore research topic. Please check your AI provider configuration.")
    }
  }

  static async searchPapers(query: string, searchType = "keyword"): Promise<any> {
    try {
      // Use the existing OpenAlex integration
      const response = await fetch(`/api/search/papers?query=${encodeURIComponent(query)}&type=${searchType}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        console.error("Search papers API returned an error:", response.status, response.statusText)
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Unexpected content type:", contentType, "Response body:", text)
        throw new Error("Unexpected response from search papers API: Not valid JSON")
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error searching papers:", error)
      throw new Error("Failed to search academic papers. Please try again.")
    }
  }

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

export default function ResearchExplorer() {
  const { toast } = useToast()

  // State for research chatbot
  const [chatTopic, setChatTopic] = useState("")
  const [chatPapers, setChatPapers] = useState<any[]>([])
  const [chatIdeas, setChatIdeas] = useState("")

  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>(undefined)
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined)

  return (
    <RouteGuard requireAuth={true}>
      <ResearchSessionProvider>
        <ErrorBoundary>
          <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Research Explorer</h1>
            <p className="text-gray-600">
              Discover research papers, generate ideas, and explore topics with AI-powered tools
            </p>
          </div>

          <div className="mb-8">
            <CompactAIProviderSelector
              selectedProvider={selectedProvider}
              onProviderChange={(provider) => setSelectedProvider(provider)}
              selectedModel={selectedModel}
              onModelChange={(model) => setSelectedModel(model)}
            />
          </div>

          <Tabs defaultValue="search" className="space-y-8">
            <TabsList className="grid w-full grid-cols-5 bg-gray-50">
              <TabsTrigger value="search" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Literature Search
              </TabsTrigger>
              <TabsTrigger value="explore" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Topic Explorer
              </TabsTrigger>
              <TabsTrigger value="ideas" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Idea Generator
              </TabsTrigger>
              <TabsTrigger value="assistant" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Research Assistant
              </TabsTrigger>
              <TabsTrigger value="session" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Session Manager
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-6">
              <EnhancedLiteratureSearch className="space-y-6" />
            </TabsContent>

            <TabsContent value="explore" className="space-y-6">
              <TopicExplorer className="space-y-6" selectedProvider={selectedProvider} selectedModel={selectedModel} />
            </TabsContent>

            <TabsContent value="ideas" className="space-y-6">
              <IdeaGenerator className="space-y-6" />
            </TabsContent>

            <TabsContent value="assistant" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Research Assistant
                  </CardTitle>
                  <CardDescription>
                    Get AI-powered assistance for your research questions and paper analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResearchChatbot
                    topic={chatTopic}
                    papers={chatPapers}
                    ideas={chatIdeas}
                    context="Research exploration session"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="session" className="space-y-6">
              <ResearchSessionManager className="space-y-6" />
            </TabsContent>
          </Tabs>

          {/* Help Section */}
          <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">Literature Search</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Find papers with advanced filters, citation data, and export options
                  </p>
                </div>
                <div className="text-center">
                  <Brain className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">Topic Explorer</h3>
                  <p className="text-xs text-gray-600 mt-1">Get AI-powered insights into any research topic</p>
                </div>
                <div className="text-center">
                  <Lightbulb className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">Idea Generator</h3>
                  <p className="text-xs text-gray-600 mt-1">Generate innovative research ideas and methodologies</p>
                </div>
                <div className="text-center">
                  <MessageCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">Research Assistant</h3>
                  <p className="text-xs text-gray-600 mt-1">Chat with AI about your research questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
      </ResearchSessionProvider>
    </RouteGuard>
  )
}
