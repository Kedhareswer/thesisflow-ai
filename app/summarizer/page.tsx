"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import type { AIProvider } from "@/lib/ai-providers"
import { ContextInputPanel } from "./components/context-input-panel"
import { ConfigurationPanel } from "./components/configuration-panel"
import { SummaryOutputPanel } from "./components/summary-output-panel"
import { WebSearchPanel } from "./components/web-search-panel"

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
  const [currentTab, setCurrentTab] = useState<"file" | "url">("file")

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

  // Helper to estimate tokens (rough approximation)
  const estimateTokens = (text: string) => Math.ceil(text.length / 4)

  // Helper to clean up JSON artifacts from summary text
  const cleanSummaryText = (text: string): string => {
    if (!text) return ""
    
    return text
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\\n/g, '\n') // Convert escaped newlines
      .replace(/\\"/g, '"') // Convert escaped quotes
      .replace(/\\t/g, '\t') // Convert escaped tabs
      .replace(/\\r/g, '\r') // Convert escaped carriage returns
      .replace(/\\\\/g, '\\') // Convert double backslashes
      .trim()
  }

  // Style and length instructions for dynamic prompts
  const styleInstructions = {
    academic: "Write in an academic, scholarly tone with formal language, citations where appropriate, and analytical depth. Focus on methodology, findings, and implications.",
    executive: "Write in a business executive style - concise, action-oriented, with clear recommendations and strategic insights. Use bullet points for key takeaways.",
    "bullet-points": "Present the information in a structured bullet-point format. Each point should be clear, concise, and actionable. Use sub-bullets for details.",
    detailed: "Provide a comprehensive, detailed analysis with thorough explanations, context, and nuanced understanding. Include multiple perspectives and deep insights."
  }

  const lengthInstructions = {
    brief: "Keep the summary very concise (150-200 words). Focus only on the most essential points and key insights.",
    medium: "Provide a balanced summary (300-400 words) with main points and supporting details.",
    comprehensive: "Create a thorough summary (500-700 words) with comprehensive coverage, detailed analysis, and extensive insights."
  }

  // Helper to generate dynamic prompts based on style and length
  const generateSummaryPrompt = (content: string, style: string, length: string): string => {
    return `Please provide a ${length} ${style} summary of the following content.

${lengthInstructions[length as keyof typeof lengthInstructions]}

Style Instructions: ${styleInstructions[style as keyof typeof styleInstructions]}

Content to summarize:
${content}

Please format your response as JSON with the following structure. IMPORTANT: The "summary" field should contain clean, readable text (not JSON format). If relevant, include tables (with title, headers, rows) and graphs (with title, type, data):
{
  "summary": "The main summary text in clean, readable format with proper paragraphs and formatting",
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
}`
  }

  // Helper to get max tokens based on summary length
  const getMaxTokens = (length: string): number => {
    switch (length) {
      case "brief": return 800
      case "medium": return 1200
      case "comprehensive": return 1800
      default: return 1000
    }
  }

  // Chunked summarization when content too large
  const summarizeInChunks = async (): Promise<SummaryResult | null> => {
    const maxTokensPerChunk = 8000 // safe margin (≈32k chars)
    const maxCharsPerChunk = maxTokensPerChunk * 4

    // Split content into manageable chunks
    const chunks: string[] = []
    for (let i = 0; i < content.length; i += maxCharsPerChunk) {
      chunks.push(content.substring(i, i + maxCharsPerChunk))
    }

    // Summarize each chunk briefly to keep token usage low
    const chunkSummaries: string[] = []
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx]
      const chunkPrompt = `Provide a concise summary (executive, bullet points) of the following content (part ${idx + 1} of ${chunks.length}). Limit to 150 words.\n\n${chunk}`

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: chunkPrompt,
          provider: selectedProvider,
          model: selectedModel,
          temperature: 0.3,
          maxTokens: 512,
        }),
      })

      if (!response.ok) {
        throw new Error(`Chunk ${idx + 1} summarization failed (${response.status})`)
      }
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      chunkSummaries.push(data.content)
    }

    // Aggregate summaries
    const aggregatePrompt = `Combine the following chunk summaries into a single ${summaryLength} ${summaryStyle} summary.

${lengthInstructions[summaryLength as keyof typeof lengthInstructions]}

Style Instructions: ${styleInstructions[summaryStyle as keyof typeof styleInstructions]}

Chunk Summaries:
${chunkSummaries
      .map((s, i) => `Part ${i + 1}: ${s}`)
  .join("\n\n")}

Return JSON with the following structure. IMPORTANT: The "summary" field should contain clean, readable text (not JSON format):
{
  "summary": "The combined summary text in clean, readable format with proper paragraphs",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "sentiment": "positive|neutral|negative",
  "topics": ["topic 1", "topic 2"],
  "difficulty": "beginner|intermediate|advanced"
}`

    const aggregateResponse = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: aggregatePrompt,
        provider: selectedProvider,
        model: selectedModel,
        temperature: 0.3,
        maxTokens: getMaxTokens(summaryLength),
      }),
    })

    if (!aggregateResponse.ok) {
      throw new Error(`Aggregation failed (${aggregateResponse.status})`)
    }
    const aggregateData = await aggregateResponse.json()
    if (aggregateData.error) throw new Error(aggregateData.error)

    let parsed
    try {
      // Clean the response content to extract JSON
      let contentToParse = aggregateData.content.trim()
      
      // Try to find JSON object in the response
      const jsonMatch = contentToParse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        contentToParse = jsonMatch[0]
      }
      
      parsed = JSON.parse(contentToParse)
      
      // Ensure summary is a string, not JSON
      if (typeof parsed.summary === 'string') {
        // Clean up any remaining JSON artifacts
        parsed.summary = cleanSummaryText(parsed.summary)
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON response in chunked summarization:', parseError)
      parsed = { 
        summary: cleanSummaryText(aggregateData.content), 
        keyPoints: [] 
      }
    }

    const originalLength = getWordCount(content)
    const summaryWordCount = getWordCount(parsed.summary || aggregateData.content)
    const compressionRatio = `${Math.round((1 - summaryWordCount / originalLength) * 100)}%`

    const finalResult: SummaryResult = {
      summary: parsed.summary || aggregateData.content,
      keyPoints: parsed.keyPoints || [],
      readingTime: getReadingTime(parsed.summary || aggregateData.content),
      sentiment: parsed.sentiment,
      originalLength,
      summaryLength: summaryWordCount,
      compressionRatio,
      topics: parsed.topics,
      difficulty: parsed.difficulty,
    }
    return finalResult
  }

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
      const totalTokens = estimateTokens(content)
      const tokenThreshold = 11000 // Groq safe limit
      if (totalTokens > tokenThreshold) {
        console.log("Using chunked summarization due to large content")
        const chunkedResult = await summarizeInChunks()
        if (chunkedResult) {
          setResult(chunkedResult)
          toast({ title: "Summary Generated", description: `Successfully summarized large document in chunks.` })
          return
        }
      }

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
          prompt: generateSummaryPrompt(content, summaryStyle, summaryLength),
          provider: selectedProvider,
          model: selectedModel,
          temperature: 0.3,
          maxTokens: getMaxTokens(summaryLength),
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
        // Clean the response content to extract JSON
        let contentToParse = data.content.trim()
        
        // Try to find JSON object in the response
        const jsonMatch = contentToParse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          contentToParse = jsonMatch[0]
        }
        
        parsedResult = JSON.parse(contentToParse)
        
        // Ensure summary is a string, not JSON
        if (typeof parsedResult.summary === 'string') {
          // Clean up any remaining JSON artifacts
          parsedResult.summary = cleanSummaryText(parsedResult.summary)
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON response:', parseError)
        // Fallback for non-JSON responses
        parsedResult = {
          summary: cleanSummaryText(data.content),
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

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Alert className="border-gray-300 bg-gray-50">
            <AlertCircle className="h-4 w-4 text-gray-700" />
            <AlertDescription className="text-gray-800">
              {error}
              {error.toLowerCase().includes('token') || error.toLowerCase().includes('limit') || error.toLowerCase().includes('failed') ? (
                <span className="block mt-2 text-sm">
                  <strong>Note:</strong> For enhanced PDF processing, try{' '}
                  <a 
                    href="https://quantumn-pdf-chatapp.netlify.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-black"
                  >
                    QuantumPDF
                  </a>
                </span>
              ) : null}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {result ? (
          // Summary View - Full width when summary exists
          <div className="space-y-8">
            {/* Summary Output - Primary Focus */}
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
                    disabled={loading || !content.trim() || !selectedProvider}
                    className="w-full h-12 bg-black hover:bg-gray-800 text-white border-0 font-light tracking-wide"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
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
                  onClick={handleSummarize}
                  disabled={loading || !content.trim() || !selectedProvider}
                  className="w-full h-12 bg-black hover:bg-gray-800 text-white border-0 font-light tracking-wide"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Summary...
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

            {/* Loading State */}
            {loading && (
              <div className="mt-12 text-center">
                <div className="inline-flex items-center gap-3 text-gray-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-light">Analyzing content and generating summary...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
