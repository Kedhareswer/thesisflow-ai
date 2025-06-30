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
import { AIProviderService } from "@/lib/ai-providers"
import { EnhancedAIService } from "@/lib/enhanced-ai-service"

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
        "Hello! I'm your AI Research Assistant powered by advanced language models. I can help you with research questions, methodology advice, literature reviews, data analysis guidance, and more. How can I assist you today?",
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
      // Generate contextual AI response using the enhanced AI service
      const context = `You are an expert research assistant helping with academic and scientific research. 
      Provide helpful, accurate, and detailed responses about research methodology, analysis, and best practices.
      
      User question: ${currentMessage}`

      const response = await AIProviderService.generateResponse(context)

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (socket) {
        socket.emit("chat_message", {
          content: userMessage.content,
          response: assistantMessage.content,
        })
      }

      toast({
        title: "Response generated",
        description: "AI assistant has provided guidance on your research question",
      })
    } catch (error) {
      console.error("Error generating AI response:", error)
      
      // Fallback response
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I'm having trouble connecting to the AI service right now. Please check your AI provider configuration in settings and try again. In the meantime, I'd be happy to help if you can rephrase your question.",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])

      toast({
        title: "Service Unavailable",
        description: "Please check your AI provider settings and try again.",
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
      // Use enhanced AI service for research methodology advice
      const constraints = ["Academic rigor", "Feasible timeline", "Available resources"]
      const advice = await EnhancedAIService.generateMethodologyAdvice(
        researchQuestion,
        constraints
      )

      const detailedAnswer = `
**Research Question Analysis:**
${researchQuestion}

**Recommended Approach:**
${advice.recommendedApproach}

**Alternative Approaches:**
${advice.alternatives.map((alt, i) => `${i + 1}. ${alt}`).join('\n')}

**Key Considerations:**
${advice.considerations.map((consideration, i) => `• ${consideration}`).join('\n')}

**Estimated Timeline:**
${advice.timeline}
      `.trim()

      const query: ResearchQuery = {
        id: `query-${Date.now()}`,
        question: researchQuestion,
        answer: detailedAnswer,
        category: categorizeQuestion(researchQuestion),
        timestamp: new Date(),
      }

      setQueries((prev) => [query, ...prev])
      setResearchQuestion("")

      toast({
        title: "Research analysis complete",
        description: "Your question has been analyzed with AI-powered methodology advice",
      })
    } catch (error) {
      console.error("Error generating research advice:", error)
      
      // Fallback analysis
      const fallbackAnswer = `
**Research Question Analysis:**
${researchQuestion}

I'm having trouble connecting to the AI service right now. Here are some general research methodology guidelines:

**General Approach:**
1. Clearly define your research objectives and hypotheses
2. Conduct a thorough literature review
3. Choose appropriate research methods (quantitative, qualitative, or mixed)
4. Design your data collection strategy
5. Plan your analysis approach
6. Consider ethical implications and limitations

**Next Steps:**
- Refine your research question to be more specific
- Identify key variables and concepts
- Review recent literature in your field
- Consult with subject matter experts

Please check your AI provider configuration and try again for more detailed guidance.
      `.trim()

      const query: ResearchQuery = {
        id: `query-${Date.now()}`,
        question: researchQuestion,
        answer: fallbackAnswer,
        category: categorizeQuestion(researchQuestion),
        timestamp: new Date(),
      }

      setQueries((prev) => [query, ...prev])
      setResearchQuestion("")

      toast({
        title: "Basic analysis provided",
        description: "Check AI provider settings for enhanced analysis features",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const categorizeQuestion = (question: string): string => {
    const lowerQuestion = question.toLowerCase()

    if (lowerQuestion.includes("machine learning") || lowerQuestion.includes("ml") || lowerQuestion.includes("ai")) return "AI/ML"
    if (lowerQuestion.includes("data")) return "Data Science"
    if (lowerQuestion.includes("methodology") || lowerQuestion.includes("method")) return "Research Methods"
    if (lowerQuestion.includes("literature") || lowerQuestion.includes("review")) return "Literature Review"
    if (lowerQuestion.includes("statistics") || lowerQuestion.includes("analysis")) return "Statistics"
    if (lowerQuestion.includes("psychology") || lowerQuestion.includes("behavior")) return "Psychology"
    if (lowerQuestion.includes("medicine") || lowerQuestion.includes("health")) return "Medicine/Health"
    if (lowerQuestion.includes("computer") || lowerQuestion.includes("software")) return "Computer Science"

    return "General Research"
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">AI Research Assistant</h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            Get AI-powered assistance for your research questions, methodology, and analysis
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="chat">Chat Assistant</TabsTrigger>
            <TabsTrigger value="research">Research Queries</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Chat Interface */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Chat with AI Assistant
                    </CardTitle>
                    <CardDescription>
                      Ask questions about research methodology, data analysis, or get general research advice
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Messages Container */}
                    <div className="space-y-4 h-96 overflow-y-auto border rounded-lg p-4 bg-muted/20">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] p-3 rounded-lg ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground ml-4"
                                : "bg-background border shadow-sm mr-4"
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{message.content}</p>
                            <p className="text-xs opacity-70 mt-2">{message.timestamp.toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))}
                      {loading && (
                        <div className="flex justify-start">
                          <div className="bg-background border shadow-sm p-3 rounded-lg mr-4">
                            <p className="text-sm">AI is thinking...</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="flex gap-3">
                      <Input
                        placeholder="Ask me anything about research..."
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        className="flex-1"
                      />
                      <Button onClick={sendMessage} disabled={loading || !currentMessage.trim()} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Questions */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Quick Questions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      "How do I choose the right methodology?",
                      "What's the best way to analyze qualitative data?",
                      "How to write a literature review?",
                      "Statistical significance vs practical significance?",
                      "How to handle missing data?",
                    ].map((question, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="w-full text-left justify-start h-auto p-3 text-wrap"
                        onClick={() => setCurrentMessage(question)}
                      >
                        <span className="text-sm leading-relaxed">{question}</span>
                      </Button>
                    ))}
                  </CardContent>
                </Card>

                {/* Research Areas */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Research Areas</CardTitle>
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

          <TabsContent value="research" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Research Query Assistant
                </CardTitle>
                <CardDescription>Get detailed answers to specific research questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Research Question</label>
                  <Textarea
                    placeholder="Enter your detailed research question here..."
                    value={researchQuestion}
                    onChange={(e) => setResearchQuestion(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
                <Button
                  onClick={askResearchQuestion}
                  disabled={loading || !researchQuestion.trim()}
                  className="w-full"
                  size="lg"
                >
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
                      <div key={query.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-medium leading-relaxed">{query.question}</h4>
                          <Badge variant="outline" className="shrink-0">
                            {query.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{query.answer}</p>
                        <p className="text-xs text-muted-foreground">{query.timestamp.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
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
                    <div
                      key={index}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
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
                <CardContent className="space-y-4">
                  {[
                    "Start with a clear research question",
                    "Use systematic literature search strategies",
                    "Document your methodology thoroughly",
                    "Consider ethical implications early",
                    "Plan for data management and storage",
                  ].map((tip, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                      <p className="text-sm leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
