"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Upload, FileText, Table, Users, Download, X, Eye, Maximize, Minimize, MessageSquare, Settings, Zap, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import Sidebar from '@/app/ai-agents/components/Sidebar'
import { Search, Sparkles, ChevronDown, MoreHorizontal, Send } from 'lucide-react'
import type { RecentExtraction } from '@/lib/services/extractions-store'
import { fetchRecentExtractions, fetchExtractionWithChats, saveChatMessage, deleteExtraction, clearAllExtractions } from '@/lib/services/extractions-store'

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

interface ExtractionTypeOption {
  value: string
  label: string
  description: string
  icon: any
}

interface OutputFormatOption {
  value: string
  label: string
  description: string
  icon: any
}

interface ExtractedData {
  summary: string
  keyPoints: string[]
  statistics: {
    totalWords: number
    readingTime: number
    confidence?: number
  }
  tables: {
    id: string
    headers: string[]
    rows: string[][]
  }[]
  entities: {
    type: string
    value: string
    count: number
  }[]
}

type ExtractionType = 'summary' | 'tables' | 'entities' | 'structured'
type OutputFormat = 'json' | 'csv' | 'markdown' | 'text'
type TabMode = 'summary' | 'pdf'
type ViewMode = 'upload' | 'chat'

const extractionTypes: ExtractionTypeOption[] = [
  { value: 'summary', label: 'Summary', description: 'Extract key points and overview', icon: FileText },
  { value: 'tables', label: 'Tables', description: 'Extract structured data tables', icon: Table },
  { value: 'entities', label: 'Entities', description: 'Extract people, places, organizations', icon: Users },
  { value: 'structured', label: 'Structured', description: 'Extract all data in structured format', icon: Settings }
]

const outputFormats: OutputFormatOption[] = [
  { value: 'json', label: 'JSON', description: 'JavaScript Object Notation', icon: FileText },
  { value: 'csv', label: 'CSV', description: 'Comma-separated values', icon: Download },
  { value: 'markdown', label: 'Markdown', description: 'Formatted text with markup', icon: FileText },
  { value: 'text', label: 'Plain Text', description: 'Simple text format', icon: FileText }
]

export default function ExtractPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('upload')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [activeTab, setActiveTab] = useState<TabMode>('summary')
  const [copied, setCopied] = useState<string | null>(null)
  const [extractionType, setExtractionType] = useState<ExtractionType>('summary')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('json')
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showFormatDropdown, setShowFormatDropdown] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [extractionPhase, setExtractionPhase] = useState('')
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [supportedExtensions, setSupportedExtensions] = useState<string[]>([])
  const [ocrEnabled, setOcrEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  // File preview state
  const [previewType, setPreviewType] = useState<'none' | 'pdf' | 'image' | 'text' | 'csv' | 'unsupported'>('none')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showTables, setShowTables] = useState(true)
  const [showEntities, setShowEntities] = useState(true)
  const [recentExtractions, setRecentExtractions] = useState<RecentExtraction[]>([])
  const [activeExtractionId, setActiveExtractionId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  // Search & Zoom state
  const [searchQuery, setSearchQuery] = useState('')
  const [currentMatch, setCurrentMatch] = useState(0)
  const matchRefs = useRef<HTMLElement[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [zoom, setZoom] = useState<number>(100)
  const [showZoomMenu, setShowZoomMenu] = useState(false)
  // Suggestions modal state
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false)
  const [suggestionsTab, setSuggestionsTab] = useState<'general' | 'mine'>('general')
  const generalSuggestions = [
    'Generate summary of this paper',
    'Results of the paper',
    'Conclusions from the paper',
    'Explain Abstract of this paper',
    'What are the contributions of this paper',
    'Find Related Papers',
    'Explain the practical implications of this paper',
    'Summarise introduction of this paper',
    'Literature survey of this paper',
    'Explain methodology used',
    'Key findings of the paper',
    'Limitations and future work',
    'Create a layman summary for non-experts'
  ]
  const myQuestions: string[] = []

  // Helpers: export extracted tables
  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [])

  const handleDeleteRecent = useCallback(async (id: string) => {
    try {
      const res = await deleteExtraction(id)
      if (res?.success) {
        toast({ title: 'Deleted', description: 'File removed from recent.' })
        // Optimistically update list without reloading
        setRecentExtractions((prev) => prev.filter((r) => r.id !== id))
      } else {
        toast({ title: 'Delete failed', description: 'Could not delete this item', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Delete failed', description: 'Unexpected error', variant: 'destructive' })
    }
  }, [toast])

  const handleClearAll = useCallback(async () => {
    try {
      const res = await clearAllExtractions()
      if (res?.success) {
        toast({ title: 'Cleared', description: 'All recent files cleared.' })
        setRecentExtractions([])
      } else {
        toast({ title: 'Clear failed', description: res?.error ? String(res.error) : 'Could not clear', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Clear failed', description: 'Unexpected error', variant: 'destructive' })
    }
  }, [toast, ocrEnabled])

  const exportTablesAsCSV = useCallback((tables: Array<{ headers: string[]; rows: string[][] }>) => {
    if (!tables || tables.length === 0) return
    const lines: string[] = []
    tables.forEach((t, idx) => {
      if (idx > 0) lines.push('')
      if (t.headers && t.headers.length) {
        lines.push(t.headers.map(h => '"' + String(h).replace(/"/g, '""') + '"').join(','))
      }
      if (t.rows) {
        t.rows.forEach(row => {
          lines.push(row.map(cell => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(','))
        })
      }
    })
    const csv = lines.join('\n')
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'extracted_tables.csv')
  }, [downloadBlob])

  const exportTablesAsJSON = useCallback((tables: Array<{ headers: string[]; rows: string[][] }>) => {
    if (!tables || tables.length === 0) return
    const json = JSON.stringify(tables, null, 2)
    downloadBlob(new Blob([json], { type: 'application/json' }), 'extracted_tables.json')
  }, [downloadBlob])

  const handleFileSelect = useCallback((files: FileList) => {
    const MAX_BYTES = 10 * 1024 * 1024 // 10MB
    const picked = Array.from(files)
    const tooLarge = picked.filter(f => f.size > MAX_BYTES)
    if (tooLarge.length) {
      toast({
        title: 'File too large',
        description: `${tooLarge.map(f => f.name).join(', ')} exceed(s) 10MB. Please upload smaller files.`,
        variant: 'destructive'
      })
    }
    const accepted = picked.filter(f => f.size <= MAX_BYTES)
    setSelectedFiles(accepted)
    const generateServerPreview = async (file: File) => {
      setPreviewLoading(true)
      setPreviewType('none')
      setPreviewUrl(null)
      setPreviewText(null)
      try {
        const fd = new FormData()
        fd.append('file', file)
        // Use current OCR toggle value rather than hardcoded false
        fd.append('enableOCR', String(ocrEnabled))
        const res = await fetch('/api/extract-file', { method: 'POST', body: fd })
        const ct = res.headers.get('content-type') || ''
        const data = ct.includes('application/json') ? await res.json() : { text: '' }
        if (res.ok && data.text) {
          setPreviewType('text')
          setPreviewUrl(null)
          setPreviewText(String(data.text))
        } else {
          setPreviewType('unsupported')
          setPreviewUrl(null)
          setPreviewText(null)
        }
      } catch {
        setPreviewType('unsupported')
        setPreviewUrl(null)
        setPreviewText(null)
      } finally {
        setPreviewLoading(false)
      }
    }

    if (accepted.length > 0) {
      const first = accepted[0]
      // Set preview based on type
      if (first.type === 'application/pdf') {
        const url = URL.createObjectURL(first)
        setPreviewType('pdf')
        setPreviewUrl(url)
        setPreviewText(null)
      } else if (first.type.startsWith('image/')) {
        const url = URL.createObjectURL(first)
        setPreviewType('image')
        setPreviewUrl(url)
        setPreviewText(null)
      } else if (first.type === 'text/plain') {
        first.text().then(t => {
          setPreviewType('text')
          setPreviewUrl(null)
          setPreviewText(t)
        })
      } else if (first.type === 'text/csv' || first.name.toLowerCase().endsWith('.csv')) {
        first.text().then(t => {
          setPreviewType('csv')
          setPreviewUrl(null)
          setPreviewText(t)
        })
      } else if (
        first.type === 'application/msword' ||
        first.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        first.type === 'application/vnd.ms-powerpoint' ||
        first.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ) {
        // Use server-side lightweight extraction for preview text
        generateServerPreview(first)
      } else {
        setPreviewType('unsupported')
        setPreviewUrl(null)
        setPreviewText(null)
      }
      simulateUpload(accepted)
    }
  }, [toast, ocrEnabled])

  const performExtraction = useCallback(async (file: File) => {
    setIsExtracting(true)
    setExtractionProgress(0)
    setExtractionPhase('Starting extraction...')
    setExtractionError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('extractionType', extractionType)
      formData.append('outputFormat', outputFormat)
      formData.append('ocrEnabled', ocrEnabled.toString())
      
      // Include Supabase auth for protected API route
      let authHeaders: HeadersInit | undefined = undefined
      try {
        const { supabase } = await import('@/integrations/supabase/client')
        const { data: sessionRes } = await supabase.auth.getSession()
        const token = sessionRes?.session?.access_token
        if (token) authHeaders = { Authorization: `Bearer ${token}` }
      } catch {}

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
        headers: authHeaders,
      })
      // Robust parse: handle non-JSON (e.g., platform 413 HTML/plain responses)
      const contentType = response.headers.get('content-type') || ''
      let data: any = null
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        if (!response.ok) {
          if (response.status === 413 || /request entity too large/i.test(text)) {
            throw new Error('Upload too large (HTTP 413). Please use files up to 10MB or compress images before uploading.')
          }
          throw new Error(text || 'Extraction failed')
        }
        // Unexpected but OK case
        data = { success: true, result: { text } }
      }
      
      if (!response.ok) {
        // Improve 401 message for clarity
        if (response.status === 401) {
          throw new Error('Unauthorized: please sign in again and try uploading the file. If you are signed in, refresh the page and retry.')
        }
        throw new Error(data?.error || 'Extraction failed')
      }
      
      if (data.success) {
        setExtractedData({
          ...data.result,
          fileName: file.name,
          metadata: {
            ...data.metadata,
            extractedAt: new Date().toLocaleString(),
            extractionId: data.extractionId
          }
        })
        setActiveExtractionId(data.extractionId || null)
        setExtractionProgress(100)
        setExtractionPhase('Extraction completed')
        
        toast({
          title: "Extraction Complete",
          description: `Successfully extracted data from ${file.name}`
        })

        // refresh recent list
        loadRecent()
      } else {
        throw new Error(data.error || 'Unknown error occurred')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setExtractionError(errorMessage)
      setExtractionPhase('Extraction failed')
      
      toast({
        title: "Extraction Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsExtracting(false)
    }
  }, [extractionType, outputFormat, ocrEnabled, toast])

  // Open a previous extraction with chats
  const openExtraction = useCallback(async (id: string) => {
    try {
      const rec = await fetchExtractionWithChats(id)
      if (!rec) return
      setActiveExtractionId(id)
      setExtractedData({
        ...(rec.result_json?.result || {}),
        fileName: rec.file_name,
        metadata: rec.result_json?.metadata || {}
      })
      setMessages((rec.chats || []).map((c) => ({
        id: c.id,
        content: c.content,
        sender: c.role,
        timestamp: new Date(c.created_at)
      })))
      setViewMode('chat')
      setActiveTab('summary')
    } catch (e) {
      // ignore
    }
  }, [])

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text ?? currentMessage).trim()
    if (!messageText) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: messageText,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsTyping(true)

    // persist user message if we have an active extraction id
    try { if (activeExtractionId) { await saveChatMessage(activeExtractionId, 'user', messageText) } } catch {}

    try {
      // Build lightweight context from current extraction/preview
      const parts: string[] = []
      if (extractedData?.summary) parts.push(`Summary:\n${extractedData.summary}`)
      if (Array.isArray(extractedData?.keyPoints) && extractedData.keyPoints.length) {
        parts.push(`Key Points:\n- ${extractedData.keyPoints.join('\n- ')}`)
      }
      if (extractedData?.tables?.length) {
        const firstTable = extractedData.tables[0]
        try {
          const headers = Array.isArray(firstTable.headers) ? firstTable.headers.join(', ') : ''
          parts.push(`Table 1 Headers: ${headers}`)
        } catch {}
      }
      const textCtx = (previewText || '').slice(0, 8000) // cap context to ~8k chars
      if (textCtx) parts.push(`Document Text (truncated):\n${textCtx}`)
      const context = parts.join('\n\n')

      const res = await fetch('/api/extract/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, context })
      })
      // Robustly parse response: prefer JSON when available, otherwise fallback to text
      const ct = res.headers.get('content-type') || ''
      let replyText: string = ''
      if (ct.includes('application/json')) {
        try {
          const data: any = await res.json()
          replyText = res.ok
            ? (typeof data?.response === 'string' ? data.response : (typeof data === 'string' ? data : ''))
            : (typeof data?.error === 'string' ? data.error : (typeof data === 'string' ? data : 'Failed to get response'))
        } catch {
          const text = await res.text().catch(() => '')
          replyText = text || (res.ok ? 'OK' : 'Failed to get response')
        }
      } else {
        const text = await res.text().catch(() => '')
        replyText = text || (res.ok ? 'OK' : 'Failed to get response')
      }

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: replyText,
        sender: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      try { if (activeExtractionId) { await saveChatMessage(activeExtractionId, 'assistant', replyText) } } catch {}
    } catch (e) {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 2).toString(),
        content: 'Error contacting chat service. Please try again.',
        sender: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      try { if (activeExtractionId) { await saveChatMessage(activeExtractionId, 'assistant', aiResponse.content) } } catch {}
    } finally {
      setIsTyping(false)
    }
  }, [currentMessage, activeExtractionId, extractedData, previewText])

  // Explain math & table handler: ask chat with document context
  const handleExplainMathTables = useCallback(async () => {
    try {
      await sendMessage('Explain the math and tables in the current document. Summarize key equations, statistics, metrics, and the main takeaways from any tables.')
    } catch (e) {
      toast({ title: 'Explain failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' })
    }
  }, [sendMessage, toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleFileSelect])

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      handleFileSelect(files)
    }
  }

  const simulateUpload = (files?: File[]) => {
    setIsUploading(true)
    setUploadProgress(0)
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          setTimeout(() => {
            setViewMode('chat')
            setActiveTab('summary')
          // Add initial assistant message
          setMessages([{
            id: '1',
            content: 'Hello! I\'ve processed your files. What would you like to extract or analyze?',
            sender: 'assistant',
            timestamp: new Date()
          }])
          // Kick off extraction for the first file
          const firstFile = (files && files[0]) || selectedFiles[0]
          if (firstFile) {
            performExtraction(firstFile)
          }
        }, 500)
          return 100
        }
        // Increment progress smoothly until completion
        return Math.min(prev + 10, 100)
      })
    }, 200)
  }

  const handleExtract = async () => {
    if (!inputText.trim()) return
    
    setIsExtracting(true)
    setError(null)
    
    try {
      // Simulate extraction process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock extracted data
      const mockData: ExtractedData = {
        summary: 'This is a summary of the extracted content with key insights and main points identified from the text.',
        keyPoints: [
          'First key point extracted from the content',
          'Second important finding or insight',
          'Third significant observation',
          'Fourth notable conclusion'
        ],
        statistics: {
          totalWords: inputText.split(' ').length,
          readingTime: Math.ceil(inputText.split(' ').length / 200),
          confidence: 0.85
        },
        tables: [
          {
            id: '1',
            headers: ['Item', 'Value', 'Category'],
            rows: [
              ['Data Point 1', '123', 'Type A'],
              ['Data Point 2', '456', 'Type B'],
              ['Data Point 3', '789', 'Type C']
            ]
          }
        ],
        entities: [
          { type: 'person', value: 'John Smith', count: 3 },
          { type: 'organization', value: 'Company ABC', count: 2 },
          { type: 'location', value: 'New York', count: 1 },
          { type: 'date', value: '2024', count: 4 }
        ]
      }
      
      setExtractedData(mockData)
    } catch (err) {
      setError('Failed to extract data. Please try again.')
    } finally {
      setIsExtracting(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'person': return Users
      case 'organization': return Settings
      case 'location': return Eye
      case 'date': return Maximize
      case 'email': return MessageSquare
      case 'url': return Download
      default: return Settings
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      setError('Failed to copy to clipboard')
    }
  }

  // --- Search helpers ---
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const countOccurrences = (text: string, query: string) => {
    if (!text || !query) return 0
    const re = new RegExp(escapeRegExp(query), 'gi')
    return (text.match(re) || []).length
  }

  const handleSearchChange = (v: string) => {
    setSearchQuery(v)
    setCurrentMatch(0)
    matchRefs.current = []
  }

  const goToNextMatch = (total: number) => {
    if (total > 0) setCurrentMatch((prev: number) => (prev + 1) % total)
  }

  const goToPrevMatch = (total: number) => {
    if (total > 0) setCurrentMatch((prev: number) => (prev - 1 + total) % total)
  }

  const renderHighlightedText = (text: string, query: string) => {
    if (!query) return [text]
    matchRefs.current = []
    const out: React.ReactNode[] = []
    const lower = text.toLowerCase()
    const q = query.toLowerCase()
    let i = 0
    if (!q.length) return [text]
    // Build nodes with <mark> elements and collect refs
    while (true) {
      const idx = lower.indexOf(q, i)
      if (idx === -1) break
      out.push(text.slice(i, idx))
      const seg = text.slice(idx, idx + q.length)
      out.push(
        <mark
          key={`m-${idx}-${out.length}`}
          ref={(el) => { if (el) matchRefs.current.push(el) }}
          className="bg-yellow-200 px-0.5"
        >
          {seg}
        </mark>
      )
      i = idx + q.length
    }
    out.push(text.slice(i))
    return out
  }

  // Highlight current match and scroll into view when navigating
  useEffect(() => {
    matchRefs.current.forEach((el) => el.classList.remove('ring-2', 'ring-orange-400'))
    const el = matchRefs.current[currentMatch]
    if (el) {
      el.classList.add('ring-2', 'ring-orange-400')
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentMatch, searchQuery, previewText, previewType])

  const downloadExtractedData = () => {
    if (!extractedData) return
    
    let content = ''
    let filename = ''
    
    switch (outputFormat) {
      case 'json':
        content = JSON.stringify(extractedData, null, 2)
        filename = 'extracted-data.json'
        break
      case 'csv':
        // Simple CSV conversion
        content = 'Type,Content\n'
        content += `Summary,"${extractedData.summary}"\n`
        extractedData.keyPoints.forEach((point: string) => {
          content += `Key Point,"${point}"\n`
        })
        filename = 'extracted-data.csv'
        break
      case 'markdown':
        content = `# Extracted Data\n\n## Summary\n${extractedData.summary}\n\n## Key Points\n`
        extractedData.keyPoints.forEach((point: string) => {
          content += `- ${point}\n`
        })
        filename = 'extracted-data.md'
        break
      case 'text':
        content = `EXTRACTED DATA\n\nSummary:\n${extractedData.summary}\n\nKey Points:\n`
        extractedData.keyPoints.forEach((point: string) => {
          content += `• ${point}\n`
        })
        filename = 'extracted-data.txt'
        break
    }
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Trigger send on Enter (but allow Shift+Enter for new line)
    if ((e.key === 'Enter' || (e as any).code === 'Enter') && !e.shiftKey) {
      e.preventDefault()
      if (typeof e.stopPropagation === 'function') e.stopPropagation()
      sendMessage()
    }
  }

  const fetchSupportedExtensions = async () => {
    try {
      // Pass auth if available, though this endpoint does not require it
      let headers: HeadersInit | undefined = undefined
      try {
        const { supabase } = await import('@/integrations/supabase/client')
        const { data: sessionRes } = await supabase.auth.getSession()
        const token = sessionRes?.session?.access_token
        if (token) headers = { Authorization: `Bearer ${token}` }
      } catch {}

      const response = await fetch('/api/extract', { headers })
      const ct = response.headers.get('content-type') || ''
      let data: any = null
      let textBody = ''

      if (ct.includes('application/json')) {
        try {
          data = await response.json()
        } catch (e) {
          try { textBody = await response.text() } catch {}
        }
      } else {
        try { textBody = await response.text() } catch {}
      }

      if (response.ok && data && data.success && Array.isArray(data.supportedExtensions)) {
        setSupportedExtensions(data.supportedExtensions)
      } else {
        // Gracefully handle non-OK or unparsable responses
        if (!response.ok) {
          console.warn('fetchSupportedExtensions: non-OK response', { status: response.status })
        } else if (!data) {
          console.warn('fetchSupportedExtensions: failed to parse response body')
        }
      }
    } catch (error) {
      console.error('Failed to fetch supported extensions:', error)
    }
  }

  useEffect(() => {
    fetchSupportedExtensions()
  }, [])

  // Load recent extractions (best-effort, works when Supabase is configured)
  const loadRecent = useCallback(async () => {
    try {
      const items = await fetchRecentExtractions(8)
      setRecentExtractions(items)
    } catch (e) {
      // ignore if DB not configured
    }
  }, [])

  useEffect(() => { loadRecent() }, [loadRecent])

  useEffect(() => {
    // Auto-scroll chat to bottom on new messages
    messagesEndRef.current?.scrollTo({ top: messagesEndRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Close suggestions modal with ESC
  useEffect(() => {
    if (!showSuggestionsModal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowSuggestionsModal(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSuggestionsModal])

  // Cleanup generated PDF object URL when file changes/unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  if (viewMode === 'chat') {
    return (
      <div className="flex min-h-screen bg-[#F8F9FA]">
        {/* Sidebar (same as AI Agents) */}
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <div className="flex min-h-screen flex-1 flex-col">
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            {/* Breadcrumb */}
            <div className="mb-4 text-sm text-gray-500">
              <Link href="/" className="hover:text-gray-700">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-gray-700">Extract Data</span>
            </div>

            {/* Tabs + Toolbar */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ocr-mode"
                  checked={ocrEnabled}
                  onCheckedChange={setOcrEnabled}
                />
                <Label htmlFor="ocr-mode" className="text-sm">
                  Enable OCR (for images and scanned documents)
                </Label>
              </div>
            </div>

            {/* Main content: Left (viewer) + Right (chat) */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {/* Left column */}
              <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white">
                {/* Toolbar row */}
                <div className="flex items-center gap-2 border-b border-gray-200 p-3">
                  {/* Tabs toggle (always visible) */}
                  <div className="inline-flex items-center rounded-md border border-gray-200 bg-white text-xs">
                    <button
                      onClick={() => setActiveTab('pdf')}
                      className={`px-3 py-1.5 ${activeTab === 'pdf' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                    >File View</button>
                    <button
                      onClick={() => setActiveTab('summary')}
                      className={`px-3 py-1.5 border-l border-gray-200 ${activeTab === 'summary' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                    >Summary</button>
                  </div>

                  {/* The following controls show only in File View */}
                  {activeTab === 'pdf' && (
                    <>
                      <button onClick={handleExplainMathTables} className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        Explain math & table
                      </button>
                      <div className="relative ml-1 flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            ref={searchInputRef}
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search in file"
                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          {(previewType === 'text' || previewType === 'csv') && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <button
                                onClick={() => goToPrevMatch(countOccurrences(previewText || '', searchQuery))}
                                className="rounded border border-gray-200 bg-white px-2 py-1 hover:bg-gray-50"
                                title="Previous"
                              >
                                Prev
                              </button>
                              <span className="min-w-[70px] text-center">
                                {searchQuery ? `${Math.min(currentMatch + 1, Math.max(1, countOccurrences(previewText || '', searchQuery)))} / ${countOccurrences(previewText || '', searchQuery)}` : ''}
                              </span>
                              <button
                                onClick={() => goToNextMatch(countOccurrences(previewText || '', searchQuery))}
                                className="rounded border border-gray-200 bg-white px-2 py-1 hover:bg-gray-50"
                                title="Next"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Zoom control */}
                      <div className="relative">
                        <button
                          onClick={() => setShowZoomMenu((s) => !s)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          {zoom}%
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        {showZoomMenu && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-24 overflow-hidden rounded-md border border-gray-200 bg-white shadow">
                            {[50, 80, 100, 125, 150].map((z) => (
                              <button
                                key={z}
                                onClick={() => { setZoom(z); setShowZoomMenu(false) }}
                                className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${zoom === z ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                              >
                                {z}%
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {/* Podcast feature removed */}
                </div>

                {extractionError && (
                  <div className="mx-3 my-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <div>
                      <div className="font-medium">Extraction failed</div>
                      <div className="text-red-700">{extractionError}</div>
                    </div>
                  </div>
                )}

                {/* Viewer/Summary area */}
                {activeTab === 'pdf' ? (
                  <div className="h-[620px] overflow-auto bg-[#FAFAFA]">
                    <div className="mx-auto max-w-4xl px-4 py-4">
                      {previewLoading && (
                        <div className="h-[580px] w-full overflow-hidden rounded-md border bg-white p-4">
                          <div className="space-y-3">
                            <Skeleton className="h-5 w-1/3" />
                            {Array.from({ length: 14 }).map((_, i) => (
                              <Skeleton key={i} className={`h-4 ${i % 3 === 0 ? 'w-5/6' : i % 3 === 1 ? 'w-3/4' : 'w-full'}`} />
                            ))}
                          </div>
                        </div>
                      )}
                      {!previewLoading && previewType === 'pdf' && previewUrl && (
                        <iframe
                          src={`${previewUrl}#toolbar=0&zoom=${zoom}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
                          className="h-[580px] w-full rounded-md border"
                          title="PDF Preview"
                        />
                      )}
                      {!previewLoading && previewType === 'image' && previewUrl && (
                        <div className="h-[580px] w-full overflow-auto rounded-md border bg-white p-2">
                          <img
                            src={previewUrl}
                            alt="Image preview"
                            className="rounded"
                            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                          />
                        </div>
                      )}
                      {!previewLoading && previewType === 'text' && typeof previewText === 'string' && (
                        <pre
                          className="h-[580px] w-full overflow-auto rounded-md border bg-white p-4 text-gray-800 whitespace-pre-wrap"
                          style={{ fontSize: `${zoom}%` }}
                        >
                          {renderHighlightedText(previewText, searchQuery)}
                        </pre>
                      )}
                      {!previewLoading && previewType === 'csv' && typeof previewText === 'string' && (
                        <div className="h-[580px] w-full overflow-auto rounded-md border bg-white p-4" style={{ fontSize: `${zoom}%` }}>
                          <table className="min-w-full border-collapse text-sm">
                            <tbody>
                              {previewText.split('\n').slice(0, 100).map((line, i) => (
                                <tr key={i}>
                                  {line.split(',').map((cell, j) => {
                                    if (!searchQuery) return (
                                      <td key={j} className="border px-2 py-1">{cell}</td>
                                    )
                                    // highlight matches in cell
                                    const parts: React.ReactNode[] = []
                                    const lower = cell.toLowerCase()
                                    const q = searchQuery.toLowerCase()
                                    let k = 0
                                    let pos = 0
                                    while (true) {
                                      const idx = lower.indexOf(q, pos)
                                      if (idx === -1) break
                                      parts.push(cell.slice(pos, idx))
                                      const seg = cell.slice(idx, idx + q.length)
                                      parts.push(
                                        <mark
                                          key={`c-${i}-${j}-${k++}`}
                                          ref={(el) => { if (el) matchRefs.current.push(el) }}
                                          className="bg-yellow-200 px-0.5"
                                        >
                                          {seg}
                                        </mark>
                                      )
                                      pos = idx + q.length
                                    }
                                    parts.push(cell.slice(pos))
                                    return (
                                      <td key={j} className="border px-2 py-1">{parts}</td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {!previewLoading && (previewType === 'none' || previewType === 'unsupported') && (
                        <div className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                          No preview available. Upload a supported file to preview it here.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-[620px] overflow-auto bg-white p-4">
                    <div className="prose prose-sm max-w-none">
                      <h3 className="mb-2 font-semibold text-gray-900">{extractedData?.aiSummarySource === 'openrouter' ? 'AI Summary' : 'Summary'}</h3>
                      {isExtracting && (
                        <div className="space-y-3">
                          <Skeleton className="h-6 w-40" />
                          {Array.from({ length: 10 }).map((_, i) => (
                            <Skeleton key={i} className={`h-4 ${i % 3 === 0 ? 'w-5/6' : i % 3 === 1 ? 'w-3/4' : 'w-full'}`} />
                          ))}
                        </div>
                      )}
                      {!isExtracting && extractedData ? (
                        <div>
                          {extractedData.summary && (
                            <p className="text-[15px] leading-7 text-gray-700">{extractedData.summary}</p>
                          )}
                          {Array.isArray(extractedData.keyPoints) && extractedData.keyPoints.length > 0 && (
                            <div className="mt-4">
                              <h4 className="mb-1 font-semibold flex items-center gap-2">
                                <span>Key Points</span>
                                {extractedData?.aiSummarySource === 'openrouter' && (
                                  <span className="inline-flex items-center rounded bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200">AI</span>
                                )}
                              </h4>
                              <ul className="list-disc pl-5 text-gray-700">
                                {extractedData.keyPoints.map((p: string, idx: number) => (
                                  <li key={idx}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {extractedData.statistics && (
                            <div className="mt-4 text-sm text-gray-600">
                              <div>Total Words: {extractedData.statistics.totalWords}</div>
                              {'readingTime' in extractedData.statistics && (
                                <div>Reading Time: {extractedData.statistics.readingTime} min</div>
                              )}
                            </div>
                          )}
                          {extractedData.metadata && (
                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                              {'wordCount' in extractedData.metadata && (
                                <div>Word Count: {extractedData.metadata.wordCount}</div>
                              )}
                              {'pageCount' in extractedData.metadata && (
                                <div>Pages/Slides: {extractedData.metadata.pageCount}</div>
                              )}
                              {'fileType' in extractedData.metadata && (
                                <div>File Type: {extractedData.metadata.fileType}</div>
                              )}
                              {'fileSize' in extractedData.metadata && (
                                <div>File Size: {Math.round((extractedData.metadata.fileSize / 1024 / 1024) * 100) / 100} MB</div>
                              )}
                            </div>
                          )}
                          {Array.isArray(extractedData.tables) && extractedData.tables.length > 0 && (
                            <div className="mt-6">
                              <div className="mb-2 flex items-center justify-between">
                                <h4 className="font-semibold">Extracted Tables ({extractedData.tables.length})</h4>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => exportTablesAsCSV(extractedData.tables)}
                                    className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                  >
                                    Export CSV
                                  </button>
                                  <button
                                    onClick={() => exportTablesAsJSON(extractedData.tables)}
                                    className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                  >
                                    Export JSON
                                  </button>
                                  <button
                                    onClick={() => setShowTables(s => !s)}
                                    className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                    aria-expanded={showTables}
                                  >
                                    {showTables ? 'Hide' : 'Show'}
                                  </button>
                                </div>
                              </div>
                              {showTables && (
                                <div className="space-y-4">
                                  {extractedData.tables.map((t: any, ti: number) => (
                                    <div key={t.id || ti} className="overflow-x-auto rounded-md border">
                                      <table className="min-w-full border-collapse text-sm">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            {(t.headers || []).map((h: string, hi: number) => (
                                              <th key={hi} className="border-b px-3 py-2 text-left font-medium text-gray-700">{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(t.rows || []).map((row: string[], ri: number) => (
                                            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                              {row.map((cell: string, ci: number) => (
                                                <td key={ci} className="border-b px-3 py-2 text-gray-800">{cell}</td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {Array.isArray(extractedData.entities) && extractedData.entities.length > 0 && (
                            <div className="mt-6">
                              <div className="mb-2 flex items-center justify-between">
                                <h4 className="font-semibold">Entities</h4>
                                <button
                                  onClick={() => setShowEntities(s => !s)}
                                  className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                  aria-expanded={showEntities}
                                >
                                  {showEntities ? 'Hide' : 'Show'}
                                </button>
                              </div>
                              {showEntities && (
                                <div className="flex flex-wrap gap-2">
                                  {extractedData.entities.map((e: any, ei: number) => (
                                    <span key={ei} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700">
                                      <span className="font-medium">{e.type}</span>
                                      <span className="text-gray-500">{e.value}</span>
                                      {'count' in e && (
                                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-700">{e.count}</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (!isExtracting && (
                        <p className="text-[15px] leading-7 text-gray-700">Document summary and key findings will appear here after processing.</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column - Chat */}
              <div className="flex min-h-[720px] flex-col rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-orange-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Chat</h3>
                  </div>
                  <div className="text-xs text-gray-500">en</div>
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-2 p-3">
                  {['Methods used','Limitations','Explain Abstract','Practical Implications','Paper Summary','Literature survey','Future works'].map((c) => (
                    <button
                      key={c}
                      onClick={() => sendMessage(c)}
                      className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* Messages */}
                <div className="flex-1 space-y-3 overflow-y-auto px-3 py-2" ref={messagesEndRef}>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          message.sender === 'user' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {message.sender === 'assistant' ? (
                          <div className="prose prose-sm prose-gray max-w-none">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className={`max-w-[80%] rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900`}>
                        Assistant is typing...
                      </div>
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div className="border-t border-gray-200 p-3">
                  {/* Guided prompt */}
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                    <span className="truncate">Generate summary of this paper, Results of the paper, Conc</span>
                    <button onClick={() => setShowSuggestionsModal(true)} className="text-gray-500 hover:text-gray-700">+13 more</button>
                  </div>

                  <div className="flex items-end gap-2">
                    <textarea
                      ref={chatInputRef}
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask any question..."
                      className="min-h-[40px] flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      rows={1}
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={!currentMessage.trim()}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>

                  {/* High Quality and sigma UI removed */}
                </div>
              </div>
            </div>
          </main>
        {/* Suggestions Modal */}
        {showSuggestionsModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4" onClick={() => setShowSuggestionsModal(false)}>
            <div className="mt-16 w-full max-w-2xl rounded-lg bg-white shadow-lg ring-1 ring-gray-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div className="text-sm font-medium text-gray-900">Suggestions <span className="text-gray-500">({generalSuggestions.length} results)</span></div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5">esc</span>
                  <button className="rounded p-1 hover:bg-gray-100" onClick={() => setShowSuggestionsModal(false)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="px-4 pt-3">
                <div className="flex items-center gap-6 border-b border-gray-200 text-sm">
                  <button onClick={() => setSuggestionsTab('general')} className={`pb-2 ${suggestionsTab === 'general' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-600'}`}>General ({generalSuggestions.length})</button>
                  <button onClick={() => setSuggestionsTab('mine')} className={`pb-2 ${suggestionsTab === 'mine' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-600'}`}>My questions ({myQuestions.length})</button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                {suggestionsTab === 'general' ? (
                  <ul className="list-disc pl-5 text-sm text-gray-800 space-y-2">
                    {generalSuggestions.map((s) => (
                      <li key={s}>
                        <button
                          onClick={() => { setCurrentMessage(s); setShowSuggestionsModal(false) }}
                          className="text-left hover:underline"
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">No saved questions yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      {/* Sidebar (same as AI Agents) */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {/* Breadcrumb */}
          <div className="mb-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700">Extract Data</span>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Extract Data From Research Papers</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600">Get summary, conclusions and findings from multiple PDFs in a table.</p>
          </div>

          {/* Upload Area */}
          <div className="mx-auto max-w-3xl">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              {/* Drop Zone */}
              {!isUploading && (
                <div className="rounded-md border border-gray-200 p-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`rounded-md border-2 border-dashed p-10 text-center ${
                      isDragOver ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={supportedExtensions.length ? supportedExtensions.map(ext => `.${ext}`).join(',') : '.pdf'}
                      onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                      className="hidden"
                    />
                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
                      <FileText className="h-7 w-7 text-gray-500" />
                    </div>
                    <div className="text-sm text-gray-700">Drag and drop or click to browse files</div>
                    <div className="mt-1 text-xs text-gray-400">Max. 10 MB per file</div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-5 inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                    >
                      <Upload className="h-4 w-4" />
                      Upload files
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="mb-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Uploading...</span>
                    <span className="text-sm text-gray-500">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div className="h-2 rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* File List */}
              {selectedFiles.length > 0 && !isUploading && (
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-medium text-gray-900">Selected Files</h3>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button onClick={() => removeFile(index)} className="text-gray-400 hover:text-gray-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Files */}
              {(!isUploading) && (
                <div className="mt-8">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Recent Files</h3>
                    <div className="flex items-center gap-3">
                      <button onClick={loadRecent} className="text-xs text-gray-500 hover:text-gray-700">Refresh</button>
                      <button onClick={handleClearAll} className="text-xs text-gray-500 hover:text-gray-700">Clear all</button>
                    </div>
                  </div>
                  {recentExtractions.length === 0 ? (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">No recent files yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {recentExtractions.map((r) => (
                        <div
                          key={r.id}
                          className="relative rounded-md border border-gray-200 bg-white p-3 hover:bg-gray-50"
                          role="button"
                          tabIndex={0}
                          onClick={() => openExtraction(r.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || (e as any).code === 'Enter') {
                              e.preventDefault()
                              openExtraction(r.id)
                            } else if (e.key === ' ' || (e as any).code === 'Space') {
                              e.preventDefault()
                              openExtraction(r.id)
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <FileText className="mt-0.5 h-4 w-4 text-gray-500" />
                              <div>
                                <div className="truncate text-sm font-medium text-gray-900" title={r.file_name}>{r.file_name}</div>
                                <div className="text-xs text-gray-500">{(r.file_type || 'file')} • {formatFileSize(r.file_size)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-[11px] text-gray-400">{new Date(r.created_at).toLocaleDateString()}</div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteRecent(r.id) }}
                                className="text-gray-400 hover:text-red-600"
                                title="Delete"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {r.summary && (
                            <p className="mt-2 line-clamp-3 text-xs text-gray-700">{r.summary}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
