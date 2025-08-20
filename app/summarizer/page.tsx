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
  const [loading, setLoading] = useState(false)
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
    topTopics: [],
    // Enhanced statistics
    averageConfidence: 0.85,
    successRate: 95,
    mostUsedDifficulty: 'intermediate',
    averageProcessingTime: 2.5,
    inputMethodBreakdown: [
      { method: 'text', count: 0, percentage: 0 },
      { method: 'file', count: 0, percentage: 0 },
      { method: 'url', count: 0, percentage: 0 },
      { method: 'search', count: 0, percentage: 0 }
    ],
    providerBreakdown: [
      { provider: 'openai', count: 0, percentage: 0 },
      { provider: 'gemini', count: 0, percentage: 0 },
      { provider: 'groq', count: 0, percentage: 0 },
      { provider: 'anthropic', count: 0, percentage: 0 }
    ],
    sentimentBreakdown: [
      { sentiment: 'positive', count: 0, percentage: 0 },
      { sentiment: 'neutral', count: 0, percentage: 0 },
      { sentiment: 'negative', count: 0, percentage: 0 }
    ]
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

      // Automatically trigger summarization and switch to the Summary tab
      // Ensure content is available before triggering
      if (data.content && data.content.trim().length > 10) {
        setTimeout(() => {
          handleSummarize(data.content)
          handleTabChange('summary')
        }, 100)
      }

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
      console.log('File processed, content length:', fileContent?.length)
      console.log('File metadata:', metadata)
      
      // Ensure content is properly set
      if (!fileContent || fileContent.trim().length === 0) {
        const noContentError: UserFriendlyError = {
          title: "No Content Extracted",
          message: "The file appears to be empty or could not be read. Please try a different file.",
          actions: [
            "Try uploading a different file",
            "Ensure the file contains readable text",
            "Use the Text tab to paste content manually"
          ],
          errorType: 'validation'
        }
        setError(noContentError)
        return
      }
      
      setContent(fileContent)
      setError(null) // Clear any previous errors
      
      toast({
        title: "File Processed",
        description: `Successfully extracted ${getWordCount(fileContent)} words from ${metadata?.name || "the file"}.`,
      })
      
      // Auto-trigger summarization if provider is selected and content is valid
      if (selectedProvider && fileContent && fileContent.trim().length > 10) {
        console.log('Auto-triggering summarization with file content:', fileContent.substring(0, 100))
        setTimeout(() => {
          handleSummarize(fileContent)
        }, 100)
      } else if (selectedProvider) {
        console.log('Provider selected but content invalid:', {
          hasContent: !!fileContent,
          length: fileContent?.length,
          trimmedLength: fileContent?.trim()?.length
        })
      }
    },
    [getWordCount, selectedProvider, toast],
  )

  const handleFileError = useCallback(
    (error: string | UserFriendlyError) => {
      // Check if error is already a UserFriendlyError object
      let processedError: UserFriendlyError
      
      if (typeof error === 'object' && 'title' in error && 'message' in error) {
        // Already a UserFriendlyError
        processedError = error as UserFriendlyError
      } else {
        // Process the error string
        const errorMessage = typeof error === 'string' ? error : 'Unknown file processing error'
        processedError = ErrorHandler.processError(errorMessage, {
          operation: 'file-processing'
        })
      }
      
      setError(processedError)
      toast({
        title: "File Processing Failed",
        description: processedError.message,
        variant: "destructive",
      })
    },
    [toast],
  )

  // Handle text summarization with progress
  const handleSummarize = async (contentOverride?: unknown, retryOptions?: any) => {
    const textToSummarize = typeof contentOverride === 'string' ? contentOverride : content
    
    const preview = (val: unknown) => typeof val === 'string' ? val.slice(0, 100) : undefined
    const safeLen = (val: unknown) => typeof val === 'string' ? val.length : undefined
    const safeTrimLen = (val: unknown) => typeof val === 'string' ? val.trim().length : undefined

    console.log('HandleSummarize called with:', {
      hasOverride: typeof contentOverride !== 'undefined',
      overrideType: typeof contentOverride,
      contentOverridePreview: preview(contentOverride),
      contentPreview: preview(content),
      textToSummarizePreview: preview(textToSummarize),
      length: safeLen(textToSummarize),
      trimmedLength: safeTrimLen(textToSummarize)
    });
    
    // More lenient validation - only check for truly empty content
    if (typeof textToSummarize !== 'string' || textToSummarize.trim().length < 10) {
      const validationError = ErrorHandler.processError(
        "Content is too short or empty. Please provide at least 10 characters of text to summarize.",
        {
          operation: 'summarization-validation',
          contentLength: typeof content === 'string' ? content.length : 0
        }
      )
      setError(validationError)
      toast({
        title: "No Content Provided",
        description: validationError.message,
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
    setIsProcessing(true)
    startProcessing()
    setError(null)
    setProcessingProgress(null)

    try {
      console.log('Summarizer: Starting summarization with options:', {
        provider: selectedProvider,
        model: selectedModel,
        style: summaryStyle,
        length: summaryLength,
        contentLength: textToSummarize.length
      })

      const result = await SummarizerService.summarizeText(
        textToSummarize,
        true,
        (progress) => setProcessingProgress(progress),
        {
          provider: selectedProvider,
          model: selectedModel,
          style: summaryStyle,
          length: summaryLength
        }
      )

      console.log('Summarizer: Raw result returned:', {
        hasSummary: !!result?.summary,
        summaryPreview: result?.summary?.slice(0, 160),
        keyPointsCount: Array.isArray(result?.keyPoints) ? result.keyPoints.length : 0,
        method: result?.processingMethod,
      })

      const enhancedResult = enhanceResult(result)
      console.log('Summarizer: Enhanced result:', {
        readingTime: enhancedResult.readingTime,
        summaryLength: enhancedResult.summaryLength,
        compressionRatio: enhancedResult.compressionRatio,
        keyPoints: enhancedResult.keyPoints,
      })
      setResult(enhancedResult)
      setHasActiveSummary(true)
      completeProcessing(true)
      // Ensure Summary tab is shown after successful generation
      handleTabChange('summary')

      toast({
        title: "Summary Generated",
        description: `Successfully created summary using ${result.processingMethod} processing.`,
      })
    } catch (error) {
      const processedError = ErrorHandler.processError(error, {
        operation: 'summarize-text',
        contentLength: typeof textToSummarize === 'string' ? textToSummarize.length : 0
      })
      setError(processedError)
      completeProcessing(false)
      toast({
        title: "Summarization Failed",
        description: processedError.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setIsProcessing(false)
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
    console.log('Viewing history item:', item)
    toast({
      title: "History Item",
      description: `Viewing summary: ${item.title}`,
    })
  }

  const handleDeleteHistoryItem = (id: string) => {
    // In a real implementation, this would delete from localStorage/backend
    console.log('Deleting history item:', id)
    toast({
      title: "Item Deleted",
      description: "Summary has been removed from history.",
    })
  }

  const handleExportHistory = () => {
    // In a real implementation, this would export all history data
    console.log('Exporting history')
    toast({
      title: "Export Started",
      description: "History data is being prepared for download.",
    })
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white hidden">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            
              Summarizer
            
            
              
            
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