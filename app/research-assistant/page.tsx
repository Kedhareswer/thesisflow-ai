"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lightbulb, BookOpen, AlertCircle, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import { projectService, type ResearchIdea } from "@/lib/services/project.service"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { RouteGuard } from "@/components/route-guard"
import type { AIProvider } from "@/lib/ai-providers"
import CompactAIProviderSelector from "@/components/compact-ai-provider-selector"

const containerStyle = "container mx-auto p-8 max-w-4xl"
const sectionTitleStyle = "text-2xl font-semibold text-gray-900 mb-4"
const sectionDescriptionStyle = "text-gray-600"

interface GeneratedIdea {
  title: string
  description: string
  research_question?: string
  methodology?: string
  impact?: string
  challenges?: string
  saved?: boolean
}

interface ResearchResult {
  ideas: Array<{ title: string; description: string }>
  topic: string
  context: string
  count: number
  timestamp: string
}

export default function ResearchAssistant() {
  const [topic, setTopic] = useState("")
  const [context, setContext] = useState("")
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([])
  const [savedIdeas, setSavedIdeas] = useState<ResearchIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const { toast } = useToast()

  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>(undefined)
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined)

  useEffect(() => {
    checkUser()
    loadSavedIdeas()
  }, [])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadSavedIdeas = async () => {
    try {
      const result = await projectService.getResearchIdeas()
      setSavedIdeas(result.ideas || [])
    } catch (error) {
      console.error("Error loading saved ideas:", error)
    }
  }

  const generateIdeas = async () => {
    if (!topic.trim()) {
      setError("Please enter a research topic")
      return
    }

    setLoading(true)
    setError(null)
    setIdeas([])

    try {
      const result = await enhancedAIService.generateResearchIdeas(
        topic,
        context || "",
        5,
        selectedProvider,
        selectedModel
      )

      setIdeas(
        result.ideas.map((idea) => ({
          ...idea,
          saved: false,
        })),
      )

      toast({
        title: "Research ideas generated!",
        description: `Generated ${result.ideas.length} research ideas for "${topic}"`,
      })
    } catch (error) {
      console.error("Research generation error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate research ideas"
      setError(errorMessage)

      if (errorMessage.includes("No AI providers available")) {
        toast({
          title: "AI Configuration Required",
          description: "Please configure your AI API keys in Settings to use the Research Assistant.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Generation failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const saveIdea = async (idea: GeneratedIdea) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save research ideas",
        variant: "destructive",
      })
      return
    }

    setSaving(idea.title)

    try {
      const savedIdea = await projectService.saveResearchIdea({
        title: idea.title,
        description: idea.description,
        research_question: idea.research_question,
        methodology: idea.methodology,
        impact: idea.impact,
        challenges: idea.challenges,
        topic,
        context: context || undefined,
      })

      // Update the idea as saved
      setIdeas((prev) => prev.map((i) => (i.title === idea.title ? { ...i, saved: true, id: savedIdea.id } : i)))

      // Add to saved ideas
      setSavedIdeas((prev) => [savedIdea, ...prev])

      toast({
        title: "Research idea saved!",
        description: `"${idea.title}" has been saved to your collection`,
      })
    } catch (error) {
      console.error("Error saving idea:", error)
      toast({
        title: "Save failed",
        description: "Failed to save research idea. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(null)
    }
  }

  const removeIdea = async (ideaId: string) => {
    try {
      await projectService.deleteResearchIdea(ideaId)
      setSavedIdeas((prev) => prev.filter((idea) => idea.id !== ideaId))

      toast({
        title: "Research idea removed",
        description: "The research idea has been removed from your collection",
      })
    } catch (error) {
      console.error("Error removing idea:", error)
      toast({
        title: "Remove failed",
        description: "Failed to remove research idea. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <RouteGuard requireAuth={true}>
      <div className="min-h-screen bg-white text-gray-900">
        <div className={containerStyle}>
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-xl">
                <Lightbulb className="h-7 w-7 text-gray-900" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Research Ideas</h1>
                <p className={sectionDescriptionStyle}>Generate innovative research concepts with AI assistance</p>
              </div>
            </div>
          </header>

          <section className="mb-6">
            <CompactAIProviderSelector
              selectedProvider={selectedProvider}
              onProviderChange={(provider) => setSelectedProvider(provider)}
              selectedModel={selectedModel}
              onModelChange={(model) => setSelectedModel(model)}
            />
          </section>

          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl h-12">
              <TabsTrigger
                value="generate"
                className="data-[state=active]:bg-gray-200 text-gray-700 font-medium rounded-lg"
              >
                Generate Ideas
              </TabsTrigger>
              <TabsTrigger
                value="saved"
                className="data-[state=active]:bg-gray-200 text-gray-700 font-medium rounded-lg"
              >
                Saved Ideas ({savedIdeas.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-6 mt-6">
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-medium text-gray-900">Research Topic Input</CardTitle>
                  <CardDescription className={sectionDescriptionStyle}>
                    Enter your research topic and optional context to generate innovative research ideas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div>
                    <label htmlFor="topic" className="text-sm font-medium mb-2 block text-gray-700">
                      Research Topic *
                    </label>
                    <Input
                      id="topic"
                      placeholder="e.g., Machine Learning in Healthcare, Climate Change Adaptation..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !loading && generateIdeas()}
                      className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black text-gray-900 placeholder:text-gray-400 h-10"
                    />
                  </div>

                  <div>
                    <label htmlFor="context" className="text-sm font-medium mb-2 block text-gray-700">
                      Additional Context (Optional)
                    </label>
                    <Textarea
                      id="context"
                      placeholder="Provide any additional context, constraints, or specific focus areas..."
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      rows={4}
                      className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black text-gray-900 placeholder:text-gray-400 resize-none"
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
                      <AlertCircle className="h-4 w-4 text-red-700" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={generateIdeas}
                    disabled={loading || !topic.trim()}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 h-auto transition-colors rounded-md"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Ideas...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Generate Research Ideas
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {ideas.length > 0 && (
                <section className="space-y-6">
                  <h2 className="text-xl font-medium text-gray-900">Generated Research Ideas</h2>

                  {ideas.map((idea, index) => (
                    <Card key={index} className="border-gray-200 shadow-sm bg-white">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-medium text-gray-900 leading-tight">
                              {idea.title}
                            </CardTitle>
                            <CardDescription className="mt-2 text-gray-600 text-sm leading-relaxed">
                              {idea.description}
                            </CardDescription>
                          </div>
                          {user && (
                            <Button
                              size="sm"
                              variant={idea.saved ? "secondary" : "default"}
                              onClick={() => !idea.saved && saveIdea(idea)}
                              disabled={saving === idea.title || idea.saved}
                              className={
                                idea.saved
                                  ? "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                                  : "bg-gray-900 hover:bg-gray-800 text-white"
                              }
                            >
                              {saving === idea.title ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : idea.saved ? (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Saved
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 pt-0">
                        {idea.research_question && (
                          <div className="border-t border-gray-100 pt-3">
                            <h4 className="font-medium text-sm text-gray-500 mb-1 uppercase tracking-wide">
                              Research Question
                            </h4>
                            <p className="text-sm text-gray-800 leading-relaxed">{idea.research_question}</p>
                          </div>
                        )}

                        {idea.methodology && (
                          <div className="border-t border-gray-100 pt-3">
                            <h4 className="font-medium text-sm text-gray-500 mb-1 uppercase tracking-wide">
                              Methodology
                            </h4>
                            <p className="text-sm text-gray-800 leading-relaxed">{idea.methodology}</p>
                          </div>
                        )}

                        {idea.impact && (
                          <div className="border-t border-gray-100 pt-3">
                            <h4 className="font-medium text-sm text-gray-500 mb-1 uppercase tracking-wide">
                              Potential Impact
                            </h4>
                            <p className="text-sm text-gray-800 leading-relaxed">{idea.impact}</p>
                          </div>
                        )}

                        {idea.challenges && (
                          <div className="border-t border-gray-100 pt-3">
                            <h4 className="font-medium text-sm text-gray-500 mb-1 uppercase tracking-wide">
                              Challenges
                            </h4>
                            <p className="text-sm text-gray-800 leading-relaxed">{idea.challenges}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </section>
              )}
            </TabsContent>

            <TabsContent value="saved" className="space-y-6 mt-6">
              {savedIdeas.length === 0 ? (
                <Card className="border-gray-200 shadow-sm bg-white">
                  <CardContent className="text-center py-12">
                    <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-medium mb-2 text-gray-900">No saved research ideas</h3>
                    <p className="text-gray-600 mb-6 text-base max-w-md mx-auto">
                      Generate and save research ideas to build your collection and track your research interests
                    </p>
                    <Button
                      onClick={() => setTopic("")}
                      className="bg-gray-900 hover:bg-gray-800 text-white font-medium px-5 py-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Generate New Ideas
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <section className="space-y-6">
                  <h2 className="text-xl font-medium text-gray-900">Your Research Ideas Collection</h2>

                  {savedIdeas.map((idea) => (
                    <Card key={idea.id} className="border-gray-200 shadow-sm bg-white">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-medium text-gray-900 leading-tight">
                              {idea.title}
                            </CardTitle>
                            <CardDescription className="mt-2 text-gray-600 text-sm leading-relaxed">
                              {idea.description}
                            </CardDescription>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => idea.id && removeIdea(idea.id)}
                            className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 pt-0">
                        {idea.research_question && (
                          <div className="border-t border-gray-100 pt-3">
                            <h4 className="font-medium text-sm text-gray-500 mb-1 uppercase tracking-wide">
                              Research Question
                            </h4>
                            <p className="text-sm text-gray-800 leading-relaxed">{idea.research_question}</p>
                          </div>
                        )}

                        {idea.methodology && (
                          <div className="border-t border-gray-100 pt-3">
                            <h4 className="font-medium text-sm text-gray-500 mb-1 uppercase tracking-wide">
                              Methodology
                            </h4>
                            <p className="text-sm text-gray-800 leading-relaxed">{idea.methodology}</p>
                          </div>
                        )}

                        {idea.impact && (
                          <div className="border-t border-gray-100 pt-3">
                            <h4 className="font-medium text-sm text-gray-500 mb-1 uppercase tracking-wide">
                              Potential Impact
                            </h4>
                            <p className="text-sm text-gray-800 leading-relaxed">{idea.impact}</p>
                          </div>
                        )}

                        {idea.challenges && (
                          <div className="border-t border-gray-100 pt-3">
                            <h4 className="font-medium text-sm text-gray-500 mb-1 uppercase tracking-wide">
                              Challenges
                            </h4>
                            <p className="text-sm text-gray-800 leading-relaxed">{idea.challenges}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </section>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RouteGuard>
  )
}
