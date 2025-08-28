"use client"

import React, { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../ai-agents/components/Sidebar'
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  Check,
  X,
  Settings,
  File as FileIcon,
  MessageSquare,
  Send,
  Bot,
  User,
  Eye,
  FileImage,
  Calendar,
  Hash,
  Mail,
  Link as LinkIcon,
  ChevronDown,
  Copy,
  Download,
  AlertCircle,
  BarChart3,
  Search,
  MoreHorizontal,
  Mic
} from 'lucide-react'

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
    confidence: number
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
  { value: 'tables', label: 'Tables', description: 'Extract structured data tables', icon: BarChart3 },
  { value: 'entities', label: 'Entities', description: 'Extract people, places, organizations', icon: Hash },
  { value: 'structured', label: 'Structured', description: 'Extract all data in structured format', icon: Settings }
]

const outputFormats: OutputFormatOption[] = [
  { value: 'json', label: 'JSON', description: 'JavaScript Object Notation', icon: FileText },
  { value: 'csv', label: 'CSV', description: 'Comma-separated values', icon: BarChart3 },
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
  const [inputText, setInputText] = useState('')
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  const handleFileSelect = useCallback((files: FileList) => {
    const fileArray = Array.from(files)
    setSelectedFiles(fileArray)
    if (fileArray.length > 0) {
      simulateUpload()
    }
  }, [])

  const simulateUpload = () => {
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
          }, 500)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

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

  const sendMessage = useCallback(() => {
    if (!currentMessage.trim()) return
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: currentMessage,
      sender: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'I understand you want to extract information about "' + currentMessage + '". Let me analyze the uploaded files and provide you with the relevant data.',
        sender: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
    }, 1000)
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
      case 'person': return User
      case 'organization': return Settings
      case 'location': return Hash
      case 'date': return Calendar
      case 'email': return Mail
      case 'url': return Link
      default: return Hash
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
        extractedData.keyPoints.forEach(point => {
          content += `Key Point,"${point}"\n`
        })
        filename = 'extracted-data.csv'
        break
      case 'markdown':
        content = `# Extracted Data\n\n## Summary\n${extractedData.summary}\n\n## Key Points\n`
        extractedData.keyPoints.forEach(point => {
          content += `- ${point}\n`
        })
        filename = 'extracted-data.md'
        break
      case 'text':
        content = `EXTRACTED DATA\n\nSummary:\n${extractedData.summary}\n\nKey Points:\n`
        extractedData.keyPoints.forEach(point => {
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
            <div className="mb-3 flex items-center gap-4">
              <div className="flex items-center gap-6 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('pdf')}
                  className={`-mb-px px-1 pb-2 text-sm font-medium ${
                    activeTab === 'pdf'
                      ? 'border-b-2 border-orange-500 text-gray-900'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  PDF file
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`-mb-px px-1 pb-2 text-sm font-medium ${
                    activeTab === 'summary'
                      ? 'border-b-2 border-orange-500 text-gray-900'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Summary
                </button>
              </div>
            </div>

            {/* Main content: Left (viewer) + Right (chat) */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {/* Left column */}
              <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white">
                {/* Toolbar row */}
                <div className="flex items-center gap-2 border-b border-gray-200 p-3">
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

                {/* Viewer/Summary area */}
                {activeTab === 'pdf' ? (
                  <div className="h-[620px] overflow-auto bg-[#FAFAFA]">
                    <div className="mx-auto max-w-3xl px-6 py-6">
                      <div className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 text-center">
                          <h2 className="text-xl font-semibold text-gray-800">
                            Enhancement of Endoscopic Images & Videos using Advanced Deep Learning & Traditional Image Enhancement Techniques
                          </h2>
                          <p className="mt-2 text-xs text-gray-500">Files: {selectedFiles.map((f) => f.name).join(', ') || 'Sample.pdf'}</p>
                        </div>
                        <div className="h-96 rounded-md bg-orange-100/40 ring-1 ring-orange-200/70" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[620px] overflow-auto bg-white p-4">
                    <div className="prose prose-sm max-w-none">
                      <h3 className="mb-2 font-semibold text-gray-900">Summary</h3>
                      <p className="text-[15px] leading-7 text-gray-700">
                        Document summary and key findings will appear here after processing.
                      </p>
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
                    <button key={c} className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
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
                      onClick={sendMessage}
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
                      accept=".pdf"
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
                          <FileIcon className="h-5 w-5 text-gray-500" />
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
