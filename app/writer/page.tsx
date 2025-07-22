"use client"

import { useState } from "react"
import { PenLine, BookOpen, Check, AlertCircle, FileCode, Sparkles, Quote, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import RichTextEditor from "./components/rich-text-editor"
import CitationManager from "./components/citation-manager"
import { AIWritingModal } from "./components/ai-writing-modal"
import { useToast } from "@/hooks/use-toast"
import { ResearchSessionProvider, useResearchContext } from "@/components/research-session-provider"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { RouteGuard } from "@/components/route-guard"
import CompactAIProviderSelector from "@/components/compact-ai-provider-selector"
import type { AIProvider } from "@/lib/ai-providers"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

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

function WriterPageContent() {
  const { toast } = useToast()
  const { hasContext, contextSummary } = useResearchContext()

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
                <PenLine className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-black">Research Writer</h1>
                <p className="text-sm text-gray-500">Professional academic writing platform</p>
              </div>
            </div>
            {hasContext && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                <BookOpen className="h-3 w-3 mr-1" />
                {contextSummary}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Editor Column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Document Editor Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-medium text-black">Document Editor</h2>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-gray-400" />
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="w-36 h-8 text-xs border-gray-300 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {publisherTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id} className="text-xs">
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <RichTextEditor value={documentText} onChange={setDocumentText} />

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={checkText}
                        variant="outline"
                        size="sm"
                        disabled={isChecking || !documentText.trim()}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {isChecking ? "Checking..." : "Grammar Check"}
                      </Button>
                      <Button
                        onClick={() => setAiModalOpen(true)}
                        size="sm"
                        disabled={!selectedProvider || !selectedModel}
                        className="bg-black text-white hover:bg-gray-800"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Assist
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500">{documentText.length} characters</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grammar Suggestions */}
            {languageToolSuggestions.length > 0 && (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-medium text-black">
                      Writing Suggestions ({languageToolSuggestions.length})
                    </h3>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {languageToolSuggestions.map((sugg, idx) => {
                      const before = sugg.context?.text?.slice(0, sugg.context?.offset) || ""
                      const error =
                        sugg.context?.text?.slice(sugg.context?.offset, sugg.context?.offset + sugg.context?.length) ||
                        ""
                      const after = sugg.context?.text?.slice(sugg.context?.offset + sugg.context?.length) || ""
                      return (
                        <div key={idx} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="text-sm font-medium text-black mb-2">{sugg.message}</div>
                          <div className="text-xs text-gray-600 mb-3 font-mono bg-white p-2 rounded border">
                            <span>{before}</span>
                            <span className="bg-red-100 text-red-800 px-1 rounded">{error}</span>
                            <span>{after}</span>
                          </div>
                          {sugg.replacements && sugg.replacements.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {sugg.replacements.map((rep: any, i: number) => (
                                <button
                                  key={i}
                                  className="inline-block bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded text-xs hover:bg-green-100 transition-colors"
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
                  <div className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-200">
                    Powered by{" "}
                    <a
                      href="https://languagetool.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black hover:underline"
                    >
                      LanguageTool
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Assistant Panel */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-gray-600" />
                  <h3 className="text-base font-medium text-black">AI Assistant</h3>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {/* AI Provider Selection */}
                <div>
                  <CompactAIProviderSelector
                    selectedProvider={selectedProvider}
                    selectedModel={selectedModel}
                    onProviderChange={setSelectedProvider}
                    onModelChange={setSelectedModel}
                  />
                </div>

                <Separator className="bg-gray-200" />

                {/* Writing Styles */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Writing Style</h4>
                  <div className="space-y-2">
                    {personalities.map((personality) => (
                      <button
                        key={personality.key}
                        className={`w-full flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                          selectedPersonality.key === personality.key
                            ? "bg-black text-white border-black shadow-sm"
                            : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedPersonality(personality)}
                      >
                        <personality.icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="text-left min-w-0">
                          <div className="text-sm font-medium">{personality.name}</div>
                          <div
                            className={`text-xs mt-0.5 ${
                              selectedPersonality.key === personality.key ? "text-gray-300" : "text-gray-500"
                            }`}
                          >
                            {personality.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Citations Panel */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <Quote className="h-5 w-5 text-gray-600" />
                  <h3 className="text-base font-medium text-black">Citations & References</h3>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CitationManager selectedTemplate={selectedTemplate} onTemplateChange={setSelectedTemplate} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Writing Modal */}
      <AIWritingModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        selectedProvider={selectedProvider || ""}
        selectedModel={selectedModel || ""}
        documentTemplate={selectedTemplate}
        onGenerateContent={(text) => {
          setDocumentText((prev) => prev + "\n\n" + text)
          toast({
            title: "Content added",
            description: "AI-generated content has been added to your document.",
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
