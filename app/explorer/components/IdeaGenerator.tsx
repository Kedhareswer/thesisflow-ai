"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Lightbulb, TrendingUp, Info, Save, CheckSquare, Square, ChevronDown, ChevronUp, Plus, Calendar } from "lucide-react"
import { FormField, TextareaField } from "@/components/forms/FormField"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useResearchIdeas, useResearchContext, useResearchTopics } from "@/components/research-session-provider"
// Removed AI provider types - using Nova AI exclusively
// Removed AI provider selector - using Nova AI exclusively
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { IdeasWorkspace } from "./IdeasWorkspace"

// Enhanced research service for idea generation
class IdeaGenerationService {
  static async generateIdeas(
    topic: string,
    context = "",
    count = 5,
    researchLevel: "undergraduate" | "masters" | "phd" | "postdoc" = "masters"
  ): Promise<{
    content: string
    ideas: any[] // Full idea objects
    topic: string
    context: string
    count: number
    timestamp: string
  }> {
    try {
      // Call server-side API route
      const response = await fetch('/api/ai/generate-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          context,
          count,
          researchLevel,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate ideas' }))
        throw new Error(errorData.error || "Failed to generate research ideas. Please check your AI provider configuration.")
      }

      const researchResults = await response.json()

      if (!researchResults.success) {
        throw new Error(researchResults.error || "Failed to generate research ideas. Please check your AI provider configuration.")
      }

      const ideaObjects = researchResults.ideas

      // Format the ideas nicely for display
      const formattedIdeas = ideaObjects.map((idea: any, index: number) =>
        `${index + 1}. ${idea.title}\n${idea.description}`
      ).join("\n\n")

      return {
        content: formattedIdeas,
        ideas: ideaObjects, // Return full objects instead of strings
        topic,
        context,
        count,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Error generating ideas:", error)
      if (error instanceof Error && (error.message.includes("No AI providers") || error.message.includes("AI service not configured"))) {
        throw new Error("AI service is not configured. Please contact administrator or check your API keys.")
      }
      throw new Error(error instanceof Error ? error.message : "Failed to generate research ideas. Please check your AI provider configuration.")
    }
  }
}

interface IdeaGeneratorProps {
  className?: string
}

export function IdeaGenerator({ className }: IdeaGeneratorProps) {
  const { toast } = useToast()
  const { ideas: sessionIdeas, selectedIdeas, addIdeas, selectIdea } = useResearchIdeas()
  const { hasContext, contextSummary, buildContext, currentTopic } = useResearchContext()
  const { topics } = useResearchTopics()

  // State for active tab
  const [activeTab, setActiveTab] = useState<"generate" | "saved">("generate")

  const [ideaTopic, setIdeaTopic] = useState(() => currentTopic || "")
  const [ideaContext, setIdeaContext] = useState("")
  const [ideaCount, setIdeaCount] = useState(5)
  const [researchLevel, setResearchLevel] = useState<"undergraduate" | "masters" | "phd" | "postdoc">("masters")
  const [useSessionContext, setUseSessionContext] = useState(hasContext)
  // Removed provider/model state - using Nova AI exclusively

  // State for tracking selected ideas from current generation
  const [selectedGeneratedIdeas, setSelectedGeneratedIdeas] = useState<Set<number>>(new Set())

  // State for expanded idea details
  const [expandedIdea, setExpandedIdea] = useState<number | null>(null)
  
  // Update topic field when currentTopic changes, but only if different and not currently generating
  useEffect(() => {
    if (currentTopic && currentTopic !== ideaTopic && !ideaGenerationLoading) {
      setIdeaTopic(currentTopic)
    }
  }, [currentTopic])
  
  const [ideaGenerationData, setIdeaGenerationData] = useState<{
    content: string
    ideas: any[]
    topic: string
    context: string
    count: number
    timestamp: string
  } | null>(null)
  const [ideaGenerationLoading, setIdeaGenerationLoading] = useState(false)
  const [ideaGenerationError, setIdeaGenerationError] = useState<string | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const handleIdeaGeneration = useCallback(() => {
    if (!ideaTopic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a topic for idea generation.",
        variant: "destructive",
      })
      return
    }

    // No plan/usage gating in Explorer Ideas — unlimited when using user-provided keys

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new debounce timeout
    debounceTimeoutRef.current = setTimeout(async () => {
      setIdeaGenerationLoading(true)
      setIdeaGenerationError(null)
      setSelectedGeneratedIdeas(new Set()) // Reset selected ideas

      try {
        // Build enhanced context if using session context
        const enhancedContext = useSessionContext ? 
          `${ideaContext}\n\nResearch Session Context:\n${buildContext()}` : 
          ideaContext

        const generatedData = await IdeaGenerationService.generateIdeas(ideaTopic, enhancedContext, ideaCount, researchLevel)
        setIdeaGenerationData(generatedData)
        
        // Auto-select all ideas by default
        const allIndices = new Set(generatedData.ideas.map((_, index) => index))
        setSelectedGeneratedIdeas(allIndices)
        
        toast({
          title: "Ideas Generated",
          description: `${ideaCount} research ideas generated successfully.`,
        })

        // No token deduction or usage increment for Explorer Ideas
      } catch (error) {
        setIdeaGenerationError(error instanceof Error ? error.message : "Failed to generate ideas. Please try again.")
        toast({
          title: "Generation Failed",
          description: error instanceof Error ? error.message : "Failed to generate ideas. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIdeaGenerationLoading(false)
      }
    }, 500) // 500ms debounce
  }, [ideaTopic, ideaContext, ideaCount, researchLevel, useSessionContext, buildContext])

  // Handle idea selection
  const handleIdeaSelection = (index: number, selected: boolean) => {
    const newSelected = new Set(selectedGeneratedIdeas)
    if (selected) {
      newSelected.add(index)
    } else {
      newSelected.delete(index)
    }
    setSelectedGeneratedIdeas(newSelected)
  }

  // Handle select all/deselect all
  const handleSelectAll = () => {
    if (!ideaGenerationData) return
    
    if (selectedGeneratedIdeas.size === ideaGenerationData.ideas.length) {
      // Deselect all
      setSelectedGeneratedIdeas(new Set())
    } else {
      // Select all
      const allIndices = new Set(ideaGenerationData.ideas.map((_, index) => index))
      setSelectedGeneratedIdeas(allIndices)
    }
  }

  // Save selected ideas to session
  const handleSaveSelectedIdeas = () => {
    if (!ideaGenerationData || selectedGeneratedIdeas.size === 0) {
      toast({
        title: "No Ideas Selected",
        description: "Please select at least one idea to save to your research session.",
        variant: "destructive",
      })
      return
    }

    const ideasToSave = Array.from(selectedGeneratedIdeas).map(index => {
      const idea = ideaGenerationData.ideas[index]

      return {
        title: idea.title,
        description: idea.description,
        topic: ideaTopic,
        source: 'generated' as const
      }
    })

    addIdeas(ideasToSave)

    toast({
      title: "Ideas Saved",
      description: `Saved ${ideasToSave.length} selected ideas to your research session.`,
    })

    // Clear the current generation data after saving
    setIdeaGenerationData(null)
    setSelectedGeneratedIdeas(new Set())
  }

  const extractContent = (data: any): string => {
    if (typeof data === "string") {
      return data
    } else if (data && typeof data === "object") {
      if ("content" in data) {
        return data.content as string
      } else if ("ideas" in data && Array.isArray(data.ideas)) {
        // Format ideas nicely with titles and descriptions
        return data.ideas.map((idea: string, index: number) => {
          const lines = idea.split('\n')
          const title = lines[0].replace(/^\d+\.\s*/, '').trim()
          const description = lines.slice(1).join('\n').trim()
          
          return `${index + 1}. **${title}**\n${description || title}`
        }).join("\n\n")
      } else {
        return JSON.stringify(data, null, 2)
      }
    }
    return ""
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Research Idea Generation</h2>
        <p className="text-xs sm:text-sm text-gray-600">Unlock novel research directions with AI.</p>
      </div>

      {/* Tabs for Navigation */}
      <div className="flex gap-2 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("generate")}
          className={`pb-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "generate"
              ? "text-primary border-b-2 border-primary"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Generate
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`pb-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "saved"
              ? "text-primary border-b-2 border-primary"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Saved Ideas
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "generate" ? (
        <>
          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-[400px_1fr] gap-4 md:gap-6">
            {/* Left Column - Input Form */}
            <div className="space-y-4">{/* Form Card */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-6 space-y-6">
              {/* Core Topic */}
              <div className="space-y-2">
                <Label htmlFor="research-topic" className="text-sm font-medium text-gray-900">
                  Core Topic
                </Label>
                <Input
                  id="research-topic"
                  value={ideaTopic}
                  onChange={(e) => setIdeaTopic(e.target.value)}
                  placeholder="e.g., Artificial Intelligence in Healthcare"
                  className="w-full bg-gray-50 border-gray-200 focus:border-primary focus:ring-primary"
                />
              </div>

              {/* Keywords (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="additional-context" className="text-sm font-medium text-gray-900">
                  Keywords (Optional)
                </Label>
                <Input
                  id="keywords"
                  value={ideaContext}
                  onChange={(e) => setIdeaContext(e.target.value)}
                  placeholder="e.g., diagnostics, drug discovery, ethics"
                  className="w-full bg-gray-50 border-gray-200 focus:border-primary focus:ring-primary"
                />
              </div>

              {/* Research Level */}
              <div className="space-y-2">
                <Label htmlFor="research-level" className="text-sm font-medium text-gray-900">
                  Research Level
                </Label>
                <Select value={researchLevel} onValueChange={(value: any) => setResearchLevel(value)}>
                  <SelectTrigger id="research-level" className="w-full bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select research level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="undergraduate">Undergraduate (B.Tech/B.Sc)</SelectItem>
                    <SelectItem value="masters">Masters (M.Tech/M.Sc)</SelectItem>
                    <SelectItem value="phd">PhD/Research Level</SelectItem>
                    <SelectItem value="postdoc">Postdoc/Innovation Level</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {researchLevel === "undergraduate" && "Foundational research with learning focus"}
                  {researchLevel === "masters" && "Applied research with moderate novelty"}
                  {researchLevel === "phd" && "Highly novel, field-advancing research"}
                  {researchLevel === "postdoc" && "Groundbreaking, transformative research"}
                </p>
              </div>

              {/* Session Context Checkbox */}
              {hasContext && (
                <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-md border border-blue-100">
                  <Checkbox
                    id="use-session-context"
                    checked={useSessionContext}
                    onCheckedChange={(checked) => setUseSessionContext(checked as boolean)}
                    className="mt-0.5"
                  />
                  <label htmlFor="use-session-context" className="text-xs text-blue-800 leading-tight">
                    Use research session context for enhanced idea generation
                  </label>
                </div>
              )}

              {/* Generate Button */}
              <Button
                type="button"
                onClick={handleIdeaGeneration}
                disabled={ideaGenerationLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 flex items-center justify-center gap-2"
              >
                {ideaGenerationLoading ? (
                  <>
                    <LoadingSpinner className="h-4 w-4" />
                    <span>Generating Ideas</span>
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4" />
                    <span>Generate Ideas</span>
                  </>
                )}
              </Button>

              {/* Error Display */}
              {ideaGenerationError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-sm text-red-800">
                    {ideaGenerationError.includes("AI provider configuration") ? (
                      <>
                        No AI providers are configured. Please add at least one API key in{" "}
                        <Link href="/settings" className="underline font-medium">
                          Settings
                        </Link>
                        .
                      </>
                    ) : (
                      ideaGenerationError
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Research Context Status */}
          {hasContext && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong className="text-blue-900">Research Context Active:</strong>
                <br />
                <span className="text-blue-700">{contextSummary}</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Nova AI Status */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Powered by Nova AI</span>
          </div>
        </div>

        {/* Right Column - Generated Ideas */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Generated Ideas
              {ideaGenerationData && (
                <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500">
                  Showing {ideaGenerationData.ideas.length} ideas
                </span>
              )}
            </h3>
            {ideaGenerationData && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs h-8"
                >
                  {selectedGeneratedIdeas.size === ideaGenerationData.ideas.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  onClick={handleSaveSelectedIdeas}
                  disabled={selectedGeneratedIdeas.size === 0}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                >
                  <Save className="h-3 w-3 mr-1.5" />
                  <span className="hidden sm:inline">Save Selected</span> ({selectedGeneratedIdeas.size})
                </Button>
              </div>
            )}
          </div>

          {/* Generated Ideas Cards */}
          {ideaGenerationData ? (
            <div className="space-y-3">
              {ideaGenerationData.ideas.map((idea: any, index: number) => {
                const isSelected = selectedGeneratedIdeas.has(index)
                const isExpanded = expandedIdea === index

                return (
                  <Card
                    key={index}
                    className={`transition-all duration-200 ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleIdeaSelection(index, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-gray-900 leading-snug flex-1">
                              {idea.title}
                            </h4>
                            <button
                              onClick={() => setExpandedIdea(isExpanded ? null : index)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              aria-label={isExpanded ? "Show less" : "Read more"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          </div>

                          {/* Collapsed view - truncated description */}
                          {!isExpanded && (
                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                              {idea.description}
                            </p>
                          )}

                          {/* Expanded view - full details */}
                          {isExpanded && (
                            <div className="space-y-4 pt-2">
                              <div>
                                <h5 className="text-xs font-semibold text-gray-900 mb-2">Description</h5>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {idea.description}
                                </p>
                              </div>

                              {idea.research_question && (
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-900 mb-2">Research Question</h5>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {idea.research_question}
                                  </p>
                                </div>
                              )}

                              {idea.methodology && (
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-900 mb-2">Methodology</h5>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {idea.methodology}
                                  </p>
                                </div>
                              )}

                              {idea.research_plan && idea.research_plan.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-900 mb-2">Research Plan</h5>
                                  <div className="space-y-2 text-sm text-gray-700">
                                    {idea.research_plan.map((step: string, stepIndex: number) => (
                                      <div key={stepIndex} className="flex items-start gap-2">
                                        <span className="text-primary font-medium">{stepIndex + 1}.</span>
                                        <span>{step}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {idea.key_considerations && idea.key_considerations.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-900 mb-2">Key Considerations</h5>
                                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                    {idea.key_considerations.map((consideration: string, consIndex: number) => (
                                      <li key={consIndex}>{consideration}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {(idea.timeline || idea.novelty_score) && (
                                <div className="flex flex-wrap gap-3 text-xs">
                                  {idea.timeline && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded">
                                      <Calendar className="h-3 w-3 text-blue-600" />
                                      <span className="text-blue-700">{idea.timeline}</span>
                                    </div>
                                  )}
                                  {idea.novelty_score && (
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded ${
                                      idea.novelty_score === "Transformative" ? "bg-purple-50 text-purple-700" :
                                      idea.novelty_score === "High" ? "bg-green-50 text-green-700" :
                                      idea.novelty_score === "Moderate" ? "bg-yellow-50 text-yellow-700" :
                                      "bg-gray-50 text-gray-700"
                                    }`}>
                                      <TrendingUp className="h-3 w-3" />
                                      <span>{idea.novelty_score} Novelty</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 text-xs"
                                  onClick={() => {
                                    toast({
                                      title: "Added to Planner",
                                      description: "Research plan has been added to your planner.",
                                    })
                                  }}
                                >
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Add to Planner
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 text-xs"
                                  onClick={() => {
                                    toast({
                                      title: "Saved to Workspace",
                                      description: "Idea has been saved to your workspace.",
                                    })
                                  }}
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  Save to Workspace
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Tags */}
                          {!isExpanded && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                {ideaTopic.split(' ')[0] || 'Research'}
                              </span>
                              {idea.novelty_score && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
                                  idea.novelty_score === "Transformative" ? "bg-purple-100 text-purple-700" :
                                  idea.novelty_score === "High" ? "bg-green-100 text-green-700" :
                                  idea.novelty_score === "Moderate" ? "bg-yellow-100 text-yellow-700" :
                                  "bg-gray-100 text-gray-700"
                                }`}>
                                  {idea.novelty_score}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                Click <ChevronDown className="inline h-3 w-3" /> for details
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
              <CardContent className="p-12 text-center">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm text-gray-500 mb-2">No ideas generated yet</p>
                <p className="text-xs text-gray-400">Enter a topic and click "Generate Ideas" to get started</p>
              </CardContent>
            </Card>
          )}

          {ideaGenerationError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-sm text-red-800">
                {ideaGenerationError}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
        </>
      ) : (
        /* Saved Ideas Tab Content */
        <IdeasWorkspace />
      )}
    </div>
  )
}
