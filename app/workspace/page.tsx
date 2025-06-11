"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Lightbulb, Plus, Brain, Trash2, Edit, Search, Filter, Clock, Target, ArrowRight } from "lucide-react"
import { useSocket } from "@/components/socket-provider"
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

interface MindMapNode {
  id: string
  text: string
  x: number
  y: number
  connections: string[]
}

export default function IdeaWorkspace() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [mindMapNodes, setMindMapNodes] = useState<MindMapNode[]>([])
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
  const { socket } = useSocket()
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

    if (socket) {
      socket.emit("idea_created", {
        title: idea.title,
        category: idea.category,
      })
    }

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

      if (socket) {
        socket.emit("idea_generated", {
          topic: aiPrompt,
          count: aiIdeas.length,
        })
      }

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

  const getStatusColor = (status: Idea["status"]) => {
    switch (status) {
      case "draft":
        return "border-gray-300 text-gray-700"
      case "developing":
        return "border-black text-black"
      case "completed":
        return "border-gray-600 text-gray-600"
    }
  }

  const getPriorityColor = (priority: Idea["priority"]) => {
    switch (priority) {
      case "low":
        return "border-gray-300 text-gray-600"
      case "medium":
        return "border-gray-500 text-gray-700"
      case "high":
        return "border-black text-black"
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-8 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-sm mb-8">
            <Lightbulb className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-5xl font-light text-black mb-6 tracking-tight">Idea Workspace</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed font-light">
            Generate, organize, and develop your research ideas with AI assistance and collaborative tools
          </p>
        </div>

        <Tabs defaultValue="ideas" className="space-y-10">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 max-w-md mx-auto">
            <TabsTrigger
              value="ideas"
              className="data-[state=active]:bg-white data-[state=active]:text-black font-medium"
            >
              Ideas ({ideas.length})
            </TabsTrigger>
            <TabsTrigger
              value="mindmap"
              className="data-[state=active]:bg-white data-[state=active]:text-black font-medium"
            >
              Mind Map
            </TabsTrigger>
            <TabsTrigger
              value="ai-generator"
              className="data-[state=active]:bg-white data-[state=active]:text-black font-medium"
            >
              AI Generator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ideas" className="space-y-10">
            {/* Create New Idea */}
            <div className="border border-gray-200">
              <div className="p-8 border-b border-gray-200">
                <h3 className="text-xl font-medium text-black flex items-center gap-3">
                  <div className="w-1 h-6 bg-black"></div>
                  Create New Idea
                </h3>
                <p className="text-gray-600 text-sm mt-2 font-light">
                  Capture your research ideas and organize them for future development
                </p>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black uppercase tracking-wide">Idea Title</label>
                    <Input
                      placeholder="Enter your research idea title"
                      value={newIdea.title}
                      onChange={(e) => setNewIdea((prev) => ({ ...prev, title: e.target.value }))}
                      className="border-gray-300 focus:border-black focus:ring-black font-light"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black uppercase tracking-wide">Category</label>
                    <Input
                      placeholder="e.g., Machine Learning, NLP, Computer Vision"
                      value={newIdea.category}
                      onChange={(e) => setNewIdea((prev) => ({ ...prev, category: e.target.value }))}
                      className="border-gray-300 focus:border-black focus:ring-black font-light"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black uppercase tracking-wide">Description</label>
                  <Textarea
                    placeholder="Describe your idea in detail, including objectives, methodology, and expected outcomes..."
                    value={newIdea.description}
                    onChange={(e) => setNewIdea((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="resize-none border-gray-300 focus:border-black focus:ring-black font-light"
                  />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black uppercase tracking-wide">Tags</label>
                    <Input
                      placeholder="machine-learning, deep-learning, nlp (comma-separated)"
                      value={newIdea.tags}
                      onChange={(e) => setNewIdea((prev) => ({ ...prev, tags: e.target.value }))}
                      className="border-gray-300 focus:border-black focus:ring-black font-light"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black uppercase tracking-wide">Priority</label>
                    <select
                      value={newIdea.priority}
                      onChange={(e) =>
                        setNewIdea((prev) => ({ ...prev, priority: e.target.value as Idea["priority"] }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 focus:border-black focus:ring-black font-light"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>
                <Button
                  onClick={createIdea}
                  disabled={!newIdea.title.trim()}
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Idea to Workspace
                </Button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search ideas, descriptions, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-black focus:ring-black font-light"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 focus:border-black focus:ring-black font-light"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <Button variant="outline" className="flex items-center gap-2 border-gray-300 hover:bg-gray-50">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Category Overview */}
            {categories.length > 0 && (
              <div className="border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-black">Category Overview</h3>
                  <p className="text-gray-600 text-sm mt-1">Ideas organized by research domain</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {categories.map((category) => {
                      const categoryIdeas = ideas.filter((idea) => idea.category === category)
                      const completedCount = categoryIdeas.filter((idea) => idea.status === "completed").length
                      return (
                        <div
                          key={category}
                          className="p-4 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedCategory(category)}
                        >
                          <h4 className="font-medium text-black mb-3">{category}</h4>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex justify-between">
                              <span>Total:</span>
                              <span className="font-medium text-black">{categoryIdeas.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Completed:</span>
                              <span className="font-medium text-black">{completedCount}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Ideas Grid */}
            {filteredIdeas.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="border border-gray-200 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-lg font-medium text-black group-hover:text-gray-600 transition-colors">
                              {idea.title}
                            </h4>
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(idea.priority)}`}>
                              {idea.priority}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm">{idea.category}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(editingId === idea.id ? null : idea.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteIdea(idea.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-sm text-gray-700 leading-relaxed font-light line-clamp-3">
                        {idea.description}
                      </p>

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
                          className="px-3 py-1 border border-gray-300 text-sm focus:border-black focus:ring-black font-light"
                        >
                          <option value="draft">Draft</option>
                          <option value="developing">Developing</option>
                          <option value="completed">Completed</option>
                        </select>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(idea.status)}`}>
                          {idea.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {idea.timestamp.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {idea.priority} priority
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-gray-200">
                <div className="text-center py-20 px-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 mb-8">
                    <Lightbulb className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-medium text-black mb-2">
                    {searchTerm || selectedCategory !== "all" ? "No matching ideas found" : "No ideas yet"}
                  </h3>
                  <p className="text-gray-600 mb-6 font-light">
                    {searchTerm || selectedCategory !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "Create your first idea or use the AI generator to get started"}
                  </p>
                  {!searchTerm && selectedCategory === "all" && (
                    <Button
                      onClick={() => setAiPrompt("machine learning")}
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      <Brain className="mr-2 h-4 w-4" />
                      Try AI Generator
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mindmap" className="space-y-8">
            <div className="border border-gray-200">
              <div className="p-8 border-b border-gray-200">
                <h3 className="text-xl font-medium text-black flex items-center gap-3">
                  <div className="w-1 h-6 bg-black"></div>
                  Interactive Mind Map
                </h3>
                <p className="text-gray-600 text-sm mt-2 font-light">
                  Visualize connections between your ideas and discover new research pathways
                </p>
              </div>
              <div className="p-20 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 mb-8">
                  <Brain className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-medium text-black mb-4">Mind Map Coming Soon</h3>
                <p className="text-gray-600 max-w-md mx-auto leading-relaxed font-light mb-8">
                  Interactive mind mapping with drag-and-drop nodes, connection visualization, and AI-powered
                  suggestions
                </p>
                <div className="flex justify-center gap-6">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-black mb-2 mx-auto"></div>
                    <span className="text-xs text-gray-600 uppercase tracking-wide">AI Connections</span>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-gray-300 mb-2 mx-auto"></div>
                    <span className="text-xs text-gray-600 uppercase tracking-wide">Visual Mapping</span>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-gray-500 mb-2 mx-auto"></div>
                    <span className="text-xs text-gray-600 uppercase tracking-wide">Trend Analysis</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai-generator" className="space-y-8">
            <div className="border border-gray-200">
              <div className="p-8 border-b border-gray-200">
                <h3 className="text-xl font-medium text-black flex items-center gap-3">
                  <div className="w-1 h-6 bg-black"></div>
                  AI Idea Generator
                </h3>
                <p className="text-gray-600 text-sm mt-2 font-light">
                  Generate innovative research ideas using AI based on your interests and current trends
                </p>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black uppercase tracking-wide">
                      Research Topic or Interest
                    </label>
                    <Input
                      placeholder="e.g., Natural Language Processing, Computer Vision, Reinforcement Learning"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="border-gray-300 focus:border-black focus:ring-black font-light"
                    />
                  </div>

                  <Button
                    onClick={generateAIIdeas}
                    disabled={generatingIdeas || !aiPrompt.trim()}
                    className="w-full bg-black hover:bg-gray-800 text-white font-medium py-4"
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
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-gray-400"></div>
                    <span className="text-sm font-medium text-black uppercase tracking-wide">
                      Popular Research Topics
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {popularTopics.map((topic) => (
                      <Badge
                        key={topic}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-50 transition-colors justify-center py-2 border-gray-300"
                        onClick={() => setAiPrompt(topic)}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Generated Ideas Preview */}
            {ideas.filter((idea) => idea.category === "AI Generated").length > 0 && (
              <div className="border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-black">Recently Generated Ideas</h3>
                  <p className="text-gray-600 text-sm mt-1">Your latest AI-generated research concepts</p>
                </div>
                <div className="p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    {ideas
                      .filter((idea) => idea.category === "AI Generated")
                      .slice(0, 4)
                      .map((idea) => (
                        <div key={idea.id} className="border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium text-black line-clamp-2">{idea.title}</h4>
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(idea.priority)} ml-2`}>
                              {idea.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-3 line-clamp-3 font-light">{idea.description}</p>
                          <div className="flex gap-1 flex-wrap mb-3">
                            {idea.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {idea.timestamp.toLocaleDateString()}
                            </span>
                            <Badge variant="outline" className={`text-xs ${getStatusColor(idea.status)}`}>
                              {idea.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
