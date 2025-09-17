"use client"

import { useState, useCallback, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import type { AIProvider } from "@/lib/ai-providers"
import { ErrorHandler, type UserFriendlyError } from "@/lib/utils/error-handler"
import { SummarizerService, type SummaryResult } from "@/lib/services/summarizer.service"
import type { ProcessingProgress } from "@/lib/utils/chunked-processor"
import { supabase } from "@/integrations/supabase/client"
import type { Summary } from "@/integrations/supabase/types"

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
import { useUserPlan } from "@/hooks/use-user-plan"

export default function SummarizerPage() {
  const { toast } = useToast()
  const { canUseFeature, incrementUsage, fetchPlanData, fetchTokenStatus } = useUserPlan()

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

  // Initialize with proper default data for better UX
  const [summaryHistory, setSummaryHistory] = useState<SummaryHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [usageStatistics, setUsageStatistics] = useState<UsageStatistics>({
    totalSummaries: 0,
    averageCompressionRatio: 75,
    mostUsedInputMethod: 'text',
    mostUsedProvider: 'openai',
    totalWordsProcessed: 0,
    totalTimeSaved: 0,
    summariesByMonth: [],
    topTopics: [],
    averageConfidence: 0.85,
    successRate: 95,
    mostUsedDifficulty: 'intermediate',
    averageProcessingTime: 2.5,
    inputMethodBreakdown: [
      { method: 'text', count: 0, percentage: 25 },
      { method: 'file', count: 0, percentage: 45 },
      { method: 'url', count: 0, percentage: 25 },
      { method: 'search', count: 0, percentage: 5 }
    ],
    providerBreakdown: [
      { provider: 'openai', count: 0, percentage: 40 },
      { provider: 'gemini', count: 0, percentage: 30 },
      { provider: 'groq', count: 0, percentage: 20 },
      { provider: 'anthropic', count: 0, percentage: 10 }
    ],
    sentimentBreakdown: [
      { sentiment: 'positive', count: 0, percentage: 35 },
      { sentiment: 'neutral', count: 0, percentage: 50 },
      { sentiment: 'negative', count: 0, percentage: 15 }
    ]
  })

  // Fetch summary history and calculate statistics on mount
  useEffect(() => {
    fetchSummaryHistory()
  }, [])

  const fetchSummaryHistory = async () => {
    try {
      setHistoryLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setHistoryLoading(false)
        return
      }

      // Fetch summaries from database
      const { data: summaries, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching summaries:', error)
        setHistoryLoading(false)
        return
      }

      if (summaries && summaries.length > 0) {
        // Convert database summaries to history items
        const historyItems: SummaryHistoryItem[] = summaries.map(summary => {
          const keyPoints = Array.isArray(summary.key_points) 
            ? summary.key_points 
            : typeof summary.key_points === 'string' 
              ? JSON.parse(summary.key_points || '[]')
              : []
          
          const originalWordCount = summary.original_length || getWordCount(summary.original_content || '')
          const summaryWordCount = getWordCount(summary.summary_content)
          const compressionRatio = originalWordCount > 0 
            ? `${Math.round((1 - summaryWordCount / originalWordCount) * 100)}%` 
            : '0%'

          return {
            id: summary.id,
            title: summary.title || 'Untitled Summary',
            originalSource: (summary.source_type as 'file' | 'url' | 'text' | 'search') || 'text',
            sourceDetails: summary.source_url || summary.source_type || 'Text input',
            summary: summary.summary_content,
            keyPoints: keyPoints as string[],
            statistics: {
              originalLength: originalWordCount,
              summaryLength: summaryWordCount,
              compressionRatio,
              readingTime: summary.reading_time || Math.ceil(summaryWordCount / 200),
              confidence: 0.9
            },
            timestamp: new Date(summary.created_at),
            tags: extractTopics(summary.summary_content, keyPoints as string[]),
            sentiment: analyzeSentiment(summary.summary_content),
            topics: extractTopics(summary.summary_content, keyPoints as string[]),
            difficulty: determineDifficulty(summary.summary_content, originalWordCount),
            provider: 'openai',
            processingMethod: 'direct'
          }
        })

        setSummaryHistory(historyItems)
        
        // Calculate real statistics from the data
        calculateStatistics(historyItems)
      }
    } catch (error) {
      console.error('Error in fetchSummaryHistory:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const calculateStatistics = (items: SummaryHistoryItem[]) => {
    if (items.length === 0) return

    // Calculate total words processed
    const totalWordsProcessed = items.reduce((sum, item) => sum + item.statistics.originalLength, 0)
    const totalSummaryWords = items.reduce((sum, item) => sum + item.statistics.summaryLength, 0)
    
    // Calculate average compression ratio
    const avgCompression = Math.round(
      items.reduce((sum, item) => {
        const ratio = parseInt(item.statistics.compressionRatio.replace('%', ''))
        return sum + ratio
      }, 0) / items.length
    )

    // Calculate time saved (assuming 200 words per minute reading speed)
    const totalTimeSaved = Math.round((totalWordsProcessed - totalSummaryWords) / 200)

    // Calculate breakdown by input method
    const inputMethodCounts: Record<string, number> = {}
    items.forEach(item => {
      const method = item.originalSource || 'text'
      inputMethodCounts[method] = (inputMethodCounts[method] || 0) + 1
    })

    // Calculate input method breakdown
    const inputMethodBreakdown = Object.entries(inputMethodCounts).map(([method, count]) => ({
      method,
      count,
      percentage: Math.round((count / items.length) * 100)
    }))

    // Calculate breakdown by sentiment
    const sentimentCounts: Record<string, number> = {}
    items.forEach(item => {
      const sentiment = item.sentiment || 'neutral'
      sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1
    })

    // Calculate sentiment breakdown
    const sentimentBreakdown = Object.entries(sentimentCounts).map(([sentiment, count]) => ({
      sentiment,
      count,
      percentage: Math.round((count / items.length) * 100)
    }))

    // Extract all topics and count occurrences
    const topicCounts: Record<string, number> = {}
    items.forEach(item => {
      (item.topics || []).forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1
      })
    })

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }))

    // Calculate monthly summaries
    const monthCounts: Record<string, number> = {}
    items.forEach(item => {
      const month = item.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      monthCounts[month] = (monthCounts[month] || 0) + 1
    })

    // Get last 6 months of data
    const sortedMonths = Object.entries(monthCounts)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-6)
      .map(([month, count]) => ({ month, count }))

    // Calculate average confidence
    const avgConfidence = items.reduce((sum, item) => sum + (item.statistics.confidence || 0.8), 0) / items.length

    // Calculate average processing time (simulated based on word count)
    const avgProcessingTime = items.reduce((sum, item) => sum + (item.statistics.originalLength || 1000), 0) / items.length / 500 // Rough estimate: 1 second per 1000 words

    // Determine most used difficulty
    const difficultyCounts = items.reduce((acc, item) => {
      const difficulty = item.difficulty || 'intermediate'
      acc[difficulty] = (acc[difficulty] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const mostUsedDifficulty = Object.entries(difficultyCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as 'beginner' | 'intermediate' | 'advanced' || 'intermediate'

    setUsageStatistics({
      totalSummaries: items.length,
      averageCompressionRatio: avgCompression,
      mostUsedInputMethod: (inputMethodBreakdown[0]?.method || 'text') as any,
      mostUsedProvider: 'openai', // We can enhance this later
      totalWordsProcessed,
      totalTimeSaved,
      summariesByMonth: sortedMonths,
      topTopics,
      averageConfidence: avgConfidence,
      successRate: 95, // Can be calculated if we track failures
      mostUsedDifficulty,
      averageProcessingTime: avgProcessingTime,
      inputMethodBreakdown: inputMethodBreakdown as any,
      providerBreakdown: [
        { provider: 'openai', count: items.length, percentage: 100 }
      ],
      sentimentBreakdown: sentimentBreakdown as any
    })
  }

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

  // Convert SummaryResult to EnhancedSummaryResult with proper analytics
  const enhanceResult = (result: SummaryResult): EnhancedSummaryResult => {
    const originalLength = getWordCount(content)
    const summaryWordCount = getWordCount(result.summary)
    const compressionRatio = originalLength > 0 ? `${Math.round((1 - summaryWordCount / originalLength) * 100)}%` : '0%'

    // Analyze sentiment from summary content
    const sentiment = analyzeSentiment(result.summary)
    
    // Extract topics from key points and summary
    const topics = extractTopics(result.summary, result.keyPoints || [])
    
    // Determine difficulty based on content complexity
    const difficulty = determineDifficulty(result.summary, originalLength)
    
    // Calculate confidence based on processing method and content quality
    const confidence = calculateConfidence(result, originalLength, summaryWordCount)

    // Add metadata for better analytics
    const metadata = {
      source: currentTab,
      sourceDetails: currentTab === 'url' ? url : currentTab === 'file' ? 'Uploaded file' : 'Text input',
      ...result.metadata
    }

    return {
      ...result,
      readingTime: result.readingTime || getReadingTime(result.summary),
      originalLength,
      summaryLength: summaryWordCount,
      compressionRatio,
      sentiment,
      topics,
      difficulty,
      confidence,
      metadata,
      tables: [],
      graphs: []
    }
  }

  // Helper function to analyze sentiment
  const analyzeSentiment = (text: string): "positive" | "neutral" | "negative" => {
    const positiveWords = ['good', 'excellent', 'great', 'positive', 'success', 'achieve', 'benefit', 'advantage', 'improve', 'effective']
    const negativeWords = ['bad', 'poor', 'negative', 'problem', 'issue', 'fail', 'disadvantage', 'risk', 'challenge', 'difficult']
    
    const words = text.toLowerCase().split(/\s+/)
    const positiveCount = words.filter(word => positiveWords.some(pos => word.includes(pos))).length
    const negativeCount = words.filter(word => negativeWords.some(neg => word.includes(neg))).length
    
    if (positiveCount > negativeCount + 2) return 'positive'
    if (negativeCount > positiveCount + 2) return 'negative'
    return 'neutral'
  }

  // Helper function to extract topics with better detection
  const extractTopics = (summary: string, keyPoints: string[]): string[] => {
    const allText = [summary, ...keyPoints].join(' ')
    const words = allText.toLowerCase().split(/\s+/)
    const topicKeywords = {
      'Technology': ['tech', 'digital', 'software', 'computer', 'internet', 'web', 'app', 'platform'],
      'Research': ['research', 'study', 'analysis', 'investigation', 'findings', 'results'],
      'Business': ['business', 'company', 'market', 'revenue', 'profit', 'strategy', 'management'],
      'Science': ['science', 'scientific', 'experiment', 'hypothesis', 'theory', 'discovery'],
      'Health': ['health', 'medical', 'patient', 'treatment', 'diagnosis', 'care'],
      'Education': ['education', 'learning', 'student', 'teaching', 'academic', 'university'],
      'Innovation': ['innovation', 'development', 'improvement', 'advancement', 'progress'],
      'Data': ['data', 'information', 'statistics', 'analytics', 'metrics', 'database']
    }
    
    const detectedTopics: string[] = []
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const matches = keywords.filter(keyword => 
        words.some(word => word.includes(keyword) || keyword.includes(word))
      )
      if (matches.length > 0) {
        detectedTopics.push(topic)
      }
    })
    
    return detectedTopics.slice(0, 5)
  }

  // Helper function to determine difficulty
  const determineDifficulty = (summary: string, originalLength: number): "beginner" | "intermediate" | "advanced" => {
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgSentenceLength = summary.split(/\s+/).length / sentences.length
    
    if (originalLength > 2000 && avgSentenceLength > 20) return 'advanced'
    if (originalLength > 500 && avgSentenceLength > 15) return 'intermediate'
    return 'beginner'
  }

  // Helper function to calculate confidence
  const calculateConfidence = (result: SummaryResult, originalLength: number, summaryLength: number): number => {
    let confidence = 0.8 // Base confidence
    
    // Adjust based on compression ratio
    const compressionRatio = 1 - (summaryLength / originalLength)
    if (compressionRatio > 0.5 && compressionRatio < 0.9) confidence += 0.1
    
    // Adjust based on key points
    if (result.keyPoints && result.keyPoints.length >= 3) confidence += 0.05
    
    // Adjust based on processing method
    if (result.processingMethod === 'direct') confidence += 0.05
    
    return Math.min(confidence, 1.0)
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
    
    // Check feature allowance before proceeding
    if (!canUseFeature('document_summaries')) {
      const limitErr = ErrorHandler.processError('You have reached your monthly summaries limit. Upgrade to Pro for unlimited summaries.', { operation: 'summarization-quota' })
      setError(limitErr)
      toast({ title: 'Limit reached', description: limitErr.message, variant: 'destructive' })
      return
    }

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

      // Consume one summary token and record usage (include provider/model context)
      try {
        await incrementUsage('document_summaries', {
          provider: selectedProvider,
          model: selectedModel,
        })
        // Ensure UI reflects new counts promptly
        await Promise.all([fetchTokenStatus(), fetchPlanData(true)])
      } catch (e) {
        // Non-fatal; already handled inside hook
      }

      // Save the summary to the database
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: savedSummary, error } = await supabase
          .from('summaries')
          .insert([
            {
              user_id: user.id,
            title: 'Untitled Summary',
            summary_content: enhancedResult.summary,
            key_points: JSON.stringify(enhancedResult.keyPoints),
            original_content: textToSummarize,
            reading_time: enhancedResult.readingTime,
            source_type: currentTab,
            source_url: currentTab === 'url' ? url : undefined,
            compression_ratio: enhancedResult.compressionRatio,
            sentiment: enhancedResult.sentiment,
            topics: JSON.stringify(enhancedResult.topics),
            difficulty: enhancedResult.difficulty,
            confidence: enhancedResult.confidence
          }
            ]
          )
          .select()
          .single()

        if (error) {
          console.error('Error saving summary:', error)
        } else {
          if (savedSummary) {
            console.log("Summary saved to database with ID:", savedSummary.id)
          }
          
          // Refresh history after saving new summary
          if (result && savedSummary) {
            // Refresh history to include the new summary
            await fetchSummaryHistory()
          }
        }
      }

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
    // Load the historical summary into the current view
    const enhancedResult: EnhancedSummaryResult = {
      summary: item.summary,
      keyPoints: item.keyPoints,
      readingTime: item.statistics.readingTime,
      originalLength: item.statistics.originalLength,
      summaryLength: item.statistics.summaryLength,
      compressionRatio: item.statistics.compressionRatio,
      sentiment: item.sentiment,
      topics: item.topics,
      difficulty: item.difficulty,
      confidence: item.statistics.confidence,
      metadata: {
        source: item.originalSource as any,
        sourceDetails: item.sourceDetails || 'Text input'
      },
      processingMethod: item.processingMethod || 'direct',
      tables: [],
      graphs: []
    }
    
    setResult(enhancedResult)
    setHasActiveSummary(true)
    handleTabChange('summary')
    
    toast({
      title: "Summary Loaded",
      description: `Loaded summary: ${item.title}`,
    })
  }

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('summaries')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      // Update local state
      const updatedHistory = summaryHistory.filter(item => item.id !== id)
      setSummaryHistory(updatedHistory)
      
      // Recalculate statistics
      if (updatedHistory.length > 0) {
        calculateStatistics(updatedHistory)
      } else {
        // Reset to default statistics if no items left
        setUsageStatistics({
          totalSummaries: 0,
          averageCompressionRatio: 0,
          mostUsedInputMethod: 'text',
          mostUsedProvider: 'openai',
          totalWordsProcessed: 0,
          totalTimeSaved: 0,
          summariesByMonth: [],
          topTopics: [],
          averageConfidence: 0,
          successRate: 0,
          mostUsedDifficulty: 'intermediate',
          averageProcessingTime: 0,
          inputMethodBreakdown: [],
          providerBreakdown: [],
          sentimentBreakdown: []
        })
      }

      toast({
        title: "Summary Deleted",
        description: "Summary has been removed from your history.",
      })
    } catch (error) {
      console.error('Error deleting summary:', error)
      toast({
        title: "Delete Failed",
        description: "Failed to delete the summary. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExportHistory = () => {
    if (summaryHistory.length === 0) {
      toast({
        title: "No Data to Export",
        description: "You don't have any summaries to export yet.",
        variant: "destructive",
      })
      return
    }

    try {
      // Create a comprehensive export object
      const exportData = {
        exportDate: new Date().toISOString(),
        statistics: usageStatistics,
        summaries: summaryHistory.map(item => ({
          id: item.id,
          title: item.title,
          timestamp: item.timestamp.toISOString(),
          summary: item.summary,
          keyPoints: item.keyPoints,
          originalLength: item.statistics.originalLength,
          summaryLength: item.statistics.summaryLength,
          compressionRatio: item.statistics.compressionRatio,
          readingTime: item.statistics.readingTime,
          sourceType: item.originalSource,
          sourceDetails: item.sourceDetails,
          sentiment: item.sentiment,
          topics: item.topics,
          difficulty: item.difficulty,
          confidence: item.statistics.confidence
        }))
      }

      // Convert to JSON and create blob
      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `summary-history-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Complete",
        description: `Successfully exported ${summaryHistory.length} summaries with statistics.`,
      })
    } catch (error) {
      console.error('Error exporting history:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export history data. Please try again.",
        variant: "destructive",
      })
    }
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