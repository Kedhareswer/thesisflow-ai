"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, X, Edit2, Save, ZoomIn, ZoomOut, LayoutTemplate, Download, Upload, Share2, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"

interface Note {
  id: string
  title: string
  content: string
  color: string
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
}

interface Node {
  id: string
  text: string
  x: number
  y: number
  color: string
  type?: string
}

interface Connection {
  source: string
  target: string
}

interface MindMapTemplate {
  id: string
  name: string
  description: string
  nodes: Node[]
  connections: Connection[]
  thumbnail: string
}

interface CollaboratorAction {
  userId: string
  userName: string
  action: string
  timestamp: string
}

export default function IdeaWorkspace() {
  const { toast } = useToast()

  // Sticky Notes State
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      title: "Research Question",
      content: "How does artificial intelligence impact educational outcomes in higher education?",
      color: "bg-yellow-100",
      tags: ["research question", "education", "AI"],
      createdAt: "2023-06-10T10:30:00Z",
      updatedAt: "2023-06-10T10:30:00Z",
      createdBy: "You",
    },
    {
      id: "2",
      title: "Methodology Idea",
      content: "Mixed methods approach with quantitative surveys and qualitative interviews",
      color: "bg-green-100",
      tags: ["methodology", "mixed methods"],
      createdAt: "2023-06-11T14:20:00Z",
      updatedAt: "2023-06-11T14:20:00Z",
      createdBy: "You",
    },
    {
      id: "3",
      title: "Literature to Review",
      content: "Find recent papers on AI in education from the last 3 years",
      color: "bg-blue-100",
      tags: ["literature", "to-do"],
      createdAt: "2023-06-12T09:15:00Z",
      updatedAt: "2023-06-12T09:15:00Z",
      createdBy: "You",
    },
  ])

  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    color: "bg-yellow-100",
    tags: [] as string[],
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [newTag, setNewTag] = useState("")
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])

  // Mind Map State
  const [nodes, setNodes] = useState<Node[]>([
    { id: "1", text: "Research Topic", x: 400, y: 200, color: "#3b82f6" },
    { id: "2", text: "Literature Review", x: 200, y: 100, color: "#10b981" },
    { id: "3", text: "Methodology", x: 600, y: 100, color: "#f59e0b" },
    { id: "4", text: "Data Collection", x: 200, y: 300, color: "#ef4444" },
    { id: "5", text: "Analysis", x: 600, y: 300, color: "#8b5cf6" },
  ])

  const [connections, setConnections] = useState<Connection[]>([
    { source: "1", target: "2" },
    { source: "1", target: "3" },
    { source: "1", target: "4" },
    { source: "1", target: "5" },
  ])

  const [newNodeText, setNewNodeText] = useState("")
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [nodeColor, setNodeColor] = useState("#3b82f6")

  // Collaboration State
  const [collaborators, setCollaborators] = useState([
    { id: "1", name: "You", status: "active" },
    { id: "2", name: "Alex Johnson", status: "active" },
    { id: "3", name: "Sam Taylor", status: "idle" },
  ])

  const [collaboratorActions, setCollaboratorActions] = useState<CollaboratorAction[]>([
    { userId: "2", userName: "Alex Johnson", action: "added a note: 'Research Methods'", timestamp: "2 minutes ago" },
    { userId: "3", userName: "Sam Taylor", action: "updated the mind map", timestamp: "5 minutes ago" },
    { userId: "2", userName: "Alex Johnson", action: "added a tag: 'literature review'", timestamp: "10 minutes ago" },
  ])

  // Mind Map Templates
  const [templates, setTemplates] = useState<MindMapTemplate[]>([
    {
      id: "research-paper",
      name: "Research Paper Structure",
      description: "Template for organizing a research paper",
      thumbnail: "/placeholder.svg?height=100&width=150",
      nodes: [
        { id: "c1", text: "Research Paper", x: 400, y: 200, color: "#3b82f6", type: "central" },
        { id: "c2", text: "Introduction", x: 200, y: 100, color: "#10b981", type: "section" },
        { id: "c3", text: "Literature Review", x: 200, y: 300, color: "#10b981", type: "section" },
        { id: "c4", text: "Methodology", x: 600, y: 100, color: "#f59e0b", type: "section" },
        { id: "c5", text: "Results", x: 600, y: 300, color: "#ef4444", type: "section" },
        { id: "c6", text: "Discussion", x: 400, y: 400, color: "#8b5cf6", type: "section" },
        { id: "c7", text: "Conclusion", x: 400, y: 500, color: "#ec4899", type: "section" },
      ],
      connections: [
        { source: "c1", target: "c2" },
        { source: "c1", target: "c3" },
        { source: "c1", target: "c4" },
        { source: "c1", target: "c5" },
        { source: "c1", target: "c6" },
        { source: "c1", target: "c7" },
      ],
    },
    {
      id: "literature-review",
      name: "Literature Review",
      description: "Template for organizing literature review",
      thumbnail: "/placeholder.svg?height=100&width=150",
      nodes: [
        { id: "l1", text: "Literature Review", x: 400, y: 200, color: "#3b82f6", type: "central" },
        { id: "l2", text: "Theoretical Framework", x: 200, y: 100, color: "#10b981", type: "category" },
        { id: "l3", text: "Current Research", x: 600, y: 100, color: "#f59e0b", type: "category" },
        { id: "l4", text: "Historical Context", x: 200, y: 300, color: "#ef4444", type: "category" },
        { id: "l5", text: "Research Gaps", x: 600, y: 300, color: "#8b5cf6", type: "category" },
      ],
      connections: [
        { source: "l1", target: "l2" },
        { source: "l1", target: "l3" },
        { source: "l1", target: "l4" },
        { source: "l1", target: "l5" },
      ],
    },
    {
      id: "methodology",
      name: "Research Methodology",
      description: "Template for planning research methodology",
      thumbnail: "/placeholder.svg?height=100&width=150",
      nodes: [
        { id: "m1", text: "Research Methodology", x: 400, y: 200, color: "#3b82f6", type: "central" },
        { id: "m2", text: "Research Design", x: 200, y: 100, color: "#10b981", type: "main" },
        { id: "m3", text: "Data Collection", x: 600, y: 100, color: "#f59e0b", type: "main" },
        { id: "m4", text: "Sampling", x: 200, y: 300, color: "#ef4444", type: "main" },
        { id: "m5", text: "Data Analysis", x: 600, y: 300, color: "#8b5cf6", type: "main" },
        { id: "m6", text: "Quantitative", x: 100, y: 100, color: "#10b981", type: "sub" },
        { id: "m7", text: "Qualitative", x: 100, y: 200, color: "#10b981", type: "sub" },
        { id: "m8", text: "Mixed Methods", x: 100, y: 300, color: "#10b981", type: "sub" },
      ],
      connections: [
        { source: "m1", target: "m2" },
        { source: "m1", target: "m3" },
        { source: "m1", target: "m4" },
        { source: "m1", target: "m5" },
        { source: "m2", target: "m6" },
        { source: "m2", target: "m7" },
        { source: "m2", target: "m8" },
      ],
    },
  ])

  // Update all tags whenever notes change
  useEffect(() => {
    const tags = new Set<string>()
    notes.forEach((note) => {
      note.tags.forEach((tag) => tags.add(tag))
    })
    setAllTags(Array.from(tags))
  }, [notes])

  // Filter notes based on selected tag
  const filteredNotes = filterTag ? notes.filter((note) => note.tags.includes(filterTag)) : notes

  // Sticky Notes Functions
  const colorOptions = [
    { value: "bg-yellow-100", label: "Yellow" },
    { value: "bg-blue-100", label: "Blue" },
    { value: "bg-green-100", label: "Green" },
    { value: "bg-pink-100", label: "Pink" },
    { value: "bg-purple-100", label: "Purple" },
  ]

  const addNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return

    const now = new Date().toISOString()
    const note: Note = {
      id: Date.now().toString(),
      ...newNote,
      createdAt: now,
      updatedAt: now,
      createdBy: "You",
    }

    setNotes([...notes, note])
    setNewNote({
      title: "",
      content: "",
      color: "bg-yellow-100",
      tags: [],
    })

    // Simulate collaborative action
    addCollaborativeAction("You", "added a new note: '" + note.title + "'")

    toast({
      title: "Note Added",
      description: "Your note has been added successfully.",
    })
  }

  const deleteNote = (id: string) => {
    const noteToDelete = notes.find((note) => note.id === id)
    setNotes(notes.filter((note) => note.id !== id))

    if (noteToDelete) {
      addCollaborativeAction("You", "deleted note: '" + noteToDelete.title + "'")
    }
  }

  const startEditing = (note: Note) => {
    setEditingId(note.id)
    setEditNote({ ...note })
  }

  const saveEdit = () => {
    if (!editNote) return

    const updatedNote = {
      ...editNote,
      updatedAt: new Date().toISOString(),
    }

    setNotes(notes.map((note) => (note.id === editingId ? updatedNote : note)))
    addCollaborativeAction("You", "updated note: '" + updatedNote.title + "'")

    setEditingId(null)
    setEditNote(null)

    toast({
      title: "Note Updated",
      description: "Your changes have been saved.",
    })
  }

  const addTag = () => {
    if (!newTag.trim() || !editNote) return

    setEditNote({
      ...editNote,
      tags: [...editNote.tags, newTag.toLowerCase()],
    })

    setNewTag("")
  }

  const removeTag = (tag: string) => {
    if (!editNote) return

    setEditNote({
      ...editNote,
      tags: editNote.tags.filter((t) => t !== tag),
    })
  }

  const exportNotes = () => {
    const notesJson = JSON.stringify(notes, null, 2)
    const blob = new Blob([notesJson], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "research-notes.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Notes Exported",
      description: "Your notes have been exported as JSON.",
    })
  }

  // Mind Map Functions
  const addNode = () => {
    if (!newNodeText.trim()) return

    const newNode: Node = {
      id: Date.now().toString(),
      text: newNodeText,
      x: 400,
      y: 200,
      color: nodeColor,
    }

    setNodes([...nodes, newNode])
    setNewNodeText("")
    addCollaborativeAction("You", "added a new node: '" + newNodeText + "'")
  }

  const startNodeDrag = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setSelectedNode(nodeId)
    setIsDragging(true)
  }

  const startConnection = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setConnectingFrom(nodeId)
  }

  const completeConnection = (targetId: string) => {
    if (connectingFrom && connectingFrom !== targetId) {
      // Check if connection already exists
      const connectionExists = connections.some(
        (conn) =>
          (conn.source === connectingFrom && conn.target === targetId) ||
          (conn.source === targetId && conn.target === connectingFrom),
      )

      if (!connectionExists) {
        setConnections([...connections, { source: connectingFrom, target: targetId }])
        addCollaborativeAction("You", "connected two nodes in the mind map")
      }

      setConnectingFrom(null)
    }
  }

  const startCanvasDrag = (e: React.MouseEvent) => {
    if (!connectingFrom) {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const deleteNode = (nodeId: string) => {
    const nodeToDelete = nodes.find((node) => node.id === nodeId)
    setNodes(nodes.filter((node) => node.id !== nodeId))
    setConnections(connections.filter((conn) => conn.source !== nodeId && conn.target !== nodeId))

    if (nodeToDelete) {
      addCollaborativeAction("You", "deleted node: '" + nodeToDelete.text + "'")
    }
  }

  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    setNodes([...template.nodes])
    setConnections([...template.connections])

    toast({
      title: "Template Applied",
      description: `The "${template.name}" template has been applied.`,
    })

    addCollaborativeAction("You", `applied the "${template.name}" mind map template`)
  }

  const exportMindMap = () => {
    const mindMapData = {
      nodes,
      connections,
    }

    const json = JSON.stringify(mindMapData, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "mind-map.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Mind Map Exported",
      description: "Your mind map has been exported as JSON.",
    })
  }

  // Collaboration Functions
  const addCollaborativeAction = (userName: string, action: string) => {
    const newAction = {
      userId: "1", // Current user
      userName,
      action,
      timestamp: "Just now",
    }

    setCollaboratorActions([newAction, ...collaboratorActions])
  }

  const shareWorkspace = () => {
    // In a real implementation, this would generate a sharing link
    const dummyLink = "https://research-assistant.app/share/ws-" + Math.random().toString(36).substring(2, 10)

    // Copy to clipboard
    navigator.clipboard.writeText(dummyLink).then(() => {
      toast({
        title: "Sharing Link Copied",
        description: "Workspace sharing link has been copied to clipboard.",
      })
    })
  }

  // Helper function to determine text color based on background
  function getContrastColor(hexColor: string): string {
    // Convert hex to RGB
    const r = Number.parseInt(hexColor.slice(1, 3), 16)
    const g = Number.parseInt(hexColor.slice(3, 5), 16)
    const b = Number.parseInt(hexColor.slice(5, 7), 16)

    // Calculate brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000

    // Return white for dark colors, black for light colors
    return brightness > 128 ? "#000000" : "#ffffff"
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Idea Workspace</h2>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={shareWorkspace}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share Workspace</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Users className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Collaborators</DialogTitle>
                <DialogDescription>People currently working in this workspace</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  {collaborators.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            user.status === "active" ? "bg-green-500" : "bg-amber-500"
                          }`}
                        />
                        <span>{user.name}</span>
                      </div>
                      <Badge variant="outline">{user.status === "active" ? "Online" : "Idle"}</Badge>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 pr-4">
                      {collaboratorActions.map((action, i) => (
                        <div key={i} className="text-sm border-b pb-2">
                          <span className="font-medium">{action.userName}</span> {action.action}
                          <div className="text-xs text-muted-foreground">{action.timestamp}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Collaborator
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notes">Sticky Notes</TabsTrigger>
          <TabsTrigger value="mindmap">Mind Map</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Label htmlFor="filterTag">Filter by tag:</Label>
              <Select value={filterTag || ""} onValueChange={(value) => setFilterTag(value || null)}>
                <SelectTrigger id="filterTag" className="w-[180px]">
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">All tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportNotes}>
                <Download className="mr-2 h-4 w-4" />
                Export Notes
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import Notes
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Add New Note</CardTitle>
              <CardDescription>Capture your research ideas and thoughts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    placeholder="Note title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    placeholder="Your research ideas, thoughts, or reminders..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color) => (
                        <div
                          key={color.value}
                          className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                            newNote.color === color.value ? "border-black" : "border-transparent"
                          } ${color.value}`}
                          onClick={() => setNewNote({ ...newNote, color: color.value })}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tags"
                        placeholder="Add tag and press Enter"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            if (newTag.trim()) {
                              setNewNote({
                                ...newNote,
                                tags: [...newNote.tags, newTag.toLowerCase()],
                              })
                              setNewTag("")
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (newTag.trim()) {
                            setNewNote({
                              ...newNote,
                              tags: [...newNote.tags, newTag.toLowerCase()],
                            })
                            setNewTag("")
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    {newNote.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {newNote.tags.map((tag, index) => (
                          <div
                            key={index}
                            className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1"
                          >
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => {
                                setNewNote({
                                  ...newNote,
                                  tags: newNote.tags.filter((_, i) => i !== index),
                                })
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={addNote} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </CardFooter>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <Card key={note.id} className={`${note.color} border`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    {editingId === note.id ? (
                      <Input
                        value={editNote?.title || ""}
                        onChange={(e) => setEditNote({ ...editNote!, title: e.target.value })}
                        className="bg-white/50"
                      />
                    ) : (
                      <CardTitle className="text-lg">{note.title}</CardTitle>
                    )}
                    <div className="flex gap-1">
                      {editingId === note.id ? (
                        <Button size="icon" variant="ghost" onClick={saveEdit}>
                          <Save className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="icon" variant="ghost" onClick={() => startEditing(note)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => deleteNote(note.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>By {note.createdBy}</span>
                    <span>Updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editNote?.content || ""}
                        onChange={(e) => setEditNote({ ...editNote!, content: e.target.value })}
                        className="min-h-[100px] bg-white/50"
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add tag"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          className="bg-white/50"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addTag()
                            }
                          }}
                        />
                        <Button type="button" variant="outline" onClick={addTag} className="shrink-0">
                          Add
                        </Button>
                      </div>
                      {editNote?.tags.length ? (
                        <div className="flex flex-wrap gap-1">
                          {editNote.tags.map((tag, index) => (
                            <div
                              key={index}
                              className="bg-white/50 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                            >
                              {tag}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap">{note.content}</p>
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.map((tag, index) => (
                            <div key={index} className="bg-white/30 text-xs px-2 py-0.5 rounded-full">
                              {tag}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mindmap" className="space-y-4">
          <div className="flex justify-between items-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <LayoutTemplate className="mr-2 h-4 w-4" />
                  Mind Map Templates
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Mind Map Templates</DialogTitle>
                  <DialogDescription>Choose a template to quickly create a structured mind map</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-primary"
                      onClick={() => applyTemplate(template.id)}
                    >
                      <CardContent className="p-4">
                        <div className="aspect-video bg-muted rounded-md mb-2 flex items-center justify-center">
                          <img
                            src={template.thumbnail || "/placeholder.svg"}
                            alt={template.name}
                            className="h-full w-full object-cover rounded-md"
                          />
                        </div>
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportMindMap}>
                <Download className="mr-2 h-4 w-4" />
                Export Mind Map
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mind Map Tools</CardTitle>
              <CardDescription>Visualize your research concepts and connections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nodeText">New Node Text</Label>
                    <Input
                      id="nodeText"
                      value={newNodeText}
                      onChange={(e) => setNewNodeText(e.target.value)}
                      placeholder="Enter node text"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Node Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map((color) => (
                        <div
                          key={color}
                          className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                            nodeColor === color ? "border-black" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNodeColor(color)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end">
                    <Button onClick={addNode} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Node
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between">
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setZoom(Math.min(zoom + 0.1, 2))}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative border rounded-lg overflow-hidden bg-white h-[500px]" onMouseDown={startCanvasDrag}>
            <div
              className="absolute w-full h-full"
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: "0 0",
              }}
            >
              {/* Connections */}
              <svg className="absolute w-full h-full pointer-events-none">
                {connections.map((conn, index) => {
                  const sourceNode = nodes.find((n) => n.id === conn.source)
                  const targetNode = nodes.find((n) => n.id === conn.target)

                  if (!sourceNode || !targetNode) return null

                  return (
                    <line
                      key={index}
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke="#888"
                      strokeWidth="2"
                    />
                  )
                })}

                {/* Active connection line */}
                {connectingFrom && (
                  <line
                    x1={nodes.find((n) => n.id === connectingFrom)?.x || 0}
                    y1={nodes.find((n) => n.id === connectingFrom)?.y || 0}
                    x2={dragStart.x / zoom - pan.x}
                    y2={dragStart.y / zoom - pan.y}
                    stroke="#888"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                )}
              </svg>

              {/* Nodes */}
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute p-2 rounded-lg shadow-md cursor-move flex flex-col items-center"
                  style={{
                    left: `${node.x - 75}px`,
                    top: `${node.y - 30}px`,
                    width: "150px",
                    backgroundColor: node.color,
                    color: getContrastColor(node.color),
                    zIndex: selectedNode === node.id ? 10 : 1,
                  }}
                  onMouseDown={(e) => startNodeDrag(e, node.id)}
                  onClick={() => connectingFrom && completeConnection(node.id)}
                >
                  <div className="text-center font-medium">{node.text}</div>
                  <div className="flex mt-2 space-x-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 bg-white/30"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNode(node.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 bg-white/30"
                      onClick={(e) => startConnection(e, node.id)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
