"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import * as SliderPrimitive from "@radix-ui/react-slider"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useSocket } from "@/components/socket-provider"
import { useUser } from "@/components/user-provider"
import { useRouter } from "next/navigation"
import { Brain, Loader2, Search, BookOpen, Lightbulb, ArrowRight, Copy, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Define socket event types
type SocketEvents = {
  literature_searched: { query: string; type: string; resultCount: number };
  idea_generated: { topic: string; count: number; context: string };
};

type Event = {
  type: "paper_summarized" | "idea_generated" | "collaborator_joined" | "document_edited" | "document_shared"
  userId: string
  payload: any
}

const ResearchExplorer = () => {
  const { user, isLoading: userLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { sendEvent } = useSocket()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Topic exploration state
  const [researchTopic, setResearchTopic] = React.useState("")
  const [explorationDepth, setExplorationDepth] = React.useState<number>(3)
  const [explorationResult, setExplorationResult] = React.useState("")
  const [explorationType, setExplorationType] = React.useState("broad")

  // Literature search state
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchType, setSearchType] = React.useState("keyword")
  const [searchResults, setSearchResults] = React.useState<any[]>([])

  // Idea generation state
  const [ideaTopic, setIdeaTopic] = React.useState("")
  const [ideaContext, setIdeaContext] = React.useState("")
  const [ideaCount, setIdeaCount] = React.useState(5)
  const [generatedIdeas, setGeneratedIdeas] = React.useState("")

  // Redirect if not logged in
  React.useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login")
    }
  }, [user, userLoading, router])

  const handleExplore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!researchTopic) return

    setIsLoading(true)
    setError(null)
    setExplorationResult("")

    const prompt = `Please explore the research topic: "${researchTopic}". Consider the following aspects:
    1. Key concepts and theories
    2. Current state of research
    3. Major debates and controversies
    4. Future research directions
    5. Practical applications
    Please provide a comprehensive analysis with a depth level of ${explorationDepth} (1-5 scale).
    
    Format the response in markdown with clear headings and bullet points.`

    try {
      const response = await fetch("/api/explore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          options: {
            temperature: 0.7,
            maxTokens: 1000,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to explore research topic")
      }

      const data = await response.json()
      
      // Ensure we have a valid response
      if (!data.result) {
        throw new Error("No response received from the API")
      }
      
      setExplorationResult(data.result)
      
      // Track the search event
      sendEvent({
        type: "paper_summarized",
        userId: user?.id || "anonymous",
        payload: {
          topic: researchTopic,
          depth: explorationDepth
        }
      })
    } catch (err) {
      console.error("Error exploring topic:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
      setExplorationResult("")
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
      const prompt = `As an academic search engine, generate 4 realistic and detailed academic paper search results for the query: "${searchQuery}" (search type: ${searchType}).

For each paper, provide a structured entry in JSON format with the following fields:
{
  "title": "Paper title",
  "authors": "Author names with affiliations",
  "journal": "Journal or conference name",
  "year": "Publication year",
  "abstract": "A comprehensive abstract",
  "citations": "Number of citations",
  "keywords": ["keyword1", "keyword2", ...],
  "doi": "Digital Object Identifier",
  "impact_factor": "Journal impact factor",
  "methodology": "Brief description of research methodology",
  "key_findings": ["finding1", "finding2", ...]
}

Requirements:
1. Ensure papers are diverse but highly relevant to the query
2. Include recent publications (within last 5 years) and seminal works
3. Provide realistic citation counts based on publication year
4. Include both journal articles and conference papers
5. Ensure abstracts are detailed and technically accurate
6. Include relevant methodology descriptions
7. List impactful findings

Format the response as a JSON array containing these detailed paper objects. Make the results academically rigorous and realistic.`

      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Improved JSON parsing with better error handling
      try {
        // First try to parse the raw result
        const parsedResults = JSON.parse(data.result);
        setSearchResults(parsedResults);
      } catch (parseError) {
        // If that fails, try to clean the string and parse again
        try {
          const cleanedStr = data.result
            .replace(/```json|```/g, "")
            .replace(/[\n\r]/g, "")
            .trim();
          const parsedResults = JSON.parse(cleanedStr);
          setSearchResults(parsedResults);
        } catch (secondParseError) {
          console.error("Error parsing search results:", secondParseError);
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
          ]);
        }
      }

      // Track the search event
      sendEvent({
        type: "paper_summarized",
        userId: user?.id || "anonymous",
        payload: {
          query: searchQuery,
          type: searchType,
          resultCount: searchResults.length,
        }
      });

      toast({
        title: "Search completed",
        description: `Found ${searchResults.length} papers related to "${searchQuery}"`,
      });
    } catch (error) {
      console.error("Search failed:", error);
      toast({
        title: "Search failed",
        description: "There was an error performing the search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      // Enhanced prompt for more innovative and structured research ideas
      const prompt = `As an expert research advisor, generate ${ideaCount} innovative research ideas for: "${ideaTopic}"
${ideaContext ? `\nContext: ${ideaContext}\n` : ''}

Format each idea as follows:

# Research Ideas for ${ideaTopic}

${Array.from({ length: ideaCount }, (_, i) => `
## Research Idea ${i + 1}

### Research Question
- Main question
- Key sub-questions

### Background
- Current knowledge gaps
- Research significance

### Methods
- Research design
- Data collection
- Analysis approach

### Impact & Innovation
- Academic impact
- Practical applications
- Novel aspects

### Timeline & Resources
- Key phases
- Required expertise
- Essential resources
`).join('\n')}

Requirements:
1. Be innovative but feasible
2. Include interdisciplinary aspects
3. Address real-world problems
4. Suggest practical methods
5. Consider resource constraints

Use markdown formatting with clear headings and bullet points.`

      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          options: {
            temperature: 0.7,
            maxOutputTokens: 8192, // Increased token limit for longer responses
            topK: 40,
            topP: 0.8,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Set the generated ideas without validation
      setGeneratedIdeas(data.result);

      // Track the idea generation event
      sendEvent({
        type: "idea_generated",
        userId: user?.id || "anonymous",
        payload: {
          topic: ideaTopic,
          count: ideaCount,
          context: ideaContext,
        }
      })

      toast({
        title: "Ideas generated",
        description: `Generated ${ideaCount} research ideas for "${ideaTopic}"`,
      })
    } catch (error) {
      console.error("Error generating ideas:", error)
      
      // More specific error message
      const errorMessage = error instanceof Error && error.message.includes("Incomplete response")
        ? "Received incomplete results. Please try reducing the number of requested ideas or simplifying the topic."
        : "Failed to generate ideas. Please try again.";

      setGeneratedIdeas("")
      toast({
        title: "Idea generation failed",
        description: errorMessage,
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
                    value={researchTopic}
                    onChange={(e) => setResearchTopic(e.target.value)}
                    placeholder="Enter your research topic"
                  />
                </div>

                <div className="grid gap-4">
                  <Label>Exploration Depth</Label>
                  <Slider
                    value={[explorationDepth]}
                    min={1}
                    max={5}
                    step={1}
                    onValueChange={(value) => setExplorationDepth(value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Shallow</span>
                    <span>Deep</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Exploration Type</Label>
                  <RadioGroup value={explorationType} onValueChange={setExplorationType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="broad" id="broad" />
                      <Label htmlFor="broad">Broad Overview</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="deep" id="deep" />
                      <Label htmlFor="deep">Deep Dive</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Exploring..." : "Explore"}
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
                <div className="prose prose-sm max-w-none dark:prose-invert space-y-4">
                  {explorationResult.split("\n").map((line, index) => {
                    // Main title
                    if (line.startsWith("# ")) {
                      return (
                        <h1 key={index} className="text-2xl font-bold text-primary border-b pb-2 mb-6">
                          {line.replace("# ", "")}
                        </h1>
                      )
                    }
                    // Section headers
                    if (line.startsWith("## ")) {
                      return (
                        <h2 key={index} className="text-xl font-semibold text-primary/90 mt-8 mb-4">
                          {line.replace("## ", "")}
                        </h2>
                      )
                    }
                    // Subsection headers
                    if (line.startsWith("### ")) {
                      return (
                        <h3 key={index} className="text-lg font-medium text-primary/80 mt-6 mb-3">
                          {line.replace("### ", "")}
                        </h3>
                      )
                    }
                    // Clean bullet points
                    if (line.trim().startsWith("-") || line.trim().startsWith("•")) {
                      return (
                        <div key={index} className="flex gap-3 ml-4 my-1.5">
                          <span className="text-primary/60 mt-1">•</span>
                          <span className="text-sm flex-1">{line.replace(/^[-•]\s*/, "")}</span>
                        </div>
                      )
                    }
                    // Numbered lists
                    if (/^\d+\.\s/.test(line)) {
                      const number = line.match(/^\d+/)?.[0]
                      return (
                        <div key={index} className="flex gap-3 ml-4 my-1.5">
                          <span className="text-primary/60 font-medium min-w-[1.5rem]">{number}.</span>
                          <span className="text-sm flex-1">{line.replace(/^\d+\.\s/, "")}</span>
                        </div>
                      )
                    }
                    // Empty lines for spacing
                    if (line.trim() === "") {
                      return <div key={index} className="h-3" />
                    }
                    // Regular paragraphs with improved formatting
                    return (
                      <p key={index} className="text-sm leading-relaxed my-2">
                        {line.split(/(\*\*.*?\*\*|__.*?__)/g).map((part, i) => {
                          if (part.startsWith("**") || part.startsWith("__")) {
                            return (
                              <strong key={i} className="font-semibold text-primary/90">
                                {part.replace(/\*\*|__/g, "")}
                              </strong>
                            )
                          }
                          return part
                        })}
                      </p>
                    )
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
                  <LabelPrimitive.Root htmlFor="searchQuery">Search Query</LabelPrimitive.Root>
                  <Input
                    id="searchQuery"
                    placeholder="Enter keywords or phrases (e.g., 'artificial intelligence ethics')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <LabelPrimitive.Root>Search Type</LabelPrimitive.Root>
                  <RadioGroupPrimitive.Root value={searchType} onValueChange={setSearchType} className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupPrimitive.Item id="keyword" />
                      <LabelPrimitive.Root htmlFor="keyword">Keyword</LabelPrimitive.Root>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupPrimitive.Item id="title" />
                      <LabelPrimitive.Root htmlFor="title">Title</LabelPrimitive.Root>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupPrimitive.Item id="author" />
                      <LabelPrimitive.Root htmlFor="author">Author</LabelPrimitive.Root>
                    </div>
                  </RadioGroupPrimitive.Root>
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
                          {paper.impact_factor && ` • Impact Factor: ${paper.impact_factor}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <p className="text-sm mb-2">{paper.abstract}</p>
                        {paper.methodology && (
                          <div className="mt-2 mb-3">
                            <span className="text-sm font-medium">Methodology: </span>
                            <span className="text-sm">{paper.methodology}</span>
                          </div>
                        )}
                        {paper.key_findings && paper.key_findings.length > 0 && (
                          <div className="mt-2 mb-3">
                            <span className="text-sm font-medium">Key Findings:</span>
                            <ul className="list-disc list-inside">
                              {paper.key_findings.map((finding: string, i: number) => (
                                <li key={i} className="text-sm ml-2">{finding}</li>
                              ))}
                            </ul>
                          </div>
                        )}
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
                        <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">Citations: {paper.citations}</span>
                          {paper.doi && (
                            <span className="text-xs text-muted-foreground">
                              DOI: {paper.doi}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            // Try to open using DOI first, then fall back to a Google Scholar search
                            const url = paper.doi
                              ? `https://doi.org/${paper.doi}`
                              : `https://scholar.google.com/scholar?q=${encodeURIComponent(paper.title)}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                        >
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
                  <LabelPrimitive.Root htmlFor="ideaTopic">Research Topic</LabelPrimitive.Root>
                  <Input
                    id="ideaTopic"
                    placeholder="Enter your research area (e.g., 'Climate Change Adaptation')"
                    value={ideaTopic}
                    onChange={(e) => setIdeaTopic(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <LabelPrimitive.Root htmlFor="ideaContext">Research Context (Optional)</LabelPrimitive.Root>
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
                    <LabelPrimitive.Root htmlFor="ideaCount">Number of Ideas</LabelPrimitive.Root>
                    <span className="text-sm text-muted-foreground">{ideaCount} ideas</span>
                  </div>
                  <SliderPrimitive.Root
                    value={[ideaCount]}
                    min={3}
                    max={10}
                    step={1}
                    onValueChange={(value: number[]) => setIdeaCount(value[0])}
                  >
                    <SliderPrimitive.Track>
                      <SliderPrimitive.Range />
                    </SliderPrimitive.Track>
                    <SliderPrimitive.Thumb />
                  </SliderPrimitive.Root>
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
                <div className="prose prose-sm max-w-none dark:prose-invert space-y-4">
                  {generatedIdeas.split("\n").map((line, index) => {
                    if (line.startsWith("# ")) {
                      return (
                        <h1 key={index} className="text-2xl font-bold text-primary border-b pb-2">
                          {line.replace("# ", "")}
                        </h1>
                      )
                    }
                    if (line.startsWith("## ")) {
                      return (
                        <h2 key={index} className="text-xl font-semibold text-primary/90 mt-6">
                          {line.replace("## ", "")}
                        </h2>
                      )
                    }
                    if (line.startsWith("### ")) {
                      return (
                        <h3 key={index} className="text-lg font-medium text-primary/80 mt-4">
                          {line.replace("### ", "")}
                        </h3>
                      )
                    }
                    if (line.startsWith("- ") || line.startsWith("* ")) {
                      return (
                        <div key={index} className="flex gap-2 ml-4">
                          <span className="text-primary/60">•</span>
                          <span className="text-sm">{line.replace(/^[-*]\s/, "")}</span>
                        </div>
                      )
                    }
                    if (/^\d+\.\s/.test(line)) {
                      const number = line.match(/^\d+/)?.[0]
                      return (
                        <div key={index} className="flex gap-2 ml-4">
                          <span className="text-primary/60 font-medium min-w-[1.5rem]">{number}.</span>
                          <span className="text-sm">{line.replace(/^\d+\.\s/, "")}</span>
                        </div>
                      )
                    }
                    if (line.trim() === "") {
                      return <div key={index} className="h-2" />
                    }
                    return (
                      <p key={index} className="text-sm leading-relaxed">
                        {line.split(/(\*\*.*?\*\*|__.*?__)/g).map((part, i) => {
                          if (part.startsWith("**") || part.startsWith("__")) {
                            return (
                              <strong key={i} className="font-semibold text-primary">
                                {part.replace(/\*\*|__/g, "")}
                              </strong>
                            )
                          }
                          return part
                        })}
                      </p>
                    )
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

export default ResearchExplorer
