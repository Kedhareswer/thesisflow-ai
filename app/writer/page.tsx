"use client"

import { useState, useEffect } from "react"
import {
  PenLine,
  BookOpen,
  Check,
  AlertCircle,
  FileCode,
  Sparkles,
  Quote,
  Zap,
  Eye,
  FileText,
  Save,
  Download,
  ChevronDown,
  ChevronUp,
  Settings,
  BarChart3,
  Brain,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownEditor } from "./components/rich-text-editor"
import CitationManager from "./components/citation-manager"
import { AIWritingModal } from "./components/ai-writing-modal"
import { useToast } from "@/hooks/use-toast"
import { ResearchSessionProvider, useResearchContext } from "@/components/research-session-provider"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { RouteGuard } from "@/components/route-guard"
import MinimalAIProviderSelector from "@/components/ai-provider-selector-minimal"
import type { AIProvider } from "@/lib/ai-providers"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Supported publisher templates with enhanced metadata
const publisherTemplates = [
  {
    id: "ieee",
    name: "IEEE",
    description: "IEEE Conference/Journal Template",
    wordLimit: 8000,
    sections: ["Abstract", "Introduction", "Methods", "Results", "Discussion", "Conclusion"],
  },
  {
    id: "acm",
    name: "ACM",
    description: "ACM Conference/Journal Template",
    wordLimit: 10000,
    sections: ["Abstract", "Introduction", "Related Work", "Methodology", "Evaluation", "Conclusion"],
  },
  {
    id: "springer",
    name: "Springer",
    description: "Springer Conference/Journal Template",
    wordLimit: 12000,
    sections: ["Abstract", "Introduction", "Literature Review", "Methods", "Results", "Discussion"],
  },
  {
    id: "elsevier",
    name: "Elsevier",
    description: "Elsevier Journal Template",
    wordLimit: 15000,
    sections: ["Abstract", "Introduction", "Materials and Methods", "Results", "Discussion", "Conclusion"],
  },
  {
    id: "general",
    name: "General Academic",
    description: "General Academic Paper Template",
    wordLimit: 10000,
    sections: ["Abstract", "Introduction", "Body", "Conclusion"],
  },
]

// Enhanced writer personalities with detailed descriptions
const personalities = [
  {
    key: "academic",
    name: "Academic",
    description: "Formal, precise and scholarly writing style with proper citations.",
    systemPrompt:
      "You are an academic writing assistant. Use formal language, proper citations, and logical structure. Maintain scholarly tone throughout.",
    icon: BookOpen,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    key: "technical",
    name: "Technical",
    description: "Clear, concise technical writing with detailed explanations.",
    systemPrompt:
      "You are a technical writing assistant. Focus on clarity, precision, and detailed explanations. Use technical terminology appropriately.",
    icon: FileCode,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    key: "creative",
    name: "Creative",
    description: "Engaging, vivid academic writing while maintaining standards.",
    systemPrompt:
      "You are a creative academic writing assistant. Write engaging content while maintaining scholarly standards. Use varied sentence structures.",
    icon: Sparkles,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
]

function getTemplatePrompt(templateId: string): string {
  switch (templateId) {
    case "ieee":
      return "Format the writing according to IEEE guidelines, including section headings and citation style. Use clear, concise language with technical precision."
    case "acm":
      return "Follow ACM formatting and structure. Emphasize computational aspects and technical contributions."
    case "springer":
      return "Use concise, formal academic writing as per Springer requirements. Focus on research methodology and findings."
    case "elsevier":
      return "Structure the writing for Elsevier journals, with clear sections and formal tone. Include detailed methodology."
    case "general":
    default:
      return "Use standard academic formatting with clear structure and appropriate scholarly tone."
  }
}

function WriterPageContent() {
  const { toast } = useToast()
  const { hasContext, contextSummary, buildContext } = useResearchContext()

  // AI provider selection state
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>(undefined)
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined)
  const [selectedPersonality, setSelectedPersonality] = useState(personalities[0])

  // Document state
  const [selectedTemplate, setSelectedTemplate] = useState(publisherTemplates[0].id)
  const [documentText, setDocumentText] = useState("")
  const [documentTitle, setDocumentTitle] = useState("Untitled Document")
  const [languageToolSuggestions, setLanguageToolSuggestions] = useState<any[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [supabaseToken, setSupabaseToken] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date>(new Date())
  const [isAutoSaving, setIsAutoSaving] = useState(false)

  // Sidebar state for collapsible sections
  const [activeTab, setActiveTab] = useState("assistant")
  const [isAIConfigOpen, setIsAIConfigOpen] = useState(true)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true)
  const [isCitationsOpen, setIsCitationsOpen] = useState(true)

  // Fetch Supabase session/token on mount
  useEffect(() => {
    async function fetchToken() {
      const { data } = await supabase.auth.getSession()
      setSupabaseToken(data.session?.access_token || null)
    }
    fetchToken()

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSupabaseToken(session?.access_token || null)
    })

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (documentText.trim()) {
        setIsAutoSaving(true)
        // Simulate auto-save
        setTimeout(() => {
          setLastSaved(new Date())
          setIsAutoSaving(false)
        }, 1000)
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [documentText])

  // Check text for grammar/style issues using LanguageTool
  const checkText = async () => {
    if (!documentText.trim()) {
      toast({
        title: "No text to check",
        description: "Please write some text before checking grammar and style.",
        variant: "default",
      })
      return
    }
    setIsChecking(true)
    try {
      const response = await fetch("/api/language-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: documentText }),
      })
      if (!response.ok) throw new Error("Failed to check text")
      const data = await response.json()
      setLanguageToolSuggestions(data.matches || [])
      toast({
        title: `Found ${data.matches?.length || 0} suggestions`,
        description: data.matches?.length
          ? "Review and apply suggestions to improve your text."
          : "No issues found in your text.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error checking text:", error)
      toast({
        title: "Error checking text",
        description: "There was a problem checking your text. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsChecking(false)
    }
  }

  // Manual save function
  const handleSave = async () => {
    setIsAutoSaving(true)
    // Simulate save
    setTimeout(() => {
      setLastSaved(new Date())
      setIsAutoSaving(false)
      toast({
        title: "Document saved",
        description: "Your document has been saved successfully.",
        duration: 2000,
      })
    }, 500)
  }

  // Export functions
  const handleExport = (format: "markdown" | "pdf" | "docx") => {
    const blob = new Blob([documentText], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${documentTitle.replace(/\s+/g, "_")}.${format === "markdown" ? "md" : format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: `Exported as ${format.toUpperCase()}`,
      description: `Your document has been exported successfully.`,
      duration: 2000,
    })
  }

  // Only allow opening modal if token is present
  const handleOpenAIModal = () => {
    if (!supabaseToken) {
      toast({
        title: "Authentication required",
        description: "Please log in again to use AI features.",
        variant: "destructive",
      })
      return
    }
    setAiModalOpen(true)
  }

  // Calculate document statistics
  const wordCount = documentText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length
  const charCount = documentText.length
  const charCountNoSpaces = documentText.replace(/\s/g, "").length
  const paragraphCount = documentText.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length
  const readingTime = Math.ceil(wordCount / 200) // Average reading speed: 200 words per minute

  // Get current template info
  const currentTemplate = publisherTemplates.find((t) => t.id === selectedTemplate) || publisherTemplates[0]
  const wordProgress = (wordCount / currentTemplate.wordLimit) * 100

  // Format last saved time
  const formatLastSaved = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Document Controls */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Document Title Editor */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="text-lg font-medium text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded transition-colors"
                  placeholder="Document title..."
                />
                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-300">
                  {currentTemplate.name}
                </Badge>
              </div>
            </div>

            {/* Right: Actions and Status */}
            <div className="flex items-center space-x-4">
              {/* Research Context Badge */}
              {hasContext && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1.5">
                  <BookOpen className="h-3 w-3 mr-1.5" />
                  <span className="text-xs font-medium">{contextSummary}</span>
                </Badge>
              )}

              {/* Document Stats */}
              <div className="hidden md:flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <FileText className="h-4 w-4" />
                  <span>{wordCount.toLocaleString()} words</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{readingTime}min read</span>
                </div>
              </div>

              {/* Save Status */}
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {isAutoSaving ? (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Saved {formatLastSaved(lastSaved)}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={isAutoSaving}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>

                <Select onValueChange={(value) => handleExport(value as "markdown" | "pdf" | "docx")}>
                  <SelectTrigger>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markdown">Export as Markdown</SelectItem>
                    <SelectItem value="pdf">Export as PDF</SelectItem>
                    <SelectItem value="docx">Export as DOCX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Editor Column */}
          <div className="xl:col-span-3 space-y-6">
            {/* Document Progress Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-sm font-medium text-gray-900">Writing Progress</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {wordCount.toLocaleString()} / {currentTemplate.wordLimit.toLocaleString()} words
                  </span>
                </div>
                <Progress value={Math.min(wordProgress, 100)} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{Math.round(wordProgress)}% complete</span>
                  <span className={wordProgress > 100 ? "text-red-600" : "text-gray-500"}>
                    {wordProgress > 100 ? "Over limit" : `${currentTemplate.wordLimit - wordCount} words remaining`}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Document Editor Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <PenLine className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-gray-900">Document Editor</CardTitle>
                      <p className="text-sm text-gray-500 mt-0.5">Write and edit your research document</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="w-48 h-9 text-sm border-gray-300 bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 shadow-lg">
                        {publisherTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id} className="text-sm hover:bg-gray-50 p-3">
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{template.description}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {template.wordLimit.toLocaleString()} words • {template.sections.length} sections
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <MarkdownEditor value={documentText} onChange={setDocumentText} className="border-0 rounded-none" />

                {/* Enhanced Action Bar */}
                <div className="p-6 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={checkText}
                        variant="outline"
                        size="sm"
                        disabled={isChecking || !documentText.trim()}
                        className="border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 transition-all duration-200 bg-transparent"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {isChecking ? "Checking..." : "Grammar Check"}
                      </Button>

                      <Button
                        onClick={handleOpenAIModal}
                        size="sm"
                        disabled={!selectedProvider || !selectedModel || !supabaseToken}
                        className="bg-gray-900 text-white hover:bg-gray-800 shadow-sm transition-all duration-200 disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Assistant
                      </Button>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {languageToolSuggestions.length > 0 && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {languageToolSuggestions.length} suggestions
                        </Badge>
                      )}
                      <div className="flex items-center space-x-2">
                        <span>{charCount.toLocaleString()} characters</span>
                        <span>•</span>
                        <span>{paragraphCount} paragraphs</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grammar Suggestions Card */}
            {languageToolSuggestions.length > 0 && (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-gray-900">
                        Writing Suggestions ({languageToolSuggestions.length})
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-0.5">Grammar and style improvements</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="space-y-4">
                    {languageToolSuggestions.slice(0, 5).map((sugg, idx) => {
                      const before = sugg.context?.text?.slice(0, sugg.context?.offset) || ""
                      const error =
                        sugg.context?.text?.slice(sugg.context?.offset, sugg.context?.offset + sugg.context?.length) ||
                        ""
                      const after = sugg.context?.text?.slice(sugg.context?.offset + sugg.context?.length) || ""

                      return (
                        <div
                          key={idx}
                          className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="text-sm font-medium text-gray-900">{sugg.message}</div>
                            <Badge variant="outline" className="text-xs bg-white border-gray-300">
                              {sugg.rule?.category?.name || "Style"}
                            </Badge>
                          </div>

                          <div className="text-gray-700 mb-4 p-3 bg-white rounded border font-mono text-xs">
                            <span>{before}</span>
                            <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-medium">{error}</span>
                            <span>{after}</span>
                          </div>

                          {sugg.replacements && sugg.replacements.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs text-gray-500 font-medium">Suggestions:</span>
                              {sugg.replacements.slice(0, 3).map((rep: any, i: number) => (
                                <button
                                  key={i}
                                  className="inline-block bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-medium hover:bg-green-100 transition-colors duration-200"
                                  onClick={() => {
                                    // Apply suggestion logic would go here
                                    toast({
                                      title: "Suggestion applied",
                                      description: `Replaced with "${rep.value}"`,
                                      duration: 2000,
                                    })
                                  }}
                                >
                                  {rep.value}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {languageToolSuggestions.length > 5 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 bg-transparent">
                          Show {languageToolSuggestions.length - 5} more suggestions
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-200 text-center">
                    Powered by{" "}
                    <a
                      href="https://languagetool.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 hover:underline font-medium"
                    >
                      LanguageTool
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Redesigned Compact Sidebar */}
          <div className="xl:col-span-1 space-y-4">
            {/* Tabbed Interface for Main Tools */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-50 p-1 rounded-lg">
                  <TabsTrigger
                    value="assistant"
                    className="flex items-center space-x-1 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Brain className="h-3 w-3" />
                    <span className="hidden sm:inline">AI</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="flex items-center space-x-1 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <BarChart3 className="h-3 w-3" />
                    <span className="hidden sm:inline">Stats</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="citations"
                    className="flex items-center space-x-1 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Quote className="h-3 w-3" />
                    <span className="hidden sm:inline">Refs</span>
                  </TabsTrigger>
                </TabsList>

                {/* AI Writing Assistant Tab */}
                <TabsContent value="assistant" className="mt-4 space-y-4">
                  <div className="px-4 pb-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-medium text-gray-900">AI Writing Assistant</h3>
                    </div>

                    {/* Collapsible AI Configuration */}
                    <Collapsible open={isAIConfigOpen} onOpenChange={setIsAIConfigOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-8 text-xs">
                          <span className="flex items-center space-x-2">
                            <Settings className="h-3 w-3" />
                            <span>Configuration</span>
                          </span>
                          {isAIConfigOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 mt-2">
                        <div>
                          <Label className="text-xs font-medium text-gray-700 mb-2 block">Provider</Label>
                          <MinimalAIProviderSelector
                            selectedProvider={selectedProvider}
                            onProviderChange={setSelectedProvider}
                            selectedModel={selectedModel}
                            onModelChange={setSelectedModel}
                            variant="compact"
                            showModelSelector={true}
                            showConfigLink={false}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Separator className="my-3" />

                    {/* Writing Style Selection */}
                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-2 block">Writing Style</Label>
                      <div className="space-y-1">
                        {personalities.map((personality) => (
                          <button
                            key={personality.key}
                            className={`w-full p-2 rounded-md border text-left transition-all duration-200 ${
                              selectedPersonality.key === personality.key
                                ? `${personality.bgColor} ${personality.borderColor} ${personality.color}`
                                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() => setSelectedPersonality(personality)}
                          >
                            <div className="flex items-center space-x-2">
                              <personality.icon className="h-3 w-3" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium">{personality.name}</div>
                                <div className="text-xs opacity-75 truncate">{personality.description}</div>
                              </div>
                              {selectedPersonality.key === personality.key && (
                                <div className="w-1.5 h-1.5 bg-current rounded-full flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Status */}
                    <div className="mt-4 p-2 bg-gray-50 rounded-md border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              selectedProvider && selectedModel && supabaseToken ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                          <span className="text-xs text-gray-600 font-medium">
                            {selectedProvider && selectedModel && supabaseToken ? "Ready" : "Setup Required"}
                          </span>
                        </div>
                        {selectedProvider && selectedModel && supabaseToken && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-50 text-green-700 border-green-200 px-2 py-0.5"
                          >
                            Connected
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Quick AI Action */}
                    <Button
                      onClick={handleOpenAIModal}
                      disabled={!selectedProvider || !selectedModel || !supabaseToken}
                      className="w-full mt-3 bg-gray-900 text-white hover:bg-gray-800 h-8 text-xs"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Generate Content
                    </Button>
                  </div>
                </TabsContent>

                {/* Document Analytics Tab */}
                <TabsContent value="analytics" className="mt-4 space-y-4">
                  <div className="px-4 pb-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Eye className="h-4 w-4 text-gray-600" />
                      <h3 className="text-sm font-medium text-gray-900">Document Analytics</h3>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded-md">
                        <div className="text-lg font-bold text-gray-900">{wordCount.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Words</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-md">
                        <div className="text-lg font-bold text-gray-900">{readingTime}</div>
                        <div className="text-xs text-gray-500">Min Read</div>
                      </div>
                    </div>

                    {/* Detailed Stats */}
                    <Collapsible open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-8 text-xs">
                          <span>Detailed Statistics</span>
                          {isAnalyticsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Characters</span>
                            <span className="font-medium text-gray-900">{charCount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Characters (no spaces)</span>
                            <span className="font-medium text-gray-900">{charCountNoSpaces.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Paragraphs</span>
                            <span className="font-medium text-gray-900">{paragraphCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Grammar Issues</span>
                            <span
                              className={`font-medium ${
                                languageToolSuggestions.length > 0 ? "text-orange-600" : "text-green-600"
                              }`}
                            >
                              {languageToolSuggestions.length}
                            </span>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Separator className="my-3" />

                    {/* Template Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Template Progress</span>
                        <Badge variant="outline" className="text-xs bg-gray-50 border-gray-300">
                          {currentTemplate.name}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <Progress value={Math.min(wordProgress, 100)} className="h-1.5" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{Math.round(wordProgress)}% complete</span>
                          <span className={wordProgress > 100 ? "text-red-600" : "text-gray-500"}>
                            {wordProgress > 100 ? "Over limit" : `${currentTemplate.wordLimit - wordCount} remaining`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Citations & References Tab */}
                <TabsContent value="citations" className="mt-4 space-y-4">
                  <div className="px-4 pb-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Quote className="h-4 w-4 text-purple-600" />
                      <h3 className="text-sm font-medium text-gray-900">Citations & References</h3>
                    </div>

                    {/* Compact Citation Manager */}
                    <CitationManager
                      selectedTemplate={selectedTemplate}
                      onTemplateChange={setSelectedTemplate}
                      compact={true}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </Card>

            {/* Quick Actions Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Zap className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-medium text-gray-900">Quick Actions</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={checkText}
                    variant="outline"
                    size="sm"
                    disabled={isChecking || !documentText.trim()}
                    className="h-8 text-xs border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {isChecking ? "Checking..." : "Grammar"}
                  </Button>
                  <Button
                    onClick={handleSave}
                    variant="outline"
                    size="sm"
                    disabled={isAutoSaving}
                    className="h-8 text-xs border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Enhanced AI Writing Modal */}
      <AIWritingModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        selectedProvider={selectedProvider || ""}
        selectedModel={selectedModel || ""}
        supabaseToken={supabaseToken}
        writingStylePrompt={selectedPersonality.systemPrompt}
        templatePrompt={getTemplatePrompt(selectedTemplate)}
        researchContext={buildContext()}
        onGenerateContent={(text) => {
          setDocumentText((prev) => prev + "\n\n" + text)
          toast({
            title: "Content Added",
            description: "AI-generated content has been added to your document.",
            duration: 3000,
          })
        }}
      />
    </div>
  )
}

export default function WriterPage() {
  return (
    <RouteGuard requireAuth={true}>
      <ResearchSessionProvider>
        <ErrorBoundary>
          <WriterPageContent />
        </ErrorBoundary>
      </ResearchSessionProvider>
    </RouteGuard>
  )
}
