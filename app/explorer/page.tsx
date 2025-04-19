"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { useSocket } from "@/components/socket-provider"
import { useUser } from "@/components/user-provider"
import { useRouter } from "next/navigation"
import { Brain, Loader2, Search, BookOpen, Lightbulb, ArrowRight, Copy, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export default function ResearchExplorer() {
  const { user, isLoading: userLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { sendEvent } = useSocket()
  const [isLoading, setIsLoading] = useState(false)

  // Topic exploration state
  const [researchTopic, setResearchTopic] = useState("")
  const [explorationDepth, setExplorationDepth] = useState(3)
  const [explorationResult, setExplorationResult] = useState("")

  // Literature search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState("keyword")
  const [searchResults, setSearchResults] = useState<any[]>([])

  // Idea generation state
  const [ideaTopic, setIdeaTopic] = useState("")
  const [ideaContext, setIdeaContext] = useState("")
  const [ideaCount, setIdeaCount] = useState(5)
  const [generatedIdeas, setGeneratedIdeas] = useState("")

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login")
    }
  }, [user, userLoading, router])

  const handleExplore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!researchTopic.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a research topic to explore.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setExplorationResult("")

    try {
      // Create the prompt for the AI
      const prompt = `Provide a comprehensive exploration of the research topic: "${researchTopic}".
      
      Please include:
      1. An overview of the field
      2. Key concepts and terminology
      3. Major research areas
      4. Leading researchers and institutions
      5. Recommended starting points for research
      ${explorationDepth > 3 ? "6. Research gaps and opportunities" : ""}
      7. Next steps for research
      
      The depth of exploration should be ${explorationDepth <= 2 ? "brief" : explorationDepth <= 4 ? "comprehensive" : "in-depth"}.
      Format the response with clear markdown headings, bullet points, and sections for readability.`

      // Use the AI SDK to generate the exploration
      const result = await generateText({
        model: openai("gpt-4o"),
        prompt: prompt,
        temperature: 0.7,
        maxTokens: 1500,
      })

      setExplorationResult(result.text)

      // Track the exploration event
      sendEvent("topic_explored", {
        topic: researchTopic,
        depth: explorationDepth,
      })

      toast({
        title: "Topic explored",
        description: "Your research topic has been successfully explored.",
      })
    } catch (error) {
      console.error("Error exploring topic:", error)
      setExplorationResult("Error: Failed to explore topic. Please try again.")
      toast({
        title: "Exploration failed",
        description: "There was an error exploring the topic. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a search query.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setSearchResults([])

    try {
      // In a real app, this would call an academic search API
      // For now, we'll generate mock results using AI
      const prompt = `Generate 4 realistic academic paper search results for the query: "${searchQuery}" (search type: ${searchType}).
      
      For each result, include:
      1. Title
      2. Authors
      3. Journal
      4. Year
      5. A brief abstract
      6. Number of citations
      7. Keywords
      
      Format the response as a JSON array with these fields. Make the results diverse but relevant to the query.`

      const result = await generateText({
        model: openai("gpt-4o"),
        prompt: prompt,
        temperature: 0.7,
      })

      // Parse the JSON response
      try {
        const jsonStr = result.text.replace(/```json|```/g, "").trim()
        const parsedResults = JSON.parse(jsonStr)
        setSearchResults(parsedResults)
      } catch (parseError) {
        console.error("Error parsing search results:", parseError)
        // Fallback to mock data if parsing fails
        setSearchResults([
          {
            title: `Recent Advances in ${searchQuery}: A Systematic Review`,
            authors: "Johnson, A., Smith, B., & Williams, C.",
            journal: "Journal of Advanced Research",
            year: "2023",
            abstract: `This paper provides a comprehensive review of recent developments in ${searchQuery}, highlighting key methodological advances and empirical findings from the past five years.`,
            citations: 42,
            keywords: ["systematic review", searchQuery.toLowerCase(), "research methods", "empirical findings"],
          },
          {
            title: `Exploring the Impact of ${searchQuery} on Educational Outcomes`,
            authors: "Chen, D. & Garcia, E.",
            journal: "Educational Research Quarterly",
            year: "2022",
            abstract: `This study investigates how ${searchQuery} influences various educational outcomes across different age groups and learning contexts.`,
            citations: 28,
            keywords: ["education", searchQuery.toLowerCase(), "student engagement", "mixed-methods"],
          },
        ])
      }

      // Track the search event
      sendEvent("literature_searched", {
        query: searchQuery,
        type: searchType,
        resultCount: searchResults.length,
      })

      toast({
        title: "Search completed",
        description: `Found ${searchResults.length} papers related to "${searchQuery}"`,
      })
    } catch (error) {
      console.error("Search failed:", error)
      toast({
        title: "Search failed",
        description: "There was an error performing the search. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateIdeas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ideaTopic.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a research topic for idea generation.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setGeneratedIdeas("")

    try {
      // Create the prompt for the AI
      const prompt = `Generate ${ideaCount} innovative research ideas on the topic: "${ideaTopic}".
      ${ideaContext ? `Additional context: ${ideaContext}` : ""}
      
      For each idea, include:
      1. A clear research question
      2. Suggested methodology
      3. Potential impact of the research
      
      Format the response with markdown headings and bullet points for readability.
      Make the ideas diverse, innovative, and academically rigorous.`

      // Use the AI SDK to generate ideas
      const result = await generateText({
        model: openai("gpt-4o"),
        prompt: prompt,
        temperature: 0.8,
        maxTokens: 1500,
      })

      setGeneratedIdeas(result.text)

      // Track the idea generation event
      sendEvent("idea_generated", {
        topic: ideaTopic,
        count: ideaCount,
        context: ideaContext,
      })

      toast({
        title: "Ideas generated",
        description: `Generated ${ideaCount} research ideas on "${ideaTopic}"`,
      })
    } catch (error) {
      console.error("Error generating ideas:", error)
      setGeneratedIdeas("Error: Failed to generate ideas. Please try again.")
      toast({
        title: "Idea generation failed",
        description: "There was an error generating research ideas. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Copied to clipboard",
          description: "The content has been copied to your clipboard.",
        })
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
        toast({
          title: "Copy failed",
          description: "Failed to copy to clipboard. Please try again.",
          variant: "destructive",
        })
      })
  }

  if (userLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Research Explorer</h1>
        <p className="text-muted-foreground">
          Explore research topics, search literature, and generate research ideas with AI assistance.
        </p>
      </div>

      <Tabs defaultValue="explore" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="explore">Topic Explorer</TabsTrigger>
          <TabsTrigger value="search">Literature Search</TabsTrigger>
          <TabsTrigger value="ideas">Idea Generator</TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                Research Topic Explorer
              </CardTitle>
              <CardDescription>
                Get an overview of any research topic to understand key concepts, major research areas, and leading
                researchers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleExplore} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="researchTopic">Research Topic</Label>
                  <Input
                    id="researchTopic"
                    placeholder="Enter a research topic (e.g., 'Machine Learning in Healthcare')"
                    value={researchTopic}
                    onChange={(e) => setResearchTopic(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="explorationDepth">Exploration Depth</Label>
                    <span className="text-sm text-muted-foreground">
                      {explorationDepth <= 2 ? "Brief" : explorationDepth <= 4 ? "Comprehensive" : "In-depth"}
                    </span>
                  </div>
                  <Slider
                    id="explorationDepth"
                    min={1}
                    max={5}
                    step={1}
                    value={[explorationDepth]}
                    onValueChange={(value) => setExplorationDepth(value[0])}
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exploring...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Explore Topic
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {explorationResult && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Topic Exploration Results</CardTitle>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(explorationResult)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost">
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {explorationResult.split("\n").map((line, index) => {
                    // Handle headings
                    if (line.startsWith("# ")) {
                      return (
                        <h1 key={index} className="text-xl font-bold mt-4">
                          {line.replace("# ", "")}
                        </h1>
                      )
                    } else if (line.startsWith("## ")) {
                      return (
                        <h2 key={index} className="text-lg font-bold mt-3">
                          {line.replace("## ", "")}
                        </h2>
                      )
                    } else if (line.startsWith("### ")) {
                      return (
                        <h3 key={index} className="text-md font-bold mt-2">
                          {line.replace("### ", "")}
                        </h3>
                      )
                    }
                    // Handle bullet points
                    else if (line.startsWith("- ")) {
                      return (
                        <li key={index} className="ml-4">
                          {line.replace("- ", "")}
                        </li>
                      )
                    } else if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ")) {
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-500" />
                Literature Search
              </CardTitle>
              <CardDescription>Find relevant research papers and articles on your topic of interest</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="searchQuery">Search Query</Label>
                  <Input
                    id="searchQuery"
                    placeholder="Enter keywords or phrases (e.g., 'artificial intelligence ethics')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Search Type</Label>
                  <RadioGroup value={searchType} onValueChange={setSearchType} className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="keyword" id="keyword" />
                      <Label htmlFor="keyword">Keyword</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="title" id="title" />
                      <Label htmlFor="title">Title</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="author" id="author" />
                      <Label htmlFor="author">Author</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search Literature
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  {searchResults.length} papers found for "{searchQuery}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchResults.map((paper, index) => (
                    <Card key={index} className="bg-muted/50">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">{paper.title}</CardTitle>
                        <CardDescription>
                          {paper.authors} ({paper.year}) • {paper.journal}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <p className="text-sm mb-2">{paper.abstract}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {paper.keywords &&
                            paper.keywords.map((keyword: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Citations: {paper.citations}</span>
                        <Button variant="ghost" size="sm" className="gap-1">
                          View Paper <ArrowRight className="h-3 w-3" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ideas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Research Idea Generator
              </CardTitle>
              <CardDescription>Generate novel research ideas and questions based on your interests</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateIdeas} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ideaTopic">Research Topic</Label>
                  <Input
                    id="ideaTopic"
                    placeholder="Enter your research area (e.g., 'Climate Change Adaptation')"
                    value={ideaTopic}
                    onChange={(e) => setIdeaTopic(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ideaContext">Research Context (Optional)</Label>
                  <Textarea
                    id="ideaContext"
                    placeholder="Provide additional context or specific aspects you're interested in..."
                    value={ideaContext}
                    onChange={(e) => setIdeaContext(e.target.value)}
                    className="min-h-[100px]"
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
            </CardContent>
          </Card>

          {generatedIdeas && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Generated Research Ideas</CardTitle>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedIdeas)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost">
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {generatedIdeas.split("\n").map((line, index) => {
                    // Handle headings
                    if (line.startsWith("# ")) {
                      return (
                        <h1 key={index} className="text-xl font-bold mt-4">
                          {line.replace("# ", "")}
                        </h1>
                      )
                    } else if (line.startsWith("## ")) {
                      return (
                        <h2 key={index} className="text-lg font-bold mt-3">
                          {line.replace("## ", "")}
                        </h2>
                      )
                    } else if (line.startsWith("### ")) {
                      return (
                        <h3 key={index} className="text-md font-bold mt-2">
                          {line.replace("### ", "")}
                        </h3>
                      )
                    }
                    // Handle bullet points
                    else if (line.startsWith("- ")) {
                      return (
                        <li key={index} className="ml-4">
                          {line.replace("- ", "")}
                        </li>
                      )
                    } else if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ")) {
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
                    // Handle bold text
                    else if (line.includes("**")) {
                      return (
                        <p
                          key={index}
                          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }}
                        />
                      )
                    }
                    // Regular text
                    else {
                      return <p key={index}>{line}</p>
                    }
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
