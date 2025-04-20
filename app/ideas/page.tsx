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
import { Brain, Lightbulb, Users, Plus, StickyNote, Calendar, ListTodo, Trash2, Edit2, Save, X } from "lucide-react"
import { AIService } from "@/lib/ai-service"
import { ScrollArea } from "@/components/ui/scroll-area"
import MindMapVisualization from "@/components/mind-map-visualization"

interface StickyNote {
  id: string
  content: string
  color: string
  position: { x: number; y: number }
}

interface MindMapNode {
  id: string
  content: string
  children: MindMapNode[]
  position: { x: number; y: number }
}

interface ProjectTask {
  id: string
  title: string
  description: string
  dueDate: string
  status: "todo" | "in-progress" | "completed"
  priority: "low" | "medium" | "high"
}

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

  // Mind Map State
  const [mindMapNodes, setMindMapNodes] = useState<MindMapNode[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [newNodeContent, setNewNodeContent] = useState("")

  // Sticky Notes State
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([])
  const [newNoteContent, setNewNoteContent] = useState("")
  const [selectedNote, setSelectedNote] = useState<string | null>(null)

  // Project Planner State
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [newTask, setNewTask] = useState<Partial<ProjectTask>>({
    title: "",
    description: "",
    dueDate: "",
    status: "todo",
    priority: "medium",
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

  // Handle AI assistance
  const handleAIAssist = async (type: "mindmap" | "notes" | "project") => {
    setIsGenerating(true)
    try {
      let prompt = ""
      let context = ""

      switch (type) {
        case "mindmap":
          context = mindMapNodes.length > 0
            ? `Current mind map structure:\n${JSON.stringify(mindMapNodes, null, 2)}`
            : "No existing mind map structure"
          prompt = `As a research planning assistant, analyze the following context and suggest improvements to the mind map structure:

${context}

Please provide:
1. Main research topics to add
2. Key subtopics and their relationships
3. Important connections between topics
4. Potential research gaps to explore

Format the response as a JSON array of nodes with their children, where each node has:
{
  "content": "Topic or subtopic",
  "children": [] // Array of child nodes
}`

          const mindMapResponse = await fetch("/api/explore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              options: {
                temperature: 0.7,
                maxTokens: 2048,
              },
            }),
          })

          if (!mindMapResponse.ok) throw new Error("Failed to get AI assistance")
          const mindMapData = await mindMapResponse.json()
          
          // Process and add new nodes to the mind map
          const newNodes = JSON.parse(mindMapData.result)
          setMindMapNodes((prev) => [...prev, ...newNodes])
          break

        case "notes":
          context = stickyNotes.length > 0
            ? `Current notes:\n${stickyNotes.map(note => note.content).join('\n')}`
            : "No existing notes"
          prompt = `As a research assistant, analyze the following context and suggest additional research notes:

${context}

Please provide 5-7 new research notes that:
1. Build upon existing ideas
2. Suggest new research directions
3. Identify potential challenges
4. Propose solutions or approaches

Format each note as a separate item with clear, actionable content.`

          const notesResponse = await fetch("/api/explore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              options: {
                temperature: 0.7,
                maxTokens: 2048,
              },
            }),
          })

          if (!notesResponse.ok) throw new Error("Failed to get AI assistance")
          const notesData = await notesResponse.json()
          
          // Process and add new notes
          const newNotes = notesData.result.split('\n').map((content: string) => ({
            id: Date.now().toString() + Math.random(),
            content: content.trim(),
            color: `hsl(${Math.random() * 360}, 70%, 80%)`,
            position: { x: 0, y: 0 },
          }))
          setStickyNotes((prev) => [...prev, ...newNotes])
          break

        case "project":
          context = tasks.length > 0
            ? `Current project tasks:\n${tasks.map(task => `${task.title}: ${task.description}`).join('\n')}`
            : "No existing tasks"
          prompt = `As a project management assistant, analyze the following context and suggest improvements to the project plan:

${context}

Please provide:
1. Additional tasks to consider
2. Timeline suggestions
3. Resource allocation recommendations
4. Risk mitigation strategies

Format the response as a JSON array of tasks, where each task has:
{
  "title": "Task title",
  "description": "Detailed description",
  "priority": "low|medium|high",
  "status": "todo|in-progress|completed"
}`

          const projectResponse = await fetch("/api/explore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              options: {
                temperature: 0.7,
                maxTokens: 2048,
              },
            }),
          })

          if (!projectResponse.ok) throw new Error("Failed to get AI assistance")
          const projectData = await projectResponse.json()
          
          // Process and add new tasks
          const newTasks = JSON.parse(projectData.result)
          setTasks((prev) => [...prev, ...newTasks])
          break
      }

      toast({
        title: "AI Assistance",
        description: "Generated suggestions have been added to your workspace.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI assistance. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Mind Map Functions
  const addMindMapNode = () => {
    if (!newNodeContent.trim()) return

    const centerX = 400
    const centerY = 300
    const radius = 200
    const currentNodes = mindMapNodes.length

    // Calculate position based on golden angle for better distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)) // Golden angle in radians
    const angle = currentNodes * goldenAngle

    const newNode: MindMapNode = {
      id: Date.now().toString(),
      content: newNodeContent,
      children: [],
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
    }

    if (selectedNode) {
      // If a node is selected, add as a child with relative positioning
      const parentNode = findNode(mindMapNodes, selectedNode)
      if (parentNode) {
        const childAngle = (parentNode.children.length * Math.PI * 2) / 8
        const childRadius = 150
        newNode.position = {
          x: parentNode.position.x + childRadius * Math.cos(childAngle),
          y: parentNode.position.y + childRadius * Math.sin(childAngle),
        }
        setMindMapNodes((prev) =>
          prev.map((node) =>
            node.id === selectedNode
              ? { ...node, children: [...node.children, newNode] }
              : node
          )
        )
      }
    } else {
      setMindMapNodes((prev) => [...prev, newNode])
    }

    setNewNodeContent("")
    toast({
      title: "Node Added",
      description: "New mind map node has been created.",
    })
  }

  // Helper function to find a node by ID in the tree structure
  const findNode = (nodes: MindMapNode[], id: string): MindMapNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node
      const found = findNode(node.children, id)
      if (found) return found
    }
    return null
  }

  // Sticky Notes Functions
  const addStickyNote = () => {
    if (!newNoteContent.trim()) return

    const newNote: StickyNote = {
      id: Date.now().toString(),
      content: newNoteContent,
      color: `hsl(${Math.random() * 360}, 70%, 80%)`,
      position: { x: 0, y: 0 },
    }

    setStickyNotes((prev) => [...prev, newNote])
    setNewNoteContent("")
  }

  // Project Planner Functions
  const addTask = () => {
    if (!newTask.title?.trim()) return

    const task: ProjectTask = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description || "",
      dueDate: newTask.dueDate || new Date().toISOString().split("T")[0],
      status: newTask.status || "todo",
      priority: newTask.priority || "medium",
    }

    setTasks((prev) => [...prev, task])
    setNewTask({
      title: "",
      description: "",
      dueDate: "",
      status: "todo",
      priority: "medium",
    })
  }

  // Update mind map node
  const updateMindMapNode = (nodeId: string, content: string) => {
    setMindMapNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? { ...node, content }
          : {
              ...node,
              children: node.children.map((child) =>
                child.id === nodeId
                  ? { ...child, content }
                  : {
                      ...child,
                      children: child.children.map((grandChild) =>
                        grandChild.id === nodeId
                          ? { ...grandChild, content }
                          : grandChild
                      ),
                    }
              ),
            }
      )
    )
  }

  // Delete mind map node
  const deleteMindMapNode = (nodeId: string) => {
    setMindMapNodes((prev) =>
      prev.filter((node) => {
        if (node.id === nodeId) return false
        return {
          ...node,
          children: node.children.filter((child) => {
            if (child.id === nodeId) return false
            return {
              ...child,
              children: child.children.filter(
                (grandChild) => grandChild.id !== nodeId
              ),
            }
          }),
        }
      })
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Ideas Workspace</h1>
          <p className="text-muted-foreground mt-2">
            Organize your research ideas, create mind maps, and plan your projects
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
              <TabsTrigger value="notes">
                <StickyNote className="mr-2 h-4 w-4" />
                Sticky Notes
              </TabsTrigger>
              <TabsTrigger value="project">
                <ListTodo className="mr-2 h-4 w-4" />
                Project Planner
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mindmap" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Research Mind Map</CardTitle>
                  <CardDescription>
                    Visualize your research ideas and their connections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Input
                      placeholder="Enter node content"
                      value={newNodeContent}
                      onChange={(e) => setNewNodeContent(e.target.value)}
                    />
                    <Button onClick={addMindMapNode}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Node
                    </Button>
                  </div>
                  <div className="mt-4 h-[500px] border rounded-lg relative">
                    <MindMapVisualization
                      nodes={mindMapNodes}
                      onNodeSelect={setSelectedNode}
                      onNodeUpdate={updateMindMapNode}
                      onNodeDelete={deleteMindMapNode}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sticky Notes</CardTitle>
                  <CardDescription>
                    Capture quick thoughts and research notes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Input
                      placeholder="Enter note content"
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                    />
                    <Button onClick={addStickyNote}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Note
                    </Button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stickyNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-4 rounded-lg shadow-sm"
                        style={{ backgroundColor: note.color }}
                      >
                        <div className="flex justify-end gap-2 mb-2">
                          <Button variant="ghost" size="icon">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="project" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Project Planner</CardTitle>
                  <CardDescription>
                    Organize your research tasks and track progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <Input
                        placeholder="Task title"
                        value={newTask.title}
                        onChange={(e) =>
                          setNewTask((prev) => ({ ...prev, title: e.target.value }))
                        }
                      />
                      <Textarea
                        placeholder="Task description"
                        value={newTask.description}
                        onChange={(e) =>
                          setNewTask((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                      <div className="flex gap-4">
                        <Input
                          type="date"
                          value={newTask.dueDate}
                          onChange={(e) =>
                            setNewTask((prev) => ({
                              ...prev,
                              dueDate: e.target.value,
                            }))
                          }
                        />
                        <select
                          value={newTask.priority}
                          onChange={(e) =>
                            setNewTask((prev) => ({
                              ...prev,
                              priority: e.target.value as "low" | "medium" | "high",
                            }))
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                      </div>
                      <Button onClick={addTask}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Task
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium">Tasks</h3>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {tasks.map((task) => (
                            <Card key={task.id}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium">{task.title}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {task.description}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                      <span className="text-xs text-muted-foreground">
                                        Due: {task.dueDate}
                                      </span>
                                      <span
                                        className={`text-xs px-2 py-1 rounded-full ${
                                          task.priority === "high"
                                            ? "bg-red-100 text-red-800"
                                            : task.priority === "medium"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-green-100 text-green-800"
                                        }`}
                                      >
                                        {task.priority} priority
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="ghost" size="icon">
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>
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