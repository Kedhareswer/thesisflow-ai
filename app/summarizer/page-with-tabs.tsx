"use client"

import { useState, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import type { AIProvider } from "@/lib/ai-providers"
import { ErrorHandler, type UserFriendlyError } from "@/lib/utils/error-handler"
import { SummarizerService, type SummaryResult } from "@/lib/services/summarizer.service"
import type { ProcessingProgress } from "@/lib/utils/chunked-processor"

// Import the new tabbed layout and tab components
import { 
  SummarizerTabbedLayout, 
  useSummarizerTabs,
  type SummarizerTab 
} from "./components/summarizer-tabbed-layout"
import { InputTab } from "./components/input-tab"
import { SummaryTab, type EnhancedSummaryResult } from "./components/summary-tab"
import { 
  AnalyticsTab, 
  type SummaryHistoryItem, 
  type UsageStatistics 
} from "./components/analytics-tab"
import { ErrorDisplay } from "./components/error-display"

export default function SummarizerPage() {
  const { toast } = useToast()

  // Tab management
  const {
    activeTab,
    hasActiveSummary,
    isProcessing,
    handleTabChange,
    resetTabs,
    startProcessing,
    completeProcessing,
    setHasActiveSummary,
    setIsProcessing
  } = useSummarizerTabs('input')

  // State management
  const [content, setContent] = useState("")
  const [url, setUrl] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>(undefined)
  const [selectedModel, setSelectedModel] = useState<string>()
  const [summaryStyle, setSummaryStyle] = useState<"academic" | "executive" | "bullet-points" | "detailed">("academic")
  const [summaryLength, setSummaryLength] = useState<"brief" | "medium" | "comprehensive">("medium")
  const [result, setResult] = useState<EnhancedSummaryResult | null>(null)
  const [urlFetching, setUrlFetching] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<UserFriendlyError | null>(null)
  const [currentTab, setCurrentTab] = useState<"file" | "url" | "text">("file")
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)

  // Mock data for analytics (in real implementation, this would come from localStorage or backend)
  const [summaryHistory] = useState<SummaryHistoryItem[]>([])
  const [usageStatistics] = useState<UsageStatistics>({
    totalSummaries: summaryHistory.length,
    averageCompressionRatio: 75,
    mostUsedInputMethod: 'text',
    mostUsedProvider: 'openai',
    totalWordsProcessed: summaryHistory.reduce((acc, item) => acc + item.statistics.originalLength, 0),
    totalTimeSaved: summaryHistory.reduce((acc, item) => acc + item.statistics.readingTime, 0),
    summariesByMonth: [],
    topTopics: []
  })

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
      readingTime: result.readingTime || getReadingTime(result.summary),
      originalLength,
      summaryLength: summaryWordCount,
      compressionRatio,
      sentiment: "neutral",
      topics: [],
      difficulty: "intermediate",
      tables: [],
      graphs: []
    }
  }

  // Handle URL fetching
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

  // Handle summarization
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

    startProcessing()
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
      completeProcessing(true)

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
      completeProcessing(false)
      toast({
        title: "Summarization Failed",
        description: processedError.message,
        variant: "destructive",
      })
    } finally {
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

  // Analytics handlers
  const handleViewHistoryItem = (item: SummaryHistoryItem) => {
    // In a real implementation, this would load the historical summary
    console.log('View history item:', item)
  }

  const handleDeleteHistoryItem = (id: string) => {
    // In a real implementation, this would delete from localStorage/backend
    console.log('Delete history item:', id)
  }

  const handleExportHistory = () => {
    // In a real implementation, this would export history data
    console.log('Export history')
    toast({
      title: "Export Started",
      description: "History data has been exported.",
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

      {/* Tabbed Layout */}
      <SummarizerTabbedLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasActiveSummary={hasActiveSummary}
        isProcessing={isProcessing}
      >
        {{
          inputTab: (
            <InputTab
              content={content}
              url={url}
              onContentChange={setContent}
              onUrlChange={setUrl}
              onFileProcessed={handleFileProcessed}
              onFileError={handleFileError}
              onUrlFetch={handleUrlFetch}
              urlFetching={urlFetching}
              selectedProvider={selectedProvider}
              onProviderChange={setSelectedProvider}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              summaryStyle={summaryStyle}
              onSummaryStyleChange={setSummaryStyle}
              summaryLength={summaryLength}
              onSummaryLengthChange={setSummaryLength}
              isProcessing={isProcessing}
              processingProgress={processingProgress}
              onStartProcessing={handleSummarize}
              getWordCount={getWordCount}
              currentTab={currentTab}
              onTabChange={setCurrentTab}
            />
          ),
          summaryTab: (
            <SummaryTab
              result={result}
              isProcessing={isProcessing}
              processingProgress={processingProgress}
              onRetry={handleSummarize}
              onCopyToClipboard={handleCopyToClipboard}
              onDownloadSummary={handleDownloadSummary}
              onShareSummary={handleShareSummary}
              copied={copied}
              getWordCount={getWordCount}
              summaryStyle={summaryStyle}
              summaryLength={summaryLength}
            />
          ),
          analyticsTab: (
            <AnalyticsTab
              currentSummary={result}
              summaryHistory={summaryHistory}
              usageStatistics={usageStatistics}
              onViewHistoryItem={handleViewHistoryItem}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              onExportHistory={handleExportHistory}
            />
          )
        }}
      </SummarizerTabbedLayout>
    </div>
  )
}