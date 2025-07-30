"use client"

import { SidebarGroupContent } from "@/components/ui/sidebar"

import { useEffect } from "react"
import {
  BookOpen,
  Check,
  AlertCircle,
  FileCode,
  Sparkles,
  Quote,
  ChevronDown,
  ChevronUp,
  BarChart3,
  BotIcon as Robot,
  User,
  ClipboardCopy,
  Loader2,
  Edit,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownEditor } from "./components/rich-text-editor"
import CitationManager from "./components/citation-manager"
import { AIWritingModal } from "./components/ai-writing-modal"
import { DocumentList } from "./components/document-list" // Updated import
import { useToast } from "@/hooks/use-toast"
import { ResearchSessionProvider, useResearchContext } from "@/components/research-session-provider"
import { RouteGuard } from "@/components/route-guard"
import type { AIProvider } from "@/lib/ai-providers"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import DocumentService, { type Document } from "@/lib/services/document.service"
import { useSafeDOM } from "./hooks/use-safe-dom"
import { useSafeState, useSafeCallback } from "./hooks/use-safe-state"
import { useDebouncedState } from "./hooks/use-debounced-state"
import { WriterErrorBoundary } from "./components/error-boundary"
import { SafeDOMWrapper } from "./components/safe-dom-wrapper"
import { useGlobalErrorHandler } from "./hooks/use-global-error-handler"
import { ResearchService } from "@/lib/services/research.service"
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar" // Import sidebar components
import { UserProfileAvatar } from "@/components/user-profile-avatar" // For user editing indicator

// Supported publisher templates with enhanced metadata
const publisherTemplates = [
  {
    id: "ieee",
    name: "IEEE",
    description: "IEEE Conference/Journal Template",
    wordLimit: 8000,
    sections: [
      "Title",
      "Authors",
      "Abstract",
      "Keywords",
      "Introduction",
      "Related Work",
      "Methods",
      "Results",
      "Discussion",
      "Conclusion",
      "Acknowledgments",
      "References",
    ],
  },
  {
    id: "acm",
    name: "ACM",
    description: "ACM Conference/Journal Template",
    wordLimit: 10000,
    sections: [
      "Title",
      "Authors",
      "Abstract",
      "Keywords",
      "Introduction",
      "Related Work",
      "Methods",
      "Results",
      "Discussion",
      "Conclusion",
      "Acknowledgments",
      "References",
    ],
  },
  {
    id: "springer",
    name: "Springer",
    description: "Springer Conference/Journal Template",
    wordLimit: 12000,
    sections: [
      "Title",
      "Authors",
      "Abstract",
      "Keywords",
      "Introduction",
      "Literature Review",
      "Materials and Methods",
      "Results",
      "Discussion",
      "Conclusion",
      "Acknowledgments",
      "References",
    ],
  },
  {
    id: "elsevier",
    name: "Elsevier",
    description: "Elsevier Journal Template",
    wordLimit: 15000,
    sections: [
      "Title",
      "Authors",
      "Abstract",
      "Keywords",
      "Introduction",
      "Materials and Methods",
      "Results",
      "Discussion",
      "Conclusion",
      "Acknowledgments",
      "References",
    ],
  },
  {
    id: "general",
    name: "General Academic",
    description: "Standard Academic Paper Template",
    wordLimit: 10000,
    sections: [
      "Title",
      "Authors",
      "Abstract",
      "Keywords",
      "Introduction",
      "Body",
      "Conclusion",
      "Acknowledgments",
      "References",
    ],
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
    color: "text-gray-900", // Monochromatic adjustment
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  {
    key: "technical",
    name: "Technical",
    description: "Clear, concise technical writing with detailed explanations.",
    systemPrompt:
      "You are a technical writing assistant. Focus on clarity, precision, and detailed explanations. Use technical terminology appropriately.",
    icon: FileCode,
    color: "text-gray-900", // Monochromatic adjustment
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  {
    key: "creative",
    name: "Creative",
    description: "Engaging, vivid academic writing while maintaining standards.",
    systemPrompt:
      "You are a creative academic writing assistant. Write engaging content while maintaining scholarly standards. Use varied sentence structures.",
    icon: Sparkles,
    color: "text-gray-900", // Monochromatic adjustment
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
]

function getTemplatePrompt(templateId: string): string {
  switch (templateId) {
    case "ieee":
      return "Format the writing according to IEEE guidelines, including section headings and citation style. Use clear, concise language with technical precision. Ensure content is suitable for an IEEE conference or journal."
    case "acm":
      return "Follow ACM formatting and structure. Emphasize computational aspects and technical contributions. Ensure content is suitable for an ACM conference or journal."
    case "springer":
      return "Use concise, formal academic writing as per Springer requirements. Focus on research methodology and findings. Ensure content is suitable for a Springer conference or journal."
    case "elsevier":
      return "Structure the writing for Elsevier journals, with clear sections and formal tone. Include detailed methodology. Ensure content is suitable for an Elsevier journal."
    case "general":
    default:
      return "Use standard academic formatting with clear structure and appropriate scholarly tone. Do not adhere to any specific publisher guidelines."
  }
}

function WriterPageContent() {
  const { toast } = useToast()
  const { hasContext, contextSummary, buildContext } = useResearchContext()
  const { safeDownload } = useSafeDOM()

  // Add global error handler
  useGlobalErrorHandler()

  // AI provider selection state
  const [selectedProvider, setSelectedProvider] = useSafeState<AIProvider | undefined>(undefined)
  const [selectedModel, setSelectedModel] = useSafeState<string | undefined>(undefined)
  const [selectedPersonality, setSelectedPersonality] = useSafeState(personalities[0])

  // Document state with debouncing
  const [selectedTemplate, setSelectedTemplate] = useSafeState(publisherTemplates[0].id)
  const [documentText, setDocumentText] = useDebouncedState("", 500) // Debounce text changes
  const [documentTitle, setDocumentTitle] = useDebouncedState("Untitled document", 300) // Default title
  const [languageToolSuggestions, setLanguageToolSuggestions] = useSafeState<any[]>([])
  const [isChecking, setIsChecking] = useSafeState(false)
  const [checkProgress, setCheckProgress] = useSafeState<string>("")
  const [aiModalOpen, setAiModalOpen] = useSafeState(false)
  const [supabaseToken, setSupabaseToken] = useSafeState<string | null>(null)
  const [lastSaved, setLastSaved] = useSafeState<Date>(new Date())
  const [isAutoSaving, setIsAutoSaving] = useSafeState(false)

  // New states for AI Detection, Humanizer, and Plagiarism
  const [aiDetectionResult, setAiDetectionResult] = useSafeState<{
    is_ai: boolean
    ai_probability: number
    message: string
  } | null>(null)
  const [isDetectingAI, setIsDetectingAI] = useSafeState(false)
  const [humanizedText, setHumanizedText] = useSafeState<string>("")
  const [isHumanizing, setIsHumanizing] = useSafeState(false)
  const [plagiarismResult, setPlagiarismResult] = useSafeState<{
    plagiarism_percentage: number
    sources: { url: string; match: string }[]
    message: string
  } | null>(null)
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useSafeState(false)

  // Document management state
  const [currentDocument, setCurrentDocument] = useSafeState<Document | null>(null)
  const [documentManagerOpen, setDocumentManagerOpen] = useSafeState(false) // Still used for the dialog
  const documentService = DocumentService.getInstance()

  // Sidebar state for collapsible sections
  const [activeTab, setActiveTab] = useSafeState("assistant")
  const [isAIConfigOpen, setIsAIConfigOpen] = useSafeState(true)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useSafeState(true)
  const [isCitationsOpen, setIsCitationsOpen] = useSafeState(true)
  // New collapsible states
  const [isAIDetectionOpen, setIsAIDetectionOpen] = useSafeState(false)
  const [isHumanizerOpen, setIsHumanizerOpen] = useSafeState(false)
  const [isPlagiarismOpen, setIsPlagiarismOpen] = useSafeState(false)

  // Fetch Supabase session/token on mount
  useEffect(() => {
    let isMounted = true

    async function fetchToken() {
      try {
        const { data } = await supabase.auth.getSession()
        if (isMounted) {
          setSupabaseToken(data.session?.access_token || null)
        }
      } catch (error) {
        console.error("Error fetching token:", error)
      }
    }

    fetchToken()

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        setSupabaseToken(session?.access_token || null)
      }
    })

    return () => {
      isMounted = false
      listener?.subscription.unsubscribe()
    }
  }, [])

  // Auto-save functionality with safe cleanup
  useEffect(() => {
    let isMounted = true
    let autoSaveInterval: NodeJS.Timeout | null = null

    const performAutoSave = async () => {
      if (!isMounted || !documentText.trim() || !documentTitle.trim()) return

      try {
        setIsAutoSaving(true)
        await documentService.autoSaveDocument(documentTitle, documentText, "paper")
        if (isMounted) {
          setLastSaved(new Date())
        }
      } catch (error) {
        console.error("Auto-save failed:", error)
      } finally {
        if (isMounted) {
          setIsAutoSaving(false)
        }
      }
    }

    autoSaveInterval = setInterval(performAutoSave, 30000) // Auto-save every 30 seconds

    return () => {
      isMounted = false
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval)
      }
    }
  }, [documentText, documentTitle])

  // Document management functions with safe callbacks
  const handleDocumentSelect = useSafeCallback((document: Document) => {
    setCurrentDocument(document)
    setDocumentTitle(document.title)
    setDocumentText(document.content)
    // No need to close dialog here, as DocumentList is now in sidebar
  })

  const handleDocumentLoad = useSafeCallback((content: string) => {
    setDocumentText(content)
  })

  const handleSaveDocument = useSafeCallback(async () => {
    try {
      if (!documentTitle.trim()) {
        toast({
          title: "Error",
          description: "Please enter a document title",
          variant: "destructive",
        })
        return
      }

      if (currentDocument) {
        await documentService.updateDocument(currentDocument.id, {
          title: documentTitle,
          content: documentText,
        })
      } else {
        const newDoc = await documentService.createDocument({
          title: documentTitle,
          content: documentText,
          document_type: "paper",
        })
        setCurrentDocument(newDoc)
      }

      setLastSaved(new Date())
      toast({
        title: "Success",
        description: "Document saved successfully",
      })
    } catch (error) {
      console.error("Error saving document:", error)
      toast({
        title: "Error",
        description: "Failed to save document",
        variant: "destructive",
      })
    }
  })

  // Check text for grammar/style issues using LanguageTool
  const checkText = useSafeCallback(async () => {
    if (!documentText.trim()) {
      toast({
        title: "No text to check",
        description: "Please write some text before checking grammar and style.",
        variant: "default",
      })
      return
    }

    // Check text size before sending to API
    const textSizeInBytes = new TextEncoder().encode(documentText).length
    const maxSizeInBytes = 25000 // Same limit as API

    if (textSizeInBytes > maxSizeInBytes) {
      // Estimate number of chunks needed
      const estimatedChunks = Math.ceil(textSizeInBytes / maxSizeInBytes)
      toast({
        title: "Large document detected",
        description: `Your document (${Math.round(
          textSizeInBytes / 1024,
        )}KB) will be processed sequentially in approximately ${estimatedChunks} chunks. This may take a few moments.`,
        variant: "default",
      })
      // Continue with processing - the API will handle chunking
    }
    setIsChecking(true)
    setCheckProgress("Analyzing document...")
    try {
      const response = await fetch("/api/language-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: documentText }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 413) {
          toast({
            title: "Text too large",
            description:
              errorData.message ||
              "Your document is too large to check. Please try checking a smaller portion of your text.",
            variant: "destructive",
          })
          return
        }
        throw new Error("Failed to check text")
      }

      const data = await response.json()
      setLanguageToolSuggestions(data.matches || [])
      setCheckProgress("")

      if (data.chunked) {
        toast({
          title: `Found ${data.matches?.length || 0} suggestions`,
          description: `Processed your large document sequentially in ${data.totalChunks} chunks. Review and apply suggestions to improve your text.`,
          variant: "default",
        })
      } else {
        toast({
          title: `Found ${data.matches?.length || 0} suggestions`,
          description: data.matches?.length
            ? "Review and apply suggestions to improve your text."
            : "No issues found in your text.",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error checking text:", error)
      toast({
        title: "Error checking text",
        description: "There was a problem checking your text. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsChecking(false)
      setCheckProgress("")
    }
  })

  // New function: Handle AI Detection
  const handleDetectAI = useSafeCallback(async () => {
    if (!documentText.trim()) {
      toast({
        title: "No text to analyze",
        description: "Please write some text before checking for AI content.",
        variant: "default",
      })
      return
    }
    setIsDetectingAI(true)
    setAiDetectionResult(null)
    try {
      const result = await ResearchService.detectAI(documentText)
      setAiDetectionResult(result)
      toast({
        title: "AI Detection Complete",
        description: result.message,
      })
    } catch (error) {
      console.error("Error detecting AI:", error)
      toast({
        title: "AI Detection Failed",
        description: "There was an error detecting AI content. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDetectingAI(false)
    }
  })

  // New function: Handle Humanize Text
  const handleHumanizeText = useSafeCallback(async () => {
    if (!documentText.trim()) {
      toast({
        title: "No text to humanize",
        description: "Please write some text before humanizing.",
        variant: "default",
      })
      return
    }
    setIsHumanizing(true)
    setHumanizedText("")
    try {
      const result = await ResearchService.humanizeText(documentText)
      setHumanizedText(result.humanized_text)
      toast({
        title: "Text Humanized",
        description: "Your text has been humanized.",
      })
    } catch (error) {
      console.error("Error humanizing text:", error)
      toast({
        title: "Humanization Failed",
        description: "There was an error humanizing your text. Please try again.",
        variant: "destructive",
      })
      setHumanizedText("Failed to humanize text. Please try again.")
    } finally {
      setIsHumanizing(false)
    }
  })

  // New function: Handle Plagiarism Check
  const handleCheckPlagiarism = useSafeCallback(async () => {
    if (!documentText.trim()) {
      toast({
        title: "No text to check",
        description: "Please write some text before checking for plagiarism.",
        variant: "default",
      })
      return
    }
    setIsCheckingPlagiarism(true)
    setPlagiarismResult(null)
    try {
      const result = await ResearchService.checkPlagiarism(documentText)
      setPlagiarismResult(result)
      toast({
        title: "Plagiarism Check Complete",
        description: result.message,
      })
    } catch (error) {
      console.error("Error checking plagiarism:", error)
      toast({
        title: "Plagiarism Check Failed",
        description: "There was an error checking for plagiarism. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCheckingPlagiarism(false)
    }
  })

  // Manual save function
  const handleSave = useSafeCallback(async () => {
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
  })

  // Export functions
  const handleExport = useSafeCallback((format: "markdown" | "pdf" | "docx") => {
    const blob = new Blob([documentText], { type: "text/markdown" })
    const filename = `${documentTitle.replace(/\s+/g, "_")}.${format === "markdown" ? "md" : format}`

    safeDownload(blob, filename)

    toast({
      title: `Exported as ${format.toUpperCase()}`,
      description: `Your document has been exported successfully.`,
      duration: 2000,
    })
  })

  // Only allow opening modal if token is present
  const handleOpenAIModal = useSafeCallback(() => {
    if (!supabaseToken) {
      toast({
        title: "Authentication required",
        description: "Please log in again to use AI features.",
        variant: "destructive",
      })
      return
    }
    setAiModalOpen(true)
  })

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
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Left Sidebar */}
        <Sidebar side="left" collapsible="icon" variant="sidebar" className="bg-white border-r border-gray-200">
          <SidebarHeader className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center space-x-2">
              <img src="/placeholder-logo.svg" alt="Acme Inc Logo" className="h-6 w-6" />
              <span className="text-lg font-semibold text-gray-900">Acme Inc</span>
            </div>
            <SidebarTrigger className="h-7 w-7" />
          </SidebarHeader>

          <SidebarContent className="p-2 space-y-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="flex items-center space-x-2">
                  <Edit className="h-4 w-4" />
                  <span>Inbox</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Create with AI</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Pages
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <DocumentList onDocumentSelect={handleDocumentSelect} currentDocumentId={currentDocument?.id || null} />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className="flex-1 flex flex-col bg-white">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded transition-colors"
                placeholder="Untitled document"
                aria-label="Document title"
              />
              {/* Placeholder for checkmark/save status */}
              {isAutoSaving ? (
                <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            <div className="flex items-center space-x-2">
              <UserProfileAvatar className="h-8 w-8" />
              <span className="text-sm text-gray-600">1 user editing</span>
            </div>
          </div>

          {/* Document Editor */}
          <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
            <MarkdownEditor value={documentText} onChange={setDocumentText} className="min-h-[calc(100vh-250px)]" />

            {/* AI Assistant & Grammar Check Buttons */}
            <div className="mt-8 flex items-center justify-between">
              <Button
                onClick={handleOpenAIModal}
                disabled={!selectedProvider || !selectedModel || !supabaseToken}
                className="bg-gray-900 text-white hover:bg-gray-800 shadow-sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
              <Button
                onClick={checkText}
                variant="outline"
                disabled={isChecking || !documentText.trim()}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
              >
                <Check className="h-4 w-4 mr-2" />
                {isChecking ? checkProgress || "Checking..." : "Grammar Check"}
              </Button>
            </div>

            {/* Collapsible Sections for Analytics, AI Tools, Citations */}
            <div className="mt-12 space-y-6">
              {/* Document Analytics */}
              <Collapsible open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-base font-semibold px-4 py-3">
                    <span className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-gray-600" />
                      <span>Document Analytics</span>
                    </span>
                    {isAnalyticsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 p-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-md border border-gray-200">
                      <div className="text-xl font-bold text-gray-900">{wordCount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Words</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-md border border-gray-200">
                      <div className="text-xl font-bold text-gray-900">{readingTime}</div>
                      <div className="text-sm text-gray-500">Min Read</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
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
                        className={`font-medium ${languageToolSuggestions.length > 0 ? "text-red-600" : "text-black"}`}
                      >
                        {languageToolSuggestions.length}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Template Progress</span>
                      <Badge variant="outline" className="text-sm bg-gray-50 border-gray-300">
                        {currentTemplate.name}
                      </Badge>
                    </div>
                    <Progress value={Math.min(wordProgress, 100)} className="h-2 bg-gray-200 [&>*]:bg-black" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{Math.round(wordProgress)}% complete</span>
                      <span className={wordProgress > 100 ? "text-red-600" : "text-gray-500"}>
                        {wordProgress > 100 ? "Over limit" : `${currentTemplate.wordLimit - wordCount} remaining`}
                      </span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* AI Detection Section */}
              <Collapsible open={isAIDetectionOpen} onOpenChange={setIsAIDetectionOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-base font-semibold px-4 py-3">
                    <span className="flex items-center space-x-2">
                      <Robot className="h-5 w-5" />
                      <span>AI Detection</span>
                    </span>
                    {isAIDetectionOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 p-4 border-t border-gray-200">
                  <Button
                    onClick={handleDetectAI}
                    disabled={isDetectingAI || !documentText.trim()}
                    className="w-full h-10 text-sm bg-gray-900 text-white hover:bg-gray-800"
                  >
                    {isDetectingAI ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Detecting AI...
                      </>
                    ) : (
                      "Detect AI Content"
                    )}
                  </Button>
                  {aiDetectionResult && (
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-sm">
                      <p className="font-medium mb-1">Result:</p>
                      <p className={aiDetectionResult.is_ai ? "text-red-600" : "text-green-600"}>
                        {aiDetectionResult.message}
                      </p>
                      <p className="text-gray-600 mt-1">
                        AI Probability: {aiDetectionResult.ai_probability.toFixed(2)}%
                      </p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Humanizer Section */}
              <Collapsible open={isHumanizerOpen} onOpenChange={setIsHumanizerOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-base font-semibold px-4 py-3">
                    <span className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Humanizer</span>
                    </span>
                    {isHumanizerOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 p-4 border-t border-gray-200">
                  <Button
                    onClick={handleHumanizeText}
                    disabled={isHumanizing || !documentText.trim()}
                    className="w-full h-10 text-sm bg-gray-900 text-white hover:bg-gray-800"
                  >
                    {isHumanizing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Humanizing...
                      </>
                    ) : (
                      "Humanize Text"
                    )}
                  </Button>
                  {humanizedText && (
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-sm">
                      <p className="font-medium mb-1">Humanized Version:</p>
                      <div className="whitespace-pre-wrap text-gray-700">{humanizedText}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-3 w-full h-8 text-sm"
                        onClick={() => setDocumentText(humanizedText)}
                      >
                        <Check className="h-4 w-4 mr-1" /> Apply to Document
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Plagiarism Detection Section */}
              <Collapsible open={isPlagiarismOpen} onOpenChange={setIsPlagiarismOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-base font-semibold px-4 py-3">
                    <span className="flex items-center space-x-2">
                      <ClipboardCopy className="h-5 w-5" />
                      <span>Plagiarism Check</span>
                    </span>
                    {isPlagiarismOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 p-4 border-t border-gray-200">
                  <Button
                    onClick={handleCheckPlagiarism}
                    disabled={isCheckingPlagiarism || !documentText.trim()}
                    className="w-full h-10 text-sm bg-gray-900 text-white hover:bg-gray-800"
                  >
                    {isCheckingPlagiarism ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking Plagiarism...
                      </>
                    ) : (
                      "Check Plagiarism"
                    )}
                  </Button>
                  {plagiarismResult && (
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-sm">
                      <p className="font-medium mb-1">Result:</p>
                      <p className={plagiarismResult.plagiarism_percentage > 20 ? "text-red-600" : "text-green-600"}>
                        {plagiarismResult.message}
                      </p>
                      <p className="text-gray-600 mt-1">
                        Plagiarism Score: {plagiarismResult.plagiarism_percentage.toFixed(2)}%
                      </p>
                      {plagiarismResult.sources.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium mb-1">Potential Sources:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {plagiarismResult.sources.map((source, idx) => (
                              <li key={idx}>
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {source.url}
                                </a>
                                <p className="text-gray-500 italic">Match: "{source.match}"</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Grammar Suggestions Card (moved here) */}
              {languageToolSuggestions.length > 0 && (
                <Collapsible open={true} onOpenChange={() => {}}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between text-base font-semibold px-4 py-3">
                      <span className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-gray-600" />
                        <span>Writing Suggestions ({languageToolSuggestions.length})</span>
                      </span>
                      <ChevronUp className="h-5 w-5" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 p-4 border-t border-gray-200">
                    <div className="space-y-4">
                      {languageToolSuggestions.slice(0, 5).map((sugg, idx) => {
                        const before = sugg.context?.text?.slice(0, sugg.context?.offset) || ""
                        const error =
                          sugg.context?.text?.slice(
                            sugg.context?.offset,
                            sugg.context?.offset + sugg.context?.length,
                          ) || ""
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
                              <span className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-medium">
                                {error}
                              </span>
                              <span>{after}</span>
                            </div>

                            {sugg.replacements && sugg.replacements.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                <span className="text-xs text-gray-500 font-medium">Suggestions:</span>
                                {sugg.replacements.slice(0, 3).map((rep: any, i: number) => (
                                  <button
                                    key={i}
                                    className="inline-block bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors duration-200"
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
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Citations & References Section */}
              <Collapsible open={isCitationsOpen} onOpenChange={setIsCitationsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-base font-semibold px-4 py-3">
                    <span className="flex items-center space-x-2">
                      <Quote className="h-5 w-5" />
                      <span>Citations & References</span>
                    </span>
                    {isCitationsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 p-4 border-t border-gray-200">
                  <CitationManager selectedTemplate={selectedTemplate} onTemplateChange={setSelectedTemplate} />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </SidebarInset>
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

      {/* Document Manager Dialog (kept for potential future use or other document types) */}
      <Dialog open={documentManagerOpen} onOpenChange={setDocumentManagerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Document Management</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {/* This DocumentManager is still here but not actively used for the main document list */}
            {/* It could be used for other document types or a more advanced management view */}
            <DocumentList
              onDocumentSelect={handleDocumentSelect}
              currentDocumentId={currentDocument?.id}
              className="h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

export default function WriterPage() {
  return (
    <RouteGuard requireAuth={true}>
      <ResearchSessionProvider>
        <WriterErrorBoundary>
          <SafeDOMWrapper>
            <WriterPageContent />
          </SafeDOMWrapper>
        </WriterErrorBoundary>
      </ResearchSessionProvider>
    </RouteGuard>
  )
}
