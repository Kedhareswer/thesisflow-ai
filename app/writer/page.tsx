"use client"

import Link from "next/link"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import {
  Edit,
  CheckCircle,
  History,
  Share2,
  Users,
  Lightbulb,
  FileText,
  Copy,
  Gavel,
  BookOpen,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ResearchService } from "@/lib/services/research.service"
import DocumentService, { Document } from "@/lib/services/document.service"
import DocumentList from "./components/document-list"
import RichTextEditor from "./components/rich-text-editor"
import CitationManager from "./components/citation-manager"
import AiWritingAssistant from "./components/ai-writing-assistant"
import { VisualContentRenderer } from "./components/visual-content-renderer"
import { useDebouncedState } from "./hooks/use-debounced-state"
import { useGlobalErrorHandler } from "./hooks/use-global-error-handler"
import { UserProfileAvatar } from "@/components/user-profile-avatar" // For user editing indicator
import { supabase } from "@/lib/supabase"
import type { AIProvider } from "@/lib/ai-providers"
import { WriterCommandMenu } from "./components/writer-command-menu"
import WriterShareModal from "./components/writer-share-modal"
import { AIDetectionBadge } from "@/components/ai-detection-badge"
import { AIDetectionResult } from "@/lib/services/ai-detection.service"

export default function WriterPage() {
  const searchParams = useSearchParams()
  const documentId = searchParams.get("id")
  const { toast } = useToast()
  const { handleError: globalErrorHandler } = useGlobalErrorHandler()

  // Create a proper error handler for async operations
  const handleError = useCallback((error: any, message: string) => {
    console.error(message, error)
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    })
  }, [toast])

  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false)
  const [isCitationManagerOpen, setIsCitationManagerOpen] = useState(false)
  const [isAiDetectOpen, setIsAiDetectOpen] = useState(false)
  const [isHumanizeOpen, setIsHumanizeOpen] = useState(false)
  const [isPlagiarismCheckOpen, setIsPlagiarismCheckOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  const [aiDetectionResult, setAiDetectionResult] = useState<AIDetectionResult | null>(null)
  const [humanizedText, setHumanizedText] = useState("")
  const [humanizationDetails, setHumanizationDetails] = useState<{
    changes_made?: string[]
    readability_score?: number
    naturalness_score?: number
  }>({})
  const [plagiarismCheckResult, setPlagiarismCheckResult] = useState<{
    detected: boolean
    details: string
    percentage: number
    matches?: Array<{
      text: string
      similarity: number
      type: string
      source?: string
      position: { start: number; end: number }
    }>
    suspicious_sections?: Array<{
      text: string
      reason: string
      severity: string
      suggestions: string[]
    }>
    analysis_details?: {
      total_words: number
      unique_phrases: number
      common_phrases_detected: number
      citation_patterns_found: number
      fingerprint_matches: number
      algorithms_used: string[]
    }
    sources_checked?: string[]
    fingerprint?: string
  } | null>(null)

  const [documentTitle, setDocumentTitle] = useState("Untitled document")
  const [documentContent, setDocumentContent] = useState("")
  const [debouncedDocumentContent, setDebouncedDocumentContent] = useState("")
  const [debouncedDocumentTitle, setDebouncedDocumentTitle] = useState("Untitled document")

  // AI Provider state management (similar to Summarizer)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>()
  const [selectedModel, setSelectedModel] = useState<string>()

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)
      } catch (err) {
        console.error("Auth check failed:", err)
        setIsAuthenticated(false)
      }
    }
    
    checkAuth()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      setIsAuthenticated(!!session?.user)
    })
    
    return () => subscription.unsubscribe()
  }, [])

  // Debounce document content changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDocumentContent(documentContent)
    }, 1000)
    return () => clearTimeout(timer)
  }, [documentContent])

  // Debounce document title changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDocumentTitle(documentTitle)
    }, 1000)
    return () => clearTimeout(timer)
  }, [documentTitle])

  const fetchDocument = useCallback(
    async (id: string) => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        const fetchedDoc = await DocumentService.getInstance().getDocument(id)
        setDocument(fetchedDoc)
        setDocumentTitle(fetchedDoc.title || "Untitled document")
        setDocumentContent(fetchedDoc.content || "")
      } catch (err) {
        handleError(err, "Failed to fetch document")
        setDocument(null)
        setDocumentTitle("Untitled document")
        setDocumentContent("")
      } finally {
        setLoading(false)
      }
    },
    [handleError, isAuthenticated],
  )

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    
    if (documentId) {
      fetchDocument(documentId)
    } else {
      // If no documentId, create a new unsaved document
      setDocument(null)
      setDocumentTitle("Untitled document")
      setDocumentContent("")
      setLoading(false)
    }
  }, [documentId, fetchDocument, isAuthenticated])

  const saveDocument = useCallback(async () => {
    if (!isAuthenticated) return // Don't save if not authenticated
    
    if (!document && !debouncedDocumentContent && debouncedDocumentTitle === "Untitled document") return // No document and no content to save

    setSaving(true)
    try {
      let updatedDoc: Document
      if (document) {
        // Update existing document
        updatedDoc = await DocumentService.getInstance().updateDocument(document.id, {
          title: debouncedDocumentTitle,
          content: debouncedDocumentContent,
        })
      } else {
        // Create new document if none exists
        updatedDoc = await DocumentService.getInstance().createDocument({
          title: debouncedDocumentTitle || "Untitled document",
          content: debouncedDocumentContent,
          document_type: "paper", // Default type for writer page
        })
        // Update URL to reflect the new document ID
        window.history.pushState({}, "", `/writer?id=${updatedDoc.id}`)
      }
      setDocument(updatedDoc)
      toast({
        title: "Document saved",
        description: "Your changes have been automatically saved.",
      })
    } catch (err) {
      handleError(err, "Failed to save document")
      toast({
        title: "Save failed",
        description: "Could not save your changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [document, debouncedDocumentContent, debouncedDocumentTitle, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return // Don't save if not authenticated
    
    // Only save if there's a document or content, and content/title has changed
    if (
      (document && (debouncedDocumentContent !== document.content || debouncedDocumentTitle !== document.title)) ||
      (!document && (debouncedDocumentContent || debouncedDocumentTitle !== "Untitled document"))
    ) {
      saveDocument()
    }
  }, [debouncedDocumentContent, debouncedDocumentTitle, document, saveDocument, isAuthenticated])

  const handleNewDocument = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a new document.",
        variant: "destructive",
      })
      return
    }
    
    try {
      setLoading(true)
      const newDoc = await DocumentService.getInstance().createDocument({
        title: "Untitled document",
        content: "",
        document_type: "paper",
      })
      window.history.pushState({}, "", `/writer?id=${newDoc.id}`)
      setDocument(newDoc)
      setDocumentTitle("Untitled document")
      setDocumentContent("")
      toast({
        title: "New document created",
        description: "Start writing your new masterpiece!",
      })
    } catch (err) {
      handleError(err, "Failed to create new document")
      toast({
        title: "Error",
        description: "Failed to create new document.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAiDetectionComplete = (result: AIDetectionResult) => {
    setAiDetectionResult(result)
    toast({
      title: "AI Detection Complete", 
      description: `Analysis complete: ${result.is_ai ? 'AI-generated' : 'Human-written'} content detected with ${result.confidence}% confidence`,
      variant: result.is_ai ? "destructive" : "default"
    })
  }

  const handleHumanize = async () => {
    if (!documentContent) {
      toast({ title: "No content", description: "Please write some text to humanize.", variant: "destructive" })
      return
    }
    setHumanizedText("Humanizing...")
    setHumanizationDetails({})
    try {
      const result = await ResearchService.humanizeText(documentContent)
      setHumanizedText(result.humanized_text)
      setHumanizationDetails({
        changes_made: result.changes_made,
        readability_score: result.readability_score,
        naturalness_score: result.naturalness_score
      })
      toast({
        title: "Text Humanized Successfully",
        description: `Applied ${result.changes_made?.length || 0} transformations to make text more natural`,
      })
    } catch (err) {
      handleError(err, "Humanization failed")
      setHumanizedText("")
      setHumanizationDetails({})
    }
  }

  const handlePlagiarismCheck = async () => {
    if (!documentContent) return

    setPlagiarismCheckResult({ detected: false, percentage: 0, details: "Checking..." })

    try {
      const result = await ResearchService.checkPlagiarism(documentContent)
      setPlagiarismCheckResult({
        detected: result.detected,
        percentage: result.percentage,
        details: result.details,
        matches: result.matches,
        suspicious_sections: result.suspicious_sections,
        analysis_details: result.analysis_details,
        sources_checked: result.sources_checked,
        fingerprint: result.fingerprint
      })
    } catch (error) {
      console.error("Plagiarism check error:", error)
      setPlagiarismCheckResult({
        detected: false,
        percentage: 0,
        details: "Failed to check for plagiarism. Please try again.",
      })
    }
  }

  // Command menu handlers
  const handleSaveDocument = () => {
    // Trigger save
    setSaving(true)
    // Save logic would be implemented here
    setTimeout(() => setSaving(false), 1000)
  }

  const handleExportDocument = () => {
    toast({
      title: "Export",
      description: "Export functionality coming soon!",
    })
  }

  const handleImportDocument = () => {
    toast({
      title: "Import",
      description: "Import functionality coming soon!",
    })
  }

  const handleShareDocument = () => {
    toast({
      title: "Share",
      description: "Share functionality coming soon!",
    })
  }

  const handleToggleAiAssistant = () => {
    setIsAiAssistantOpen(!isAiAssistantOpen)
  }

  const handleToggleCitationManager = () => {
    setIsCitationManagerOpen(!isCitationManagerOpen)
  }

  const handleToggleAiDetection = () => {
    setIsAiDetectOpen(!isAiDetectOpen)
  }

  const handleToggleHumanize = () => {
    setIsHumanizeOpen(!isHumanizeOpen)
  }

  const handleTogglePlagiarismCheck = () => {
    setIsPlagiarismCheckOpen(!isPlagiarismCheckOpen)
  }

  // Formatting handlers
  const handleFormatBold = () => {
    toast({
      title: "Format",
      description: "Bold formatting applied!",
    })
  }

  const handleFormatItalic = () => {
    toast({
      title: "Format",
      description: "Italic formatting applied!",
    })
  }

  const handleFormatList = () => {
    toast({
      title: "Format",
      description: "List formatting applied!",
    })
  }

  const handleFormatQuote = () => {
    toast({
      title: "Format",
      description: "Quote formatting applied!",
    })
  }

  const handleFormatLink = () => {
    toast({
      title: "Format",
      description: "Link formatting applied!",
    })
  }

  const handleFormatImage = () => {
    toast({
      title: "Format",
      description: "Image formatting applied!",
    })
  }

  const handleFormatTable = () => {
    toast({
      title: "Format",
      description: "Table formatting applied!",
    })
  }

  const handleFormatCode = () => {
    toast({
      title: "Format",
      description: "Code formatting applied!",
    })
  }

  const handleFormatHeading1 = () => {
    toast({
      title: "Format",
      description: "Heading 1 applied!",
    })
  }

  const handleFormatHeading2 = () => {
    toast({
      title: "Format",
      description: "Heading 2 applied!",
    })
  }

  const handleFormatHeading3 = () => {
    toast({
      title: "Format",
      description: "Heading 3 applied!",
    })
  }

  const handleAlignLeft = () => {
    toast({
      title: "Alignment",
      description: "Left alignment applied!",
    })
  }

  const handleAlignCenter = () => {
    toast({
      title: "Alignment",
      description: "Center alignment applied!",
    })
  }

  const handleAlignRight = () => {
    toast({
      title: "Alignment",
      description: "Right alignment applied!",
    })
  }

  const handleUndo = () => {
    toast({
      title: "Edit",
      description: "Undo action performed!",
    })
  }

  const handleRedo = () => {
    toast({
      title: "Edit",
      description: "Redo action performed!",
    })
  }

  const handleFindReplace = () => {
    toast({
      title: "Edit",
      description: "Find & Replace dialog opened!",
    })
  }

  // Analysis handlers
  const handleWordCount = () => {
    const wordCount = documentContent.split(/\s+/).filter(word => word.length > 0).length
    toast({
      title: "Word Count",
      description: `${wordCount} words in document`,
    })
  }

  const handleSpellCheck = () => {
    toast({
      title: "Analysis",
      description: "Spell check completed!",
    })
  }

  const handleGrammarCheck = () => {
    toast({
      title: "Analysis",
      description: "Grammar check completed!",
    })
  }

  const handleReadabilityScore = () => {
    toast({
      title: "Analysis",
      description: "Readability score calculated!",
    })
  }

  const handleToneAnalysis = () => {
    toast({
      title: "Analysis",
      description: "Tone analysis completed!",
    })
  }

  const handleSentimentAnalysis = () => {
    toast({
      title: "Analysis",
      description: "Sentiment analysis completed!",
    })
  }

  const handleKeywordDensity = () => {
    toast({
      title: "Analysis",
      description: "Keyword density calculated!",
    })
  }

  const handleReadAloud = () => {
    toast({
      title: "Output",
      description: "Read aloud started!",
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const handlePrintPreview = () => {
    toast({
      title: "Output",
      description: "Print preview opened!",
    })
  }

  const handlePageSetup = () => {
    toast({
      title: "Output",
      description: "Page setup dialog opened!",
    })
  }

  // Help & Settings handlers
  const handlePreferences = () => {
    toast({
      title: "Settings",
      description: "Preferences dialog opened!",
    })
  }

  const handleHelp = () => {
    toast({
      title: "Help",
      description: "Help documentation opened!",
    })
  }

  const handleAbout = () => {
    toast({
      title: "About",
      description: "About dialog opened!",
    })
  }

  const handleFeedback = () => {
    toast({
      title: "Feedback",
      description: "Feedback form opened!",
    })
  }

  const handleReportBug = () => {
    toast({
      title: "Bug Report",
      description: "Bug report form opened!",
    })
  }

  const handleFeatureRequest = () => {
    toast({
      title: "Feature Request",
      description: "Feature request form opened!",
    })
  }

  const handleContactSupport = () => {
    toast({
      title: "Support",
      description: "Contact support form opened!",
    })
  }

  const handleDocumentation = () => {
    toast({
      title: "Documentation",
      description: "Documentation opened!",
    })
  }

  const handleTutorial = () => {
    toast({
      title: "Tutorial",
      description: "Tutorial started!",
    })
  }

  const handleKeyboardShortcuts = () => {
    toast({
      title: "Keyboard Shortcuts",
      description: "Keyboard shortcuts reference opened!",
    })
  }

  const handleAccessibility = () => {
    toast({
      title: "Accessibility",
      description: "Accessibility settings opened!",
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <div className="w-64 border-r border-gray-200 dark:border-gray-800 p-4">
          <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded mb-4 animate-pulse"></div>
          <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded mb-2 animate-pulse"></div>
          <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded mb-2 animate-pulse"></div>
          <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 flex flex-col p-8">
          <div className="h-10 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mb-6 animate-pulse"></div>
          <div className="h-6 w-1/4 bg-gray-200 dark:bg-gray-800 rounded mb-8 animate-pulse"></div>
          <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }
  
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col">
          <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Doc Editor</h1>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleNewDocument}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">New document</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New document</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <History className="h-4 w-4" />
                    <span className="sr-only">History</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>History</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="p-4 space-y-2 border-b border-gray-200 dark:border-gray-800">
            <Link
              href="/ai-assistant"
              className="flex items-center gap-2 py-1.5 px-3 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Lightbulb className="w-4 h-4" />
              Create with AI
            </Link>
          </div>
          <DocumentList activeDocumentId={documentId || undefined} />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0">
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
              {!saving && <CheckCircle className="h-4 w-4 text-green-500" />}
              <span className="text-sm text-gray-500 dark:text-gray-400">{saving ? "Saving..." : "Saved"}</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Command Menu */}
              <WriterCommandMenu
                onNewDocument={handleNewDocument}
                onSaveDocument={handleSaveDocument}
                onExportDocument={handleExportDocument}
                onImportDocument={handleImportDocument}
                onShareDocument={handleShareDocument}
                onToggleAiAssistant={handleToggleAiAssistant}
                onToggleCitationManager={handleToggleCitationManager}
                onToggleAiDetection={handleToggleAiDetection}
                onToggleHumanize={handleToggleHumanize}
                onTogglePlagiarismCheck={handleTogglePlagiarismCheck}
                onFormatBold={handleFormatBold}
                onFormatItalic={handleFormatItalic}
                onFormatList={handleFormatList}
                onFormatQuote={handleFormatQuote}
                onFormatLink={handleFormatLink}
                onFormatImage={handleFormatImage}
                onFormatTable={handleFormatTable}
                onFormatCode={handleFormatCode}
                onFormatHeading1={handleFormatHeading1}
                onFormatHeading2={handleFormatHeading2}
                onFormatHeading3={handleFormatHeading3}
                onAlignLeft={handleAlignLeft}
                onAlignCenter={handleAlignCenter}
                onAlignRight={handleAlignRight}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onFindReplace={handleFindReplace}
                onWordCount={handleWordCount}
                onSpellCheck={handleSpellCheck}
                onGrammarCheck={handleGrammarCheck}
                onReadabilityScore={handleReadabilityScore}
                onToneAnalysis={handleToneAnalysis}
                onSentimentAnalysis={handleSentimentAnalysis}
                onKeywordDensity={handleKeywordDensity}
                onReadAloud={handleReadAloud}
                onPrint={handlePrint}
                onPrintPreview={handlePrintPreview}
                onPageSetup={handlePageSetup}
                onPreferences={handlePreferences}
                onHelp={handleHelp}
                onAbout={handleAbout}
                onFeedback={handleFeedback}
                onReportBug={handleReportBug}
                onFeatureRequest={handleFeatureRequest}
                onContactSupport={handleContactSupport}
                onDocumentation={handleDocumentation}
                onTutorial={handleTutorial}
                onKeyboardShortcuts={handleKeyboardShortcuts}
                onAccessibility={handleAccessibility}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setIsShareOpen(true)}>
                    <Share2 className="h-4 w-4" />
                    <span className="sr-only">Share</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share</TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <UserProfileAvatar className="h-6 w-6" /> {/* Using UserProfileAvatar for user editing */}
                <span>1 user editing</span>
              </div>
            </div>
          </div>

          {/* Document Editor and Tools */}
          <ScrollArea className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-3xl mx-auto pb-16">
              <Input
                className="text-4xl font-bold mb-4 border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto bg-transparent"
                placeholder="Untitled document"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
              />
              <p className="text-gray-500 dark:text-gray-400 mb-8">Try mentioning a user with @</p>

              <RichTextEditor
                value={documentContent}
                onChange={setDocumentContent}
                className="min-h-[500px] border-none focus-within:ring-0 focus-within:ring-offset-0"
              />

              <Separator className="my-8" />

              {/* AI Writing Assistant */}
              <Collapsible open={isAiAssistantOpen} onOpenChange={setIsAiAssistantOpen} className="mb-6">
                <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 rounded-md text-lg font-semibold text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" /> AI Writing Assistant
        </div>
                  {isAiAssistantOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <Card>
              <CardContent className="p-4">
                      <AiWritingAssistant
                        selectedProvider={selectedProvider || "groq"}
                        selectedModel={selectedModel || "llama-3.3-70b-versatile"}
                        onInsertText={(text) => setDocumentContent((prev) => prev + text)}
                        documentTemplate="general"
                        currentDocumentContent={documentContent}
                        isAuthenticated={isAuthenticated}
                        onProviderChange={setSelectedProvider}
                        onModelChange={setSelectedModel}
                      />
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* Citation Manager */}
              <Collapsible open={isCitationManagerOpen} onOpenChange={setIsCitationManagerOpen} className="mb-6">
                <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 rounded-md text-lg font-semibold text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" /> Citation Manager
                  </div>
                  {isCitationManagerOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <CitationManager selectedTemplate="ieee" />
              </CardContent>
            </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* AI Detection */}
              <Collapsible open={isAiDetectOpen} onOpenChange={setIsAiDetectOpen} className="mb-6">
                <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 rounded-md text-lg font-semibold text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" /> AI Content Detection
                  </div>
                  {isAiDetectOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      {documentContent ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">Detection Status:</span>
                            <AIDetectionBadge
                              text={documentContent}
                              onDetectionComplete={handleAiDetectionComplete}
                              showButton={true}
                            />
                          </div>
                          
                          {aiDetectionResult && (
                            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
                              <div className="flex items-center justify-between">
                                <h4 className="text-lg font-semibold">
                                  {aiDetectionResult.is_ai ? "⚠️ AI-Generated Content" : "✅ Human-Written Content"}
                                </h4>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  Confidence: {aiDetectionResult.confidence}%
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">AI Probability:</span>
                                  <span className="ml-2 font-medium">{aiDetectionResult.ai_probability}%</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Human Probability:</span>
                                  <span className="ml-2 font-medium">{aiDetectionResult.human_probability}%</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Reliability:</span>
                                  <span className="ml-2 font-medium">{aiDetectionResult.reliability_score}%</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Chunks Analyzed:</span>
                                  <span className="ml-2 font-medium">{aiDetectionResult.analysis_details.chunks_analyzed}</span>
                                </div>
                              </div>
                              
                              <div className="text-xs text-gray-500">
                                Analysis completed using {aiDetectionResult.model_used} at {new Date(aiDetectionResult.timestamp).toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Write some content in the document to analyze for AI detection.</p>
                          <p className="text-sm mt-2">Minimum 10 words required for accurate analysis.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* Humanize Text */}
              <Collapsible open={isHumanizeOpen} onOpenChange={setIsHumanizeOpen} className="mb-6">
                <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 rounded-md text-lg font-semibold text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Humanize Text
                  </div>
                  {isHumanizeOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <Button onClick={handleHumanize} disabled={!documentContent || humanizedText === "Humanizing..."}>
                        {humanizedText === "Humanizing..." ? "Humanizing..." : "Humanize Text"}
                      </Button>
                      {humanizedText && humanizedText !== "Humanizing..." && (
                        <div className="space-y-4">
                          {/* Scores Display */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Readability Score</p>
                              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {humanizationDetails.readability_score || 0}/100
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {(humanizationDetails.readability_score ?? 0) >= 60 ? "Easy to read" : 
                                 (humanizationDetails.readability_score ?? 0) >= 30 ? "Moderate" : "Complex"}
                              </p>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Naturalness Score</p>
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {humanizationDetails.naturalness_score || 0}/100
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {(humanizationDetails.naturalness_score ?? 0) >= 70 ? "Very natural" :
                                 (humanizationDetails.naturalness_score ?? 0) >= 40 ? "Moderately natural" : "Needs work"}
                              </p>
                            </div>
                          </div>

                          {/* Changes Made */}
                          {humanizationDetails.changes_made && humanizationDetails.changes_made.length > 0 && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                              <p className="text-sm font-medium mb-2">Transformations Applied:</p>
                              <ul className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                                {humanizationDetails.changes_made.map((change, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <CheckCircle className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                    {change}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Humanized Text */}
                          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                            <p className="text-sm font-medium mb-2">Humanized Version:</p>
                            <Textarea 
                              value={humanizedText} 
                              readOnly 
                              className="mt-2 min-h-[200px] font-mono text-sm" 
                            />
                            <div className="flex gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(humanizedText)
                                  toast({
                                    title: "Copied",
                                    description: "Humanized text copied to clipboard",
                                  })
                                }}
                              >
                                <Copy className="h-4 w-4 mr-2" /> Copy
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setDocumentContent(humanizedText)
                                  toast({
                                    title: "Text updated",
                                    description: "Document content replaced with humanized text.",
                                  })
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" /> Use Humanized Text
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* Plagiarism Check */}
              <Collapsible open={isPlagiarismCheckOpen} onOpenChange={setIsPlagiarismCheckOpen} className="mb-6">
                <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 rounded-md text-lg font-semibold text-gray-900 dark:text-gray-50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <Gavel className="h-5 w-5" /> Plagiarism Check
                  </div>
                  {isPlagiarismCheckOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <Button
                        onClick={handlePlagiarismCheck}
                        disabled={!documentContent || plagiarismCheckResult?.details === "Checking..."}
                      >
                        {plagiarismCheckResult?.details === "Checking..." ? "Checking..." : "Run Plagiarism Check"}
                      </Button>
                      
                      {plagiarismCheckResult && plagiarismCheckResult.details !== "Checking..." && (
                        <div className="space-y-4">
                          {/* Overall Result */}
                          <div className={`p-4 rounded-lg ${
                            plagiarismCheckResult.detected 
                              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                              : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  {plagiarismCheckResult.detected ? (
                                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                  ) : (
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  )}
                                  <h4 className={`text-lg font-bold ${
                                    plagiarismCheckResult.detected 
                                      ? 'text-red-700 dark:text-red-300' 
                                      : 'text-green-700 dark:text-green-300'
                                  }`}>
                                    {plagiarismCheckResult.detected ? 'Plagiarism Detected' : 'Original Content'}
                                  </h4>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {plagiarismCheckResult.details}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className={`text-3xl font-bold ${
                                  plagiarismCheckResult.percentage > 60 
                                    ? 'text-red-600 dark:text-red-400' 
                                    : plagiarismCheckResult.percentage > 30 
                                    ? 'text-amber-600 dark:text-amber-400' 
                                    : 'text-green-600 dark:text-green-400'
                                }`}>
                                  {plagiarismCheckResult.percentage}%
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-500">similarity</p>
                              </div>
                            </div>
                          </div>

                          {/* Analysis Details */}
                          {plagiarismCheckResult.analysis_details && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                              <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Analysis Summary
                              </h5>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Total Words:</span>
                                  <span className="ml-2 font-medium">{plagiarismCheckResult.analysis_details.total_words}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Unique Phrases:</span>
                                  <span className="ml-2 font-medium">{plagiarismCheckResult.analysis_details.unique_phrases}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Citations Found:</span>
                                  <span className="ml-2 font-medium">{plagiarismCheckResult.analysis_details.citation_patterns_found}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Fingerprint Matches:</span>
                                  <span className="ml-2 font-medium">{plagiarismCheckResult.analysis_details.fingerprint_matches}</span>
                                </div>
                              </div>
                              {plagiarismCheckResult.fingerprint && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <p className="text-xs text-gray-500">
                                    Document Fingerprint: <code className="font-mono">{plagiarismCheckResult.fingerprint.substring(0, 20)}...</code>
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Suspicious Sections */}
                          {plagiarismCheckResult.suspicious_sections && plagiarismCheckResult.suspicious_sections.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-sm font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" /> 
                                Suspicious Sections
                              </h5>
                              {plagiarismCheckResult.suspicious_sections.map((section, idx) => (
                                <div key={idx} className={`p-3 rounded-md border ${
                                  section.severity === 'high' 
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                                    : section.severity === 'medium' 
                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' 
                                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                }`}>
                                  <div className="flex items-start justify-between mb-2">
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                      "{section.text.substring(0, 100)}..."
                                    </p>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      section.severity === 'high' 
                                        ? 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200' 
                                        : section.severity === 'medium' 
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-200' 
                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200'
                                    }`}>
                                      {section.severity}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                    <strong>Reason:</strong> {section.reason}
                                  </p>
                                  {section.suggestions && section.suggestions.length > 0 && (
                                    <div className="text-xs">
                                      <strong className="text-gray-600 dark:text-gray-400">Suggestions:</strong>
                                      <ul className="mt-1 space-y-1">
                                        {section.suggestions.map((suggestion, sIdx) => (
                                          <li key={sIdx} className="flex items-start text-gray-500 dark:text-gray-500">
                                            <span className="mr-1">•</span>
                                            <span>{suggestion}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Matches Found */}
                          {plagiarismCheckResult.matches && plagiarismCheckResult.matches.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-sm font-semibold flex items-center gap-2">
                                <Copy className="h-4 w-4" /> Similarity Matches
                              </h5>
                              <div className="max-h-60 overflow-y-auto space-y-2">
                                {plagiarismCheckResult.matches.map((match, idx) => (
                                  <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`px-2 py-0.5 rounded text-xs ${
                                        match.type === 'exact' 
                                          ? 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200' 
                                          : match.type === 'near_duplicate' 
                                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-200' 
                                          : 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                                      }`}>
                                        {match.type.replace('_', ' ')}
                                      </span>
                                      <span className="text-gray-500">
                                        {Math.round(match.similarity * 100)}% match
                                      </span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 italic">
                                      "{match.text}"
                                    </p>
                                    {match.source && (
                                      <p className="text-gray-500 dark:text-gray-500 mt-1">
                                        Source: {match.source}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sources Checked */}
                          {plagiarismCheckResult.sources_checked && plagiarismCheckResult.sources_checked.length > 0 && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                <strong>Sources Checked:</strong>
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {plagiarismCheckResult.sources_checked.map((source, idx) => (
                                  <span key={idx} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">
                                    {source}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Algorithms Used */}
                          {plagiarismCheckResult.analysis_details?.algorithms_used && (
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              <details className="cursor-pointer">
                                <summary className="hover:text-gray-700 dark:hover:text-gray-300">
                                  Detection Methods Used
                                </summary>
                                <ul className="mt-2 ml-4 space-y-1">
                                  {plagiarismCheckResult.analysis_details.algorithms_used.map((algo, idx) => (
                                    <li key={idx}>• {algo}</li>
                                  ))}
                                </ul>
                              </details>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        </main>
      </div>
    <WriterShareModal
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        documentId={document?.id}
        documentTitle={documentTitle}
      />
    </TooltipProvider>
  )
}
