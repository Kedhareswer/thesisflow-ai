"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lightbulb, Search, BookOpen, TrendingUp, AlertCircle, Loader2, Plus, Save } from "lucide-react"
import { enhancedAIService, ResearchResult } from "@/lib/enhanced-ai-service"
import { projectService, ResearchIdea } from "@/lib/services/project.service"
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
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadSavedIdeas = async () => {
    try {
      const result = await projectService.getResearchIdeas()
      setSavedIdeas(result.ideas || [])
    } catch (error) {
      console.error('Error loading saved ideas:', error)
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
      const result: ResearchResult = await enhancedAIService.generateResearchIdeas(
        topic,
        context || undefined
      )

      setIdeas(result.ideas.map(idea => ({
        ...idea,
        saved: false
      })))

      toast({
        title: "Research ideas generated!",
        description: `Generated ${result.ideas.length} research ideas for "${topic}"`,
      })
    } catch (error) {
      console.error('Research generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate research ideas'
      setError(errorMessage)
      
      if (errorMessage.includes('No AI providers available')) {
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
        context
      })

      // Update the idea as saved
      setIdeas(prev => prev.map(i => 
        i.title === idea.title ? { ...i, saved: true, id: savedIdea.id } : i
      ))
      
      // Add to saved ideas
      setSavedIdeas(prev => [savedIdea, ...prev])

      toast({
        title: "Research idea saved!",
        description: `"${idea.title}" has been saved to your collection`,
      })
    } catch (error) {
      console.error('Error saving idea:', error)
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
      setSavedIdeas(prev => prev.filter(idea => idea.id !== ideaId))
      
      toast({
        title: "Research idea removed",
        description: "The research idea has been removed from your collection",
      })
    } catch (error) {
      console.error('Error removing idea:', error)
      toast({
        title: "Remove failed",
        description: "Failed to remove research idea. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="h-8 w-8 text-yellow-500" />
        <div>
          <h1 className="text-3xl font-bold">Research Assistant</h1>
          <p className="text-muted-foreground">Generate innovative research ideas with AI assistance</p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Generate Ideas</TabsTrigger>
          <TabsTrigger value="saved">Saved Ideas ({savedIdeas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Research Topic Input
              </CardTitle>
              <CardDescription>
                Enter your research topic and optional context to generate innovative research ideas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="topic" className="text-sm font-medium mb-2 block">
                  Research Topic *
                </label>
                <Input
                  id="topic"
                  placeholder="e.g., Machine Learning in Healthcare, Climate Change Adaptation..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && generateIdeas()}
                />
              </div>
              
              <div>
                <label htmlFor="context" className="text-sm font-medium mb-2 block">
                  Additional Context (Optional)
                </label>
                <Textarea
                  id="context"
                  placeholder="Provide any additional context, constraints, or specific focus areas..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={3}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={generateIdeas} 
                disabled={loading || !topic.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Research Ideas...
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
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Generated Research Ideas
              </h2>
              
              {ideas.map((idea, index) => (
                <Card key={index} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{idea.title}</CardTitle>
                        <CardDescription className="mt-2">{idea.description}</CardDescription>
                      </div>
                      {user && (
                        <Button
                          size="sm"
                          variant={idea.saved ? "secondary" : "default"}
                          onClick={() => !idea.saved && saveIdea(idea)}
                          disabled={saving === idea.title || idea.saved}
                        >
                          {saving === idea.title ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : idea.saved ? (
                            <>
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Saved
                              </Badge>
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {idea.research_question && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Research Question</h4>
                        <p className="text-sm">{idea.research_question}</p>
                      </div>
                    )}
                    
                    {idea.methodology && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Methodology</h4>
                        <p className="text-sm">{idea.methodology}</p>
                      </div>
                    )}
                    
                    {idea.impact && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Potential Impact</h4>
                        <p className="text-sm">{idea.impact}</p>
                      </div>
                    )}
                    
                    {idea.challenges && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Challenges</h4>
                        <p className="text-sm">{idea.challenges}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-6">
          {savedIdeas.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No saved research ideas</h3>
                <p className="text-muted-foreground mb-4">
                  Generate and save research ideas to build your collection
                </p>
                <Button onClick={() => setTopic("")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate New Ideas
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                Your Research Ideas Collection
              </h2>
              
              {savedIdeas.map((idea) => (
                <Card key={idea.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{idea.title}</CardTitle>
                        <CardDescription className="mt-2">{idea.description}</CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => idea.id && removeIdea(idea.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {idea.research_question && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Research Question</h4>
                        <p className="text-sm">{idea.research_question}</p>
                      </div>
                    )}
                    
                    {idea.methodology && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Methodology</h4>
                        <p className="text-sm">{idea.methodology}</p>
                      </div>
                    )}
                    
                    {idea.impact && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Potential Impact</h4>
                        <p className="text-sm">{idea.impact}</p>
                      </div>
                    )}
                    
                    {idea.challenges && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Challenges</h4>
                        <p className="text-sm">{idea.challenges}</p>
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
  )
}
