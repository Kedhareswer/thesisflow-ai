"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Brain, Loader2, Search, BookOpen, Lightbulb, ArrowRight, Copy, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SearchResult {
  id: string
  title: string
  authors: string[]
  abstract: string
  year: number
  url: string
  citations?: number
  journal?: string
}

export default function ResearchExplorer() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Topic exploration state
  const [researchTopic, setResearchTopic] = useState("")
  const [explorationDepth, setExplorationDepth] = useState(3)
  const [explorationResult, setExplorationResult] = useState("")

  // Literature search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState("keyword")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  // Idea generation state
  const [ideaTopic, setIdeaTopic] = useState("")
  const [ideaContext, setIdeaContext] = useState("")
  const [ideaCount, setIdeaCount] = useState(5)
  const [generatedIdeas, setGeneratedIdeas] = useState("")

  const handleExplore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!researchTopic.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please enter a research topic",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setExplorationResult("")

    try {
      // Use server API route instead of direct API call
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Provide a comprehensive research overview of "${researchTopic}". Include:
1. Key concepts and definitions
2. Major research areas and subfields
3. Current challenges and limitations
4. Recent developments and trends
5. Leading researchers and institutions
6. Future research directions

Format the response in markdown.`,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate research overview")
      }

      const data = await response.json()
      setExplorationResult(data.content)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to explore topic. Please try again later.",
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
        title: "Missing search query",
        description: "Please enter a search term",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setSearchResults([])

    try {
      // Use server API route for semantic scholar search
      const response = await fetch(`/api/search/papers?query=${encodeURIComponent(searchQuery)}&type=${searchType}`, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to search papers")
      }

      const results = await response.json()
      setSearchResults(results)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search papers. Please try again.",
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
        title: "Missing required fields",
        description: "Please enter a topic",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setGeneratedIdeas("")

    try {
      // Use server API route instead of direct API call
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Generate ${ideaCount} research ideas about "${ideaTopic}". ${ideaContext ? `Context: ${ideaContext}` : ""}
For each idea, include:
1. Research question
2. Methodology
3. Potential impact
4. Key challenges

Format the response in markdown.`,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate ideas")
      }

      const data = await response.json()
      setGeneratedIdeas(data.content)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate ideas. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Success",
        description: "Copied to clipboard!",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
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
                <div className="whitespace-pre-wrap prose prose-sm max-w-none">{explorationResult}</div>
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
                          {paper.authors.join(", ")} ({paper.year})
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <p className="text-sm mb-2">{paper.abstract}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {/* Assuming keywords are not available in the mock data */}
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">URL: {paper.url}</span>
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
                <div className="whitespace-pre-wrap prose prose-sm max-w-none">{generatedIdeas}</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
