"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Brain, Loader2, Copy, Download, ContrastIcon as Compare, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { enhancedAIService, type AIResponse as EnhancedAIResponse } from "@/lib/enhanced-ai-service"
import type { AIProvider } from "@/lib/ai-providers"
import AIProviderSelector from "./ai-provider-selector"

// Types for the enhanced AI assistant
interface ResearchContext {
  topic: string
  description: string
  existingWork: string
  researchGap: string
  targetAudience: string
  methodology: string
}

interface SummaryOptions {
  length: "short" | "medium" | "long"
  style: "academic" | "casual" | "technical"
  includeKeywords: boolean
  includeCitations: boolean
  includeMethodology: boolean
}

export default function EnhancedAIAssistant() {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("groq")
  const [selectedModel, setSelectedModel] = useState("")
  const [loading, setLoading] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [availableProviders] = useState<AIProvider[]>(["openai", "groq", "gemini"])
  const { toast } = useToast()

  // Research Suggestions State
  const [researchContext, setResearchContext] = useState<ResearchContext>({
    topic: "",
    description: "",
    existingWork: "",
    researchGap: "",
    targetAudience: "",
    methodology: "",
  })
  const [researchSuggestions, setResearchSuggestions] = useState<any[]>([])

  // Summarization State
  const [textToSummarize, setTextToSummarize] = useState("")
  const [summaryOptions, setSummaryOptions] = useState<SummaryOptions>({
    length: "medium",
    style: "academic",
    includeKeywords: true,
    includeCitations: false,
    includeMethodology: false,
  })
  const [summary, setSummary] = useState("")

  // Idea Generation State
  const [ideaTopic, setIdeaTopic] = useState("")
  const [ideaContext, setIdeaContext] = useState("")
  const [ideaCount, setIdeaCount] = useState(5)
  const [generatedIdeas, setGeneratedIdeas] = useState<string[]>([])

  // Comparison Results
  const [comparisonResults, setComparisonResults] = useState<Partial<Record<AIProvider, EnhancedAIResponse>>>({})

  const generateResearchSuggestions = async () => {
    if (!researchContext.topic || !researchContext.description) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a topic and description.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      if (compareMode) {
        const prompt = `Generate research suggestions for: ${researchContext.topic}\nDescription: ${researchContext.description}`
        // Simple comparison using multiple calls
        const results: Partial<Record<AIProvider, EnhancedAIResponse>> = {}
        for (const provider of availableProviders) {
          try {
            const response = await enhancedAIService.chatCompletion([{ role: "user", content: prompt }], {
              preferredProvider: provider,
            })
            results[provider] = response
          } catch (error) {
            console.error(`Error with provider ${provider}:`, error)
          }
        }
        setComparisonResults(results)
      } else {
        const response = await enhancedAIService.generateResearchIdeas(
          researchContext.topic,
          researchContext.description,
        )
        setResearchSuggestions(response.ideas)
      }

      toast({
        title: "Research Suggestions Generated",
        description: "AI has analyzed your research context and provided suggestions.",
      })
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate research suggestions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateSummary = async () => {
    if (!textToSummarize.trim()) {
      toast({
        title: "No Text Provided",
        description: "Please provide text to summarize.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const result = await enhancedAIService.summarizeContent(textToSummarize, {
        style:
          summaryOptions.style === "casual"
            ? "bullet-points"
            : summaryOptions.style === "technical"
              ? "detailed"
              : "academic",
        length:
          summaryOptions.length === "short" ? "brief" : summaryOptions.length === "long" ? "comprehensive" : "medium",
      })
      setSummary(result.summary)

      toast({
        title: "Summary Generated",
        description: "Text has been successfully summarized.",
      })
    } catch (error) {
      toast({
        title: "Summarization Failed",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateIdeas = async () => {
    if (!ideaTopic.trim()) {
      toast({
        title: "No Topic Provided",
        description: "Please provide a topic for idea generation.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const result = await enhancedAIService.generateResearchIdeas(ideaTopic, ideaContext)
      const ideas = result.ideas.map((idea) => `${idea.title}: ${idea.description}`)
      setGeneratedIdeas(ideas)

      toast({
        title: "Ideas Generated",
        description: `Generated ${ideas.length} research ideas for your topic.`,
      })
    } catch (error) {
      toast({
        title: "Idea Generation Failed",
        description: "Failed to generate ideas. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to Clipboard",
        description: "Content has been copied to your clipboard.",
      })
    })
  }

  const exportResults = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Enhanced AI Research Assistant</h1>
        <p className="text-muted-foreground">Advanced AI-powered research tools with multiple provider support</p>
      </div>

      {/* AI Provider Configuration */}
      <AIProviderSelector
        selectedProvider={selectedProvider}
        onProviderChange={setSelectedProvider}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        showComparison={true}
      />

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch id="compare-mode" checked={compareMode} onCheckedChange={setCompareMode} />
            <Label htmlFor="compare-mode">Compare responses across multiple providers</Label>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="research" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="research">Research Suggestions</TabsTrigger>
          <TabsTrigger value="summarize">Smart Summarization</TabsTrigger>
          <TabsTrigger value="ideas">Idea Generation</TabsTrigger>
        </TabsList>

        {/* Research Suggestions Tab */}
        <TabsContent value="research" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Research Suggestions
              </CardTitle>
              <CardDescription>Get personalized research suggestions based on your context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="topic">Research Topic *</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Machine Learning in Healthcare"
                    value={researchContext.topic}
                    onChange={(e) => setResearchContext({ ...researchContext, topic: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Input
                    id="audience"
                    placeholder="e.g., Medical professionals, Researchers"
                    value={researchContext.targetAudience}
                    onChange={(e) => setResearchContext({ ...researchContext, targetAudience: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Research Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your research area, objectives, and current understanding..."
                  value={researchContext.description}
                  onChange={(e) => setResearchContext({ ...researchContext, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="existing-work">Existing Work</Label>
                <Textarea
                  id="existing-work"
                  placeholder="Summarize relevant existing research and literature..."
                  value={researchContext.existingWork}
                  onChange={(e) => setResearchContext({ ...researchContext, existingWork: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="research-gap">Research Gap</Label>
                  <Textarea
                    id="research-gap"
                    placeholder="What gaps do you see in current research?"
                    value={researchContext.researchGap}
                    onChange={(e) => setResearchContext({ ...researchContext, researchGap: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="methodology">Preferred Methodology</Label>
                  <Textarea
                    id="methodology"
                    placeholder="Any methodological preferences or constraints?"
                    value={researchContext.methodology}
                    onChange={(e) => setResearchContext({ ...researchContext, methodology: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <Button onClick={generateResearchSuggestions} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Suggestions...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Generate Research Suggestions
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Research Suggestions Results */}
          {researchSuggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Research Suggestions</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(researchSuggestions, null, 2))}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportResults(JSON.stringify(researchSuggestions, null, 2), "research-suggestions.json")
                    }
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {researchSuggestions.map((suggestion, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg">{suggestion.title}</h3>
                        <div className="flex gap-2">
                          <Badge variant="outline">Feasibility: {suggestion.feasibilityScore}/10</Badge>
                          <Badge variant="outline">Novelty: {suggestion.noveltyScore}/10</Badge>
                        </div>
                      </div>

                      <p className="text-muted-foreground">{suggestion.description}</p>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <h4 className="font-medium mb-1">Methodology</h4>
                          <p className="text-sm text-muted-foreground">{suggestion.methodology}</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Potential Impact</h4>
                          <p className="text-sm text-muted-foreground">{suggestion.potentialImpact}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-1">Key Challenges</h4>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {suggestion.keyChallenges.map((challenge: string, i: number) => (
                            <li key={i}>{challenge}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium mb-1">Next Steps</h4>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {suggestion.nextSteps.map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparison Results */}
          {Object.keys(comparisonResults).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Compare className="h-5 w-5" />
                  Provider Comparison Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(comparisonResults).map(([provider, response]) => (
                    <div key={provider} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">{provider.toUpperCase()}</h3>
                        <Badge variant="outline">{response.model}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{response.content}</p>
                      {response.usage && (
                        <div className="text-xs text-muted-foreground">Tokens: {response.usage.tokens}</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Summarization Tab */}
        <TabsContent value="summarize" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Smart Text Summarization</CardTitle>
              <CardDescription>Advanced summarization with customizable options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-to-summarize">Text to Summarize</Label>
                <Textarea
                  id="text-to-summarize"
                  placeholder="Paste your text here..."
                  value={textToSummarize}
                  onChange={(e) => setTextToSummarize(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Summary Length</Label>
                  <Select
                    value={summaryOptions.length}
                    onValueChange={(value: "short" | "medium" | "long") =>
                      setSummaryOptions({ ...summaryOptions, length: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (1-2 paragraphs)</SelectItem>
                      <SelectItem value="medium">Medium (3-4 paragraphs)</SelectItem>
                      <SelectItem value="long">Long (5-6 paragraphs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Writing Style</Label>
                  <Select
                    value={summaryOptions.style}
                    onValueChange={(value: "academic" | "casual" | "technical") =>
                      setSummaryOptions({ ...summaryOptions, style: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Include Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="keywords"
                        checked={summaryOptions.includeKeywords}
                        onCheckedChange={(checked) =>
                          setSummaryOptions({ ...summaryOptions, includeKeywords: checked })
                        }
                      />
                      <Label htmlFor="keywords" className="text-sm">
                        Keywords
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="citations"
                        checked={summaryOptions.includeCitations}
                        onCheckedChange={(checked) =>
                          setSummaryOptions({ ...summaryOptions, includeCitations: checked })
                        }
                      />
                      <Label htmlFor="citations" className="text-sm">
                        Citations
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="methodology"
                        checked={summaryOptions.includeMethodology}
                        onCheckedChange={(checked) =>
                          setSummaryOptions({ ...summaryOptions, includeMethodology: checked })
                        }
                      />
                      <Label htmlFor="methodology" className="text-sm">
                        Methodology
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={generateSummary} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Summary...
                  </>
                ) : (
                  "Generate Summary"
                )}
              </Button>
            </CardContent>
          </Card>

          {summary && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Summary</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(summary)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportResults(summary, "summary.txt")}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{summary}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Idea Generation Tab */}
        <TabsContent value="ideas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Research Idea Generation</CardTitle>
              <CardDescription>Generate innovative research ideas for your topic</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="idea-topic">Research Topic</Label>
                  <Input
                    id="idea-topic"
                    placeholder="e.g., Quantum Computing"
                    value={ideaTopic}
                    onChange={(e) => setIdeaTopic(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idea-count">Number of Ideas</Label>
                  <Select value={ideaCount.toString()} onValueChange={(value) => setIdeaCount(Number.parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Ideas</SelectItem>
                      <SelectItem value="5">5 Ideas</SelectItem>
                      <SelectItem value="7">7 Ideas</SelectItem>
                      <SelectItem value="10">10 Ideas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idea-context">Additional Context (Optional)</Label>
                <Textarea
                  id="idea-context"
                  placeholder="Provide any additional context, constraints, or focus areas..."
                  value={ideaContext}
                  onChange={(e) => setIdeaContext(e.target.value)}
                  rows={3}
                />
              </div>

              <Button onClick={generateIdeas} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Ideas...
                  </>
                ) : (
                  "Generate Research Ideas"
                )}
              </Button>
            </CardContent>
          </Card>

          {generatedIdeas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Research Ideas</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedIdeas.join("\n\n"))}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportResults(generatedIdeas.join("\n\n"), "research-ideas.txt")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {generatedIdeas.map((idea, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">Idea {index + 1}</h3>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(idea)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{idea}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
