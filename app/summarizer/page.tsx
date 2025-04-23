"use client"

import type React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Light as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useSocket } from "@/components/socket-provider"
import { useRouter } from "next/navigation"
import { FileText, Loader2, Copy, Save, Upload, LinkIcon, Brain, Search, Lightbulb, ArrowRight, Book } from "lucide-react"
import { processFile, validateFile } from "@/lib/file-upload"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CSSProperties } from "react"

interface MainConcept {
  concept: string;
  description: string;
  importance: string;
}

interface TheoreticalFramework {
  name: string;
  description: string;
  applications: string[];
}

interface MethodologicalApproach {
  method: string;
  strengths: string[];
  limitations: string[];
}

interface ResearchGap {
  gap: string;
  impact: string;
  potentialSolutions: string[];
}

interface FutureDirection {
  direction: string;
  rationale: string;
  timeline: string;
}

interface MindMapNode {
  id: string;
  label: string;
  type: 'main' | 'sub' | 'leaf';
  connections: string[];
}

interface Relationship {
  from: string;
  to: string;
  type: 'depends_on' | 'influences' | 'relates_to';
  strength: 'weak' | 'moderate' | 'strong';
}

interface NextStep {
  step: string;
  priority: 'high' | 'medium' | 'low';
  resources: string[];
}

interface Collaboration {
  field: string;
  rationale: string;
  benefits: string[];
}

interface Resource {
  type: 'paper' | 'book' | 'tool' | 'dataset';
  title: string;
  description: string;
  url: string;
}

interface ResearchAnalysis {
  analysis: {
    mainConcepts: MainConcept[];
    theoreticalFrameworks: TheoreticalFramework[];
    methodologicalApproaches: MethodologicalApproach[];
    researchGaps: ResearchGap[];
    futureDirections: FutureDirection[];
  };
  visualization: {
    mindMap: {
      nodes: MindMapNode[];
    };
    relationships: Relationship[];
  };
  recommendations: {
    nextSteps: NextStep[];
    potentialCollaborations: Collaboration[];
    resources: Resource[];
  };
}

const renderMainConcept = (concept: MainConcept) => (
  <div className="p-4 border rounded-lg bg-card">
    <h4 className="font-semibold text-primary">{concept.concept}</h4>
    <p className="mt-1 text-sm text-muted-foreground">{concept.description}</p>
    <div className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      {concept.importance}
    </div>
  </div>
)

const renderTheoreticalFramework = (framework: TheoreticalFramework) => (
  <div className="p-4 border rounded-lg bg-card">
    <h4 className="font-semibold text-primary">{framework.name}</h4>
    <p className="mt-1 text-sm text-muted-foreground">{framework.description}</p>
    <div className="mt-2 flex flex-wrap gap-1">
      {framework.applications.map((app, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-secondary"
        >
          {app}
        </span>
      ))}
    </div>
  </div>
)

const renderMethodologicalApproach = (approach: MethodologicalApproach) => (
  <div className="p-4 border rounded-lg bg-card">
    <h4 className="font-semibold text-primary">{approach.method}</h4>
    <div className="mt-2 space-y-2">
      <div>
        <h5 className="text-sm font-medium">Strengths</h5>
        <ul className="mt-1 list-disc list-inside text-sm text-muted-foreground">
          {approach.strengths.map((strength, i) => (
            <li key={i}>{strength}</li>
          ))}
        </ul>
      </div>
      <div>
        <h5 className="text-sm font-medium">Limitations</h5>
        <ul className="mt-1 list-disc list-inside text-sm text-muted-foreground">
          {approach.limitations.map((limitation, i) => (
            <li key={i}>{limitation}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
)

const renderResearchGap = (gap: ResearchGap) => (
  <div className="p-4 border rounded-lg bg-card">
    <h4 className="font-semibold text-primary">{gap.gap}</h4>
    <p className="mt-1 text-sm font-medium">Impact: {gap.impact}</p>
    <div className="mt-2">
      <h5 className="text-sm font-medium">Potential Solutions</h5>
      <ul className="mt-1 list-disc list-inside text-sm text-muted-foreground">
        {gap.potentialSolutions.map((solution, i) => (
          <li key={i}>{solution}</li>
        ))}
      </ul>
    </div>
  </div>
)

const renderFutureDirection = (direction: FutureDirection) => (
  <div className="p-4 border rounded-lg bg-card">
    <h4 className="font-semibold text-primary">{direction.direction}</h4>
    <p className="mt-1 text-sm text-muted-foreground">{direction.rationale}</p>
    <div className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      Timeline: {direction.timeline}
    </div>
  </div>
)

const renderResource = (resource: Resource) => (
  <div className="p-4 border rounded-lg bg-card">
    <div className="flex items-start justify-between">
      <div>
        <h4 className="font-semibold text-primary">{resource.title}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{resource.description}</p>
      </div>
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
        {resource.type}
      </span>
    </div>
    {resource.url && (
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center text-sm font-medium text-primary hover:underline"
      >
        View Resource
        <ArrowRight className="ml-1 h-4 w-4" />
      </a>
    )}
  </div>
)

export default function TopicExplorer() {
  const router = useRouter()
  const { toast } = useToast()
  const { sendEvent } = useSocket()
  const [currentUser] = useState({
    id: `anonymous-${Math.random().toString(36).substr(2, 9)}`,
    name: `Guest ${Math.floor(Math.random() * 1000)}`,
    avatar: null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [paperText, setPaperText] = useState("")
  const [paperUrl, setPaperUrl] = useState("")
  const [paperTitle, setPaperTitle] = useState("")
  const [summaryLength, setSummaryLength] = useState(3)
  const [includeKeywords, setIncludeKeywords] = useState(true)
  const [includeCitations, setIncludeCitations] = useState(true)
  const [includeMethodology, setIncludeMethodology] = useState(true)
  const [summary, setSummary] = useState("")
  const [savedSummaries, setSavedSummaries] = useState<
    Array<{
      id: string
      title: string
      summary: string
      date: string
    }>
  >([
    {
      id: "1",
      title: "Machine Learning Applications in Healthcare",
      summary: "This paper explores various applications of machine learning in healthcare...",
      date: "2023-05-15",
    },
    {
      id: "2",
      title: "Sustainable Energy: A Comprehensive Review",
      summary: "A review of sustainable energy sources and their implementation...",
      date: "2023-06-02",
    },
  ])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedSummary, setSelectedSummary] = useState<{
    id: string;
    title: string;
    summary: string;
    date: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState("analysis")
  const [topic, setTopic] = useState("")
  const [context, setContext] = useState("")
  const [result, setResult] = useState<ResearchAnalysis | null>(null)

  const codeBlockStyle: { [key: string]: CSSProperties } = {
    margin: '0',
    borderRadius: '0.5rem',
    padding: '1rem',
  }

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!paperText.trim() && !paperUrl.trim()) || !paperTitle.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide paper content or URL and a title.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setSummary("")

    try {
      // Compose a detailed prompt for the Gemini API
      const prompt = `Summarize the following research paper.\n\nTitle: ${paperTitle}\n\nContent: ${paperText || `Content from URL: ${paperUrl}`}\n\nInstructions: Provide a structured summary with the following sections: Title, Authors (if available), Abstract, Key Findings, Methods, and Conclusions. Use clear markdown headings. ${includeKeywords ? 'Include a Keywords section.' : ''} ${includeCitations ? 'Include a Key Citations section if references are present.' : ''} ${includeMethodology ? 'Include a Methodology section.' : ''} The summary should be ${summaryLength === 1 ? 'very concise' : summaryLength === 2 ? 'concise' : summaryLength === 3 ? 'moderate in length' : summaryLength === 4 ? 'detailed' : 'very detailed'}.`;

      // Call Gemini API
      const response = await fetch(`/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          options: {
            includeKeywords,
            includeCitations,
            includeMethodology,
            summaryLength
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.summary);

      sendEvent("paper_summarized", {
        userId: currentUser.id,
        title: paperTitle,
        length: summaryLength,
        options: {
          includeKeywords,
          includeCitations,
          includeMethodology,
        },
      });

      toast({
        title: "Summary generated",
        description: "Your paper has been successfully summarized.",
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      setSummary("Error: Failed to summarize paper. Please try again.");
      toast({
        title: "Summarization failed",
        description: "There was an error generating the summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSaveSummary = () => {
    if (!summary.trim() || !paperTitle.trim()) return

    const newSummary = {
      id: Date.now().toString(),
      title: paperTitle,
      summary: summary,
      date: new Date().toISOString().split("T")[0],
    }

    setSavedSummaries([newSummary, ...savedSummaries])

    toast({
      title: "Summary saved",
      description: "Your summary has been saved successfully.",
    })

    // Track the save event
    sendEvent("document_edited", {
      userId: currentUser.id,
      title: paperTitle,
      id: newSummary.id,
      action: 'save'
    });
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateFile(file)
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await processFile(file)
      if (result.error) {
        throw new Error(result.error)
      }
      setPaperTitle(result.title)
      setPaperText(result.text)
      toast({
        title: "File uploaded",
        description: "Your document has been successfully processed.",
      })
    } catch (error) {
      console.error("Error processing file:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process file",
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
          description: "The summary has been copied to your clipboard.",
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

  const handleView = (summary: typeof savedSummaries[0]) => {
    setSelectedSummary(summary);
  };

  const formatMarkdown = (text: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-primary border-b pb-2 mb-4">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-primary/90 mt-6 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-primary/80 mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-2 text-foreground/90 leading-relaxed">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-2 ml-6 list-disc space-y-1">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="text-foreground/80">
              {children}
            </li>
          ),
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                className="rounded-md my-2"
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/20 pl-4 my-4 italic text-foreground/80">
              {children}
            </blockquote>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  const renderCodeBlock = (code: string, language: string) => (
    <div className="relative">
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={codeBlockStyle}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={() => {
          navigator.clipboard.writeText(code)
          toast({
            title: "Copied",
            description: "Code copied to clipboard",
          })
        }}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  )

  const exploreResearchTopic = async () => {
    if (!topic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a research topic to explore.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Analyze the following research topic in JSON format:\n\nTopic: ${topic}\nContext: ${context}`,
          options: {
            temperature: 0.7,
            maxTokens: 2048,
          },
        }),
      })

      if (!response.ok) throw new Error("Failed to explore topic")
      
      const data = await response.json()
      setResult(JSON.parse(data.result))
      
      toast({
        title: "Analysis Complete",
        description: "Research topic analysis has been generated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze research topic. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderAnalysisSection = (title: string, items: string[]) => (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="space-y-2">
        {items?.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Paper Summarizer</h1>
        <p className="text-muted-foreground">
          Extract key insights from research papers using AI. Upload a paper or paste its content to get started.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Paper Summarizer
            </CardTitle>
            <CardDescription>Extract key insights from research papers using AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paperTitle">Paper Title</Label>
                <Input
                  id="paperTitle"
                  placeholder="Enter the title of the paper"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                />
              </div>

              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text">Paste Text</TabsTrigger>
                  <TabsTrigger value="upload">Upload Word (.docx)</TabsTrigger>
                  <TabsTrigger value="url">Enter URL</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paperText">Paper Content</Label>
                    <Textarea
                      id="paperText"
                      placeholder="Paste the paper content here...\nFor best results, include a clear title, author(s), abstract, and section headings. Optionally, add a prompt describing what you want summarized."
                      value={paperText}
                      onChange={(e) => setPaperText(e.target.value)}
                      className="min-h-[200px]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paperFile">Upload Paper (.docx only)</Label>
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="paperFile"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">DOCX only (MAX. 50MB)</p>
                        </div>
                        <input
                          id="paperFile"
                          type="file"
                          accept=".docx"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="url" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paperUrl">Paper URL</Label>
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="paperUrl"
                        placeholder="https://example.com/research-paper.pdf"
                        value={paperUrl}
                        onChange={(e) => setPaperUrl(e.target.value)}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-4 pt-4 border-t">
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
                    onValueChange={(value: number[]) => setSummaryLength(value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Concise</span>
                    <span>Detailed</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Include in Summary</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeKeywords" className="cursor-pointer">
                        Keywords
                      </Label>
                      <Switch id="includeKeywords" checked={includeKeywords} onCheckedChange={setIncludeKeywords} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeCitations" className="cursor-pointer">
                        Key Citations
                      </Label>
                      <Switch id="includeCitations" checked={includeCitations} onCheckedChange={setIncludeCitations} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeMethodology" className="cursor-pointer">
                        Methodology Section
                      </Label>
                      <Switch
                        id="includeMethodology"
                        checked={includeMethodology}
                        onCheckedChange={setIncludeMethodology}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSummarize} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Summarize Paper
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          {summary && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Summary</CardTitle>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(summary)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleSaveSummary}>
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {formatMarkdown(summary)}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Saved Summaries</CardTitle>
              <CardDescription>Your previously summarized papers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedSummaries.map((summary) => (
                  <Card key={summary.id} className="bg-muted/50">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base">{summary.title}</CardTitle>
                      <CardDescription>{summary.date}</CardDescription>
                    </CardHeader>
                    <CardFooter className="p-4 pt-2 flex justify-between items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(summary)}
                      >
                        View Summary
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(summary.summary)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary View Modal */}
      {selectedSummary && (
        <Card className="fixed inset-4 md:inset-10 bg-background z-50 overflow-auto">
          <CardHeader className="sticky top-0 bg-background z-10 border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{selectedSummary.title}</CardTitle>
                <CardDescription>{selectedSummary.date}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedSummary(null)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {formatMarkdown(selectedSummary.summary)}
            </div>
          </CardContent>
          <CardFooter className="sticky bottom-0 bg-background border-t">
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(selectedSummary.summary)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedSummary(null)}
              >
                Close
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Research Topic Analysis</CardTitle>
          <CardDescription>
            Enter your research topic and any relevant context for a comprehensive analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Research Topic</label>
            <Input
              placeholder="Enter your research topic (e.g., 'Deep Learning in Healthcare')"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Context (Optional)</label>
            <Textarea
              placeholder="Provide any additional context or specific aspects you'd like to explore"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
            />
          </div>
          <Button 
            onClick={exploreResearchTopic} 
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>Analyzing...</>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Explore Topic
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Research Analysis Results</CardTitle>
            <CardDescription>
              Comprehensive breakdown of your research topic
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analysis">
                  <Brain className="mr-2 h-4 w-4" />
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="visualization">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Visualization
                </TabsTrigger>
                <TabsTrigger value="recommendations">
                  <Book className="mr-2 h-4 w-4" />
                  Resources
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Main Concepts</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {result.analysis.mainConcepts.map((concept, i) => (
                          <div key={i}>{renderMainConcept(concept)}</div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Theoretical Frameworks</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {result.analysis.theoreticalFrameworks.map((framework, i) => (
                          <div key={i}>{renderTheoreticalFramework(framework)}</div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Methodological Approaches</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {result.analysis.methodologicalApproaches.map((approach, i) => (
                          <div key={i}>{renderMethodologicalApproach(approach)}</div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Research Gaps</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {result.analysis.researchGaps.map((gap, i) => (
                          <div key={i}>{renderResearchGap(gap)}</div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Future Directions</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {result.analysis.futureDirections.map((direction, i) => (
                          <div key={i}>{renderFutureDirection(direction)}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="visualization" className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div className="rounded-lg border p-4">
                      <h3 className="text-lg font-semibold mb-4">Topic Relationships</h3>
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">Interactive visualization coming soon</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="recommendations" className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
                      <div className="grid gap-4">
                        {result.recommendations.nextSteps.map((step, i) => (
                          <div key={i} className="p-4 border rounded-lg bg-card">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-primary">{step.step}</h4>
                                <div className="mt-2">
                                  <h5 className="text-sm font-medium">Required Resources</h5>
                                  <ul className="mt-1 list-disc list-inside text-sm text-muted-foreground">
                                    {step.resources.map((resource, j) => (
                                      <li key={j}>{resource}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                  step.priority === 'high'
                                    ? 'bg-red-100 text-red-800'
                                    : step.priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {step.priority} priority
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Potential Collaborations</h3>
                      <div className="grid gap-4">
                        {result.recommendations.potentialCollaborations.map((collab, i) => (
                          <div key={i} className="p-4 border rounded-lg bg-card">
                            <h4 className="font-semibold text-primary">{collab.field}</h4>
                            <p className="mt-1 text-sm text-muted-foreground">{collab.rationale}</p>
                            <div className="mt-2">
                              <h5 className="text-sm font-medium">Benefits</h5>
                              <ul className="mt-1 list-disc list-inside text-sm text-muted-foreground">
                                {collab.benefits.map((benefit, j) => (
                                  <li key={j}>{benefit}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Resources</h3>
                      <div className="grid gap-4">
                        {result.recommendations.resources.map((resource, i) => (
                          <div key={i}>{renderResource(resource)}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
