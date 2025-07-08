"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Sparkles, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import type { AIProvider } from "@/lib/ai-providers"
import { ContextInputPanel } from "./components/context-input-panel"
import { ConfigurationPanel } from "./components/configuration-panel"
import { SummaryOutputPanel } from "./components/summary-output-panel"

interface SummaryResult {
  summary: string
  keyPoints: string[]
  readingTime: number
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
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>()
  const [selectedModel, setSelectedModel] = useState<string>()
  const [summaryStyle, setSummaryStyle] = useState<"academic" | "executive" | "bullet-points" | "detailed">("academic")
  const [summaryLength, setSummaryLength] = useState<"brief" | "medium" | "comprehensive">("medium")
  const [result, setResult] = useState<SummaryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [urlFetching, setUrlFetching] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Handle URL fetching
  const handleUrlFetch = async () => {
    if (!url.trim()) return

    setUrlFetching(true)
    setError(null)

    try {
      const response = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setContent(data.content || "")
      toast({
        title: "URL Content Extracted",
        description: `Successfully extracted ${getWordCount(data.content || "")} words from the URL.`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch URL content"
      setError(errorMessage)
      toast({
        title: "URL Fetch Failed",
        description: errorMessage,
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
      setError(error)
      toast({
        title: "File Processing Failed",
        description: error,
        variant: "destructive",
      })
    },
    [toast],
  )

  // Handle summarization
  const handleSummarize = async () => {
    if (!content.trim()) {
      toast({
        title: "No Content",
        description: "Please provide content to summarize.",
        variant: "destructive",
      })
      return
    }

    if (!selectedProvider) {
      toast({
        title: "No AI Provider",
        description: "Please select an AI provider to generate summaries.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`
      }

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: `Please provide a ${summaryLength} ${summaryStyle} summary of the following content. Also extract key points and analyze the sentiment.

Content to summarize:
${content}

Please format your response as JSON with the following structure. If relevant, include tables (with title, headers, rows) and graphs (with title, type, data):
{
  "summary": "The main summary text",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "sentiment": "positive|neutral|negative",
  "topics": ["topic 1", "topic 2"],
  "difficulty": "beginner|intermediate|advanced",
  "tables": [
    {
      "title": "Table Title",
      "headers": ["Column 1", "Column 2"],
      "rows": [["Row1Col1", "Row1Col2"], ["Row2Col1", "Row2Col2"]]
    }
  ],
  "graphs": [
    {
      "title": "Graph Title",
      "type": "bar|line|pie|scatter",
      "data": { "labels": ["A", "B"], "values": [10, 20] }
    }
  ]
}`,
          provider: selectedProvider,
          model: selectedModel,
          temperature: 0.3,
          maxTokens: summaryLength === "brief" ? 500 : summaryLength === "medium" ? 1000 : 1500,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Try to parse JSON response, fallback to plain text
      let parsedResult
      try {
        parsedResult = JSON.parse(data.content)
      } catch {
        // Fallback for non-JSON responses
        parsedResult = {
          summary: data.content,
          keyPoints: [],
          sentiment: "neutral",
          topics: [],
          difficulty: "intermediate",
          tables: [],
          graphs: [],
        }
      }

      const originalLength = getWordCount(content)
      const summaryWordCount = getWordCount(parsedResult.summary)
      const compressionRatio = `${Math.round((1 - summaryWordCount / originalLength) * 100)}%`

      const summaryResult: SummaryResult = {
        summary: parsedResult.summary || data.content,
        keyPoints: parsedResult.keyPoints || [],
        readingTime: getReadingTime(parsedResult.summary || data.content),
        sentiment: parsedResult.sentiment,
        originalLength,
        summaryLength: summaryWordCount,
        compressionRatio,
        topics: parsedResult.topics,
        difficulty: parsedResult.difficulty,
        tables: parsedResult.tables || [],
        graphs: parsedResult.graphs || [],
      }

      setResult(summaryResult)
      toast({
        title: "Summary Generated",
        description: `Successfully created a ${summaryLength} ${summaryStyle} summary.`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate summary"
      setError(errorMessage)
        toast({
        title: "Summarization Failed",
        description: errorMessage,
          variant: "destructive",
        })
    } finally {
      setLoading(false)
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Summarizer</h1>
        <p className="text-gray-600">Transform lengthy content into concise, intelligent summaries using advanced AI</p>
                </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Layout */}
      <div className="grid gap-8 xl:grid-cols-3">
        {/* Left Panel - Input and Configuration */}
        <div className="xl:col-span-1 space-y-6">
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
          />

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

          {/* Generate Button */}
                        <Button
            onClick={handleSummarize}
            disabled={loading || !content.trim() || !selectedProvider}
            className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Summary...
                  </>
                ) : (
                  <>
                <Sparkles className="mr-2 h-5 w-5" />
                    Generate Summary
                  </>
                )}
              </Button>
            </div>

        {/* Right Panel - Summary Output */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-8">
            <SummaryOutputPanel
              result={result}
              loading={loading}
              copied={copied}
              onCopyToClipboard={handleCopyToClipboard}
              onDownloadSummary={handleDownloadSummary}
              onShareSummary={handleShareSummary}
              getWordCount={getWordCount}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
