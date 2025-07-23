"use client"

import { useState } from "react"
import { PenLine, BookOpen, Check, AlertCircle, FileCode, Sparkles, Quote, Settings, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import RichTextEditor from "./components/rich-text-editor"
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
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

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

  // Generate text with AI assistance
  const generateText = async () => {
    if (!selectedProvider || !selectedModel) {
      toast({
        title: "AI provider required",
        description: "Please select an AI provider and model first.",
        variant: "default",
      })
      return
    }
    toast({
      title: "Coming soon",
      description: "AI writing assistance will be available in the next update.",
      variant: "default",
    })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-black tracking-tight">Research Writer</h1>
              <p className="text-sm text-gray-600 mt-1">Professional academic writing with AI assistance</p>
            </div>
            {hasContext && (
              <Badge variant="outline" className="px-3 py-1 text-xs bg-gray-50 text-gray-700 border-gray-300">
                <BookOpen className="h-3 w-3 mr-1" />
                {contextSummary}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Main Editor - Left Column */}
          <div className="col-span-8">
            <div className="bg-white border border-gray-200 rounded-lg">
              {/* Editor Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PenLine className="h-4 w-4 text-gray-600" />
                    <h2 className="text-lg font-medium text-black">Document</h2>
                  </div>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="w-40 h-8 text-xs border-gray-300">
                      <SelectValue placeholder="Template" />
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

              {/* Editor Content */}
              <div className="p-6">
                <RichTextEditor value={documentText} onChange={setDocumentText} className="border-gray-200" />

                {/* Action Buttons */}
                <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-gray-100">
                  <Button
                    onClick={checkText}
                    variant="outline"
                    size="sm"
                    disabled={isChecking || !documentText.trim()}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                  >
                    <Check className="h-3.5 w-3.5 mr-2" />
                    {isChecking ? "Checking..." : "Check Grammar"}
                  </Button>
                  <Button
                    onClick={() => setAiModalOpen(true)}
                    size="sm"
                    disabled={!selectedProvider || !selectedModel}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    Generate with AI
                  </Button>
                </div>
              </div>
            </div>

            {/* Grammar Suggestions */}
            {languageToolSuggestions.length > 0 && (
              <div className="mt-6 bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-gray-600" />
                    <h3 className="text-lg font-medium text-black">
                      Grammar & Style ({languageToolSuggestions.length})
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {languageToolSuggestions.map((sugg, idx) => {
                      const before = sugg.context?.text?.slice(0, sugg.context?.offset) || ""
                      const error =
                        sugg.context?.text?.slice(sugg.context?.offset, sugg.context?.offset + sugg.context?.length) ||
                        ""
                      const after = sugg.context?.text?.slice(sugg.context?.offset + sugg.context?.length) || ""
                      return (
                        <div key={idx} className="border border-gray-200 rounded-md p-4 bg-gray-50">
                          <div className="text-sm font-medium text-black mb-2">{sugg.message}</div>
                          <div className="text-xs text-gray-600 mb-3">
                            <span className="text-gray-500">Context: </span>
                            <span>{before}</span>
                            <span className="bg-red-100 text-red-800 px-1 rounded font-medium">{error}</span>
                            <span>{after}</span>
                          </div>
                          {sugg.replacements && sugg.replacements.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {sugg.replacements.map((rep: any, i: number) => (
                                <span
                                  key={i}
                                  className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs"
                                >
                                  {rep.value}
                                </span>
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
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="col-span-4 space-y-6">
            {/* AI Provider Selector */}
            <Card className="border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-medium text-black">AI Configuration</h3>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-700 mb-2 block">AI Provider</Label>
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

                  <Separator className="my-2" />

                  <div>
                    <Label className="text-xs font-medium text-gray-700 mb-2 block">Writing Style</Label>
                    <Select
                      value={selectedPersonality.key}
                      onValueChange={(value) => {
                        const personality = personalities.find((p) => p.key === value)
                        if (personality) setSelectedPersonality(personality)
                      }}
                    >
                      <SelectTrigger className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-10 text-sm">
                        <SelectValue placeholder="Select writing style" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {personalities.map((personality) => (
                          <SelectItem key={personality.key} value={personality.key} className="hover:bg-gray-50">
                            <div className="flex items-center gap-2">
                              <personality.icon className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{personality.name}</div>
                                <div className="text-xs text-gray-500">{personality.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Citations */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Quote className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-medium text-black">Citations</h3>
                </div>
              </div>
              <div className="p-4">
                <CitationManager selectedTemplate={selectedTemplate} onTemplateChange={setSelectedTemplate} />
              </div>
            </div>
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
