/**
 * Extract Data v2 - New redesigned page (Phase 0 scaffold)
 * Access via /extract-v2 or set NEXT_PUBLIC_EXTRACT_V2_ENABLED=true
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Sidebar } from '../../components/sidebar'
import { useToast } from '@/hooks/use-toast'
import { fetchRecentExtractions, fetchExtractionWithChats, saveChatMessage, deleteExtraction, clearAllExtractions, RecentExtraction } from '@/lib/services/extractions-store'

// Extract Data v2 components
import { WorkspacePanel } from '../extract/components/workspace-panel'
import { FileView } from '../extract/components/viewer-tabs/file-view'
import { SummaryView } from '../extract/components/viewer-tabs/summary-view'
import { TablesView } from '../extract/components/viewer-tabs/tables-view'
import { EntitiesView } from '../extract/components/viewer-tabs/entities-view'
import { CitationsView } from '../extract/components/viewer-tabs/citations-view'
import { RawJsonView } from '../extract/components/viewer-tabs/raw-json-view'
import { InsightsRail } from '../extract/components/insights-rail'
import { ChatDock } from '../extract/components/chat-dock'
import { useExtractionStream } from '@/hooks/use-extraction-stream'
import { useExtractChatStream } from '@/hooks/use-extract-chat-stream'
import { ChatMessage as StreamChatMessage } from '@/lib/types/extract-stream'

export default function ExtractV2Page() {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [recentExtractions, setRecentExtractions] = useState<RecentExtraction[]>([])
  const [activeViewerTab, setActiveViewerTab] = useState<'file' | 'summary' | 'tables' | 'entities' | 'citations' | 'raw'>('file')
  const [supportedExtensions, setSupportedExtensions] = useState<string[]>(['pdf', 'docx', 'doc', 'csv', 'txt', 'pptx'])
  const [extractedData, setExtractedData] = useState<any>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  
  // File preview state (reused from original)
  const [previewType, setPreviewType] = useState<'none' | 'pdf' | 'image' | 'text' | 'csv' | 'unsupported'>('none')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentMatch, setCurrentMatch] = useState(0)
  const [zoom, setZoom] = useState<number>(100)
  const [showZoomMenu, setShowZoomMenu] = useState(false)
  const matchRefs = useRef<HTMLElement[]>([])

  // v2 hooks
  const extractionStream = useExtractionStream()
  const chatStream = useExtractChatStream()
  const { toast } = useToast()

  // Load recent extractions on mount
  useEffect(() => {
    loadRecent()
  }, [])

  const loadRecent = async () => {
    const recent = await fetchRecentExtractions(10)
    setRecentExtractions(recent)
  }

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
    setSelectedFiles(prev => [...prev, ...accepted])
    
    // Phase 0: Start mock extraction stream
    if (accepted.length > 0) {
      extractionStream.start(accepted)
    }
  }, [toast, extractionStream])

  const handleFileRemove = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleRecentSelect = (id: string) => {
    // Phase 0: Mock opening recent extraction
    toast({ title: 'Opening extraction', description: `Loading extraction ${id}` })
  }

  const handleDeleteRecent = async (id: string) => {
    try {
      const res = await deleteExtraction(id)
      if (res?.success) {
        toast({ title: 'Deleted', description: 'File removed from recent.' })
        setRecentExtractions(prev => prev.filter(r => r.id !== id))
      } else {
        toast({ title: 'Delete failed', description: 'Could not delete this item', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Delete failed', description: 'Unexpected error', variant: 'destructive' })
    }
  }

  const handleClearAll = async () => {
    try {
      const res = await clearAllExtractions()
      if (res?.success) {
        toast({ title: 'Cleared', description: 'All recent files cleared.' })
        setRecentExtractions([])
      } else {
        toast({ title: 'Clear failed', description: 'Could not clear', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Clear failed', description: 'Unexpected error', variant: 'destructive' })
    }
  }

  const handleSendMessage = (message: string) => {
    const chatMessages: StreamChatMessage[] = [
      ...chatStream.state.messages,
      { role: 'user', content: message }
    ]
    chatStream.send(chatMessages, { 
      sessionId: extractionStream.state.sessionId,
      fileId: extractionStream.state.files[0]?.fileId 
    })
  }

  // Mock functions for Phase 0
  const handleSearchChange = (query: string) => setSearchQuery(query)
  const goToNextMatch = (total: number) => setCurrentMatch(prev => (prev + 1) % Math.max(1, total))
  const goToPrevMatch = (total: number) => setCurrentMatch(prev => (prev - 1 + Math.max(1, total)) % Math.max(1, total))
  const handleExplainMathTables = () => toast({ title: 'Feature coming', description: 'Math & table explanation in Phase 1' })
  const renderHighlightedText = (text: string, query: string) => text // Mock implementation
  const countOccurrences = (text: string, query: string) => 0 // Mock implementation
  const exportTablesAsCSV = (tables: any[]) => toast({ title: 'Export', description: 'CSV export functionality' })
  const exportTablesAsJSON = (tables: any[]) => toast({ title: 'Export', description: 'JSON export functionality' })

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          {/* Breadcrumb */}
          <div className="mb-4 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700">Extract Data v2</span>
            <span className="ml-2 rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
              Phase 0 Scaffold
            </span>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Extract Data From Research Papers
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Get summary, conclusions and findings from multiple PDFs in a structured format.
            </p>
          </div>

          {/* 3-Column Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Workspace Panel */}
            <div className="lg:col-span-3">
              <WorkspacePanel
                selectedFiles={selectedFiles}
                recentExtractions={recentExtractions}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                onRecentSelect={handleRecentSelect}
                onRecentDelete={handleDeleteRecent}
                onClearAll={handleClearAll}
                onRefreshRecent={loadRecent}
                supportedExtensions={supportedExtensions}
              />
            </div>

            {/* Center: Viewer Tabs */}
            <div className="lg:col-span-6">
              <div className="rounded-lg border border-gray-200 bg-white">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-4" aria-label="Tabs">
                    {[
                      { key: 'file', label: 'File View' },
                      { key: 'summary', label: 'Summary' },
                      { key: 'tables', label: 'Tables' },
                      { key: 'entities', label: 'Entities' },
                      { key: 'citations', label: 'Citations' },
                      { key: 'raw', label: 'Raw JSON' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveViewerTab(tab.key as any)}
                        className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                          activeViewerTab === tab.key
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="h-[600px]">
                  {activeViewerTab === 'file' && (
                    <FileView
                      previewLoading={previewLoading}
                      previewType={previewType}
                      previewUrl={previewUrl || undefined}
                      previewText={previewText || undefined}
                      searchQuery={searchQuery}
                      currentMatch={currentMatch}
                      zoom={zoom}
                      showZoomMenu={showZoomMenu}
                      onSearchChange={handleSearchChange}
                      onNextMatch={goToNextMatch}
                      onPrevMatch={goToPrevMatch}
                      onZoomChange={setZoom}
                      onShowZoomMenu={setShowZoomMenu}
                      onExplainMathTables={handleExplainMathTables}
                      renderHighlightedText={renderHighlightedText}
                      countOccurrences={countOccurrences}
                      matchRefs={matchRefs}
                    />
                  )}
                  {activeViewerTab === 'summary' && (
                    <SummaryView
                      isExtracting={isExtracting}
                      extractedData={extractedData}
                    />
                  )}
                  {activeViewerTab === 'tables' && (
                    <TablesView
                      tables={extractedData?.tables}
                      onExportCSV={exportTablesAsCSV}
                      onExportJSON={exportTablesAsJSON}
                    />
                  )}
                  {activeViewerTab === 'entities' && (
                    <EntitiesView entities={extractedData?.entities} />
                  )}
                  {activeViewerTab === 'citations' && (
                    <CitationsView citations={[]} />
                  )}
                  {activeViewerTab === 'raw' && (
                    <RawJsonView 
                      extractedData={extractedData} 
                      filename={selectedFiles[0]?.name}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right: Insights Rail */}
            <div className="lg:col-span-3">
              <InsightsRail
                currentPhase={extractionStream.state.files[0]?.phase || 'queued'}
                overallProgress={extractionStream.state.files[0]?.progress || 0}
                insights={extractionStream.state.insights}
                timeline={extractionStream.state.timeline}
                metrics={{
                  filesProcessed: extractionStream.state.files.filter(f => f.phase === 'completed').length,
                  totalFiles: extractionStream.state.files.length,
                  tablesFound: extractedData?.tables?.length,
                  entitiesFound: extractedData?.entities?.length,
                  ocrEnabled: false,
                }}
              />
            </div>
          </div>

          {/* Bottom: Chat Dock */}
          <div className="mt-6">
            <ChatDock
              messages={chatStream.state.messages}
              currentResponse={chatStream.state.currentResponse}
              isStreaming={chatStream.state.isStreaming}
              onSendMessage={handleSendMessage}
              onAbort={chatStream.abort}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
