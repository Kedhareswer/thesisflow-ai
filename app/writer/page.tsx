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
  Settings,
  Zap,
  Eye,
  FileText,
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

// Supported publisher templates
const publisherTemplates = [
  { id: "ieee", name: "IEEE", description: "IEEE Conference/Journal Template" },
  { id: "acm", name: "ACM", description: "ACM Conference/Journal Template" },
  { id: "springer", name: "Springer", description: "Springer Conference/Journal Template" },
  { id: "elsevier", name: "Elsevier", description: "Elsevier Journal Template" },
  { id: "general", name: "General Academic", description: "General Academic Paper Template" },
]

// Writer personalities
const personalities = [
  {
    key: "academic",
    name: "Academic",
    description: "Formal, precise and scholarly writing style.",
    systemPrompt:
      "You are an academic writing assistant. Use formal language, proper citations, and logical structure.",
    icon: BookOpen,
    color: [34, 139, 230] as [number, number, number],
  },
  {
    key: "technical",
    name: "Technical",
    description: "Clear, concise technical writing.",
    systemPrompt: "You are a technical writing assistant. Focus on clarity, precision, and detailed explanations.",
    icon: FileCode,
    color: [52, 211, 153] as [number, number, number],
  },
  {
    key: "creative",
    name: "Creative",
    description: "Engaging, vivid academic writing.",
    systemPrompt:
      "You are a creative academic writing assistant. Write engaging content while maintaining scholarly standards.",
    icon: Sparkles,
    color: [236, 72, 153] as [number, number, number],
  },
]

function getTemplatePrompt(templateId: string): string {
  switch (templateId) {
    case "ieee":
      return "Format the writing according to IEEE guidelines, including section headings and citation style."
    case "acm":
      return "Follow ACM formatting and structure."
    case "springer":
      return "Use concise, formal academic writing as per Springer requirements."
    case "elsevier":
      return "Structure the writing for Elsevier journals, with clear sections and formal tone."
    case "general":
    default:
      return "Use standard academic formatting."
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
  const [languageToolSuggestions, setLanguageToolSuggestions] = useState<any[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [supabaseToken, setSupabaseToken] = useState<string | null>(null)

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

  const wordCount = documentText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length
  const charCount = documentText.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header with Modern Typography */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center shadow-sm">
                <PenLine className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Research Writer</h1>
                <p className="text-sm text-gray-500 mt-0.5">Professional academic writing platform</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {hasContext && (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 px-3 py-1">
                  <BookOpen className="h-3 w-3 mr-1.5" />
                  <span className="text-xs font-medium">{contextSummary}</span>
                </Badge>
              )}

              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <FileText className="h-3.5 w-3.5" />
                <span>
                  {wordCount} words • {charCount} characters
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area with Improved Layout */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Editor Column - Enhanced */}
          <div className="xl:col-span-3 space-y-6">
            {/* Document Editor Card with Modern Design */}
            <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                      <PenLine className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-gray-900">Document Editor</CardTitle>
                      <p className="text-sm text-gray-500 mt-0.5">Write and edit your research document</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-gray-400" />
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="w-40 h-9 text-sm border-gray-300 bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 shadow-lg">
                          {publisherTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id} className="text-sm hover:bg-gray-50">
                              <div>
                                <div className="font-medium">{template.name}</div>
                                <div className="text-xs text-gray-500">{template.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="space-y-6">
                  <MarkdownEditor
                    value={documentText}
                    onChange={setDocumentText}
                    className="border-gray-200 rounded-lg"
                  />

                  {/* Enhanced Action Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={checkText}
                        variant="outline"
                        size="sm"
                        disabled={isChecking || !documentText.trim()}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200 bg-transparent"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {isChecking ? "Checking..." : "Grammar Check"}
                      </Button>

                      <Button
                        onClick={handleOpenAIModal}
                        size="sm"
                        disabled={!selectedProvider || !selectedModel || !supabaseToken}
                        className="bg-black text-white hover:bg-gray-800 shadow-sm transition-all duration-200 disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </Button>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                        {languageToolSuggestions.length > 0 && (
                          <span className="text-orange-600 font-medium mr-2">
                            {languageToolSuggestions.length} suggestions
                          </span>
                        )}
                        Last saved: just now
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grammar Suggestions with Enhanced Design */}
            {languageToolSuggestions.length > 0 && (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-50 rounded-md flex items-center justify-center">
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
                    {languageToolSuggestions.map((sugg, idx) => {
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
                          <div className="text-sm font-medium text-gray-900 mb-3">{sugg.message}</div>
                          <div className="text-sm text-gray-700 mb-4 p-3 bg-white rounded border font-mono">
                            <span>{before}</span>
                            <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-medium">{error}</span>
                            <span>{after}</span>
                          </div>
                          {sugg.replacements && sugg.replacements.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs text-gray-500 font-medium">Suggestions:</span>
                              {sugg.replacements.map((rep: any, i: number) => (
                                <button
                                  key={i}
                                  className="inline-block bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-medium hover:bg-green-100 transition-colors duration-200"
                                >
                                  {rep.value}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-200">
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

          {/* Enhanced Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* AI Configuration Panel */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center">
                    <Zap className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium text-gray-900">AI Assistant</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">Configure AI writing assistance</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-5">
                <div>
                  <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 block">
                    AI Provider
                  </Label>
                  <MinimalAIProviderSelector
                    selectedProvider={selectedProvider}
                    onProviderChange={setSelectedProvider}
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    variant="inline"
                    showModelSelector={true}
                    showConfigLink={true}
                  />
                </div>

                <Separator className="bg-gray-200" />

                <div>
                  <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 block">
                    Writing Style
                  </Label>
                  <Select
                    value={selectedPersonality.key}
                    onValueChange={(value) => {
                      const personality = personalities.find((p) => p.key === value)
                      if (personality) setSelectedPersonality(personality)
                    }}
                  >
                    <SelectTrigger className="border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 h-11 text-sm">
                      <SelectValue placeholder="Select writing style" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-lg">
                      {personalities.map((personality) => (
                        <SelectItem key={personality.key} value={personality.key} className="hover:bg-gray-50 p-3">
                          <div className="flex items-center gap-3">
                            <personality.icon className="h-4 w-4 text-gray-600" />
                            <div>
                              <div className="font-medium text-gray-900">{personality.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{personality.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* AI Status Indicator */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${selectedProvider && selectedModel && supabaseToken ? "bg-green-500" : "bg-gray-400"}`}
                    />
                    <span className="text-xs text-gray-600">
                      {selectedProvider && selectedModel && supabaseToken ? "AI Ready" : "AI Configuration Required"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Citations Panel */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-50 rounded-md flex items-center justify-center">
                    <Quote className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium text-gray-900">Citations</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">Manage references and citations</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                <CitationManager selectedTemplate={selectedTemplate} onTemplateChange={setSelectedTemplate} />
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-50 rounded-md flex items-center justify-center">
                    <Eye className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium text-gray-900">Document Stats</CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-gray-900">{wordCount}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Words</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-gray-900">{charCount}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Characters</div>
                  </div>
                </div>

                <Separator className="bg-gray-200" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Grammar Issues</span>
                    <span
                      className={`font-medium ${languageToolSuggestions.length > 0 ? "text-orange-600" : "text-green-600"}`}
                    >
                      {languageToolSuggestions.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Template</span>
                    <span className="font-medium text-gray-900">
                      {publisherTemplates.find((t) => t.id === selectedTemplate)?.name}
                    </span>
                  </div>
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
        documentTemplate={selectedTemplate}
        researchContext={buildContext()}
        writingStylePrompt={selectedPersonality.systemPrompt}
        templatePrompt={getTemplatePrompt(selectedTemplate)}
        supabaseToken={supabaseToken}
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
