"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { AIProvider } from "@/lib/ai-providers"
import { ErrorHandler, type UserFriendlyError } from "@/lib/utils/error-handler"
import { SummarizerService, type SummaryResult } from "@/lib/services/summarizer.service"
import type { ProcessingProgress } from "@/lib/utils/chunked-processor"
import { ContextInputPanel } from "./components/context-input-panel"
import { ConfigurationPanel } from "./components/configuration-panel"
import { SummaryOutputPanel } from "./components/summary-output-panel"
import { WebSearchPanel } from "./components/web-search-panel"
import { ErrorDisplay } from "./components/error-display"
import { ProcessingProgressIndicator, ChunkingStats } from "./components/processing-progress"
import { EnhancedLoading, SummaryLoadingSkeleton } from "./components/enhanced-loading"
import { SummaryStatistics } from "./components/summary-statistics"
import { QualityAssessment } from "./components/quality-assessment"

// Enhanced SummaryResult interface to match the new service
interface EnhancedSummaryResult extends Omit<SummaryResult, 'readingTime'> {
  readingTime: number // Override to make it required
  sentiment?: "positive" | "neutral" | "negative"
  originalLength: number
  summaryLength: number
  compressionRatio: string
  topics?: string[]
  difficulty?: "beginner" | "intermediate" | "advanced"
  tables?: any[]
  graphs?: any[]
}

export default function SummarizerPage() {
  const { toast } = useToast()

  // State management
  const [content, setContent] = useState("")
  const [url, setUrl] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>(undefined)
  const [selectedModel, setSelectedModel] = useState<string>()
  const [summaryStyle, setSummaryStyle] = useState<"academic" | "executive" | "bullet-points" | "detailed">("academic")
  const [summaryLength, setSummaryLength] = useState<"brief" | "medium" | "comprehensive">("medium")
  const [result, setResult] = useState<EnhancedSummaryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [urlFetching, setUrlFetching] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<UserFriendlyError | null>(null)
  const [currentTab, setCurrentTab] = useState<"file" | "url" | "text">("file")
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)

  // Utility functions
  const getWordCount = useCallback((text: string) => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length
  }, [])

  const getReadingTime = useCallback(
    (text: string) => {
      const wordsPerMinute = 200
      const wordCount = getWordCount(text)
      return Math.ceil(wordCount / wordsPerMinute)
    },
    [getWordCount],
  )



  // Convert SummaryResult to EnhancedSummaryResult
  const enhanceResult = (result: SummaryResult): EnhancedSummaryResult => {
    const originalLength = getWordCount(content)
    const summaryWordCount = getWordCount(result.summary)
    const compressionRatio = `${Math.round((1 - summaryWordCount / originalLength) * 100)}%`

    return {
      ...result,
      readingTime: result.readingTime || getReadingTime(result.summary), // Ensure readingTime is always a number
      originalLength,
      summaryLength: summaryWordCount,
      compressionRatio,
      sentiment: "neutral", // Default values for backward compatibility
      topics: [],
      difficulty: "intermediate",
      tables: [],
      graphs: []
    }
  }

  // Handle URL fetching and summarization
  const handleUrlFetch = async () => {
    if (!url.trim()) return

    setUrlFetching(true)
    setError(null)
    setProcessingProgress(null)

    try {
      const response = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        // Handle structured error responses from the new error handling system
        if (data.userMessage) {
          const structuredError: UserFriendlyError = {
            title: data.error || "URL Fetch Failed",
            message: data.userMessage,
            actions: [...(data.actions || []), "Switch to Text tab to paste content manually"],
            fallbackOptions: data.fallbackOptions,
            helpLinks: data.helpLinks,
            errorType: data.errorType || 'url_extraction',
            technicalDetails: data.technicalDetails
          }
          setError(structuredError)
          toast({
            title: "URL Fetch Failed",
            description: data.userMessage + " Try switching to the Text tab to paste content manually.",
            variant: "destructive",
          })
          return
        }

        // Fallback for legacy error responses
        throw new Error(data.error || `Failed to fetch URL: ${response.statusText}`)
      }

      setContent(data.content || "")
      toast({
        title: "URL Content Extracted",
        description: `Successfully extracted ${getWordCount(data.content || "")} words from the URL.`,
      })
    } catch (error) {
      const processedError = ErrorHandler.processError(error, {
        operation: 'url-fetch',
        url
      })
      setError(processedError)
      toast({
        title: "URL Fetch Failed",
        description: processedError.message,
        variant: "destructive",
      })
    } finally {
      setUrlFetching(false)
    }
  }

  // Handle URL summarization with progress
  const handleUrlSummarize = async () => {
    if (!url.trim()) return

    setLoading(true)
    setError(null)
    setProcessingProgress(null)

    try {
      const result = await SummarizerService.summarizeUrl(
        url,
        true,
        (progress) => setProcessingProgress(progress),
        {
          provider: selectedProvider,
          model: selectedModel,
          style: summaryStyle,
          length: summaryLength
        }
      )

      const enhancedResult = enhanceResult(result)
      setResult(enhancedResult)

      toast({
        title: "URL Summarized",
        description: `Successfully summarized content from URL using ${result.processingMethod} processing.`,
      })
    } catch (error) {
      const processedError = ErrorHandler.processError(error, {
        operation: 'summarize-url',
        url
      })
      setError(processedError)
      toast({
        title: "URL Summarization Failed",
        description: processedError.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setProcessingProgress(null)
    }
  }

  // Handle file processing
  const handleFileProcessed = useCallback(
    (fileContent: string, metadata: any) => {
      setContent(fileContent)
      toast({
        title: "File Processed",
        description: `Successfully extracted ${getWordCount(fileContent)} words from ${metadata?.name || "the file"}.`,
      })
    },
    [getWordCount],
  )

  const handleFileError = useCallback(
    (error: string) => {
      const processedError = ErrorHandler.processError(error, {
        operation: 'file-processing'
      })
      setError(processedError)
      toast({
        title: "File Processing Failed",
        description: processedError.message,
        variant: "destructive",
      })
    },
    [toast],
  )

  // Handle file summarization with progress
  const handleFileSummarize = async (file: File) => {
    setLoading(true)
    setError(null)
    setProcessingProgress(null)

    try {
      const result = await SummarizerService.summarizeFile(
        file,
        true,
        (progress) => setProcessingProgress(progress),
        {
          provider: selectedProvider,
          model: selectedModel,
          style: summaryStyle,
          length: summaryLength
        }
      )

      const enhancedResult = enhanceResult(result)
      setResult(enhancedResult)

      toast({
        title: "File Summarized",
        description: `Successfully summarized ${file.name} using ${result.processingMethod} processing.`,
      })
    } catch (error) {
      const processedError = ErrorHandler.processError(error, {
        operation: 'summarize-file',
        fileType: file.type
      })
      setError(processedError)
      toast({
        title: "File Summarization Failed",
        description: processedError.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setProcessingProgress(null)
    }
  }

  // Handle text summarization with progress
  const handleSummarize = async (retryOptions?: any) => {
    if (!content.trim()) {
      const validationError = ErrorHandler.processError(
        "No content provided for summarization",
        { operation: 'summarize-validation' }
      )
      setError(validationError)
      toast({
        title: "No Content",
        description: "Please provide content to summarize.",
        variant: "destructive",
      })
      return
    }

    // Apply retry options if provided
    if (retryOptions) {
      if (retryOptions.style) setSummaryStyle(retryOptions.style)
      if (retryOptions.length) setSummaryLength(retryOptions.length)
      if (retryOptions.provider) setSelectedProvider(retryOptions.provider)
      if (retryOptions.model) setSelectedModel(retryOptions.model)
    }

    setLoading(true)
    setError(null)
    setProcessingProgress(null)

    try {
      console.log('Summarizer: Starting summarization with options:', {
        provider: selectedProvider,
        model: selectedModel,
        style: summaryStyle,
        length: summaryLength,
        contentLength: content.length
      })

      const result = await SummarizerService.summarizeText(
        content,
        true,
        (progress) => setProcessingProgress(progress),
        {
          provider: selectedProvider,
          model: selectedModel,
          style: summaryStyle,
          length: summaryLength
        }
      )

      const enhancedResult = enhanceResult(result)
      setResult(enhancedResult)

      toast({
        title: "Summary Generated",
        description: `Successfully created summary using ${result.processingMethod} processing.`,
      })
    } catch (error) {
      const processedError = ErrorHandler.processError(error, {
        operation: 'summarize-text',
        contentLength: content.length
      })
      setError(processedError)
      toast({
        title: "Summarization Failed",
        description: processedError.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setProcessingProgress(null)
    }
  }

  // Handle copy to clipboard
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied to Clipboard",
        description: "Summary has been copied to your clipboard.",
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      })
    }
  }

  // Handle download
  const handleDownloadSummary = () => {
    if (!result) return

    const summaryText = `# Summary\n\n${result.summary}\n\n## Key Points\n\n${result.keyPoints.map((point) => `• ${point}`).join("\n")}\n\n## Statistics\n\n• Reading Time: ${result.readingTime} minutes\n• Compression: ${result.compressionRatio}\n• Word Count: ${result.summaryLength} words`

    const blob = new Blob([summaryText], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "summary.md"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Download Started",
      description: "Summary has been downloaded as a Markdown file.",
    })
  }

  // Handle share
  const handleShareSummary = async () => {
    if (!result) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: "AI Generated Summary",
          text: result.summary,
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to copying to clipboard
      handleCopyToClipboard(result.summary)
    }
  }

  // Handle quality feedback
  const handleQualityFeedback = (rating: "good" | "poor", feedback?: string) => {
    // Log feedback for analytics (could be sent to backend)
    console.log('Quality feedback:', { rating, feedback, resultId: result?.summary.slice(0, 50) })

    toast({
      title: "Feedback Received",
      description: `Thank you for rating this summary as ${rating}.`,
    })
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-light tracking-tight text-black mb-3">
              Summarizer
            </h1>
            <p className="text-gray-600 text-lg font-light max-w-2xl mx-auto">
              Transform lengthy content into concise, intelligent summaries
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <ErrorDisplay
            error={error}
            onRetry={() => {
              setError(null)
              if (currentTab === "url" && url) {
                handleUrlFetch()
              } else if (content) {
                handleSummarize()
              }
            }}
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {result ? (
          // Summary View - Full width when summary exists
          <div className="space-y-8">
            {/* Summary Output - Primary Focus */}
            <div className="space-y-6">
              <SummaryOutputPanel
                result={result}
                loading={loading}
                copied={copied}
                onCopyToClipboard={handleCopyToClipboard}
                onDownloadSummary={handleDownloadSummary}
                onShareSummary={handleShareSummary}
                getWordCount={getWordCount}
                showAdvancedStats={false}
                summaryStyle={summaryStyle}
                summaryLength={summaryLength}
              />

              {/* Enhanced Statistics and Quality Assessment */}
              <div className="grid gap-6 lg:grid-cols-2">
                <SummaryStatistics
                  result={result}
                  getWordCount={getWordCount}
                />

                <QualityAssessment
                  result={result}
                  onRetry={handleSummarize}
                  onFeedback={handleQualityFeedback}
                />
              </div>

              {/* Chunking Statistics */}
              {result?.metadata && (result.metadata.totalChunks || 0) > 1 && (
                <ChunkingStats
                  metadata={result.metadata}
                  confidence={result.confidence}
                  warnings={result.warnings}
                  suggestions={result.suggestions}
                  className="max-w-4xl mx-auto"
                />
              )}
            </div>

            {/* Input Controls - Minimized when summary exists */}
            <div className="border-t border-gray-200 pt-8">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <ContextInputPanel
                    content={content}
                    url={url}
                    onContentChange={setContent}
                    onUrlChange={setUrl}
                    onUrlFetch={handleUrlFetch}
                    onFileProcessed={handleFileProcessed}
                    onFileError={handleFileError}
                    urlFetching={urlFetching}
                    getWordCount={getWordCount}
                    currentTab={currentTab}
                    onTabChange={setCurrentTab}
                  />
                </div>

                <div className="space-y-6">
                  <ConfigurationPanel
                    selectedProvider={selectedProvider}
                    onProviderChange={setSelectedProvider}
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    summaryStyle={summaryStyle}
                    onSummaryStyleChange={setSummaryStyle}
                    summaryLength={summaryLength}
                    onSummaryLengthChange={setSummaryLength}
                  />

                  <Button
                    onClick={handleSummarize}
                    disabled={loading || !content.trim()}
                    className="w-full h-12 bg-black hover:bg-gray-800 text-white border-0 font-light tracking-wide"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {processingProgress?.stage === 'chunking' && 'Analyzing Structure...'}
                        {processingProgress?.stage === 'processing' && `Processing (${processingProgress.currentChunk || 1}/${processingProgress.totalChunks || 1})...`}
                        {processingProgress?.stage === 'synthesizing' && 'Creating Summary...'}
                        {!processingProgress && 'Initializing...'}
                      </>
                    ) : (
                      "Generate New Summary"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Input View - Centered when no summary
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {/* Web Search Panel - Only show when URL tab is active */}
                {currentTab === "url" && (
                  <WebSearchPanel onSelectUrl={(selectedUrl) => {
                    setUrl(selectedUrl);
                    handleUrlFetch();
                  }} />
                )}

                <ContextInputPanel
                  content={content}
                  url={url}
                  onContentChange={setContent}
                  onUrlChange={setUrl}
                  onUrlFetch={handleUrlFetch}
                  onFileProcessed={handleFileProcessed}
                  onFileError={handleFileError}
                  urlFetching={urlFetching}
                  getWordCount={getWordCount}
                  currentTab={currentTab}
                  onTabChange={setCurrentTab}
                />
              </div>

              <div className="space-y-6">
                <ConfigurationPanel
                  selectedProvider={selectedProvider}
                  onProviderChange={setSelectedProvider}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  summaryStyle={summaryStyle}
                  onSummaryStyleChange={setSummaryStyle}
                  summaryLength={summaryLength}
                  onSummaryLengthChange={setSummaryLength}
                />

                <Button
                  onClick={() => handleSummarize()}
                  disabled={loading || !content.trim()}
                  className="w-full h-12 bg-black hover:bg-gray-800 text-white border-0 font-light tracking-wide"
                >
                  {loading ? (
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

            {/* Enhanced Loading State with Progress */}
            {loading && (
              <div className="mt-12 space-y-6">
                <EnhancedLoading
                  progress={processingProgress}
                  operation="summarize"
                  className="max-w-2xl mx-auto"
                />

                {/* Show skeleton while processing */}
                {processingProgress?.stage === 'processing' && (
                  <SummaryLoadingSkeleton className="max-w-4xl mx-auto" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
