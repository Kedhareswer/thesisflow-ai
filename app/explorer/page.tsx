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
import { useRouter } from "next/navigation"
import { Brain, Loader2, Search, BookOpen, Lightbulb, ArrowRight, Copy, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Update the socket event types
type SocketPayload = {
  topic?: string;
  depth?: number;
  query?: string;
  type?: string;
  resultCount?: number;
  count?: number;
  context?: string;
  title?: string;
  id?: string;
  action?: string;
};

type SocketEvent = {
  type: string;
  userId: string;
  timestamp: string;
  payload: SocketPayload;
};

const ResearchExplorer = () => {
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

  const handleExplore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!researchTopic) {
      toast({
        title: "Missing Topic",
        description: "Please provide a research topic to explore.",
        variant: "destructive",
      })
      return
    }

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
      
      toast({
        title: "Research Topic Explored",
        description: "Your research topic has been analyzed successfully.",
      })

      const eventPayload = {
        topic: researchTopic,
        depth: explorationDepth,
        timestamp: new Date().toISOString()
      };
      sendEvent("paper_summarized", eventPayload);
    } catch (err) {
      console.error("Error exploring topic:", err)
      toast({
        title: "Exploration Failed",
        description: err instanceof Error ? err.message : "Failed to explore research topic. Please try again.",
        variant: "destructive",
      })
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
        title: "Missing Query",
        description: "Please provide a search query to find relevant papers.",
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
        body: JSON.stringify({ 
          prompt,
          options: {
            temperature: 0.7,
            maxTokens: 4096,
            topK: 40,
            topP: 0.8,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Parse the JSON result
      const parsedResults = JSON.parse(data.result);
      setSearchResults(parsedResults);

      toast({
        title: "Literature Search Complete",
        description: `Found ${parsedResults.length} papers related to "${searchQuery}"`,
      })

      const eventPayload = {
        query: searchQuery,
        type: searchType,
        resultCount: parsedResults.length,
        timestamp: new Date().toISOString()
      };
      sendEvent("paper_summarized", eventPayload);
    } catch (error) {
      console.error("Search failed:", error)
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search papers. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  };

  const handleGenerateIdeas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ideaTopic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please provide a research topic for idea generation.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setGeneratedIdeas("")

    try {
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
            maxTokens: 4096,
            topK: 40,
            topP: 0.8,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedIdeas(data.result)

      toast({
        title: "Research Ideas Generated",
        description: `Generated ${ideaCount} innovative research ideas for "${ideaTopic}"`,
        duration: 5000, // Show for 5 seconds
      })

      const eventPayload = {
        topic: ideaTopic,
        count: ideaCount,
        context: ideaContext,
        timestamp: new Date().toISOString()
      };
      sendEvent("idea_generated", eventPayload);
    } catch (error) {
      console.error("Error generating ideas:", error)
      toast({
        title: "Idea Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate research ideas. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Copied to Clipboard",
          description: "Content has been copied successfully.",
        })
      })
      .catch((err) => {
        console.error("Failed to copy:", err)
        toast({
          title: "Copy Failed",
          description: "Failed to copy content. Please try again.",
          variant: "destructive",
        })
      })
  }

  const formatMarkdown = (text: string) => {
    // Remove markdown code block indicators
    text = text.replace(/```markdown|```/g, '').trim();

    return text.split('\n').map((line, index) => {
      // Main title (# )
      if (line.match(/^# /)) {
        return (
          <h1 key={index} className="text-3xl font-bold text-primary border-b pb-3 mb-6">
            {line.replace(/^# /, '')}
          </h1>
        );
      }
      
      // Section headers (## )
      if (line.match(/^## /)) {
        return (
          <div key={index} className="mt-8 mb-4">
            <h2 className="text-2xl font-semibold text-primary/90 flex items-center gap-2">
              {line.replace(/^## /, '')}
            </h2>
            <div className="h-px bg-border mt-2" />
          </div>
        );
      }

      // Subsection headers (### )
      if (line.match(/^### /)) {
        return (
          <h3 key={index} className="text-xl font-medium text-primary/80 mt-6 mb-3">
            {line.replace(/^### /, '')}
          </h3>
        );
      }

      // Keywords section
      if (line.match(/^Keywords:/)) {
        return (
          <div key={index} className="flex flex-wrap gap-2 my-4">
            {line.replace(/^Keywords:\s*/, '').split(',').map((keyword, i) => (
              <Badge key={i} variant="secondary" className="text-sm">
                {keyword.trim()}
              </Badge>
            ))}
          </div>
        );
      }

      // Bullet points (* or - )
      if (line.match(/^[*-] /)) {
        return (
          <div key={index} className="flex gap-3 my-2 ml-4">
            <span className="text-primary/60 mt-1.5">•</span>
            <span className="flex-1">{line.replace(/^[*-] /, '')}</span>
          </div>
        );
      }

      // Numbered lists (1. 2. etc)
      if (line.match(/^\d+\. /)) {
        const number = line.match(/^\d+/)?.[0];
        return (
          <div key={index} className="flex gap-3 my-2 ml-4">
            <span className="text-primary/60 font-medium min-w-[1.5rem]">{number}.</span>
            <span className="flex-1">{line.replace(/^\d+\. /, '')}</span>
          </div>
        );
      }

      // Bold text
      if (line.includes('**')) {
        return (
          <p key={index} className="my-2">
            {line.split(/(\*\*.*?\*\*)/).map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={i} className="font-semibold text-primary">
                    {part.replace(/\*\*/g, '')}
                  </strong>
                );
              }
              return part;
            })}
          </p>
        );
      }

      // Empty lines for spacing
      if (line.trim() === '') {
        return <div key={index} className="h-4" />;
      }

      // Regular paragraphs with improved readability
      return (
        <p key={index} className="my-3 leading-relaxed text-primary/90">
          {line}
        </p>
      );
    });
  };

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
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/40">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl">Summary</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(explorationResult)}
                      className="hover:bg-muted"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => {
                        // Implement save functionality
                      }}
                      className="hover:bg-muted"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {formatMarkdown(explorationResult)}
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
                            let url;
                            // Try DOI first
                            if (paper.doi) {
                              url = `https://doi.org/${paper.doi}`;
                            }
                            // Then try direct URL if available
                            else if (paper.url && paper.url.startsWith('http')) {
                              url = paper.url;
                            }
                            // Finally fallback to Google Scholar search using multiple parameters
                            else {
                              const searchParams = new URLSearchParams();
                              if (paper.title) {
                                searchParams.append('q', paper.title);
                              }
                              if (paper.authors) {
                                // Add first author to search query
                                const firstAuthor = Array.isArray(paper.authors) 
                                  ? paper.authors[0]
                                  : paper.authors.split(',')[0];
                                if (firstAuthor) {
                                  searchParams.append('author', firstAuthor.trim());
                                }
                              }
                              if (paper.year) {
                                searchParams.append('as_ylo', paper.year.toString());
                                searchParams.append('as_yhi', paper.year.toString());
                              }
                              url = `https://scholar.google.com/scholar?${searchParams.toString()}`;
                            }
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
