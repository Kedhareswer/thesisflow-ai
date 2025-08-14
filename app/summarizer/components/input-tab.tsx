"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { ContextInputPanel } from "./context-input-panel"
import { ConfigurationPanel } from "./configuration-panel"
import { WebSearchPanel } from "./web-search-panel"
import type { AIProvider } from "@/lib/ai-providers"
import type { ProcessingProgress } from "@/lib/utils/chunked-processor"

export interface InputTabProps {
  // Content state
  content: string
  url: string
  onContentChange: (content: string) => void
  onUrlChange: (url: string) => void
  
  // File handling
  onFileProcessed: (content: string, metadata: any) => void
  onFileError: (error: string) => void
  
  // URL handling
  onUrlFetch: () => void
  urlFetching: boolean
  
  // Processing settings
  selectedProvider?: AIProvider
  onProviderChange: (provider: AIProvider | undefined) => void
  selectedModel?: string
  onModelChange: (model: string | undefined) => void
  summaryStyle: "academic" | "executive" | "bullet-points" | "detailed"
  onSummaryStyleChange: (style: "academic" | "executive" | "bullet-points" | "detailed") => void
  summaryLength: "brief" | "medium" | "comprehensive"
  onSummaryLengthChange: (length: "brief" | "medium" | "comprehensive") => void
  
  // Processing state
  isProcessing: boolean
  processingProgress?: ProcessingProgress | null
  onStartProcessing: () => void
  
  // Utilities
  getWordCount: (text: string) => number
  currentTab: "file" | "url" | "text"
  onTabChange: (tab: "file" | "url" | "text") => void
}

export function InputTab({
  content,
  url,
  onContentChange,
  onUrlChange,
  onFileProcessed,
  onFileError,
  onUrlFetch,
  urlFetching,
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
  summaryStyle,
  onSummaryStyleChange,
  summaryLength,
  onSummaryLengthChange,
  isProcessing,
  processingProgress,
  onStartProcessing,
  getWordCount,
  currentTab,
  onTabChange
}: InputTabProps) {
  
  const hasContent = content.trim().length > 0
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h2 className="text-3xl font-light tracking-tight text-black mb-3">
              Content Input
            </h2>
            <p className="text-gray-600 text-lg font-light max-w-2xl mx-auto">
              Upload files, enter URLs, paste text, or search the web for content to summarize
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Web Search Panel - Only show when URL tab is active */}
              {currentTab === "url" && (
                <WebSearchPanel 
                  onSelectUrl={(selectedUrl) => {
                    onUrlChange(selectedUrl)
                    onUrlFetch()
                  }} 
                />
              )}

              {/* Main Input Panel */}
              <ContextInputPanel
                content={content}
                url={url}
                onContentChange={onContentChange}
                onUrlChange={onUrlChange}
                onUrlFetch={onUrlFetch}
                onFileProcessed={onFileProcessed}
                onFileError={onFileError}
                urlFetching={urlFetching}
                getWordCount={getWordCount}
                currentTab={currentTab}
                onTabChange={onTabChange}
              />

              {/* Content Preview */}
              {hasContent && (
                <Card className="border-gray-200 bg-white">
                  <CardContent className="p-6">
                    <h4 className="text-lg font-light text-black mb-3 tracking-tight">
                      Content Preview
                    </h4>
                    <div className="bg-gray-50 rounded-sm p-4 border border-gray-200">
                      <p className="text-sm text-gray-700 font-light line-clamp-4">
                        {content.slice(0, 300)}
                        {content.length > 300 && "..."}
                      </p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-500">
                          {getWordCount(content)} words
                        </span>
                        <span className="text-sm text-gray-500">
                          ~{Math.ceil(getWordCount(content) / 200)} min read
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Configuration and Action Panel */}
            <div className="space-y-6">
              <ConfigurationPanel
                selectedProvider={selectedProvider}
                onProviderChange={onProviderChange}
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                summaryStyle={summaryStyle}
                onSummaryStyleChange={onSummaryStyleChange}
                summaryLength={summaryLength}
                onSummaryLengthChange={onSummaryLengthChange}
              />

              {/* Generate Summary Button */}
              <Button
                onClick={onStartProcessing}
                disabled={isProcessing || !hasContent}
                className="w-full h-12 bg-black hover:bg-gray-800 text-white border-0 font-light tracking-wide"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {processingProgress?.stage === 'chunking' && 'Analyzing Structure...'}
                    {processingProgress?.stage === 'processing' && `Processing (${processingProgress.currentChunk || 1}/${processingProgress.totalChunks || 1})...`}
                    {processingProgress?.stage === 'synthesizing' && 'Creating Summary...'}
                    {!processingProgress && 'Initializing...'}
                  </>
                ) : (
                  "Generate Summary"
                )}
              </Button>

              {/* Processing Tips */}
              {!hasContent && (
                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Getting Started
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Upload PDF, DOCX, or TXT files</li>
                      <li>• Enter URLs for web articles</li>
                      <li>• Paste text directly for quick summaries</li>
                      <li>• Use web search to find relevant content</li>
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Subtle QuantumPDF Note */}
              <p className="text-xs text-gray-500 text-center font-light">
                For advanced PDF analysis, visit{' '}
                <a
                  href="https://quantumn-pdf-chatapp.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-700"
                >
                  QuantumPDF
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}