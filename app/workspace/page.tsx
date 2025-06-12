"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Lightbulb,
  Plus,
  Brain,
  Trash2,
  Search,
  Filter,
  Clock,
  Target,
  ArrowRight,
  Copy,
  Download,
  Zap,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Idea {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  timestamp: Date
  status: "draft" | "developing" | "completed"
  priority: "low" | "medium" | "high"
}

export default function IdeaWorkspace() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [newIdea, setNewIdea] = useState({
    title: "",
    description: "",
    category: "",
    tags: "",
    priority: "medium" as const,
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState("")
  const [generatingIdeas, setGeneratingIdeas] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const { toast } = useToast()

  const createIdea = () => {
    if (!newIdea.title.trim()) return

    const idea: Idea = {
      id: Date.now().toString(),
      title: newIdea.title,
      description: newIdea.description,
      category: newIdea.category || "General",
      tags: newIdea.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      timestamp: new Date(),
      status: "draft",
      priority: newIdea.priority,
    }

    setIdeas((prev) => [idea, ...prev])
    setNewIdea({ title: "", description: "", category: "", tags: "", priority: "medium" })

    toast({
      title: "Idea created",
      description: `"${idea.title}" has been added to your workspace`,
    })
  }

  const generateAIIdeas = async () => {
    if (!aiPrompt.trim()) return

    setGeneratingIdeas(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const aiIdeas: Idea[] = [
        {
          id: `ai-${Date.now()}-1`,
          title: `Novel Approach to ${aiPrompt}`,
          description: `An innovative methodology that combines cutting-edge machine learning techniques with traditional approaches to solve complex challenges in ${aiPrompt}. This research could involve developing new algorithms, optimizing existing frameworks, or creating hybrid solutions that leverage the strengths of multiple paradigms.`,
          category: "AI Generated",
          tags: ["ai-generated", "machine-learning", "innovation", aiPrompt.toLowerCase()],
          timestamp: new Date(),
          status: "draft",
          priority: "high",
        },
        {
          id: `ai-${Date.now()}-2`,
          title: `Cross-Domain Application of ${aiPrompt}`,
          description: `Exploring interdisciplinary applications where concepts from ${aiPrompt} can be applied to other research domains. This approach could lead to breakthrough discoveries by identifying unexpected connections and developing novel solutions that bridge different fields of study.`,
          category: "AI Generated",
          tags: ["ai-generated", "cross-domain", "interdisciplinary", aiPrompt.toLowerCase()],
          timestamp: new Date(),
          status: "draft",
          priority: "medium",
        },
        {
          id: `ai-${Date.now()}-3`,
          title: `Ethical Framework for ${aiPrompt}`,
          description: `A comprehensive study of the ethical implications and societal impact of advancements in ${aiPrompt}. This research would develop guidelines and frameworks for responsible development, deployment, and governance of technologies in this domain.`,
          category: "AI Generated",
          tags: ["ai-generated", "ethics", "society", "governance", aiPrompt.toLowerCase()],
          timestamp: new Date(),
          status: "draft",
          priority: "high",
        },
      ]

      setIdeas((prev) => [...aiIdeas, ...prev])
      setAiPrompt("")

      toast({
        title: "AI ideas generated",
        description: `Generated ${aiIdeas.length} research ideas based on "${aiPrompt}"`,
      })
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Could not generate ideas. Please try again.",
        variant: "destructive",
      })
    } finally {
      setGeneratingIdeas(false)
    }
  }

  const deleteIdea = (id: string) => {
    setIdeas((prev) => prev.filter((idea) => idea.id !== id))
    toast({
      title: "Idea deleted",
      description: "The idea has been removed from your workspace",
    })
  }

  const updateIdeaStatus = (id: string, status: Idea["status"]) => {
    setIdeas((prev) => prev.map((idea) => (idea.id === id ? { ...idea, status } : idea)))

    const idea = ideas.find((i) => i.id === id)
    toast({
      title: "Status updated",
      description: `"${idea?.title}" marked as ${status}`,
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied successfully",
    })
  }

  const downloadIdea = (idea: Idea) => {
    const content = `Title: ${idea.title}\n\nCategory: ${idea.category}\n\nDescription:\n${idea.description}\n\nTags: ${idea.tags.join(", ")}\n\nPriority: ${idea.priority}\nStatus: ${idea.status}\nCreated: ${idea.timestamp.toLocaleDateString()}`
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `idea-${idea.title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: Idea["status"]) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "developing":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
    }
  }

  const getPriorityColor = (priority: Idea["priority"]) => {
    switch (priority) {
      case "low":
        return "bg-gray-100 text-gray-600"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "high":
        return "bg-red-100 text-red-800"
    }
  }

  const categories = Array.from(new Set(ideas.map((idea) => idea.category)))
  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch =
      idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || idea.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const popularTopics = [
    "Transformer Architecture",
    "Computer Vision",
    "Reinforcement Learning",
    "Graph Neural Networks",
    "Federated Learning",
    "Explainable AI",
    "Quantum Computing",
    "Edge Computing",
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="section-spacing">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center content-spacing">
            <Badge variant="outline" className="mb-6">
              AI-Powered Idea Generation
            </Badge>

            <h1 className="text-display text-balance mb-6">
              Research Idea
              <span className="block">Workspace</span>
            </h1>

            <p className="text-xl text-muted-foreground text-balance mb-8 max-w-2xl mx-auto leading-relaxed">
              Generate, organize, and develop your research ideas with AI assistance and collaborative tools. Transform
              concepts into actionable research projects.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => setAiPrompt("machine learning")} className="focus-ring">
                <Brain className="mr-2 h-4 w-4" />
                Generate Ideas
              </Button>
              <Button variant="outline" size="lg" className="focus-ring">
                <Plus className="mr-2 h-4 w-4" />
                Create Manual Idea
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-spacing bg-muted/30">
        <div className="container">
          <Tabs defaultValue="ideas" className="space-y-8">
            <div className="flex justify-center">
              <TabsList className="grid w-full grid-cols-3 bg-background p-1 max-w-md">
                <TabsTrigger
                  value="ideas"
                  className="data-[state=active]:bg-foreground data-[state=active]:text-background"
                >
                  Ideas ({ideas.length})
                </TabsTrigger>
                <TabsTrigger
                  value="mindmap"
                  className="data-[state=active]:bg-foreground data-[state=active]:text-background"
                >
                  Mind Map
                </TabsTrigger>
                <TabsTrigger
                  value="ai-generator"
                  className="data-[state=active]:bg-foreground data-[state=active]:text-background"
                >
                  AI Generator
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ideas" className="space-y-8">
              {/* Create New Idea Card */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-title flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Create New Idea
                  </CardTitle>
                  <CardDescription>
                    Capture your research ideas and organize them for future development
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Idea Title</label>
                      <Input
                        placeholder="Enter your research idea title"
                        value={newIdea.title}
                        onChange={(e) => setNewIdea((prev) => ({ ...prev, title: e.target.value }))}
                        className="focus-ring"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <Input
                        placeholder="e.g., Machine Learning, NLP, Computer Vision"
                        value={newIdea.category}
                        onChange={(e) => setNewIdea((prev) => ({ ...prev, category: e.target.value }))}
                        className="focus-ring"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Describe your idea in detail, including objectives, methodology, and expected outcomes..."
                      value={newIdea.description}
                      onChange={(e) => setNewIdea((prev) => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="resize-none focus-ring"
                    />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tags</label>
                      <Input
                        placeholder="machine-learning, deep-learning, nlp (comma-separated)"
                        value={newIdea.tags}
                        onChange={(e) => setNewIdea((prev) => ({ ...prev, tags: e.target.value }))}
                        className="focus-ring"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <select
                        value={newIdea.priority}
                        onChange={(e) =>
                          setNewIdea((prev) => ({ ...prev, priority: e.target.value as Idea["priority"] }))
                        }
                        className="w-full px-3 py-2 border border-input bg-background focus-ring"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                    </div>
                  </div>
                  <Button onClick={createIdea} disabled={!newIdea.title.trim()} size="lg" className="w-full focus-ring">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Idea to Workspace
                  </Button>
                </CardContent>
              </Card>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search ideas, descriptions, or tags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 focus-ring"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-input bg-background focus-ring"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <Button variant="outline" className="flex items-center gap-2 focus-ring">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </div>

              {/* Category Overview */}
              {categories.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-title">Category Overview</CardTitle>
                    <CardDescription>Ideas organized by research domain</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {categories.map((category) => {
                        const categoryIdeas = ideas.filter((idea) => idea.category === category)
                        const completedCount = categoryIdeas.filter((idea) => idea.status === "completed").length
                        return (
                          <Card
                            key={category}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedCategory(category)}
                          >
                            <CardContent className="p-4">
                              <h4 className="font-medium mb-3">{category}</h4>
                              <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Total:</span>
                                  <span className="font-medium text-foreground">{categoryIdeas.length}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Completed:</span>
                                  <span className="font-medium text-foreground">{completedCount}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ideas Grid */}
              {filteredIdeas.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredIdeas.map((idea) => (
                    <Card key={idea.id} className="group hover:shadow-lg transition-all duration-300 animate-fade-in">
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-lg group-hover:text-muted-foreground transition-colors">
                                {idea.title}
                              </CardTitle>
                              <Badge className={`text-xs ${getPriorityColor(idea.priority)}`}>{idea.priority}</Badge>
                            </div>
                            <CardDescription>{idea.category}</CardDescription>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(idea.description)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadIdea(idea)}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteIdea(idea.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{idea.description}</p>

                        <div className="flex gap-1 flex-wrap">
                          {idea.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {idea.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{idea.tags.length - 3} more
                            </Badge>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-2">
                          <select
                            value={idea.status}
                            onChange={(e) => updateIdeaStatus(idea.id, e.target.value as Idea["status"])}
                            className="px-3 py-1 border border-input bg-background text-sm focus-ring"
                          >
                            <option value="draft">Draft</option>
                            <option value="developing">Developing</option>
                            <option value="completed">Completed</option>
                          </select>
                          <Badge className={`text-xs ${getStatusColor(idea.status)}`}>{idea.status}</Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {idea.timestamp.toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {idea.priority} priority
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="shadow-sm">
                  <CardContent className="text-center py-20 px-8">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Lightbulb className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-headline mb-4">
                      {searchTerm || selectedCategory !== "all" ? "No matching ideas found" : "No ideas yet"}
                    </h3>
                    <p className="text-body text-muted-foreground mb-6">
                      {searchTerm || selectedCategory !== "all"
                        ? "Try adjusting your search or filter criteria"
                        : "Create your first idea or use the AI generator to get started"}
                    </p>
                    {!searchTerm && selectedCategory === "all" && (
                      <Button onClick={() => setAiPrompt("machine learning")} variant="outline" className="focus-ring">
                        <Brain className="mr-2 h-4 w-4" />
                        Try AI Generator
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="mindmap" className="space-y-8">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-title flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Interactive Mind Map
                  </CardTitle>
                  <CardDescription>
                    Visualize connections between your ideas and discover new research pathways
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-20">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Brain className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-headline mb-4">Mind Map Coming Soon</h3>
                  <p className="text-body text-muted-foreground max-w-md mx-auto mb-8">
                    Interactive mind mapping with drag-and-drop nodes, connection visualization, and AI-powered
                    suggestions
                  </p>
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-foreground mb-2 mx-auto rounded"></div>
                      <span className="text-caption">AI Connections</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-muted mb-2 mx-auto rounded"></div>
                      <span className="text-caption">Visual Mapping</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-muted-foreground mb-2 mx-auto rounded"></div>
                      <span className="text-caption">Trend Analysis</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-generator" className="space-y-8">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-title flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    AI Idea Generator
                  </CardTitle>
                  <CardDescription>
                    Generate innovative research ideas using AI based on your interests and current trends
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Research Topic or Interest</label>
                      <Input
                        placeholder="e.g., Natural Language Processing, Computer Vision, Reinforcement Learning"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="focus-ring"
                      />
                    </div>

                    <Button
                      onClick={generateAIIdeas}
                      disabled={generatingIdeas || !aiPrompt.trim()}
                      size="lg"
                      className="w-full focus-ring"
                    >
                      {generatingIdeas ? (
                        <>
                          <Brain className="mr-2 h-4 w-4 animate-pulse" />
                          Generating Ideas...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Generate Research Ideas
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Popular Research Topics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {popularTopics.map((topic) => (
                        <Badge
                          key={topic}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent transition-colors justify-center py-2"
                          onClick={() => setAiPrompt(topic)}
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Generated Ideas Preview */}
              {ideas.filter((idea) => idea.category === "AI Generated").length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-title">Recently Generated Ideas</CardTitle>
                    <CardDescription>Your latest AI-generated research concepts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {ideas
                        .filter((idea) => idea.category === "AI Generated")
                        .slice(0, 4)
                        .map((idea) => (
                          <Card key={idea.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="font-medium line-clamp-2">{idea.title}</h4>
                                <Badge className={`text-xs ${getPriorityColor(idea.priority)} ml-2`}>
                                  {idea.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{idea.description}</p>
                              <div className="flex gap-1 flex-wrap mb-3">
                                {idea.tags.slice(0, 3).map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {idea.timestamp.toLocaleDateString()}
                                </span>
                                <Badge className={`text-xs ${getStatusColor(idea.status)}`}>{idea.status}</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  )
}
