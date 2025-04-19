"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useSocket } from "@/components/socket-provider"
import { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MindMap from "@/components/mind-map"
import IdeaList from "@/components/idea-list"
import CollaboratorsList from "@/components/collaborators-list"
import { Brain, Lightbulb, Users, Plus } from "lucide-react"
import { AIService } from "@/lib/ai-service"

export default function IdeasWorkspace() {
  const { socket, events } = useSocket()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("mindmap")
  const [isGenerating, setIsGenerating] = useState(false)
  const [researchContext, setResearchContext] = useState({
    topic: "",
    description: "",
    existingWork: "",
    researchGap: "",
    targetAudience: "",
  })

  // Handle AI idea generation with context
  const generateIdeas = async () => {
    if (!researchContext.topic || !researchContext.description) {
      toast({
        title: "Error",
        description: "Please provide at least a topic and description.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const suggestions = await AIService.getResearchSuggestions(researchContext)
      
      // Emit the suggestions through socket for real-time updates
      if (socket) {
        socket.emit("idea_generated", {
          type: "idea_generated",
          payload: {
            count: suggestions.length,
            suggestions,
          },
        })
      }

      toast({
        title: "Ideas Generated",
        description: `Generated ${suggestions.length} research suggestions based on your context.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate ideas. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Listen for new ideas
  useEffect(() => {
    if (!events.length) return

    const latestEvent = events[events.length - 1]
    if (latestEvent.type === "idea_generated") {
      toast({
        title: "Ideas Generated",
        description: `Generated ${latestEvent.payload.count} new research ideas.`,
      })
    }
  }, [events, toast])

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Ideas Workspace</h1>
          <p className="text-muted-foreground mt-2">
            Organize your research ideas and collaborate with your team
          </p>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Research Context</CardTitle>
          <CardDescription>Provide context for AI-powered research suggestions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Research Topic</label>
            <Input
              placeholder="Enter your research topic"
              value={researchContext.topic}
              onChange={(e) => setResearchContext({ ...researchContext, topic: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Describe your research area and goals"
              value={researchContext.description}
              onChange={(e) => setResearchContext({ ...researchContext, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Existing Work (Optional)</label>
            <Textarea
              placeholder="Describe existing research in this area"
              value={researchContext.existingWork}
              onChange={(e) => setResearchContext({ ...researchContext, existingWork: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Research Gap (Optional)</label>
            <Textarea
              placeholder="Describe the gap you want to address"
              value={researchContext.researchGap}
              onChange={(e) => setResearchContext({ ...researchContext, researchGap: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Audience (Optional)</label>
            <Input
              placeholder="Who is your target audience?"
              value={researchContext.targetAudience}
              onChange={(e) => setResearchContext({ ...researchContext, targetAudience: e.target.value })}
            />
          </div>
          <Button onClick={generateIdeas} disabled={isGenerating}>
            <Plus className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Research Suggestions"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="mindmap">
                <Brain className="mr-2 h-4 w-4" />
                Mind Map
              </TabsTrigger>
              <TabsTrigger value="list">
                <Lightbulb className="mr-2 h-4 w-4" />
                Ideas List
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mindmap" className="mt-4">
              <MindMap />
            </TabsContent>

            <TabsContent value="list" className="mt-4">
              <IdeaList />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Collaborators
              </CardTitle>
              <CardDescription>
                Team members working on ideas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CollaboratorsList />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 