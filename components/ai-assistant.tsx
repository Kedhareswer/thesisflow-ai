"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, Send, Loader2, FileText, Lightbulb, Copy } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/components/ui/use-toast"

// Add imports for usage tracking and premium features
import { useAuth } from "@/lib/auth"
import { EnhancedUsageTracker } from "@/components/enhanced-usage-tracker"
import { UpgradeBanner } from "@/components/premium/upgrade-banner"
import { trackAIPrompt } from "@/lib/analytics"

export default function AiAssistant() {
  // Add to the beginning of the AiAssistant component function
  const { user, subscription } = useAuth()
  const [limitReached, setLimitReached] = useState(false)
  const { toast } = useToast()

  const [apiKey, setApiKey] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<{ query: string; response: string }[]>([])

  // General query state
  const [query, setQuery] = useState("")
  const [response, setResponse] = useState("")

  // Summarization state
  const [textToSummarize, setTextToSummarize] = useState("")
  const [summaryLength, setSummaryLength] = useState(3)
  const [summary, setSummary] = useState("")

  // Idea generation state
  const [ideaTopic, setIdeaTopic] = useState("")
  const [ideaCount, setIdeaCount] = useState(5)
  const [ideaType, setIdeaType] = useState("research")
  const [generatedIdeas, setGeneratedIdeas] = useState("")

  const responseRef = useRef<HTMLDivElement>(null)

  // Add after the responseRef declaration
  const handleLimitReached = () => {
    setLimitReached(true)
  }

  // Modify the handleSubmit function to include usage tracking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || !apiKey.trim()) return

    // Check if user has reached their limit
    if (limitReached) {
      toast({
        title: "Usage Limit Reached",
        description: "You've reached your AI prompts limit for today. Please upgrade your plan for more prompts.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setResponse("")

    try {
      // This is a mock implementation - in a real app, you'd call the Gemini API
      const mockResponse = await mockGeminiApiCall(query, apiKey)
      setResponse(mockResponse)
      setHistory((prev) => [...prev, { query, response: mockResponse }])
      setQuery("")

      // Track AI prompt usage
      if (user) {
        trackAIPrompt(user.id, "general_query", query.length, mockResponse.length)
      }
    } catch (error) {
      setResponse("Error: Failed to get response from AI. Please check your API key and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textToSummarize.trim() || !apiKey.trim()) return

    setIsLoading(true)
    setSummary("")

    try {
      const mockSummary = await mockSummarizeText(textToSummarize, summaryLength, apiKey)
      setSummary(mockSummary)
      setHistory((prev) => [
        ...prev,
        {
          query: `Summarize text (${textToSummarize.substring(0, 50)}...)`,
          response: mockSummary,
        },
      ])
    } catch (error) {
      setSummary("Error: Failed to summarize text. Please check your API key and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateIdeas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ideaTopic.trim() || !apiKey.trim()) return

    setIsLoading(true)
    setGeneratedIdeas("")

    try {
      const mockIdeas = await mockGenerateIdeas(ideaTopic, ideaCount, ideaType, apiKey)
      setGeneratedIdeas(mockIdeas)
      setHistory((prev) => [
        ...prev,
        {
          query: `Generate ${ideaType} ideas about ${ideaTopic}`,
          response: mockIdeas,
        },
      ])
    } catch (error) {
      setGeneratedIdeas("Error: Failed to generate ideas. Please check your API key and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Copied to clipboard!")
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
      })
  }

  // Mock function to simulate API call for general queries
  const mockGeminiApiCall = async (text: string, key: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate network delay

    if (text.toLowerCase().includes("how ai works")) {
      return "AI works through machine learning algorithms that process data, identify patterns, and make predictions or decisions. Modern AI systems like large language models are trained on vast amounts of text data to generate human-like responses."
    } else if (text.toLowerCase().includes("research") || text.toLowerCase().includes("method")) {
      return "Research methods in AI include supervised learning, unsupervised learning, reinforcement learning, and deep learning. Each approach has different applications depending on the problem you're trying to solve."
    } else {
      return `Here's what I found about "${text}": This topic involves several key concepts and approaches. I'd recommend breaking this down into smaller components and researching each one individually for a comprehensive understanding.`
    }
  }

  // Mock function to simulate API call for summarization
  const mockSummarizeText = async (text: string, length: number, key: string) => {
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate network delay

    const lengthText = length <= 1 ? "very concise" : length <= 3 ? "concise" : "detailed"

    if (text.length < 100) {
      return `The text is too short to summarize effectively. Please provide a longer passage.`
    }

    return `Summary (${lengthText}):\n\nThe provided text discusses ${text.split(" ").slice(0, 5).join(" ")}... and covers key points about ${text.split(" ").slice(-5).join(" ")}. The main argument appears to be about the relationship between different concepts and their practical applications. ${length > 2 ? "Additionally, it explores methodological approaches and potential implications for future research and development in this area." : ""} ${length > 4 ? "The text also addresses common misconceptions and provides evidence-based counterarguments to prevailing theories in the field." : ""}`
  }

  // Mock function to simulate API call for idea generation
  const mockGenerateIdeas = async (topic: string, count: number, type: string, key: string) => {
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate network delay

    let ideas = `${count} ${type.toUpperCase()} IDEAS ABOUT "${topic.toUpperCase()}":\n\n`

    const researchIdeas = [
      "Investigate the impact of [topic] on educational outcomes",
      "Analyze the relationship between [topic] and economic development",
      "Explore how [topic] affects psychological well-being",
      "Study the historical evolution of [topic] across different cultures",
      "Examine the ethical implications of [topic] in modern society",
      "Research the technological applications of [topic]",
      "Conduct a comparative analysis of [topic] in different regions",
    ]

    const projectIdeas = [
      "Develop a mobile app that helps users understand [topic]",
      "Create an interactive visualization of [topic] data",
      "Build a community platform focused on [topic]",
      "Design an educational game that teaches [topic]",
      "Produce a documentary series exploring [topic]",
      "Launch a podcast interviewing experts about [topic]",
      "Organize a workshop or conference on [topic]",
    ]

    const creativeIdeas = [
      "Write a science fiction story set in a world where [topic] is central",
      "Compose a series of poems exploring different aspects of [topic]",
      "Create an art installation visualizing the essence of [topic]",
      "Design a board game based on concepts from [topic]",
      "Develop a dance performance expressing the dynamics of [topic]",
      "Produce a musical composition inspired by [topic]",
      "Create a comic book series with [topic] as its theme",
    ]

    let selectedIdeas
    if (type === "research") {
      selectedIdeas = researchIdeas
    } else if (type === "project") {
      selectedIdeas = projectIdeas
    } else {
      selectedIdeas = creativeIdeas
    }

    for (let i = 0; i < Math.min(count, selectedIdeas.length); i++) {
      ideas += `${i + 1}. ${selectedIdeas[i].replace("[topic]", topic)}\n`
    }

    return ideas
  }

  // Add this right before the return statement
  // Check if user has access based on subscription
  const canUseAI = !limitReached && user && subscription

  return (
    <div className="space-y-6">
      <Card>
        {user && (
          <div className="mb-4">
            <EnhancedUsageTracker feature="aiPrompts" onLimitReached={handleLimitReached} />
          </div>
        )}

        {limitReached && (
          <div className="mb-4">
            <UpgradeBanner feature="aiPrompts" />
          </div>
        )}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            AI Assistant
          </CardTitle>
          <CardDescription>Ask questions, summarize text, or generate ideas with AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Gemini API Key</Label>
              <Input
                id="apiKey"
                placeholder="Enter your Gemini API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Your API key is required to use the Gemini AI model</p>
            </div>

            <Tabs defaultValue="query" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="query">Ask Questions</TabsTrigger>
                <TabsTrigger value="summarize">Summarize Text</TabsTrigger>
                <TabsTrigger value="generate">Generate Ideas</TabsTrigger>
              </TabsList>

              <TabsContent value="query" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="query">Your Question</Label>
                    <Textarea
                      id="query"
                      placeholder="Ask about research methods, concepts, or get help with brainstorming..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="min-h-[100px]"
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Query
                      </>
                    )}
                  </Button>
                </form>

                {response && (
                  <div className="relative">
                    <div className="whitespace-pre-wrap bg-muted p-4 rounded-md" ref={responseRef}>
                      {response}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(response)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="summarize" className="space-y-4">
                <form onSubmit={handleSummarize} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="textToSummarize">Text to Summarize</Label>
                    <Textarea
                      id="textToSummarize"
                      placeholder="Paste the text you want to summarize here..."
                      value={textToSummarize}
                      onChange={(e) => setTextToSummarize(e.target.value)}
                      className="min-h-[200px]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="summaryLength">Summary Length</Label>
                      <span className="text-sm text-muted-foreground">
                        {summaryLength} {summaryLength === 1 ? "paragraph" : "paragraphs"}
                      </span>
                    </div>
                    <Slider
                      id="summaryLength"
                      min={1}
                      max={5}
                      step={1}
                      value={[summaryLength]}
                      onValueChange={(value) => setSummaryLength(value[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Concise</span>
                      <span>Detailed</span>
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Summarize Text
                      </>
                    )}
                  </Button>
                </form>

                {summary && (
                  <div className="relative">
                    <div className="whitespace-pre-wrap bg-muted p-4 rounded-md">{summary}</div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(summary)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="generate" className="space-y-4">
                <form onSubmit={handleGenerateIdeas} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ideaTopic">Topic</Label>
                    <Input
                      id="ideaTopic"
                      placeholder="Enter a topic for idea generation..."
                      value={ideaTopic}
                      onChange={(e) => setIdeaTopic(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="ideaCount">Number of Ideas</Label>
                      <span className="text-sm text-muted-foreground">{ideaCount} ideas</span>
                    </div>
                    <Slider
                      id="ideaCount"
                      min={3}
                      max={10}
                      step={1}
                      value={[ideaCount]}
                      onValueChange={(value) => setIdeaCount(value[0])}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Idea Type</Label>
                    <RadioGroup value={ideaType} onValueChange={setIdeaType} className="flex space-x-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="research" id="research" />
                        <Label htmlFor="research">Research</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="project" id="project" />
                        <Label htmlFor="project">Project</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="creative" id="creative" />
                        <Label htmlFor="creative">Creative</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Generate Ideas
                      </>
                    )}
                  </Button>
                </form>

                {generatedIdeas && (
                  <div className="relative">
                    <div className="whitespace-pre-wrap bg-muted p-4 rounded-md">{generatedIdeas}</div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(generatedIdeas)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Interaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {history.map((item, index) => (
                <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                  <p className="font-medium">Q: {item.query}</p>
                  <p className="text-muted-foreground mt-1">A: {item.response.substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setHistory([])}>
              Clear History
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
