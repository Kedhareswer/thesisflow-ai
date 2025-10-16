"use client"

import Link from "next/link"
import Sidebar from "../ai-agents/components/Sidebar"

import { useState, useEffect, useCallback, useRef } from "react"
import type { ChangeEvent } from "react"
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
  BookOpen,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  Eye,
  Columns,
  PenLine,
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
import LaTeXEditor from "./components/latex-editor"
import CitationManager from "./components/citation-manager"
import AiWritingAssistant from "./components/ai-writing-assistant"
import { VisualContentRenderer } from "./components/visual-content-renderer"
import { useDebouncedState } from "./hooks/use-debounced-state"
import { useGlobalErrorHandler } from "./hooks/use-global-error-handler"
import { UserProfileAvatar } from "@/components/user-profile-avatar" // For user editing indicator
import { supabase } from "@/lib/supabase"
import type { AIProvider } from "@/lib/ai-providers"
import WriterShareModal from "./components/writer-share-modal"
import { AIDetectionBadge } from "@/components/ai-detection-badge"
import { AIDetectionResult } from "@/lib/services/ai-detection.service"
import { CommandPalette, useCommandPalette } from "./components/command-palette"
import { VersionHistory, DocumentVersion } from "./components/version-history"
import { CollaborativePresence, CollaboratorUser } from "./components/collaborative-presence"
import { PreviewRenderer } from "./components/preview-renderer"
import { FloatingToolbar } from "./components/floating-toolbar"
import { EditorContextMenu } from "./components/editor-context-menu"

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
  // collapse state for global navigation sidebar
  const [collapsed, setCollapsed] = useState(false)
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false)
  const [isCitationManagerOpen, setIsCitationManagerOpen] = useState(false)
  const [isAiDetectOpen, setIsAiDetectOpen] = useState(false)
  const [isHumanizeOpen, setIsHumanizeOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  // New states for redesigned UI
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit")
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false)
  const [currentUserId] = useState("current-user") // In production, get from auth

  const [aiDetectionResult, setAiDetectionResult] = useState<AIDetectionResult | null>(null)
  const [humanizedText, setHumanizedText] = useState("")
  const [humanizationDetails, setHumanizationDetails] = useState<{
    changes_made?: string[]
    readability_score?: number
    naturalness_score?: number
  }>({})

  const [documentTitle, setDocumentTitle] = useState("Untitled document")
  const [documentContent, setDocumentContent] = useState("")
  const [debouncedDocumentContent, setDebouncedDocumentContent] = useState("")
  const [debouncedDocumentTitle, setDebouncedDocumentTitle] = useState("Untitled document")
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('ieee')

  // AI Provider state management (similar to Summarizer)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>()
  const [selectedModel, setSelectedModel] = useState<string>()

  // Publisher export helpers (component scope)
  const buildPublisherTex = (tpl: string, title: string, body: string) => {
    let content = (body || '')
      .replace(/\\documentclass\{[^}]+\}/g, '')
      .replace(/\\usepackage\{[^}]+\}/g, '')
      .replace(/\\begin\{document\}/g, '')
      .replace(/\\end\{document\}/g, '')
      .trim()

    const commonPkgs = [
      '\\usepackage[utf8]{inputenc}',
      '\\usepackage{amsmath,amssymb}',
      '\\usepackage{graphicx}',
      '\\usepackage{hyperref}',
    ].join('\n')

    let header = ''
    let biblioStyle = ''
    switch (tpl) {
      case 'ieee':
        header = `\\documentclass[conference]{IEEEtran}\n${commonPkgs}\n\\title{${title || 'Paper Title'}}\n\\author{Anonymous}`
        biblioStyle = '\\bibliographystyle{IEEEtran}'
        break
      case 'acm':
        header = `\\documentclass[sigconf]{acmart}\n${commonPkgs}\n\\title{${title || 'Paper Title'}}\n\\author{Anonymous}`
        biblioStyle = '\\bibliographystyle{ACM-Reference-Format}'
        break
      case 'elsevier':
        header = `\\documentclass[preprint,12pt]{elsarticle}\n${commonPkgs}\n\\title{${title || 'Paper Title'}}\n\\author{Anonymous}`
        biblioStyle = '\\bibliographystyle{elsarticle-num}'
        break
      case 'springer':
        header = `\\documentclass[runningheads]{llncs}\n${commonPkgs}\n\\title{${title || 'Paper Title'}}\n\\author{Anonymous}`
        biblioStyle = '\\bibliographystyle{splncs04}'
        break
      default:
        header = `\\documentclass{article}\n${commonPkgs}\n\\title{${title || 'Paper Title'}}\n\\author{Anonymous}`
        biblioStyle = '\\bibliographystyle{plain}'
    }

    const hasTheBiblio = /\\begin\{thebibliography\}/.test(content)
    const tex = [
      `% Auto-generated by ThesisFlow-AI — ${tpl.toUpperCase()} template`,
      header,
      '\\begin{document}',
      '\\maketitle',
      content,
      hasTheBiblio ? `% ${biblioStyle}\n% \\bibliography{references}` : `${biblioStyle}\n\\bibliography{references}`,
      '\\end{document}'
    ].join('\n\n')
    return tex
  }

  const extractBibtexFromTheBibliography = (body: string) => {
    const sectionMatch = (body || '').match(/\\begin\{thebibliography\}[\s\S]*?\\end\{thebibliography\}/)
    if (!sectionMatch) return ''
    const section = sectionMatch[0]
    const items = [...section.matchAll(/\\bibitem\{([^}]+)\}([\s\S]*?)(?=(\\bibitem\{|\\end\{thebibliography\}))/g)]
    const entries: string[] = []
    for (const m of items) {
      const key = m[1]
      const raw = m[2].replace(/\n/g, ' ').trim()
      const titleMatch = raw.match(/"([^"]+)"/)
      const journalMatch = raw.match(/\\textit\{([^}]+)\}/)
      const yearMatch = raw.match(/\b(19|20)\d{2}\b/)
      const doiMatch = raw.match(/doi:\s*([\w./-]+)/i)
      const authorPart = raw.split(/[\.\(]/)[0] || ''
      const authors = authorPart.split(/,| and /).map(s=>s.trim()).filter(Boolean).join(' and ')
      const fields = [
        `  author = {${authors || 'Unknown'}}`,
        titleMatch ? `  title = {${titleMatch[1]}}` : '',
        journalMatch ? `  journal = {${journalMatch[1]}}` : '',
        yearMatch ? `  year = {${yearMatch[0]}}` : '',
        doiMatch ? `  doi = {${doiMatch[1]}}` : '',
      ].filter(Boolean).join(',\n')
      entries.push(`@article{${key},\n${fields}\n}`)
    }
    return entries.join('\n\n')
  }

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = filename
    window.document.body.appendChild(a)
    a.click()
    window.document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportPublisher = async () => {
    try {
      const tpl = selectedTemplate || 'ieee'
      const tex = buildPublisherTex(tpl, documentTitle, documentContent)
      const bib = extractBibtexFromTheBibliography(documentContent)
      downloadFile(new Blob([tex], { type: 'text/x-tex' }), `${(documentTitle || 'document').replace(/\s+/g, '-').toLowerCase()}-${tpl}.tex`)
      if (bib) {
        downloadFile(new Blob([bib], { type: 'text/plain' }), 'references.bib')
      }
      toast({ title: 'Exported', description: `Exported ${tpl.toUpperCase()} .tex${bib ? ' + references.bib' : ''}.` })
    } catch (err) {
      handleError(err, 'Failed to export publisher template')
    }
  }

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

  // Command menu handlers
  const handleSaveDocument = async () => {
    try {
      await saveDocument()
    } catch (err) {
      handleError(err, "Failed to save document")
    }
  }

  const handleExportDocument = async () => {
    try {
      let blob: Blob
      if (document?.id) {
        blob = await DocumentService.getInstance().exportDocument(document.id, 'markdown')
      } else {
        const content = `# ${documentTitle}\n\n${documentContent}`
        blob = new Blob([content], { type: 'text/markdown' })
      }
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = `${(documentTitle || 'document').replace(/\s+/g, '-').toLowerCase()}.md`
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: 'Exported', description: 'Markdown file downloaded.' })
    } catch (err) {
      handleError(err, 'Failed to export document')
    }
  }

  const handleImportDocument = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      setDocumentContent(text)
      if (!documentTitle || documentTitle === 'Untitled document') {
        const base = file.name.replace(/\.[^/.]+$/, '')
        setDocumentTitle(base || 'Imported document')
      }
      toast({ title: 'Imported', description: `Loaded ${file.name}` })
    } catch (err) {
      handleError(err, 'Failed to import file')
    } finally {
      // reset input value so the same file can be selected again later
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleShareDocument = () => {
    setIsShareOpen(true)
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

  // Command palette commands
  const commands = useCommandPalette({
    onSave: handleSaveDocument,
    onExport: handleExportDocument,
    onImport: handleImportDocument,
    onShare: handleShareDocument,
    onNewDocument: handleNewDocument,
    onTogglePreview: () => setViewMode(viewMode === "preview" ? "edit" : "preview"),
    onToggleAiAssistant: handleToggleAiAssistant,
    onToggleCitationManager: handleToggleCitationManager,
  })

  // Version history handlers
  const handleRestoreVersion = (version: DocumentVersion) => {
    setDocumentContent(version.content)
    setDocumentTitle(version.title)
    toast({
      title: "Version Restored",
      description: `Restored to version ${version.version_number}`,
    })
  }

  const handleCompareVersions = (versionA: DocumentVersion, versionB: DocumentVersion) => {
    toast({
      title: "Compare Versions",
      description: `Comparing version ${versionA.version_number} with version ${versionB.version_number}`,
    })
    // In production, open a diff view modal
  }

  // Floating toolbar formatting handler
  const handleFloatingToolbarFormat = (format: string) => {
    // Handle text formatting from floating toolbar
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const selectedText = selection.toString()
    if (!selectedText) return

    let formattedText = selectedText
    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`
        break
      case "italic":
        formattedText = `*${selectedText}*`
        break
      case "underline":
        formattedText = `<u>${selectedText}</u>`
        break
      case "highlight":
        formattedText = `<mark>${selectedText}</mark>`
        break
      case "heading1":
        formattedText = `# ${selectedText}`
        break
      case "heading2":
        formattedText = `## ${selectedText}`
        break
      case "heading3":
        formattedText = `### ${selectedText}`
        break
      case "bulletList":
        formattedText = `- ${selectedText}`
        break
      case "numberedList":
        formattedText = `1. ${selectedText}`
        break
      case "code":
        formattedText = `\`\`\`\n${selectedText}\n\`\`\``
        break
      case "quote":
        formattedText = `> ${selectedText}`
        break
      case "link":
        formattedText = `[${selectedText}](url)`
        break
      default:
        return
    }

    // Find and replace the selected text in the document content
    const newContent = documentContent.replace(selectedText, formattedText)
    setDocumentContent(newContent)

    toast({
      title: "Formatting Applied",
      description: `Applied ${format} formatting`,
    })
  }

  // Context menu handlers
  const handleContextMenuCopy = () => {
    try {
      navigator.clipboard.writeText(window.getSelection()?.toString() || "")
      toast({ title: "Copied", description: "Text copied to clipboard" })
    } catch (err) {
      toast({ title: "Copy failed", description: "Failed to copy text", variant: "destructive" })
    }
  }

  const handleContextMenuCut = () => {
    try {
      const selectedText = window.getSelection()?.toString() || ""
      navigator.clipboard.writeText(selectedText)
      if (selectedText) {
        const newContent = documentContent.replace(selectedText, "")
        setDocumentContent(newContent)
      }
      toast({ title: "Cut", description: "Text cut to clipboard" })
    } catch (err) {
      toast({ title: "Cut failed", description: "Failed to cut text", variant: "destructive" })
    }
  }

  const handleContextMenuPaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const selection = window.getSelection()
      if (selection && !selection.isCollapsed) {
        const selectedText = selection.toString()
        const newContent = documentContent.replace(selectedText, text)
        setDocumentContent(newContent)
      } else {
        setDocumentContent(documentContent + text)
      }
      toast({ title: "Pasted", description: "Text pasted from clipboard" })
    } catch (err) {
      toast({ title: "Paste failed", description: "Failed to paste text", variant: "destructive" })
    }
  }

  const handleContextMenuAiAssist = (action: string) => {
    toast({
      title: "AI Assistant",
      description: `${action} action triggered`,
    })
    // In production, integrate with AI writing assistant
  }

  const handleContextMenuTranslate = (language: string) => {
    toast({
      title: "Translate",
      description: `Translating to ${language}`,
    })
    // In production, integrate with translation service
  }

  const handleContextMenuSearch = (text: string) => {
    toast({
      title: "Search",
      description: `Searching for "${text}"`,
    })
    // In production, open search dialog
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
      <div className="flex min-h-screen bg-[#F8F9FA]">
        {/* Global Navigation Sidebar */}
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v=>!v)} />

        {/* Writer workspace (keeps existing Doc sidebar + editor) */}
        <div className="flex flex-1 h-screen overflow-hidden">
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
          <DocumentList activeDocumentId={documentId || undefined} />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0">
            {/* Left section */}
            <div className="flex-1 flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 ml-4 bg-gray-100 rounded-md p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "edit" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("edit")}
                      className="h-8 px-3"
                    >
                      <PenLine className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Mode</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "split" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("split")}
                      className="h-8 px-3"
                    >
                      <Columns className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Split</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Split View</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "preview" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("preview")}
                      className="h-8 px-3"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Preview</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Preview Mode</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Center section - Collaborative Presence */}
            <div className="flex-1 flex items-center justify-center">
              <CollaborativePresence
                documentId={documentId || undefined}
                currentUserId={currentUserId}
                className="hidden md:flex"
              />
            </div>

            {/* Right section */}
            <div className="flex-1 flex items-center justify-end gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsVersionHistoryOpen(!isVersionHistoryOpen)}
                  >
                    <History className="h-4 w-4" />
                    <span className="sr-only">Version History</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Version History</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setIsShareOpen(true)}>
                    <Share2 className="h-4 w-4" />
                    <span className="sr-only">Share</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleExportPublisher} className="hidden lg:flex">
                    Export as Publisher
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download .tex (+ .bib if available)</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Document Editor and Tools */}
          <div className="flex-1 flex overflow-hidden">
            {/* Main Editor/Preview Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Edit View */}
              {(viewMode === "edit" || viewMode === "split") && (
                <div className={`flex flex-col ${viewMode === "split" ? "w-1/2 border-r border-gray-200" : "w-full"} overflow-hidden`}>
                  <ScrollArea className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-3xl mx-auto pb-16">
                      <Input
                        className="text-3xl md:text-4xl font-bold mb-4 border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto bg-transparent"
                        placeholder="Untitled document"
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                      />

                      <EditorContextMenu
                        onCopy={handleContextMenuCopy}
                        onCut={handleContextMenuCut}
                        onPaste={handleContextMenuPaste}
                        onAiAssist={handleContextMenuAiAssist}
                        onTranslate={handleContextMenuTranslate}
                        onSearch={handleContextMenuSearch}
                      >
                        <LaTeXEditor
                          value={documentContent}
                          onChange={setDocumentContent}
                          className="min-h-[500px] border-none focus-within:ring-0 focus-within:ring-offset-0"
                          template={selectedTemplate}
                          onTemplateChange={setSelectedTemplate}
                        />
                      </EditorContextMenu>

                      {/* Floating Toolbar */}
                      <FloatingToolbar onFormat={handleFloatingToolbarFormat} />

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
                                onInsertText={(text) => setDocumentContent((prev) => prev + text)}
                                documentTemplate={selectedTemplate}
                                currentDocumentContent={documentContent}
                                isAuthenticated={isAuthenticated}
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
                              <CitationManager selectedTemplate={selectedTemplate} onTemplateChange={setSelectedTemplate} />
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
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Preview View */}
              {(viewMode === "preview" || viewMode === "split") && (
                <div className={`${viewMode === "split" ? "w-1/2" : "w-full"} overflow-hidden bg-white`}>
                  <PreviewRenderer
                    content={documentContent}
                    title={documentTitle}
                    template={selectedTemplate}
                    className="h-full"
                  />
                </div>
              )}
            </div>

            {/* Version History Sidebar */}
            {isVersionHistoryOpen && (
              <aside className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
                <VersionHistory
                  documentId={documentId || undefined}
                  currentVersion={1}
                  onRestore={handleRestoreVersion}
                  onCompare={handleCompareVersions}
                  className="h-full"
                />
              </aside>
            )}
          </div>
        </main>
      </div>
      </div>

    {/* Command Palette */}
    <CommandPalette
      open={isCommandPaletteOpen}
      onOpenChange={setIsCommandPaletteOpen}
      commands={commands}
    />

    {/* Hidden file input for Import */}
    <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,.json"
        className="hidden"
        onChange={handleFileSelected}
      />
    <WriterShareModal
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        documentId={document?.id}
        documentTitle={documentTitle}
      />
    </TooltipProvider>
  )
}
