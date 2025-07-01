"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  FileText,
  Link,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  Copy,
  CheckCircle,
  Download,
  Share2,
  X,
} from "lucide-react"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import { useToast } from "@/hooks/use-toast"
import { FileUploader } from "./components/FileUploader"
import { RouteGuard } from "@/components/route-guard"
import type { AIProvider } from "@/lib/ai-providers"
import CompactAIProviderSelector from "@/components/compact-ai-provider-selector"

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
}

interface SetupWizardProps {
  onClose: () => void
}

function SetupWizard({ onClose }: SetupWizardProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-medium text-black">Welcome to AI Summarizer</h2>
            <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="space-y-6">
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900 mb-3">🚀 Get Started in 3 Steps</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Configure AI Provider</h4>
                    <p className="text-blue-700 text-sm">
                      Add your API keys in Settings to enable AI-powered summarization
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Add Content</h4>
                    <p className="text-blue-700 text-sm">
                      Paste text, upload a document, or provide a URL to extract content
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Generate Summary</h4>
                    <p className="text-blue-700 text-sm">
                      Customize the style and length, then generate your intelligent summary
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="text-lg font-medium text-amber-900 mb-3">🔑 Supported AI Providers</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="text-sm">
                  <div className="font-medium text-amber-900">OpenAI</div>
                  <div className="text-amber-700">GPT-4, GPT-3.5 Turbo</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-amber-900">Google Gemini</div>
                  <div className="text-amber-700">Gemini Pro, Gemini Flash</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-amber-900">Groq</div>
                  <div className="text-amber-700">Llama, Mixtral models</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-amber-900">AIML API</div>
                  <div className="text-amber-700">Multiple model access</div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-medium text-green-900 mb-3">💡 Pro Tips</h3>
              <ul className="space-y-2 text-sm text-green-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  For best results, provide content with at least 100 words
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  PDFs work best when they contain selectable text (not scanned images)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  URLs work better with article pages rather than dynamic web apps
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Try different summary styles based on your use case
                </li>
              </ul>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => window.open('/settings', '_blank')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Configure AI Settings
              </Button>
              <Button variant="outline" onClick={onClose}>
                Continue Without Setup
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ErrorDisplayProps {
  error: string
  onRetry?: () => void
  onShowHelp?: () => void
}

function ErrorDisplay({ error, onRetry, onShowHelp }: ErrorDisplayProps) {
  const getErrorInfo = (errorMessage: string) => {
    if (errorMessage.includes("No AI providers available") || errorMessage.includes("API keys")) {
      return {
        type: "setup",
        title: "AI Configuration Required",
        message: "You need to configure at least one AI provider to use the summarizer.",
        actions: [
          { label: "Configure AI Settings", action: () => window.open('/settings', '_blank'), primary: true },
          { label: "View Setup Guide", action: onShowHelp }
        ]
      }
    }
    
    if (errorMessage.includes("No content could be extracted")) {
      return {
        type: "content",
        title: "Content Extraction Failed",
        message: "We couldn't extract readable content from this source.",
        actions: [
          { label: "Try Different URL", action: onRetry },
                     { label: "Upload File Instead", action: () => (document.querySelector('[value="file"]') as HTMLElement)?.click() },
           { label: "Paste Text Manually", action: () => (document.querySelector('[value="text"]') as HTMLElement)?.click() }
        ]
      }
    }
    
    if (errorMessage.includes("Failed to fetch URL") || errorMessage.includes("timeout")) {
      return {
        type: "network",
        title: "Network or Access Issue",
        message: "The URL couldn't be accessed. This might be due to network issues or website restrictions.",
        actions: [
          { label: "Try Again", action: onRetry, primary: true },
          { label: "Check URL", action: () => {} },
                     { label: "Use Different Method", action: () => (document.querySelector('[value="file"]') as HTMLElement)?.click() }
        ]
      }
    }
    
    if (errorMessage.includes("PDF")) {
      return {
        type: "pdf",
        title: "PDF Processing Issue",
        message: "There was an issue processing your PDF file.",
        actions: [
          { label: "Try Different PDF", action: onRetry },
          { label: "Convert to Text", action: () => {} },
          { label: "Use URL Instead", action: () => (document.querySelector('[value="url"]') as HTMLElement)?.click() }
        ]
      }
    }
    
    if (errorMessage.includes("File size") || errorMessage.includes("too large")) {
      return {
        type: "size",
        title: "File Too Large",
        message: "Your file exceeds the 10MB limit.",
        actions: [
          { label: "Try Smaller File", action: onRetry, primary: true },
          { label: "Use URL Instead", action: () => (document.querySelector('[value="url"]') as HTMLElement)?.click() },
          { label: "Copy Text Manually", action: () => (document.querySelector('[value="text"]') as HTMLElement)?.click() }
        ]
      }
    }
    
    return {
      type: "general",
      title: "Something Went Wrong",
      message: errorMessage,
      actions: [
        { label: "Try Again", action: onRetry, primary: true },
        { label: "Get Help", action: onShowHelp }
      ]
    }
  }
  
  const errorInfo = getErrorInfo(error)
  
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-red-900 mb-2">{errorInfo.title}</h3>
          <p className="text-red-700 mb-4">{errorInfo.message}</p>
          
          <div className="flex flex-wrap gap-2">
            {errorInfo.actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.action}
                variant={action.primary ? "default" : "outline"}
                size="sm"
                className={action.primary ? "bg-red-600 hover:bg-red-700 text-white" : "border-red-300 text-red-700 hover:bg-red-50"}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Summarizer() {
  const [content, setContent] = useState("")
  const [url, setUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<SummaryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summaryStyle, setSummaryStyle] = useState<"academic" | "executive" | "bullet-points" | "detailed">("academic")
  const [summaryLength, setSummaryLength] = useState<"brief" | "medium" | "comprehensive">("medium")
  const [copied, setCopied] = useState(false)
  const [urlFetching, setUrlFetching] = useState(false)
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const { toast } = useToast()

  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>(undefined)
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined)

  // Check if this is the user's first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('summarizer-visited')
    if (!hasVisited) {
      setIsFirstVisit(true)
      setShowSetupWizard(true)
      localStorage.setItem('summarizer-visited', 'true')
    }
  }, [])

  const handleFileProcessed = (content: string, metadata: any) => {
    setContent(content)
    setFile(null)
    setError(null)

    toast({
      title: "File processed successfully",
      description: `Content loaded with ${metadata.wordCount} words${metadata.pages ? ` from ${metadata.pages} pages` : ''}`,
    })
  }

  const handleFileError = (error: string) => {
    setError(error)
    setFile(null)
  }

  const handleUrlFetch = async () => {
    if (!url.trim()) {
      setError("Please enter a valid URL")
      return
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      setError("Please enter a valid URL format (e.g., https://example.com/article)")
      return
    }

    setUrlFetching(true)
    setError(null)

    try {
      const response = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.action ? `${data.error}: ${data.action}` : data.error || "Failed to fetch URL content")
      }

      const fetchedContent = data.content || ""

      if (!fetchedContent.trim()) {
        throw new Error("No content could be extracted from the URL. The page might be dynamically generated or protected.")
      }

      setContent(fetchedContent)

      toast({
        title: "Content fetched successfully",
        description: `Extracted ${data.wordCount || getWordCount(fetchedContent)} words${data.title ? ` from "${data.title}"` : ' from URL'}`,
      })
    } catch (error) {
      console.error("URL fetch error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch content from URL"
      setError(errorMessage)

      toast({
        title: "URL fetch failed",
        description: "See error details below for help",
        variant: "destructive",
      })
    } finally {
      setUrlFetching(false)
    }
  }

  const generateSummary = async () => {
    if (!content.trim()) {
      setError("Please provide content to summarize using one of the input methods above")
      return
    }

    if (content.length < 100) {
      setError("Content is too short to summarize effectively. Please provide at least 100 characters for better results.")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Enhanced summary generation with additional features
      const summaryResult = await enhancedAIService.summarizeContent(
        content,
        {
          style: summaryStyle,
          length: summaryLength,
        },
        selectedProvider,
        selectedModel,
      )

      const originalLength = content.length
      const summaryTextLength = summaryResult.summary.length
      const compressionRatio = (((originalLength - summaryTextLength) / originalLength) * 100).toFixed(1)

      // Generate additional insights
      const topics = await extractTopics(content)
      const difficulty = assessDifficulty(content)

      setResult({
        ...summaryResult,
        originalLength,
        summaryLength: summaryTextLength,
        compressionRatio: `${compressionRatio}%`,
        topics,
        difficulty,
      })

      toast({
        title: "Summary generated successfully!",
        description: `Content summarized with ${compressionRatio}% compression`,
      })
    } catch (error) {
      console.error("Summarization error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate summary"
      setError(errorMessage)

      // Don't show toast for API key errors - the error display will handle it
      if (!errorMessage.includes("No AI providers available")) {
        toast({
          title: "Summary generation failed",
          description: "See error details below for help",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const extractTopics = async (text: string): Promise<string[]> => {
    // Simple topic extraction based on word frequency and common patterns
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || []
    const wordCount: { [key: string]: number } = {}

    words.forEach((word) => {
      if (!isStopWord(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1
      }
    })

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1))
  }

  const isStopWord = (word: string): boolean => {
    const stopWords = [
      "the",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "this",
      "that",
      "these",
      "those",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "can",
      "shall",
    ]
    return stopWords.includes(word)
  }

  const assessDifficulty = (text: string): "beginner" | "intermediate" | "advanced" => {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    const avgWordsPerSentence = text.split(/\s+/).length / sentences.length
    const complexWords = text.match(/\b\w{7,}\b/g)?.length || 0
    const totalWords = text.split(/\s+/).length
    const complexWordRatio = complexWords / totalWords

    if (avgWordsPerSentence > 20 || complexWordRatio > 0.3) {
      return "advanced"
    } else if (avgWordsPerSentence > 15 || complexWordRatio > 0.2) {
      return "intermediate"
    }
    return "beginner"
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied to clipboard",
        description: "Summary has been copied to your clipboard",
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const downloadSummary = () => {
    if (!result) return

    const summaryData = {
      originalContent: content,
      summary: result.summary,
      keyPoints: result.keyPoints,
      statistics: {
        readingTime: result.readingTime,
        compressionRatio: result.compressionRatio,
        wordCount: getWordCount(result.summary),
        sentiment: result.sentiment,
        difficulty: result.difficulty,
        topics: result.topics,
      },
      generatedAt: new Date().toISOString(),
      settings: {
        style: summaryStyle,
        length: summaryLength,
      },
    }

    const blob = new Blob([JSON.stringify(summaryData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `summary-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Summary downloaded",
      description: "Summary data has been saved to your device",
    })
  }

  const shareSummary = async () => {
    if (!result) return

    const shareData = {
      title: "AI Generated Summary",
      text: result.summary,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        toast({
          title: "Summary shared",
          description: "Summary has been shared successfully",
        })
      } else {
        // Fallback to copying to clipboard
        await copyToClipboard(result.summary)
      }
    } catch (error) {
      console.error("Error sharing:", error)
      // Fallback to copying to clipboard
      await copyToClipboard(result.summary)
    }
  }

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800 border border-green-300"
      case "negative":
        return "bg-red-100 text-red-800 border border-red-300"
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300"
    }
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 border border-green-300"
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300"
      case "advanced":
        return "bg-red-100 text-red-800 border border-red-300"
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300"
    }
  }

  const getWordCount = (text: string) => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length
  }

  const clearContent = () => {
    setContent("")
    setUrl("")
    setResult(null)
    setError(null)
    setFile(null)

    toast({
      title: "Content cleared",
      description: "All content and results have been cleared",
    })
  }

  const retryLastAction = () => {
    if (url && !content) {
      handleUrlFetch()
    } else {
      setError(null)
    }
  }

  return (
    <RouteGuard requireAuth={true}>
      {showSetupWizard && (
        <SetupWizard onClose={() => setShowSetupWizard(false)} />
      )}
      
      <div className="min-h-screen bg-white">
        <div className="container mx-auto p-8 space-y-8">
          {/* Header */}
          <div className="border-b border-gray-200 pb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-light text-black tracking-tight">AI Summarizer</h1>
                  <p className="text-gray-600 mt-2 text-lg">
                    Transform lengthy content into concise, intelligent summaries
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                {isFirstVisit && (
                  <Button
                    onClick={() => setShowSetupWizard(true)}
                    variant="outline"
                    className="border-blue-300 hover:bg-blue-50 hover:border-blue-400 text-blue-700 bg-transparent"
                  >
                    Show Setup Guide
                  </Button>
                )}
                {(content || result) && (
                  <Button
                    onClick={clearContent}
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 bg-transparent"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>

          <CompactAIProviderSelector
            selectedProvider={selectedProvider}
            onProviderChange={(provider) => setSelectedProvider(provider)}
            selectedModel={selectedModel}
            onModelChange={(model) => setSelectedModel(model)}
          />

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Input Section */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardHeader className="border-b border-gray-100 pb-6">
                  <CardTitle className="text-black font-medium text-xl">Content Input</CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    Provide content through text input, file upload, or URL extraction
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <Tabs defaultValue="text" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-xl h-12">
                      <TabsTrigger
                        value="text"
                        className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-gray-600 font-medium rounded-lg"
                      >
                        Text Input
                      </TabsTrigger>
                      <TabsTrigger
                        value="file"
                        className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-gray-600 font-medium rounded-lg"
                      >
                        File Upload
                      </TabsTrigger>
                      <TabsTrigger
                        value="url"
                        className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-gray-600 font-medium rounded-lg"
                      >
                        From URL
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="text" className="space-y-6 mt-8">
                      <Textarea
                        placeholder="Paste your content here for intelligent summarization..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={14}
                        className="resize-none border-gray-200 focus:border-black focus:ring-1 focus:ring-black text-gray-900 placeholder:text-gray-400"
                      />
                      <div className="flex justify-between text-sm border-t border-gray-100 pt-4">
                        <span className="text-gray-500 font-medium">{getWordCount(content)} words</span>
                        <span className="text-gray-500 font-medium">{content.length} characters</span>
                      </div>
                    </TabsContent>

                    <TabsContent value="file" className="space-y-6 mt-8">
                      <FileUploader onFileProcessed={handleFileProcessed} onError={handleFileError} />
                    </TabsContent>

                    <TabsContent value="url" className="space-y-6 mt-8">
                      <div className="flex gap-3">
                        <Input
                          placeholder="https://example.com/article"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !urlFetching && handleUrlFetch()}
                          className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black text-gray-900 placeholder:text-gray-400 h-12"
                        />
                        <Button
                          onClick={handleUrlFetch}
                          disabled={urlFetching || !url.trim()}
                          variant="outline"
                          className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 px-6 bg-transparent h-12"
                        >
                          {urlFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Enter a URL to automatically extract and summarize its content. Works best with article pages and blog posts.
                      </p>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Configuration */}
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardHeader className="border-b border-gray-100 pb-6">
                  <CardTitle className="text-black font-medium text-xl">Summary Configuration</CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    Customize the style and length of your summary
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-8 md:grid-cols-2 p-8">
                  <div>
                    <label className="text-sm font-medium mb-3 block text-gray-700">Summary Style</label>
                    <Select value={summaryStyle} onValueChange={(value: any) => setSummaryStyle(value)}>
                      <SelectTrigger className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="academic" className="hover:bg-gray-50">
                          Academic - Formal and structured
                        </SelectItem>
                        <SelectItem value="executive" className="hover:bg-gray-50">
                          Executive - Business-focused
                        </SelectItem>
                        <SelectItem value="bullet-points" className="hover:bg-gray-50">
                          Bullet Points - Easy to scan
                        </SelectItem>
                        <SelectItem value="detailed" className="hover:bg-gray-50">
                          Detailed - Comprehensive analysis
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-3 block text-gray-700">Summary Length</label>
                    <Select value={summaryLength} onValueChange={(value: any) => setSummaryLength(value)}>
                      <SelectTrigger className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="brief" className="hover:bg-gray-50">
                          Brief - Quick overview
                        </SelectItem>
                        <SelectItem value="medium" className="hover:bg-gray-50">
                          Medium - Balanced detail
                        </SelectItem>
                        <SelectItem value="comprehensive" className="hover:bg-gray-50">
                          Comprehensive - Full analysis
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {error && (
                <ErrorDisplay 
                  error={error} 
                  onRetry={retryLastAction}
                  onShowHelp={() => setShowSetupWizard(true)}
                />
              )}

              <Button
                onClick={generateSummary}
                disabled={loading || !content.trim()}
                className="w-full bg-black hover:bg-gray-800 text-white font-medium py-4 h-auto transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Generating Summary...
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5 mr-3" />
                    Generate Summary
                  </>
                )}
              </Button>
            </div>

            {/* Results Section */}
            <div className="space-y-8">
              {result && (
                <>
                  {/* Summary Stats */}
                  <Card className="border-gray-200 shadow-sm bg-white">
                    <CardHeader className="border-b border-gray-100 pb-6">
                      <CardTitle className="text-lg text-black font-medium">Summary Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-8">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Reading Time</span>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-black">{result.readingTime} min</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-gray-100 pt-6">
                        <span className="text-sm text-gray-600">Compression</span>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-black">{result.compressionRatio}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-gray-100 pt-6">
                        <span className="text-sm text-gray-600">Word Count</span>
                        <span className="text-sm font-medium text-black">{getWordCount(result.summary)} words</span>
                      </div>

                      {result.sentiment && (
                        <div className="flex justify-between items-center border-t border-gray-100 pt-6">
                          <span className="text-sm text-gray-600">Sentiment</span>
                          <Badge className={getSentimentColor(result.sentiment)}>{result.sentiment}</Badge>
                        </div>
                      )}

                      {result.difficulty && (
                        <div className="flex justify-between items-center border-t border-gray-100 pt-6">
                          <span className="text-sm text-gray-600">Difficulty</span>
                          <Badge className={getDifficultyColor(result.difficulty)}>{result.difficulty}</Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Topics */}
                  {result.topics && result.topics.length > 0 && (
                    <Card className="border-gray-200 shadow-sm bg-white">
                      <CardHeader className="border-b border-gray-100 pb-6">
                        <CardTitle className="text-lg text-black font-medium">Key Topics</CardTitle>
                      </CardHeader>
                      <CardContent className="p-8">
                        <div className="flex flex-wrap gap-2">
                          {result.topics.map((topic, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="bg-gray-100 text-gray-800 border border-gray-300"
                            >
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Key Points */}
                  <Card className="border-gray-200 shadow-sm bg-white">
                    <CardHeader className="border-b border-gray-100 pb-6">
                      <CardTitle className="text-lg text-black font-medium">Key Points</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                      <ul className="space-y-4">
                        {result.keyPoints.map((point, index) => (
                          <li key={index} className="flex items-start gap-4">
                            <div className="w-2 h-2 bg-black rounde-full mt-2 flex-shrink-0"></div>
                            <span className="text-sm text-gray-800 leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Summary */}
                  <Card className="border-gray-200 shadow-sm bg-white">
                    <CardHeader className="border-b border-gray-100 pb-6">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-black font-medium">Generated Summary</CardTitle>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(result.summary)}
                            className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 bg-transparent"
                          >
                            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={downloadSummary}
                            className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 bg-transparent"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={shareSummary}
                            className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 bg-transparent"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                        {result.summary.split("\n").map((paragraph, index) => (
                          <p key={index} className="mb-4 last:mb-0">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
