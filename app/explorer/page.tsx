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
import { Brain, Loader2, Search, BookOpen, Lightbulb, ArrowRight, Copy, Save, Bookmark, BookmarkCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { detectAI, humanizeText } from "./ai-utils"
import { getLiteratureReviewPapers } from "./literature-ai"
import type { OpenAlexWork } from "./openalex"

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
  // --- Recently Saved State ---
  const [recentlySaved, setRecentlySaved] = React.useState<{
    id: string;
    type: "topic" | "literature" | "idea";
    label: string;
    content: string;
  }[]>([]);

  const handleSaveItem = (item: { id: string; type: "topic" | "literature" | "idea"; label: string; content: string }) => {
    setRecentlySaved((prev) => {
      if (prev.some((i) => i.id === item.id)) {
        toast({ title: "Already Bookmarked", description: "This item is already saved.", variant: "default" });
        return prev;
      }
      toast({ title: "Bookmarked!", description: "Item added to your saved list.", variant: "default" });
      return [item, ...prev];
    });
  };

  const isBookmarked = (id: string) => recentlySaved.some((i) => i.id === id);

  // ...existing hooks...
  // --- AI Detector & Humanizer UI ---
  const [aiInput, setAiInput] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiResult, setAiResult] = React.useState<{ aiScore: number; verdict: string } | null>(null);
  const [humanized, setHumanized] = React.useState("");
  const [humanizeLoading, setHumanizeLoading] = React.useState(false);

  // Humanizer options state
  const [humanizeEnglishVariant, setHumanizeEnglishVariant] = React.useState("");
  const [humanizeTone, setHumanizeTone] = React.useState("");
  const [humanizePOV, setHumanizePOV] = React.useState("");
  const [humanizeTense, setHumanizeTense] = React.useState("");
  const [humanizeSentenceType, setHumanizeSentenceType] = React.useState("");

  // Handler for AI detection
  const handleDetectAI = async () => {
    if (!aiInput.trim()) {
      toast({ title: "Missing Text", description: "Paste some text to analyze.", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await detectAI(aiInput);
      setAiResult(result);
    } catch (err) {
      toast({ title: "Detection Failed", description: err instanceof Error ? err.message : "Failed to detect AI.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // Handler for Humanizer
  const handleHumanize = async () => {
    if (!aiInput.trim()) {
      toast({ title: "Missing Text", description: "Paste some text to humanize.", variant: "destructive" });
      return;
    }
    setHumanizeLoading(true);
    setHumanized("");
    try {
      // Only send options that are set
      const options: any = {};
      if (humanizeEnglishVariant) options.englishVariant = humanizeEnglishVariant;
      if (humanizeTone) options.tone = humanizeTone;
      if (humanizePOV) options.pointOfView = humanizePOV;
      if (humanizeTense) options.tense = humanizeTense;
      if (humanizeSentenceType) options.sentenceType = humanizeSentenceType;
      const result = await humanizeText(aiInput, options);
      setHumanized(result.humanized);
    } catch (err) {
      toast({ title: "Humanizer Failed", description: err instanceof Error ? err.message : "Failed to humanize text.", variant: "destructive" });
    } finally {
      setHumanizeLoading(false);
    }
  };

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

  // Literature review state
  const [searchQuery, setSearchQuery] = React.useState("")
  const [literaturePapers, setLiteraturePapers] = React.useState<OpenAlexWork[]>([]);
  const [literatureError, setLiteratureError] = React.useState<string>("");

  // Idea generation state
  const [ideaTopic, setIdeaTopic] = React.useState("")
  const [ideaContext, setIdeaContext] = React.useState("")
  const [ideaCount, setIdeaCount] = React.useState(5)
  const [generatedIdeas, setGeneratedIdeas] = React.useState("")

  const handleExplore = async () => {
    if (!researchTopic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a research topic",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError(null)
    setExplorationResult("")

    try {
      const response = await fetch("/api/explore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Analyze the research topic: "${researchTopic}". Provide a comprehensive analysis including:
          1. Key concepts and definitions
          2. Current state of research
          3. Major debates and controversies
          4. Future research directions
          5. Practical applications
          
          Format the response in markdown with clear headings and bullet points.`,
          options: {
            temperature: 0.7,
            maxTokens: 2048,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to explore research topic")
      }

      const data = await response.json()
      
      if (!data.result) {
        throw new Error("No results found for the topic")
      }

      setExplorationResult(data.result)
      
      toast({
        title: "Analysis Complete",
        description: "Research topic has been analyzed successfully.",
      })

    } catch (err) {
      console.error("Error exploring topic:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to explore research topic",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Literature Review Handler using OpenAlex + AI
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast({
        title: "Missing Query",
        description: "Please provide a search query to find relevant papers.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setLiteraturePapers([]);
    setLiteratureError("");
    try {
      const papers = await getLiteratureReviewPapers(searchQuery, 6);
      setLiteraturePapers(papers);
      if (!papers.length) {
        setLiteratureError("No papers found.");
      } else {
        toast({
          title: "Search Complete",
          description: `${papers.length} papers found for \"${searchQuery}\".`,
        });
      }
      sendEvent("literature_review", {
        query: searchQuery,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Literature search failed:", error);
      setLiteratureError(error instanceof Error ? error.message : "Failed to fetch papers.");
      toast({
        title: "Literature Search Failed",
        description: error instanceof Error ? error.message : "Failed to fetch papers.",
        variant: "destructive",
      });
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied",
        description: "Content copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy content",
        variant: "destructive",
      })
    }
  }

  const formatMarkdown = (text: string) => {
    // Remove markdown code block indicators and trim
    text = text.trim();

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

      // Bold text (**text**)
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

      // Bullet points (* or - )
      if (line.match(/^\s*[*-] /)) {
        const indentLevel = (line.match(/^\s*/) || [''])[0].length;
        return (
          <div 
            key={index} 
            className="flex gap-3 my-2" 
            style={{ marginLeft: `${indentLevel + 16}px` }}
          >
            <span className="text-primary/60 mt-1.5">•</span>
            <span className="flex-1">{line.replace(/^\s*[*-] /, '')}</span>
          </div>
        );
      }

      // Empty lines for spacing
      if (line.trim() === '') {
        return <div key={index} className="h-4" />;
      }

      // Regular paragraphs
      return (
        <p key={index} className="my-3 leading-relaxed text-primary/90">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Research Explorer</h1>
          <p className="text-muted-foreground">
            Explore research topics, search literature, and generate research ideas with AI assistance.
          </p>
        </div>

      </div>

      <Tabs defaultValue="explore" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="explore">Topic Explorer</TabsTrigger>
          <TabsTrigger value="search">Literature Search</TabsTrigger>
          <TabsTrigger value="ideas">Idea Generator</TabsTrigger>
          <TabsTrigger value="ai-tools">AI Detector & Humanizer</TabsTrigger>
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
              <form className="space-y-4">
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

                <Button 
                  type="button" 
                  onClick={handleExplore} 
                  disabled={isLoading} 
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exploring...
                    </>
                  ) : (
                    "Explore"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {explorationResult && (
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/40">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl">Research Analysis</CardTitle>
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
                      onClick={() => handleSaveItem({ id: researchTopic, type: "topic", label: researchTopic, content: explorationResult })}
                      className="hover:bg-muted"
                      title={isBookmarked(researchTopic) ? "Bookmarked" : "Bookmark Topic"}
                      disabled={isBookmarked(researchTopic)}
                    >
                      {isBookmarked(researchTopic)
                        ? <BookmarkCheck className="h-4 w-4 text-green-600" />
                        : <Bookmark className="h-4 w-4" />}
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
                {/* Literature Papers Output */}
                <div className="mt-6">
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Loading...</div>
                  ) : literatureError ? (
                    <div className="text-muted-foreground">{literatureError}</div>
                   ) : literaturePapers.length > 0 ? (
                    <div>
                      <div className="mb-4 font-medium">{literaturePapers.length} papers found for "{searchQuery}"</div>
                      <div className="space-y-6">
                        {literaturePapers.map((paper, idx) => (
                          <div key={paper.id} className="border rounded-lg p-4 bg-card">
                            <div className="font-semibold text-lg mb-1">{paper.title}</div>
                            <div className="text-sm text-muted-foreground mb-2">
                              {paper.authors && paper.authors.length > 0 ? paper.authors.join(", ") : "Unknown authors"} {paper.publication_year ? `(${paper.publication_year})` : ""}
                            </div>
                            <div className="text-sm mb-2">{paper.abstract || "No abstract available."}</div>
                            <div className="text-xs text-muted-foreground mb-2">
                              {paper.host_venue && <span>Venue: {paper.host_venue} | </span>}
                              {paper.doi && <span>DOI: <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer" className="underline">{paper.doi}</a></span>}
                            </div>
                            <div className="flex justify-between">
                              <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm font-medium">View Paper →</a>
                              <div className="flex gap-2">
                                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(paper.title)} title="Copy Title">
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => handleSaveItem({ id: paper.id, type: "literature", label: paper.title, content: paper.title })} title={isBookmarked(paper.id) ? "Bookmarked" : "Bookmark Paper"} disabled={isBookmarked(paper.id)}>
                                  {isBookmarked(paper.id)
                                    ? <BookmarkCheck className="h-4 w-4 text-green-600" />
                                    : <Bookmark className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                   ) : (
                    <div className="text-muted-foreground">No papers found.</div>
                  )}
                </div>
              </div>
              </form>
            </CardContent>
          </Card>
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
                  <div className="flex gap-2 mb-2">
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedIdeas)} title="Copy Ideas">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleSaveItem({ id: ideaTopic, type: "idea", label: ideaTopic, content: generatedIdeas })} title="Save Ideas">
                      <Bookmark className="h-4 w-4" />
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
        <TabsContent value="ai-tools" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* AI Detector Card */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>AI Detector</CardTitle>
                <CardDescription>
                  Paste text to check if it is AI-generated.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste text here..."
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  rows={8}
                />
                <Button onClick={handleDetectAI} disabled={aiLoading || !aiInput.trim()}>
                  {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Detect AI
                </Button>
                {aiResult ? (
                  <div className="space-y-2">
                    <Badge variant={aiResult.aiScore >= 70 ? "destructive" : aiResult.aiScore >= 40 ? "secondary" : "default"}>
                      AI Score: {aiResult.aiScore}
                    </Badge>
                    <div className="font-medium">{aiResult.verdict}</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            {/* Humanizer Card */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Text Humanizer</CardTitle>
                <CardDescription>
                  Paste AI-generated text to make it more human-like.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste text here..."
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  rows={8}
                />
                {/* Humanizer Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>English Variant</Label>
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={humanizeEnglishVariant}
                      onChange={e => setHumanizeEnglishVariant(e.target.value)}
                    >
                      <option value="">Default</option>
                      <option value="American">American English</option>
                      <option value="British">British English</option>
                    </select>
                  </div>
                  <div>
                    <Label>Tone</Label>
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={humanizeTone}
                      onChange={e => setHumanizeTone(e.target.value)}
                    >
                      <option value="">Default</option>
                      <option value="formal">Formal</option>
                      <option value="informal">Informal</option>
                      <option value="friendly">Friendly</option>
                      <option value="academic">Academic</option>
                      <option value="conversational">Conversational</option>
                    </select>
                  </div>
                  <div>
                    <Label>Point of View</Label>
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={humanizePOV}
                      onChange={e => setHumanizePOV(e.target.value)}
                    >
                      <option value="">Default</option>
                      <option value="first">First Person</option>
                      <option value="second">Second Person</option>
                      <option value="third">Third Person</option>
                    </select>
                  </div>
                  <div>
                    <Label>Tense</Label>
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={humanizeTense}
                      onChange={e => setHumanizeTense(e.target.value)}
                    >
                      <option value="">Default</option>
                      <option value="past">Past</option>
                      <option value="present">Present</option>
                      <option value="future">Future</option>
                    </select>
                  </div>
                  <div>
                    <Label>Sentence Type</Label>
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={humanizeSentenceType}
                      onChange={e => setHumanizeSentenceType(e.target.value)}
                    >
                      <option value="">Default</option>
                      <option value="direct">Direct</option>
                      <option value="indirect">Indirect</option>
                      <option value="statement">Statement</option>
                      <option value="exclamation">Exclamation</option>
                      <option value="question">Questioning</option>
                    </select>
                  </div>
                </div>
                <Button onClick={handleHumanize} disabled={humanizeLoading || !aiInput.trim()} variant="secondary">
                  {humanizeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Humanize Text
                </Button>
                {humanized && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label>Humanized Output</Label>
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(humanized)} title="Copy Humanized Text">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea value={humanized} readOnly className="mt-1 bg-muted" rows={8} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ResearchExplorer
