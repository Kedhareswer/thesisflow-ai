"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, MessageSquare, BookOpen, Lightbulb, Search, Send } from "lucide-react"
import { useSocket } from "@/components/socket-provider"
import { useToast } from "@/hooks/use-toast"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ResearchQuery {
  id: string
  question: string
  answer: string
  category: string
  timestamp: Date
}

export default function ResearchAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [queries, setQueries] = useState<ResearchQuery[]>([])
  const [currentMessage, setCurrentMessage] = useState("")
  const [researchQuestion, setResearchQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const { socket } = useSocket()
  const { toast } = useToast()

  // Initialize with welcome message
  useState(() => {
    const welcomeMessage: ChatMessage = {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your AI Research Assistant. I can help you with research questions, methodology advice, literature reviews, and more. How can I assist you today?",
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  })

  const sendMessage = async () => {
    if (!currentMessage.trim()) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: currentMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setCurrentMessage("")
    setLoading(true)

    try {
      // Simulate AI response
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: generateAIResponse(userMessage.content),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (socket) {
        socket.emit("chat_message", {
          content: userMessage.content,
          response: assistantMessage.content,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const askResearchQuestion = async () => {
    if (!researchQuestion.trim()) return

    setLoading(true)
    try {
      // Simulate research query processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const query: ResearchQuery = {
        id: `query-${Date.now()}`,
        question: researchQuestion,
        answer: generateResearchAnswer(researchQuestion),
        category: categorizeQuestion(researchQuestion),
        timestamp: new Date(),
      }

      setQueries((prev) => [query, ...prev])
      setResearchQuestion("")

      toast({
        title: "Research query completed",
        description: "Your question has been analyzed and answered",
      })
    } catch (error) {
      toast({
        title: "Query failed",
        description: "Could not process your research question",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateAIResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes("methodology") || lowerMessage.includes("method")) {
      return "For research methodology, I recommend starting with a clear research question, then choosing appropriate methods based on your objectives. Consider mixed methods if you need both quantitative and qualitative insights. Would you like me to elaborate on any specific methodology?"
    }

    if (lowerMessage.includes("literature") || lowerMessage.includes("review")) {
      return "For literature reviews, start by defining your search terms and databases. Use systematic approaches like PRISMA guidelines. I can help you identify key papers, analyze trends, and structure your review. What specific area are you reviewing?"
    }

    if (lowerMessage.includes("data") || lowerMessage.includes("analysis")) {
      return "Data analysis approach depends on your research questions and data type. For quantitative data, consider statistical tests, regression analysis, or machine learning. For qualitative data, thematic analysis or content analysis might be appropriate. What type of data are you working with?"
    }

    return "That's an interesting question! I can help you explore this topic further. Could you provide more context about your research area or specific challenges you're facing? This will help me give you more targeted advice."
  }

  const generateResearchAnswer = (question: string): string => {
    const lowerQuestion = question.toLowerCase()

    if (lowerQuestion.includes("machine learning") || lowerQuestion.includes("ml")) {
      return "Machine learning research typically involves problem formulation, data collection and preprocessing, model selection and training, evaluation, and interpretation. Key considerations include data quality, model interpretability, generalization, and ethical implications. Current trends focus on transformer architectures, federated learning, and explainable AI."
    }

    if (lowerQuestion.includes("deep learning") || lowerQuestion.includes("neural")) {
      return "Deep learning research requires careful architecture design, proper regularization, and extensive experimentation. Consider transfer learning for limited data, attention mechanisms for sequence tasks, and proper evaluation metrics. Recent advances include vision transformers, large language models, and self-supervised learning."
    }

    return "This is a complex research question that requires systematic investigation. I recommend breaking it down into smaller, manageable components, conducting a thorough literature review, and developing a clear methodology. Consider the theoretical framework, data requirements, and potential limitations of your approach."
  }

  const categorizeQuestion = (question: string): string => {
    const lowerQuestion = question.toLowerCase()

    if (lowerQuestion.includes("machine learning") || lowerQuestion.includes("ml")) return "Machine Learning"
    if (lowerQuestion.includes("data")) return "Data Science"
    if (lowerQuestion.includes("methodology")) return "Research Methods"
    if (lowerQuestion.includes("literature")) return "Literature Review"
    if (lowerQuestion.includes("statistics")) return "Statistics"

    return "General Research"
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">AI Research Assistant</h1>
        <p className="text-muted-foreground">
          Get AI-powered assistance for your research questions, methodology, and analysis
        </p>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat">Chat Assistant</TabsTrigger>
          <TabsTrigger value="research">Research Queries</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Chat with AI Assistant
                  </CardTitle>
                  <CardDescription>
                    Ask questions about research methodology, data analysis, or get general research advice
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Messages */}
                  <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm">AI is thinking...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask me anything about research..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={loading || !currentMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    "How do I choose the right methodology?",
                    "What's the best way to analyze qualitative data?",
                    "How to write a literature review?",
                    "Statistical significance vs practical significance?",
                    "How to handle missing data?",
                  ].map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full text-left justify-start h-auto p-2"
                      onClick={() => setCurrentMessage(question)}
                    >
                      <span className="text-xs">{question}</span>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Research Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Machine Learning",
                      "Data Science",
                      "Statistics",
                      "Methodology",
                      "Literature Review",
                      "Ethics",
                    ].map((area) => (
                      <Badge key={area} variant="secondary" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="research" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Research Query Assistant
              </CardTitle>
              <CardDescription>Get detailed answers to specific research questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Research Question</label>
                <Textarea
                  placeholder="Enter your detailed research question here..."
                  value={researchQuestion}
                  onChange={(e) => setResearchQuestion(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={askResearchQuestion} disabled={loading || !researchQuestion.trim()} className="w-full">
                {loading ? (
                  <>
                    <Brain className="mr-2 h-4 w-4 animate-pulse" />
                    Analyzing Question...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Get Research Insights
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Previous Queries */}
          {queries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Previous Research Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {queries.map((query) => (
                    <div key={query.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{query.question}</h4>
                        <Badge variant="outline">{query.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{query.answer}</p>
                      <p className="text-xs text-muted-foreground">{query.timestamp.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Research Guides
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "How to Write a Research Proposal",
                  "Statistical Analysis Best Practices",
                  "Literature Review Guidelines",
                  "Data Collection Methods",
                  "Research Ethics Framework",
                ].map((guide, index) => (
                  <div key={index} className="p-2 border rounded hover:bg-muted cursor-pointer">
                    <p className="text-sm font-medium">{guide}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Research Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Start with a clear research question",
                  "Use systematic literature search strategies",
                  "Document your methodology thoroughly",
                  "Consider ethical implications early",
                  "Plan for data management and storage",
                ].map((tip, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
