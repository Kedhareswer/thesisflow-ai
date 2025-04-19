"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Users,
  MessageSquare,
  Send,
  Plus,
  FileText,
  Brain,
  Lightbulb,
  Clock,
  Share2,
  UserPlus,
  MoreHorizontal,
  Edit2,
  Save,
  X,
  BookOpen,
  BarChart,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface User {
  id: string
  name: string
  avatar: string
  status: "online" | "offline" | "away"
  role: "owner" | "editor" | "viewer"
  isTyping?: boolean
}

interface Message {
  id: string
  userId: string
  content: string
  timestamp: string
  type: "text" | "ai-response" | "document" | "idea" | "system"
  reactions?: { emoji: string; count: number }[]
}

interface Document {
  id: string
  title: string
  type: "note" | "summary" | "paper" | "idea" | "mindmap"
  content: string
  createdBy: string
  createdAt: string
  lastModified: string
  collaborators: string[]
  isEditing?: boolean
}

interface SavedResponse {
  id: string
  prompt: string
  response: string
  timestamp: string
  sharedWith: string[]
}

interface ResearchResource {
  id: string
  title: string
  type: "paper" | "tool" | "dataset"
  url: string
  description: string
  relevance: number
}

interface TimelineEvent {
  id: string
  title: string
  description: string
  date: string
  status: "planned" | "in-progress" | "completed"
  type: "milestone" | "task" | "meeting"
}

export default function CollaborativeWorkspace() {
  const { toast } = useToast()

  const [users, setUsers] = useState<User[]>([
    { id: "1", name: "You", avatar: "", status: "online", role: "owner" },
    { id: "2", name: "Alex Johnson", avatar: "", status: "online", role: "editor", isTyping: false },
    { id: "3", name: "Sam Taylor", avatar: "", status: "away", role: "editor" },
    { id: "4", name: "Jordan Lee", avatar: "", status: "offline", role: "viewer" },
  ])

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      userId: "2",
      content: "I found some interesting papers on our research topic. Should we review them together?",
      timestamp: "10:30 AM",
      type: "text",
    },
    {
      id: "2",
      userId: "1",
      content: "Yes, that would be great! I've been working on the methodology section.",
      timestamp: "10:32 AM",
      type: "text",
    },
    {
      id: "3",
      userId: "3",
      content: "I asked the AI assistant to summarize the key findings from the latest papers in our field.",
      timestamp: "10:35 AM",
      type: "text",
    },
    {
      id: "4",
      userId: "0",
      content:
        "**Summary of Recent Research**\n\nBased on the latest papers in this field, the key findings include:\n\n1. Novel methodological approaches combining qualitative and quantitative data\n2. Emerging trends in theoretical frameworks\n3. Gaps in current research regarding application in diverse contexts\n\nRecommended next steps: Focus on addressing the identified research gaps with your proposed methodology.",
      timestamp: "10:36 AM",
      type: "ai-response",
      reactions: [
        { emoji: "👍", count: 2 },
        { emoji: "🔍", count: 1 },
      ],
    },
    {
      id: "5",
      userId: "2",
      content: "That's really helpful! Let's incorporate these insights into our literature review.",
      timestamp: "10:38 AM",
      type: "text",
    },
    {
      id: "system-1",
      userId: "system",
      content: "Sam Taylor has shared a document: 'Literature Review Draft'",
      timestamp: "10:45 AM",
      type: "system",
    },
  ])

  const [newMessage, setNewMessage] = useState("")
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      title: "Literature Review Draft",
      type: "note",
      content: "Initial draft of literature review covering key theories and recent studies...",
      createdBy: "2",
      createdAt: "2023-06-10",
      lastModified: "2023-06-12",
      collaborators: ["1", "2", "3"],
    },
    {
      id: "2",
      title: "Research Methodology",
      type: "note",
      content: "Proposed mixed methods approach with survey and interviews...",
      createdBy: "1",
      createdAt: "2023-06-11",
      lastModified: "2023-06-11",
      collaborators: ["1", "2"],
    },
    {
      id: "3",
      title: "AI-Generated Research Questions",
      type: "idea",
      content: "1. How does X affect Y in context Z?\n2. What is the relationship between A and B?...",
      createdBy: "3",
      createdAt: "2023-06-12",
      lastModified: "2023-06-12",
      collaborators: ["1", "3"],
    },
    {
      id: "4",
      title: "Summary: Recent Advances in the Field",
      type: "summary",
      content: "This paper reviews the latest developments in...",
      createdBy: "2",
      createdAt: "2023-06-09",
      lastModified: "2023-06-09",
      collaborators: ["1", "2", "3", "4"],
    },
    {
      id: "5",
      title: "Research Framework Mind Map",
      type: "mindmap",
      content: "Visual representation of our research framework...",
      createdBy: "1",
      createdAt: "2023-06-13",
      lastModified: "2023-06-13",
      collaborators: ["1", "2", "3"],
    },
  ])

  const [aiPrompt, setAiPrompt] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [activeUsers, setActiveUsers] = useState<string[]>(["1", "2"])
  const [editingDocument, setEditingDocument] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const [researchContext, setResearchContext] = useState({
    field: "",
    topic: "",
    methodology: "",
    stage: "planning", // planning, data_collection, analysis, writing
  })

  const [savedResponses, setSavedResponses] = useState<SavedResponse[]>([])
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null)

  const [resources, setResources] = useState<ResearchResource[]>([
    {
      id: "1",
      title: "Recent Advances in AI Research",
      type: "paper",
      url: "https://example.com/paper1",
      description: "A comprehensive review of recent AI research methodologies",
      relevance: 0.9,
    },
    {
      id: "2",
      title: "Research Data Analysis Tool",
      type: "tool",
      url: "https://example.com/tool1",
      description: "Advanced data analysis tool for research projects",
      relevance: 0.8,
    },
  ])

  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    {
      id: "1",
      title: "Literature Review",
      description: "Complete initial literature review",
      date: "2024-03-01",
      status: "completed",
      type: "milestone",
    },
    {
      id: "2",
      title: "Data Collection",
      description: "Begin primary data collection",
      date: "2024-04-15",
      status: "in-progress",
      type: "task",
    },
  ])

  // Simulate real-time collaboration
  useEffect(() => {
    // Simulate another user typing
    const typingInterval = setInterval(() => {
      const shouldType = Math.random() > 0.7

      if (shouldType) {
        setUsers(users.map((user) => (user.id === "2" ? { ...user, isTyping: true } : user)))

        setTimeout(() => {
          setUsers(users.map((user) => (user.id === "2" ? { ...user, isTyping: false } : user)))
        }, 3000)
      }
    }, 10000)

    return () => clearInterval(typingInterval)
  }, [users])

  // Simulate document editing by other users
  useEffect(() => {
    const editingInterval = setInterval(() => {
      const randomDoc = documents[Math.floor(Math.random() * documents.length)]
      const isBeingEdited = Math.random() > 0.7

      if (isBeingEdited && !editingDocument) {
        setDocuments((docs) => docs.map((doc) => (doc.id === randomDoc.id ? { ...doc, isEditing: true } : doc)))

        setTimeout(() => {
          setDocuments((docs) =>
            docs.map((doc) =>
              doc.id === randomDoc.id
                ? { ...doc, isEditing: false, lastModified: new Date().toISOString().split("T")[0] }
                : doc,
            ),
          )

          // Add system message about the edit
          const editorId = randomDoc.collaborators.find((id) => id !== "1") || "2"
          const editor = users.find((user) => user.id === editorId)

          const systemMessage: Message = {
            id: `system-${Date.now()}`,
            userId: "system",
            content: `${editor?.name} has updated "${randomDoc.title}"`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            type: "system",
          }

          setMessages((msgs) => [...msgs, systemMessage])
        }, 5000)
      }
    }, 30000)

    return () => clearInterval(editingInterval)
  }, [documents, editingDocument, users])

  const sendMessage = () => {
    if (!newMessage.trim()) return

    const newMsg: Message = {
      id: Date.now().toString(),
      userId: "1", // Current user
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "text",
    }

    setMessages([...messages, newMsg])
    setNewMessage("")

    // Simulate response from another user
    if (Math.random() > 0.7) {
      setTimeout(
        () => {
          const responseUser = users.find((u) => u.id === "2" && u.status === "online")

          if (responseUser) {
            const responses = [
              "That's a great point! I agree with your perspective.",
              "Interesting idea. Have you considered looking at the recent paper by Johnson et al.?",
              "I think we should explore this further in our next meeting.",
              "I've been working on something similar. Let me share my notes with you later.",
            ]

            const randomResponse = responses[Math.floor(Math.random() * responses.length)]

            const responseMsg: Message = {
              id: Date.now().toString(),
              userId: "2",
              content: randomResponse,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              type: "text",
            }

            setMessages((msgs) => [...msgs, responseMsg])
          }
        },
        5000 + Math.random() * 5000,
      )
    }
  }

  const askAi = async () => {
    if (!aiPrompt.trim()) return

    setIsAiLoading(true)

    // Add user's question to messages
    const userMsg: Message = {
      id: Date.now().toString(),
      userId: "1", // Current user
      content: aiPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "text",
    }

    setMessages([...messages, userMsg])

    // Simulate AI response after a delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        userId: "0", // AI
        content: generateMockAiResponse(aiPrompt),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "ai-response",
      }

      setMessages((prev) => [...prev, aiResponse])
      setAiPrompt("")
      setIsAiLoading(false)
    }, 2000)
  }

  const startEditing = (docId: string) => {
    const doc = documents.find((d) => d.id === docId)
    if (doc) {
      setEditingDocument(docId)
      setEditedContent(doc.content)
    }
  }

  const saveDocument = () => {
    if (!editingDocument) return

    setDocuments((docs) =>
      docs.map((doc) =>
        doc.id === editingDocument
          ? {
              ...doc,
              content: editedContent,
              lastModified: new Date().toISOString().split("T")[0],
            }
          : doc,
      ),
    )

    setEditingDocument(null)
    setEditedContent("")

    toast({
      title: "Document Saved",
      description: "Your changes have been saved and shared with collaborators.",
    })

    // Add system message about the edit
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      userId: "system",
      content: `You updated a document`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "system",
    }

    setMessages([...messages, systemMessage])
  }

  const cancelEditing = () => {
    setEditingDocument(null)
    setEditedContent("")
  }

  const inviteCollaborator = () => {
    if (!inviteEmail.trim()) return

    toast({
      title: "Invitation Sent",
      description: `An invitation has been sent to ${inviteEmail}`,
    })

    setInviteEmail("")

    // Add system message about the invitation
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      userId: "system",
      content: `You invited ${inviteEmail} to collaborate`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "system",
    }

    setMessages([...messages, systemMessage])
  }

  const generateMockAiResponse = (prompt: string): string => {
    if (prompt.toLowerCase().includes("research question")) {
      return `**Research Questions Analysis:**

1. **Primary Research Question:**
   How does the implementation of AI tools affect research productivity in academic settings?

2. **Sub-questions:**
   - What specific AI tools are most effective for different research tasks?
   - How do researchers' experience levels impact AI tool adoption?
   - What are the key barriers to successful AI integration in research workflows?

3. **Methodological Considerations:**
   - Consider using a mixed-methods approach
   - Include both quantitative metrics (time saved, output quality) and qualitative insights
   - Control for confounding variables like research field and institution type

4. **Literature Gaps:**
   - Limited studies on long-term impact
   - Need for standardized evaluation metrics
   - Lack of comparative studies across disciplines`
    } else if (prompt.toLowerCase().includes("methodology")) {
      return `**Research Methodology Framework:**

1. **Research Design:**
   - Mixed-methods sequential explanatory design
   - Phase 1: Quantitative survey (n=200+)
   - Phase 2: Qualitative interviews (n=15-20)

2. **Data Collection:**
   - Survey: Standardized instruments for productivity metrics
   - Interviews: Semi-structured format
   - Document analysis: Research outputs and workflows

3. **Analysis Strategy:**
   - Quantitative: Statistical analysis (SPSS/R)
   - Qualitative: Thematic analysis (NVivo)
   - Integration: Joint display of findings

4. **Validity & Reliability:**
   - Pilot testing of instruments
   - Inter-rater reliability checks
   - Member checking for qualitative data`
    } else if (prompt.toLowerCase().includes("literature") || prompt.toLowerCase().includes("papers")) {
      return `**Literature Review Highlights:**

1. **Key Theoretical Papers:**
   - Smith et al. (2022) - "AI in Research: A Theoretical Framework"
   - Johnson & Williams (2021) - "Digital Transformation in Academia"
   - Zhang et al. (2023) - "Machine Learning Applications in Research"

2. **Methodological Studies:**
   - Brown et al. (2023) - "Evaluating AI Tools in Research"
   - Garcia & Lee (2022) - "Mixed Methods in AI Research"
   - Patel et al. (2023) - "Longitudinal Study of AI Adoption"

3. **Emerging Trends:**
   - Increased focus on ethical considerations
   - Integration of multiple AI tools
   - Development of evaluation frameworks

4. **Research Gaps:**
   - Need for standardized metrics
   - Long-term impact studies
   - Cross-disciplinary comparisons`
    } else {
      return `**Research Analysis:**

Based on your query, I've analyzed the current research landscape and can provide the following insights:

1. **Contextual Understanding:**
   - The field is rapidly evolving with new methodologies
   - Multiple theoretical frameworks exist
   - Practical applications vary by discipline

2. **Key Considerations:**
   - Methodological rigor is crucial
   - Contextual factors significantly impact outcomes
   - Integration with existing workflows is essential

3. **Recommendations:**
   - Start with a comprehensive literature review
   - Consider multiple theoretical frameworks
   - Develop a clear research methodology
   - Plan for practical implementation challenges

4. **Next Steps:**
   - Review recent systematic reviews
   - Identify key theoretical frameworks
   - Develop a research design
   - Consider ethical implications`
    }
  }

  const getDocumentIcon = (type: Document["type"]) => {
    switch (type) {
      case "note":
        return <FileText className="h-4 w-4" />
      case "summary":
        return <FileText className="h-4 w-4" />
      case "paper":
        return <FileText className="h-4 w-4" />
      case "idea":
        return <Lightbulb className="h-4 w-4" />
      case "mindmap":
        return <Brain className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getUserById = (id: string) => {
    if (id === "0") return { name: "AI Assistant", avatar: "", status: "online" as const, role: "viewer" }
    if (id === "system") return { name: "System", avatar: "", status: "online" as const, role: "viewer" }
    return (
      users.find((user) => user.id === id) || {
        name: "Unknown User",
        avatar: "",
        status: "offline" as const,
        role: "viewer",
      }
    )
  }

  const saveResponse = (prompt: string, response: string) => {
    const newResponse: SavedResponse = {
      id: Date.now().toString(),
      prompt,
      response,
      timestamp: new Date().toLocaleString(),
      sharedWith: [],
    }
    setSavedResponses([...savedResponses, newResponse])
    toast({
      title: "Response Saved",
      description: "The AI response has been saved to your research notes.",
    })
  }

  const shareResponse = (responseId: string) => {
    const response = savedResponses.find((r) => r.id === responseId)
    if (response) {
      // Add system message about sharing
      const systemMessage: Message = {
        id: `system-${Date.now()}`,
        userId: "system",
        content: `You shared an AI response with the team: "${response.prompt}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "system",
      }
      setMessages([...messages, systemMessage])
      toast({
        title: "Response Shared",
        description: "The AI response has been shared with your team.",
      })
    }
  }

  const addTimelineEvent = (event: Omit<TimelineEvent, "id">) => {
    const newEvent: TimelineEvent = {
      ...event,
      id: Date.now().toString(),
    }
    setTimeline([...timeline, newEvent])
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
      {/* Left sidebar - Team members */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Research Team
          </CardTitle>
          <CardDescription>Collaborate with your team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.id === "1" ? "You" : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </p>
                    {user.isTyping && <span className="text-xs italic text-gray-500">Typing...</span>}
                  </div>
                </div>
                <div
                  className={`h-2 w-2 rounded-full ${
                    user.status === "online" ? "bg-green-500" : user.status === "away" ? "bg-yellow-500" : "bg-gray-300"
                  }`}
                />
              </div>
            ))}

            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="Invite by email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={inviteCollaborator}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content - Chat and AI Assistant */}
      <Card className="md:col-span-2 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle>Collaborative Workspace</CardTitle>
          <CardDescription>Chat with your team and use AI assistance</CardDescription>
        </CardHeader>
        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <TabsList className="mx-6">
            <TabsTrigger value="chat" className="flex gap-2">
              <MessageSquare className="h-4 w-4" />
              Team Chat
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex gap-2">
              <Brain className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex gap-2">
              <FileText className="h-4 w-4" />
              Shared Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col mx-6 mt-0 space-y-4">
            <div className="flex-1 overflow-auto">
              <div className="space-y-4 py-4">
                {messages.map((message) => {
                  const user = getUserById(message.userId)
                  return (
                    <div key={message.id} className="flex gap-3 w-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{message.userId === "0" ? "AI" : user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 w-full">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{message.userId === "0" ? "AI Assistant" : user.name}</p>
                          <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            message.type === "ai-response"
                              ? "bg-blue-50 border border-blue-100"
                              : message.type === "system"
                                ? "bg-green-50 border border-green-100 text-green-600 italic"
                                : "bg-muted"
                          }`}
                        >
                          {message.type === "ai-response" ? (
                            <div className="prose prose-sm max-w-none">
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                          ) : (
                            <p className="text-sm">{message.content}</p>
                          )}
                        </div>
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex items-center gap-2">
                            {message.reactions.map((reaction, index) => (
                              <Badge key={index} variant="secondary">
                                {reaction.emoji} {reaction.count}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2 pb-4">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
              />
              <Button onClick={sendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="flex-1 flex flex-col mx-6 mt-0">
            <Card className="border-none shadow-none">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-500" />
                  Research AI Assistant
                </CardTitle>
                <CardDescription>
                  Get help with research questions, methodology, literature review, and analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg dark:bg-blue-950 dark:border-blue-900">
                  <h4 className="font-medium text-sm mb-2">Research Context</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Research Field</Label>
                      <Input
                        id="research-field"
                        placeholder="e.g., Computer Science, Education"
                        value={researchContext.field}
                        onChange={(e) => setResearchContext({ ...researchContext, field: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Research Topic</Label>
                      <Input
                        id="research-topic"
                        placeholder="e.g., AI in Education"
                        value={researchContext.topic}
                        onChange={(e) => setResearchContext({ ...researchContext, topic: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Methodology</Label>
                      <Input
                        id="research-methodology"
                        placeholder="e.g., Mixed Methods, Qualitative"
                        value={researchContext.methodology}
                        onChange={(e) => setResearchContext({ ...researchContext, methodology: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Research Stage</Label>
                      <div className="relative">
                        <select
                          value={researchContext.stage}
                          onChange={(e) => setResearchContext({ ...researchContext, stage: e.target.value })}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <option value="planning">Planning</option>
                          <option value="data_collection">Data Collection</option>
                          <option value="analysis">Analysis</option>
                          <option value="writing">Writing</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg dark:bg-blue-950 dark:border-blue-900">
                  <h4 className="font-medium text-sm mb-2">Research Support Categories:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => setAiPrompt("Help me formulate research questions for my study on AI in education")}
                    >
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Research Questions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => setAiPrompt("Suggest a methodology for a mixed-methods research design")}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Methodology
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => setAiPrompt("What are the most cited papers in this field from the last 3 years?")}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Literature Review
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => setAiPrompt("Help me analyze my research data and findings")}
                    >
                      <BarChart className="mr-2 h-4 w-4" />
                      Data Analysis
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Your Research Question</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="Ask the AI assistant a research-related question..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                <Button onClick={askAi} disabled={isAiLoading} className="w-full">
                  {isAiLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Research Query...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Get Research Insights
                    </>
                  )}
                </Button>

                {messages.filter((m) => m.type === "ai-response").length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Recent AI Responses</h4>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedResponse(null)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {messages
                        .filter((m) => m.type === "ai-response")
                        .slice(-3)
                        .map((message) => (
                          <Card key={message.id} className="p-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{message.content}</p>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => saveResponse(aiPrompt, message.content)}
                                >
                                  <Save className="mr-2 h-4 w-4" />
                                  Save Response
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => shareResponse(message.id)}
                                >
                                  <Share2 className="mr-2 h-4 w-4" />
                                  Share with Team
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Related Resources Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Related Resources</CardTitle>
                      <CardDescription>Suggested papers, tools, and datasets</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {resources.map((resource) => (
                        <div key={resource.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{resource.title}</h4>
                            <Badge variant="outline">{resource.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{resource.description}</p>
                          <div className="flex items-center gap-2">
                            <Button variant="link" size="sm" asChild>
                              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                View Resource
                              </a>
                            </Button>
                            <Badge variant="secondary">
                              Relevance: {Math.round(resource.relevance * 100)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Research Timeline Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Research Timeline</CardTitle>
                      <CardDescription>Track your research progress</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-4">
                        {timeline.map((event) => (
                          <div key={event.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{event.title}</h4>
                              <Badge
                                variant={
                                  event.status === "completed"
                                    ? "default"
                                    : event.status === "in-progress"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {event.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{event.type}</Badge>
                              <span className="text-sm text-muted-foreground">{event.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          addTimelineEvent({
                            title: "New Milestone",
                            description: "Add description here",
                            date: new Date().toISOString().split("T")[0],
                            status: "planned",
                            type: "milestone",
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Timeline Event
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="flex-1 mx-6 mt-0">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Shared Documents</h3>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Document
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => {
                  const creator = getUserById(doc.createdBy)
                  return (
                    <Card key={doc.id} className="bg-muted/50">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getDocumentIcon(doc.type)}
                            <CardTitle className="text-base">{doc.title}</CardTitle>
                          </div>
                          <DropdownMenu
                            trigger={
                              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            }
                          >
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => startEditing(doc.id)}
                                className={editingDocument !== null && editingDocument !== doc.id ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Users className="mr-2 h-4 w-4" />
                                View Collaborators
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardDescription className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback>{creator.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>
                            {creator.name} • {doc.lastModified}
                          </span>
                          {doc.isEditing && (
                            <Badge variant="secondary" className="ml-2">
                              Being Edited
                            </Badge>
                          )}
                        </CardDescription>
                      </CardHeader>
                      {editingDocument === doc.id ? (
                        <CardContent className="p-4 pt-2">
                          <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="min-h-[100px]"
                          />
                        </CardContent>
                      ) : (
                        <CardContent className="p-4 pt-2">
                          <p className="text-sm line-clamp-2">{doc.content}</p>
                        </CardContent>
                      )}
                      <CardFooter className="p-4 pt-0">
                        {editingDocument === doc.id ? (
                          <div className="ml-auto flex gap-2">
                            <Button variant="ghost" size="sm" onClick={cancelEditing}>
                              <X className="mr-2 h-4 w-4" />
                              Cancel
                            </Button>
                            <Button size="sm" onClick={saveDocument}>
                              <Save className="mr-2 h-4 w-4" />
                              Save
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="ml-auto">
                            Open
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
