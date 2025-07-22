"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PenLine, FileText, BookOpen, Check, AlertCircle, FileCode, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import RichTextEditor from "./components/rich-text-editor"
import CitationManager from "./components/citation-manager"
import AIWritingAssistant from "./components/ai-writing-assistant"
import { AIWritingModal } from "./components/ai-writing-modal"
import { useToast } from "@/hooks/use-toast"
import { ResearchSessionProvider, useResearchSession, useResearchContext } from "@/components/research-session-provider"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { RouteGuard } from "@/components/route-guard"
import CompactAIProviderSelector from "@/components/compact-ai-provider-selector"
import type { AIProvider } from "@/lib/ai-providers"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const containerStyle = "container mx-auto px-4 py-8 max-w-6xl"
const sectionTitleStyle = "text-2xl font-semibold text-gray-900 mb-4"
const sectionDescriptionStyle = "text-gray-600"

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
    key: 'academic',
    name: 'Academic',
    description: 'Formal, precise and scholarly writing style.',
    systemPrompt: 'You are an academic writing assistant. Use formal language, proper citations, and logical structure.',
    icon: BookOpen,
    color: [34, 139, 230] as [number, number, number],
  },
  {
    key: 'technical',
    name: 'Technical',
    description: 'Clear, concise technical writing.',
    systemPrompt: 'You are a technical writing assistant. Focus on clarity, precision, and detailed explanations.',
    icon: FileCode,
    color: [52, 211, 153] as [number, number, number],
  },
  {
    key: 'creative',
    name: 'Creative',
    description: 'Engaging, vivid academic writing.',
    systemPrompt: 'You are a creative academic writing assistant. Write engaging content while maintaining scholarly standards.',
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
    <div className="min-h-screen bg-white text-gray-900">
      <div className={containerStyle}>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Research Writer</h1>
          <p className={sectionDescriptionStyle}>
            Draft, edit, and refine your research papers with AI assistance and grammar checking.
          </p>
          {hasContext && (
            <Badge variant="outline" className="mt-2 px-3 py-1 text-sm bg-blue-50 text-blue-700 border-blue-200">
              <BookOpen className="h-3.5 w-3.5 mr-1" />
              {contextSummary}
            </Badge>
          )}
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <PenLine className="h-5 w-5 mr-2" />
                    Document Editor
                  </div>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {publisherTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardTitle>
                <CardDescription>
                  Write and edit your research document with AI assistance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <RichTextEditor
                    value={documentText}
                    onChange={setDocumentText}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={checkText} 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isChecking || !documentText.trim()}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Check Grammar & Style
                  </Button>
                  <Button 
                    onClick={() => setAiModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!selectedProvider || !selectedModel}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate with AI
                  </Button>
                </div>
              </CardContent>
            </Card>
            {languageToolSuggestions.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Suggestions ({languageToolSuggestions.length})
                  </CardTitle>
                  <CardDescription>
                    Grammar and style suggestions powered by LanguageTool
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {languageToolSuggestions.length === 0 ? (
                    <p className="text-sm text-gray-500 mb-4">
                      Suggestions will appear here after checking your text.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {languageToolSuggestions.map((sugg, idx) => {
                        // Highlight the error in context
                        let before = sugg.context?.text?.slice(0, sugg.context?.offset) || ""
                        let error = sugg.context?.text?.slice(sugg.context?.offset, sugg.context?.offset + sugg.context?.length) || ""
                        let after = sugg.context?.text?.slice(sugg.context?.offset + sugg.context?.length) || ""
                        return (
                          <li key={idx} className="border rounded p-3 bg-gray-50">
                            <div className="mb-1 text-gray-800">
                              <span className="font-medium">{sugg.message}</span>
                            </div>
                            <div className="mb-1 text-sm text-gray-700">
                              <span className="text-gray-500">Context: </span>
                              <span>{before}</span>
                              <span className="bg-red-200 text-red-900 px-1 rounded font-semibold">{error}</span>
                              <span>{after}</span>
                            </div>
                            {sugg.replacements && sugg.replacements.length > 0 && (
                              <div className="mb-1 text-sm">
                                <span className="text-gray-500">Suggestions: </span>
                                {sugg.replacements.map((rep: any, i: number) => (
                                  <span key={i} className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded mr-1 text-xs">{rep.value}</span>
                                ))}
                              </div>
                            )}
                            {sugg.rule && (
                              <div className="text-xs text-gray-400 mt-1">Rule: {sugg.rule.id} ({sugg.rule.description})</div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <div className="text-xs text-gray-500 mt-4">
                    <a 
                      href="https://languagetool.org/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Powered by LanguageTool
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Writing Assistant</CardTitle>
                <CardDescription>
                  Get AI-powered writing assistance based on your research context
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompactAIProviderSelector
                  selectedProvider={selectedProvider}
                  selectedModel={selectedModel}
                  onProviderChange={setSelectedProvider}
                  onModelChange={setSelectedModel}
                />
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Writing Style</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {personalities.map((personality) => (
                      <div
                        key={personality.key}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer border ${
                          selectedPersonality.key === personality.key
                            ? "bg-blue-50 border-blue-200"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedPersonality(personality)}
                      >
                        <personality.icon className="h-4 w-4" 
                          style={{ 
                            color: `rgb(${personality.color[0]}, ${personality.color[1]}, ${personality.color[2]})` 
                          }} 
                        />
                        <div>
                          <h5 className="text-sm font-medium">{personality.name}</h5>
                          <p className="text-xs text-gray-500">{personality.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Citations</CardTitle>
              </CardHeader>
              <CardContent>
                <CitationManager 
                  selectedTemplate={selectedTemplate}
                  onTemplateChange={setSelectedTemplate}
                />
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
          setDocumentText(prev => prev + '\n\n' + text)
          toast({
            title: "Content added",
            description: "AI-generated content has been added to your document."
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
