"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { AIService } from "@/lib/ai-service"
import {
  Lightbulb,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Tag,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  Brain,
} from "lucide-react"

interface ResearchSuggestion {
  title: string
  description: string
  methodology: string
  potentialImpact: string
  keyChallenges: string[]
  nextSteps: string[]
}

interface IdeaAnalysis {
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  feasibilityScore: number
  impactScore: number
}

interface Idea {
  id: string
  title: string
  description: string
  methodology: string
  potentialImpact: string
  keyChallenges: string[]
  nextSteps: string[]
  tags: string[]
  votes: number
  comments: number
  createdAt: string
  author: string
  analysis?: IdeaAnalysis
}

export default function IdeaList() {
  const { toast } = useToast()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null)

  const [newIdea, setNewIdea] = useState({
    title: "",
    description: "",
    methodology: "",
    potentialImpact: "",
    keyChallenges: [] as string[],
    nextSteps: [] as string[],
    tags: "",
  })

  const [editingId, setEditingId] = useState<string | null>(null)

  const handleAddIdea = async () => {
    if (!newIdea.title || !newIdea.description) {
      toast({
        title: "Error",
        description: "Please fill in both title and description.",
        variant: "destructive",
      })
      return
    }

    const idea: Idea = {
      id: Date.now().toString(),
      title: newIdea.title,
      description: newIdea.description,
      methodology: newIdea.methodology,
      potentialImpact: newIdea.potentialImpact,
      keyChallenges: newIdea.keyChallenges,
      nextSteps: newIdea.nextSteps,
      tags: newIdea.tags.split(",").map((tag) => tag.trim()),
      votes: 0,
      comments: 0,
      createdAt: new Date().toISOString().split("T")[0],
      author: "You",
    }

    // Analyze the idea using AI
    try {
      setIsAnalyzing(idea.id)
      const analysis = await AIService.analyzeResearchIdea({
        title: idea.title,
        description: idea.description,
        methodology: idea.methodology,
        potentialImpact: idea.potentialImpact,
        keyChallenges: idea.keyChallenges,
        nextSteps: idea.nextSteps,
      })
      idea.analysis = analysis
    } catch (error) {
      console.error('Error analyzing idea:', error)
    } finally {
      setIsAnalyzing(null)
    }

    setIdeas([idea, ...ideas])
    setNewIdea({
      title: "",
      description: "",
      methodology: "",
      potentialImpact: "",
      keyChallenges: [],
      nextSteps: [],
      tags: "",
    })

    toast({
      title: "Success",
      description: "New idea added successfully!",
    })
  }

  const handleVote = (id: string) => {
    setIdeas(
      ideas.map((idea) =>
        idea.id === id ? { ...idea, votes: idea.votes + 1 } : idea
      )
    )
  }

  const handleDelete = (id: string) => {
    setIdeas(ideas.filter((idea) => idea.id !== id))
    toast({
      title: "Success",
      description: "Idea deleted successfully.",
    })
  }

  const handleEdit = (id: string) => {
    const idea = ideas.find((i) => i.id === id)
    if (!idea) return

    setEditingId(id)
    setNewIdea({
      title: idea.title,
      description: idea.description,
      methodology: idea.methodology,
      potentialImpact: idea.potentialImpact,
      keyChallenges: idea.keyChallenges,
      nextSteps: idea.nextSteps,
      tags: idea.tags.join(", "),
    })
  }

  const handleSaveEdit = async (id: string) => {
    const updatedIdea = {
      ...ideas.find((i) => i.id === id)!,
      title: newIdea.title,
      description: newIdea.description,
      methodology: newIdea.methodology,
      potentialImpact: newIdea.potentialImpact,
      keyChallenges: newIdea.keyChallenges,
      nextSteps: newIdea.nextSteps,
      tags: newIdea.tags.split(",").map((tag) => tag.trim()),
    }

    // Re-analyze the idea after editing
    try {
      setIsAnalyzing(id)
      const analysis = await AIService.analyzeResearchIdea({
        title: updatedIdea.title,
        description: updatedIdea.description,
        methodology: updatedIdea.methodology,
        potentialImpact: updatedIdea.potentialImpact,
        keyChallenges: updatedIdea.keyChallenges,
        nextSteps: updatedIdea.nextSteps,
      })
      updatedIdea.analysis = analysis
    } catch (error) {
      console.error('Error analyzing idea:', error)
    } finally {
      setIsAnalyzing(null)
    }

    setIdeas(ideas.map((idea) => (idea.id === id ? updatedIdea : idea)))
    setEditingId(null)
    setNewIdea({
      title: "",
      description: "",
      methodology: "",
      potentialImpact: "",
      keyChallenges: [],
      nextSteps: [],
      tags: "",
    })
    toast({
      title: "Success",
      description: "Idea updated successfully.",
    })
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Research Ideas</h2>
          </div>
          <Input
            placeholder="Idea Title"
            value={newIdea.title}
            onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
          />
          <Textarea
            placeholder="Describe your research idea..."
            value={newIdea.description}
            onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
          />
          <Textarea
            placeholder="Proposed methodology..."
            value={newIdea.methodology}
            onChange={(e) => setNewIdea({ ...newIdea, methodology: e.target.value })}
          />
          <Textarea
            placeholder="Potential impact..."
            value={newIdea.potentialImpact}
            onChange={(e) => setNewIdea({ ...newIdea, potentialImpact: e.target.value })}
          />
          <Input
            placeholder="Tags (comma-separated)"
            value={newIdea.tags}
            onChange={(e) => setNewIdea({ ...newIdea, tags: e.target.value })}
          />
          <Button onClick={handleAddIdea}>
            <Plus className="h-4 w-4 mr-2" />
            Add Idea
          </Button>
        </div>
      </Card>

      {ideas.map((idea) => (
        <Card key={idea.id} className="p-4">
          <CardContent className="p-0">
            {editingId === idea.id ? (
              <div className="space-y-4">
                <Input
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                />
                <Textarea
                  value={newIdea.description}
                  onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                />
                <Textarea
                  value={newIdea.methodology}
                  onChange={(e) => setNewIdea({ ...newIdea, methodology: e.target.value })}
                />
                <Textarea
                  value={newIdea.potentialImpact}
                  onChange={(e) => setNewIdea({ ...newIdea, potentialImpact: e.target.value })}
                />
                <Input
                  value={newIdea.tags}
                  onChange={(e) => setNewIdea({ ...newIdea, tags: e.target.value })}
                />
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => handleSaveEdit(idea.id)}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null)
                      setNewIdea({
                        title: "",
                        description: "",
                        methodology: "",
                        potentialImpact: "",
                        keyChallenges: [],
                        nextSteps: [],
                        tags: "",
                      })
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{idea.title}</h3>
                      {idea.author === "AI Assistant" && (
                        <Badge variant="secondary">
                          <Brain className="h-3 w-3 mr-1" />
                          AI Generated
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {idea.description}
                    </p>
                    {idea.methodology && (
                      <div className="mt-2">
                        <h4 className="text-sm font-medium">Methodology</h4>
                        <p className="text-sm text-muted-foreground">{idea.methodology}</p>
                      </div>
                    )}
                    {idea.potentialImpact && (
                      <div className="mt-2">
                        <h4 className="text-sm font-medium">Potential Impact</h4>
                        <p className="text-sm text-muted-foreground">{idea.potentialImpact}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(idea.id)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(idea.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {idea.analysis && (
                  <div className="bg-secondary/50 p-3 rounded-lg space-y-2">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-sm font-medium">Feasibility</div>
                        <div className="text-2xl font-bold">{idea.analysis.feasibilityScore}/10</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Impact</div>
                        <div className="text-2xl font-bold">{idea.analysis.impactScore}/10</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <h4 className="text-sm font-medium">Strengths</h4>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {idea.analysis.strengths.map((strength, i) => (
                            <li key={i}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Weaknesses</h4>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {idea.analysis.weaknesses.map((weakness, i) => (
                            <li key={i}>{weakness}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Recommendations</h4>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {idea.analysis.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {idea.keyChallenges.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">Key Challenges</h4>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {idea.keyChallenges.map((challenge, i) => (
                        <li key={i}>{challenge}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {idea.nextSteps.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">Next Steps</h4>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {idea.nextSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {idea.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => handleVote(idea.id)}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {idea.votes}
                    </Button>
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {idea.comments}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>{idea.author}</span>
                    <span>•</span>
                    <span>{idea.createdAt}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
