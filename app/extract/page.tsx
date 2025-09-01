"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, FileText, Table, Users, Download, X, Eye, Maximize, Minimize, MessageSquare, Settings, Zap, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import Sidebar from '@/app/ai-agents/components/Sidebar'
import { Search, Sparkles, ChevronDown, MoreHorizontal, Mic, Send } from 'lucide-react'

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
  const [highQuality, setHighQuality] = useState(false)
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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [showTables, setShowTables] = useState(true)
  const [showEntities, setShowEntities] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

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
    const fileArray = Array.from(files)
    setSelectedFiles(fileArray)
    if (fileArray.length > 0) {
      // Create preview URL for first PDF file
      const first = fileArray[0]
      if (first && first.type === 'application/pdf') {
        const url = URL.createObjectURL(first)
        setPdfUrl(url)
      } else {
        setPdfUrl(null)
      }
      simulateUpload(fileArray)
    }
  }, [])

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
      
      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Extraction failed')
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
        setExtractionProgress(100)
        setExtractionPhase('Extraction completed')
        
        toast({
          title: "Extraction Complete",
          description: `Successfully extracted data from ${file.name}`
        })
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

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
        return prev + 10
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

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      })
      const data = await res.json()
      const replyText = res.ok ? (data.response as string) : (data.error || 'Failed to get response')

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: replyText,
        sender: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
    } catch (e) {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 2).toString(),
        content: 'Error contacting chat service. Please try again.',
        sender: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
    } finally {
      setIsTyping(false)
    }
  }, [currentMessage])

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const fetchSupportedExtensions = async () => {
    try {
      const response = await fetch('/api/extract')
      const data = await response.json()
      if (data.success && data.supportedExtensions) {
        setSupportedExtensions(data.supportedExtensions)
      }
    } catch (error) {
      console.error('Failed to fetch supported extensions:', error)
    }
  }

  useEffect(() => {
    fetchSupportedExtensions()
  }, [])

  useEffect(() => {
    // Auto-scroll chat to bottom on new messages
    messagesEndRef.current?.scrollTo({ top: messagesEndRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Cleanup generated PDF object URL when file changes/unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

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
                  {/* Tabs toggle */}
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
                  <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
                    <Search className="h-4 w-4" />
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Explain math & table
                  </button>
                  <div className="relative ml-1 flex-1">
                    <input
                      placeholder="Search in PDF"
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-50">
                    80%
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
                    <Mic className="h-3.5 w-3.5" />
                    Podcast
                  </span>
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
                      {pdfUrl ? (
                        <iframe src={`${pdfUrl}#toolbar=0`} className="h-[580px] w-full rounded-md border" title="PDF Preview" />
                      ) : (
                        <div className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                          Upload a PDF to preview it here.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-[620px] overflow-auto bg-white p-4">
                    <div className="prose prose-sm max-w-none">
                      <h3 className="mb-2 font-semibold text-gray-900">Summary</h3>
                      {extractedData ? (
                        <div>
                          {extractedData.summary && (
                            <p className="text-[15px] leading-7 text-gray-700">{extractedData.summary}</p>
                          )}
                          {Array.isArray(extractedData.keyPoints) && extractedData.keyPoints.length > 0 && (
                            <div className="mt-4">
                              <h4 className="mb-1 font-semibold">Key Points</h4>
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
                      ) : (
                        <p className="text-[15px] leading-7 text-gray-700">Document summary and key findings will appear here after processing.</p>
                      )}
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
                        {message.content}
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
                    <button className="text-gray-500 hover:text-gray-700">+13 more</button>
                  </div>

                  <div className="flex items-end gap-2">
                    <textarea
                      ref={chatInputRef}
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
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

                  {/* High quality toggle */}
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={highQuality}
                        onChange={(e) => setHighQuality(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      High Quality
                    </label>
                    <span className="ml-auto text-lg">∑</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
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
                    <div className="mt-1 text-xs text-gray-400">Max. 100 MB per file</div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-5 inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                    >
                      <Upload className="h-4 w-4" />
                      Upload PDF
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
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
