"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useSocket } from "@/components/socket-provider"
import { useUser } from "@/components/user-provider"
import { useRouter } from "next/navigation"
import {
  Users,
  MessageSquare,
  Send,
  Plus,
  FileText,
  Brain,
  Lightbulb,
  Share2,
  UserPlus,
  MoreHorizontal,
  Edit2,
  Save,
  X,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

export default function CollaborativeWorkspace() {
  const { user, isLoading: userLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { isConnected, sendEvent, activeUsers, events } = useSocket()
  const [isLoading, setIsLoading] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [aiPrompt, setAiPrompt] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [editingDocument, setEditingDocument] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      userId: "user-2",
      content: "I found some interesting papers on our research topic. Should we review them together?",
      timestamp: "10:30 AM",
      type: "text",
    },
    {
      id: "2",
      userId: "user-1",
      content: "Yes, that would be great! I've been working on the methodology section.",
      timestamp: "10:32 AM",
      type: "text",
    },
    {
      id: "3",
      userId: "user-3",
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
      userId: "user-2",
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

  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      title: "Literature Review Draft",
      type: "note",
      content: "Initial draft of literature review covering key theories and recent studies...",
      createdBy: "user-2",
      createdAt: "2023-06-10",
      lastModified: "2023-06-12",
      collaborators: ["user-1", "user-2", "user-3"],
    },
    {
      id: "2",
      title: "Research Methodology",
      type: "note",
      content: "Proposed mixed methods approach with survey and interviews...",
      createdBy: "user-1",
      createdAt: "2023-06-11",
      lastModified: "2023-06-11",
      collaborators: ["user-1", "user-2"],
    },
    {
      id: "3",
      title: "AI-Generated Research Questions",
      type: "idea",
      content: "1. How does X affect Y in context Z?\n2. What is the relationship between A and B?...",
      createdBy: "user-3",
      createdAt: "2023-06-12",
      lastModified: "2023-06-12",
      collaborators: ["user-1", "user-3"],
    },
    {
      id: "4",
      title: "Summary: Recent Advances in the Field",
      type: "summary",
      content: "This paper reviews the latest developments in...",
      createdBy: "user-2",
      createdAt: "2023-06-09",
      lastModified: "2023-06-09",
      collaborators: ["user-1", "user-2", "user-3", "user-4"],
    },
    {
      id: "5",
      title: "Research Framework Mind Map",
      type: "mindmap",
      content: "Visual representation of our research framework...",
      createdBy: "user-1",
      createdAt: "2023-06-13",
      lastModified: "2023-06-13",
      collaborators: ["user-1", "user-2", "user-3"],
    },
  ])

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login")
    }
  }, [user, userLoading, router])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handle socket events
  useEffect(() => {
    if (!events.length) return

    const latestEvent = events[events.length - 1]

    // Handle different event types
    if (latestEvent.type === "chat_message" && latestEvent.userId !== user?.id) {
      const newMessage: Message = {
        id: Date.now().toString(),
        userId: latestEvent.userId,
        content: latestEvent.payload.content,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "text",
      }

      setMessages((prev) => [...prev, newMessage])

      toast({
        title: "New message",
        description: `${getUserById(latestEvent.userId).name} sent a message`,
      })
    }

    if (latestEvent.type === "document_edited") {
      // Update document
      setDocuments((docs) =>
        docs.map((doc) =>
          doc.id === latestEvent.payload.documentId
            ? {
                ...doc,
                content: latestEvent.payload.content,
                lastModified: new Date().toISOString().split("T")[0],
              }
            : doc,
        ),
      )

      // Add system message
      const systemMessage: Message = {
        id: `system-${Date.now()}`,
        userId: "system",
        content: `${getUserById(latestEvent.userId).name} has updated "${latestEvent.payload.title}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "system",
      }

      setMessages((prev) => [...prev, systemMessage])
    }

    if (latestEvent.type === "document_shared") {
      // Add system message
      const systemMessage: Message = {
        id: `system-${Date.now()}`,
        userId: "system",
        content: `${getUserById(latestEvent.userId).name} has shared "${latestEvent.payload.title}" with the team`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "system",
      }

      setMessages((prev) => [...prev, systemMessage])
    }

    if (latestEvent.type === "collaborator_joined") {
      // Add system message
      const systemMessage: Message = {
        id: `system-${Date.now()}`,
        userId: "system",
        content: `${latestEvent.payload.name} has joined the workspace`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "system",
      }

      setMessages((prev) => [...prev, systemMessage])

      toast({
        title: "New collaborator",
        description: `${latestEvent.payload.name} has joined the workspace`,
      })
    }
  }, [events, user, toast])

  const sendMessage = () => {
    if (!newMessage.trim() || !user) return

    const newMsg: Message = {
      id: Date.now().toString(),
      userId: user.id,
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "text",
    }

    setMessages([...messages, newMsg])

    // Send event to other users
    sendEvent("chat_message", {
      content: newMessage,
    })

    setNewMessage("")
  }

  const askAi = async () => {
    if (!aiPrompt.trim() || !user) return

    setIsAiLoading(true)

    // Add user's question to messages
    const userMsg: Message = {
      id: Date.now().toString(),
      userId: user.id,
      content: aiPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "text",
    }

    setMessages([...messages, userMsg])

    try {
      // In a real app, this would call an AI API
      // For now, we'll simulate a response
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const aiResponse = generateAiResponse(aiPrompt)

      const responseMsg: Message = {
        id: (Date.now() + 1).toString(),
        userId: "0", // AI
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "ai-response",
      }

      setMessages((prev) => [...prev, responseMsg])

      // Track AI usage
      sendEvent("ai_prompt", {
        prompt: aiPrompt,
        responseLength: aiResponse.length,
      })
    } catch (error) {
      toast({
        title: "AI response failed",
        description: "There was an error generating the AI response. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAiPrompt("")
      setIsAiLoading(false)
    }
  }

  const startEditing = (docId: string) => {
    const doc = documents.find((d) => d.id === docId)
    if (doc) {
      setEditingDocument(docId)
      setEditedContent(doc.content)
    }
  }

  const saveDocument = () => {
    if (!editingDocument || !user) return

    const doc = documents.find((d) => d.id === editingDocument)
    if (!doc) return

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

    // Send event to other users
    sendEvent("document_edited", {
      documentId: editingDocument,
      title: doc.title,
      content: editedContent,
    })

    setEditingDocument(null)
    setEditedContent("")

    toast({
      title: "Document Saved",
      description: "Your changes have been saved and shared with collaborators.",
    })

    // Add system message
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      userId: "system",
      content: `You updated "${doc.title}"`,
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
    if (!inviteEmail.trim() || !user) return

    // Send event to other users
    sendEvent("collaborator_joined", {
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
    })

    toast({
      title: "Invitation Sent",
      description: `An invitation has been sent to ${inviteEmail}`,
    })

    setInviteEmail("")

    // Add system message
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      userId: "system",
      content: `You invited ${inviteEmail} to collaborate`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "system",
    }

    setMessages([...messages, systemMessage])
  }

  const shareDocument = (docId: string) => {
    if (!user) return

    const doc = documents.find((d) => d.id === docId)
    if (!doc) return

    // Send event to other users
    sendEvent("document_shared", {
      documentId: docId,
      title: doc.title,
    })

    toast({
      title: "Document Shared",
      description: `"${doc.title}" has been shared with the team`,
    })

    // Add system message
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      userId: "system",
      content: `You shared "${doc.title}" with the team`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "system",
    }

    setMessages([...messages, systemMessage])
  }

  const generateAiResponse = (prompt: string): string => {
    if (prompt.toLowerCase().includes("research question")) {
      return "**Potential Research Questions:**\n\n1. How does the implementation of AI tools affect research productivity in academic settings?\n2. What are the ethical implications of using AI for data analysis in sensitive research areas?\n3. To what extent can collaborative AI tools enhance interdisciplinary research outcomes?\n\nThese questions address current gaps in the literature while building on existing theoretical frameworks."
    } else if (prompt.toLowerCase().includes("methodology")) {
      return "**Recommended Methodology:**\n\nBased on your research focus, a mixed methods approach would be most appropriate:\n\n- **Quantitative component**: Survey of 100+ researchers using standardized instruments to measure key variables\n- **Qualitative component**: In-depth interviews with 12-15 participants to explore contextual factors\n- **Analysis strategy**: Sequential explanatory design where qualitative data helps explain quantitative findings\n\nThis approach addresses the complexity of your research questions while providing both breadth and depth."
    } else if (prompt.toLowerCase().includes("literature") || prompt.toLowerCase().includes("papers")) {
      return "**Recent Literature Overview:**\n\nThe most cited papers in this field from the past 3 years include:\n\n1. Smith et al. (2022) - Comprehensive framework for understanding the phenomenon\n2. Johnson & Williams (2021) - Empirical study with large sample size (n=1,200)\n3. Zhang et al. (2023) - Meta-analysis of 45 studies showing consistent effect sizes\n\nKey themes across these works include methodological innovations, theoretical integration, and practical applications."
    } else {
      return "Based on your query, I've analyzed relevant research in this area. The current consensus suggests multiple approaches to this problem, with varying degrees of empirical support.\n\nRecent studies have highlighted the importance of considering contextual factors and methodological rigor when addressing these questions.\n\nI recommend focusing on the theoretical framework established by Smith et al. (2022) while incorporating the methodological innovations proposed by Johnson & Williams (2021)."
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
    if (id === "0") return { id: "0", name: "AI Assistant", avatar: "", status: "online" as const }
    if (id === "system") return { id: "system", name: "System", avatar: "", status: "online" as const }
    if (id === user?.id) return { id: user.id, name: "You", avatar: user.avatar, status: "online" as const }

    const activeUser = activeUsers.find((u) => u.id === id)
    if (activeUser) return { ...activeUser, status: "online" as const }

    return {
      id,
      name:
        id === "user-2"
          ? "Alex Johnson"
          : id === "user-3"
            ? "Sam Taylor"
            : id === "user-4"
              ? "Jordan Lee"
              : "Unknown User",
      avatar: "",
      status: "offline" as const,
    }
  }

  if (userLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Collaborative Workspace</h1>
        <p className="text-muted-foreground">
          Work together with your team in real-time. Chat, share documents, and use AI assistance.
        </p>
      </div>

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
              {activeUsers.map((activeUser) => {
                const isCurrentUser = activeUser.id === user?.id
                return (
                  <div key={activeUser.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={activeUser.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{activeUser.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{isCurrentUser ? "You" : activeUser.name}</p>
                        <p className="text-xs text-muted-foreground">{isCurrentUser ? "Owner" : "Editor"}</p>
                      </div>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                )
              })}

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
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 py-4">
                  {messages.map((message) => {
                    const messageUser = getUserById(message.userId)
                    return (
                      <div key={message.id} className="flex gap-3 w-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={messageUser.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{message.userId === "0" ? "AI" : messageUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 w-full">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {message.userId === "0" ? "AI Assistant" : messageUser.name}
                            </p>
                            <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                          </div>
                          <div
                            className={`p-3 rounded-lg ${
                              message.type === "ai-response"
                                ? "bg-blue-50 border border-blue-100 dark:bg-blue-950 dark:border-blue-900"
                                : message.type === "system"
                                  ? "bg-green-50 border border-green-100 text-green-600 italic dark:bg-green-950 dark:border-green-900 dark:text-green-400"
                                  : "bg-muted"
                            }`}
                          >
                            {message.type === "ai-response" ? (
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                {message.content.split("\n").map((line, index) => {
                                  // Handle bold text
                                  if (line.includes("**")) {
                                    return (
                                      <p
                                        key={index}
                                        dangerouslySetInnerHTML={{
                                          __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                                        }}
                                      />
                                    )
                                  }
                                  // Handle bullet points
                                  else if (line.startsWith("- ")) {
                                    return (
                                      <li key={index} className="ml-4">
                                        {line.replace("- ", "")}
                                      </li>
                                    )
                                  } else if (
                                    line.startsWith("1. ") ||
                                    line.startsWith("2. ") ||
                                    line.startsWith("3. ")
                                  ) {
                                    return (
                                      <li key={index} className="ml-4">
                                        {line.replace(/^\d+\.\s/, "")}
                                      </li>
                                    )
                                  }
                                  // Handle empty lines
                                  else if (line.trim() === "") {
                                    return <br key={index} />
                                  }
                                  // Regular text
                                  else {
                                    return <p key={index}>{line}</p>
                                  }
                                })}
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
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

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
                  <CardTitle className="text-lg">Research AI Assistant</CardTitle>
                  <CardDescription>
                    Ask questions about research methods, literature, or get help with analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg dark:bg-blue-950 dark:border-blue-900">
                    <h4 className="font-medium text-sm mb-2">Suggested Prompts:</h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() =>
                          setAiPrompt("Help me formulate research questions for my study on AI in education")
                        }
                      >
                        Help me formulate research questions for my study on AI in education
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => setAiPrompt("Suggest a methodology for a mixed-methods research design")}
                      >
                        Suggest a methodology for a mixed-methods research design
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() =>
                          setAiPrompt("What are the most cited papers in this field from the last 3 years?")
                        }
                      >
                        What are the most cited papers in this field from the last 3 years?
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    placeholder="Ask the AI assistant a research-related question..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="min-h-[120px]"
                  />

                  <Button onClick={askAi} disabled={isAiLoading} className="w-full">
                    {isAiLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Ask AI Assistant
                      </>
                    )}
                  </Button>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => startEditing(doc.id)}
                                  disabled={editingDocument !== null && editingDocument !== doc.id}
                                >
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => shareDocument(doc.id)}>
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
    </div>
  )
}
