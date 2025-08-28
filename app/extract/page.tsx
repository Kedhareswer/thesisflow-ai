"use client"

import React, { useState, useRef, useCallback } from 'react'
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
  Link,
  ChevronDown,
  Copy,
  Download,
  AlertCircle,
  BarChart3
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
      <div className="flex min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="flex min-h-screen flex-1 flex-col">
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setViewMode('upload')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  ← Back to Upload
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Extract Data Assistant</h1>
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={highQuality}
                    onChange={(e) => setHighQuality(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">High-quality extraction</span>
                </label>
                
                <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                  <button
                    onClick={() => setActiveTab('pdf')}
                    className={`px-3 py-1.5 text-sm rounded ${
                      activeTab === 'pdf' 
                        ? 'bg-green-100 text-green-700' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    PDF View
                  </button>
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-3 py-1.5 text-sm rounded ${
                      activeTab === 'summary' 
                        ? 'bg-green-100 text-green-700' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Summary View
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
              {/* Left Panel - PDF/Summary View */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {activeTab === 'pdf' ? 'Document View' : 'Summary'}
                </h3>
                
                {activeTab === 'pdf' ? (
                  <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                    <FileIcon className="w-12 h-12 mx-auto mb-2" />
                    <p>PDF viewer would be displayed here</p>
                    <p className="text-sm mt-1">
                      Files: {selectedFiles.map(f => f.name).join(', ')}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 text-sm">
                      Document summary and key findings will appear here after processing.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Panel - Chat */}
              <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Chat Assistant</h3>
                  <p className="text-sm text-gray-600">Ask questions about your uploaded documents</p>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesEndRef}>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          message.sender === 'user'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <textarea
                      ref={chatInputRef}
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about your documents..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      rows={1}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!currentMessage.trim()}
                      className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              Extract Data
            </h1>
            <p className="mt-2 text-gray-600">
              Get summary, conclusions and findings from multiple PDFs in a table
            </p>
          </div>

          {/* Upload Area */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-6">
                <Upload className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Your Files</h2>
                <p className="text-gray-600">
                  Drop your PDFs, Word docs, or other files here to get started
                </p>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Uploading...</span>
                    <span className="text-sm text-gray-500">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  
                  {/* Skeleton Loading */}
                  <div className="mt-4 space-y-3">
                    <div className="animate-pulse flex space-x-4">
                      <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="animate-pulse flex space-x-4">
                      <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* File List */}
              {selectedFiles.length > 0 && !isUploading && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3">Selected Files</h3>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileIcon className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drop Zone */}
              {!isUploading && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                  
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drag and drop your files here
                  </p>
                  <p className="text-gray-500 mb-4">
                    or click to browse from your computer
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Choose Files
                  </button>
                  <p className="text-xs text-gray-500 mt-4">
                    Supports PDF, Word, Excel, PowerPoint, and text files
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
