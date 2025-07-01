"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lightbulb, Search, BookOpen, TrendingUp, AlertCircle, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { enhancedAIService, type ResearchResult } from "@/lib/enhanced-ai-service"
import { projectService, type ResearchIdea } from "@/lib/services/project.service"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface GeneratedIdea {
  title: string
  description: string
  research_question?: string
  methodology?: string
  impact?: string
  challenges?: string
  saved?: boolean
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
      const result: ResearchResult = await enhancedAIService.generateResearchIdeas(topic, context || undefined)

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

  const saveIdea = async (idea: ResearchIdea) => {
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
        context,
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-black rounded-xl">
              <Lightbulb className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-light text-black tracking-tight">Research Ideas</h1>
              <p className="text-gray-600 mt-2 text-lg">Generate innovative research concepts with AI assistance</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl h-12">
            <TabsTrigger
              value="generate"
              className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-gray-600 font-medium rounded-lg"
            >
              Generate Ideas
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-gray-600 font-medium rounded-lg"
            >
              Saved Ideas ({savedIdeas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-8 mt-8">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader className="border-b border-gray-100 pb-6">
                <CardTitle className="flex items-center gap-3 text-black font-medium text-xl">
                  <Search className="h-5 w-5" />
                  Research Topic Input
                </CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  Enter your research topic and optional context to generate innovative research ideas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div>
                  <label htmlFor="topic" className="text-sm font-medium mb-3 block text-gray-700">
                    Research Topic *
                  </label>
                  <Input
                    id="topic"
                    placeholder="e.g., Machine Learning in Healthcare, Climate Change Adaptation..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && generateIdeas()}
                    className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black text-gray-900 placeholder:text-gray-400 h-12"
                  />
                </div>

                <div>
                  <label htmlFor="context" className="text-sm font-medium mb-3 block text-gray-700">
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
                  <Alert variant="destructive" className="border-gray-300 bg-gray-50">
                    <AlertCircle className="h-4 w-4 text-gray-700" />
                    <AlertDescription className="text-gray-700">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={generateIdeas}
                  disabled={loading || !topic.trim()}
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-4 h-auto transition-colors rounded-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                      Generating Research Ideas...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-5 w-5 mr-3" />
                      Generate Research Ideas
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {ideas.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-light text-black flex items-center gap-3">
                  <TrendingUp className="h-6 w-6" />
                  Generated Research Ideas
                </h2>

                {ideas.map((idea, index) => (
                  <Card key={index} className="border-gray-200 shadow-sm bg-white">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-medium text-black leading-tight">{idea.title}</CardTitle>
                          <CardDescription className="mt-3 text-gray-600 text-base leading-relaxed">
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
                                : "bg-black hover:bg-gray-800 text-white"
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

                    <CardContent className="space-y-5 pt-0">
                      {idea.research_question && (
                        <div className="border-t border-gray-100 pt-5">
                          <h4 className="font-medium text-sm text-gray-500 mb-2 uppercase tracking-wide">
                            Research Question
                          </h4>
                          <p className="text-sm text-gray-800 leading-relaxed">{idea.research_question}</p>
                        </div>
                      )}

                      {idea.methodology && (
                        <div className="border-t border-gray-100 pt-5">
                          <h4 className="font-medium text-sm text-gray-500 mb-2 uppercase tracking-wide">
                            Methodology
                          </h4>
                          <p className="text-sm text-gray-800 leading-relaxed">{idea.methodology}</p>
                        </div>
                      )}

                      {idea.impact && (
                        <div className="border-t border-gray-100 pt-5">
                          <h4 className="font-medium text-sm text-gray-500 mb-2 uppercase tracking-wide">
                            Potential Impact
                          </h4>
                          <p className="text-sm text-gray-800 leading-relaxed">{idea.impact}</p>
                        </div>
                      )}

                      {idea.challenges && (
                        <div className="border-t border-gray-100 pt-5">
                          <h4 className="font-medium text-sm text-gray-500 mb-2 uppercase tracking-wide">Challenges</h4>
                          <p className="text-sm text-gray-800 leading-relaxed">{idea.challenges}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-8 mt-8">
            {savedIdeas.length === 0 ? (
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="text-center py-16">
                  <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto mb-6">
                    <BookOpen className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-medium mb-3 text-black">No saved research ideas</h3>
                  <p className="text-gray-600 mb-8 text-base max-w-md mx-auto">
                    Generate and save research ideas to build your collection and track your research interests
                  </p>
                  <Button
                    onClick={() => setTopic("")}
                    className="bg-black hover:bg-gray-800 text-white font-medium px-6 py-3"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Generate New Ideas
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <h2 className="text-2xl font-light text-black flex items-center gap-3">
                  <BookOpen className="h-6 w-6" />
                  Your Research Ideas Collection
                </h2>

                {savedIdeas.map((idea) => (
                  <Card key={idea.id} className="border-gray-200 shadow-sm bg-white">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-medium text-black leading-tight">{idea.title}</CardTitle>
                          <CardDescription className="mt-3 text-gray-600 text-base leading-relaxed">
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

                    <CardContent className="space-y-5 pt-0">
                      {idea.research_question && (
                        <div className="border-t border-gray-100 pt-5">
                          <h4 className="font-medium text-sm text-gray-500 mb-2 uppercase tracking-wide">
                            Research Question
                          </h4>
                          <p className="text-sm text-gray-800 leading-relaxed">{idea.research_question}</p>
                        </div>
                      )}

                      {idea.methodology && (
                        <div className="border-t border-gray-100 pt-5">
                          <h4 className="font-medium text-sm text-gray-500 mb-2 uppercase tracking-wide">
                            Methodology
                          </h4>
                          <p className="text-sm text-gray-800 leading-relaxed">{idea.methodology}</p>
                        </div>
                      )}

                      {idea.impact && (
                        <div className="border-t border-gray-100 pt-5">
                          <h4 className="font-medium text-sm text-gray-500 mb-2 uppercase tracking-wide">
                            Potential Impact
                          </h4>
                          <p className="text-sm text-gray-800 leading-relaxed">{idea.impact}</p>
                        </div>
                      )}

                      {idea.challenges && (
                        <div className="border-t border-gray-100 pt-5">
                          <h4 className="font-medium text-sm text-gray-500 mb-2 uppercase tracking-wide">Challenges</h4>
                          <p className="text-sm text-gray-800 leading-relaxed">{idea.challenges}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
