"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Link, Clock, TrendingUp, AlertCircle, Loader2, Copy, CheckCircle } from "lucide-react"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import { useToast } from "@/hooks/use-toast"
import { FileUploader } from "./components/FileUploader"

interface SummaryResult {
  summary: string
  keyPoints: string[]
  readingTime: number
  sentiment?: "positive" | "neutral" | "negative"
  originalLength: number
  summaryLength: number
  compressionRatio: string
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
  const { toast } = useToast()

  const handleFileProcessed = (content: string, metadata: any) => {
    setContent(content)
    setFile(null) // Clear file since we now have content
    setError(null)
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

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch URL content")
      }

      const data = await response.json()
      setContent(data.content || data.text)

      toast({
        title: "Content fetched",
        description: "URL content has been extracted successfully",
      })
    } catch (error) {
      console.error("URL fetch error:", error)
      setError("Failed to fetch content from URL. Please check the URL and try again.")
    } finally {
      setLoading(false)
    }
  }

  const generateSummary = async () => {
    if (!content.trim()) {
      setError("Please provide content to summarize")
      return
    }

    if (content.length < 100) {
      setError("Content is too short to summarize. Please provide at least 100 characters.")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const summaryResult = await enhancedAIService.summarizeContent(content, {
        style: summaryStyle,
        length: summaryLength,
      })

      const originalLength = content.length
      const summaryTextLength = summaryResult.summary.length
      const compressionRatio = (((originalLength - summaryTextLength) / originalLength) * 100).toFixed(1)

      setResult({
        ...summaryResult,
        originalLength,
        summaryLength: summaryTextLength,
        compressionRatio: `${compressionRatio}%`,
      })

      toast({
        title: "Summary generated!",
        description: `Content summarized with ${compressionRatio}% compression`,
      })
    } catch (error) {
      console.error("Summarization error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate summary"
      setError(errorMessage)

      if (errorMessage.includes("No AI providers available")) {
        toast({
          title: "AI Configuration Required",
          description: "Please configure your AI API keys in Settings to use the Summarizer.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Summary failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
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

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-gray-100 text-gray-900 border border-gray-300"
      case "negative":
        return "bg-gray-800 text-white border border-gray-600"
      default:
        return "bg-gray-200 text-gray-800 border border-gray-400"
    }
  }

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-8">
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
        </div>

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
                        onKeyDown={(e) => e.key === "Enter" && !loading && handleUrlFetch()}
                        className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black text-gray-900 placeholder:text-gray-400 h-12"
                      />
                      <Button
                        onClick={handleUrlFetch}
                        disabled={loading || !url.trim()}
                        variant="outline"
                        className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 px-6 bg-transparent h-12"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Enter a URL to automatically extract and summarize its content
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
                        Academic
                      </SelectItem>
                      <SelectItem value="executive" className="hover:bg-gray-50">
                        Executive
                      </SelectItem>
                      <SelectItem value="bullet-points" className="hover:bg-gray-50">
                        Bullet Points
                      </SelectItem>
                      <SelectItem value="detailed" className="hover:bg-gray-50">
                        Detailed
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
                        Brief
                      </SelectItem>
                      <SelectItem value="medium" className="hover:bg-gray-50">
                        Medium
                      </SelectItem>
                      <SelectItem value="comprehensive" className="hover:bg-gray-50">
                        Comprehensive
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive" className="border-gray-300 bg-gray-50">
                <AlertCircle className="h-4 w-4 text-gray-700" />
                <AlertDescription className="text-gray-700">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={generateSummary}
              disabled={loading || !content.trim()}
              className="w-full bg-black hover:bg-gray-800 text-white font-medium py-4 h-auto transition-colors rounded-lg"
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
                  </CardContent>
                </Card>

                {/* Key Points */}
                <Card className="border-gray-200 shadow-sm bg-white">
                  <CardHeader className="border-b border-gray-100 pb-6">
                    <CardTitle className="text-lg text-black font-medium">Key Points</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <ul className="space-y-4">
                      {result.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-4">
                          <div className="w-2 h-2 bg-black rounded-full mt-2 shrink-0" />
                          <span className="text-sm leading-relaxed text-gray-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Summary Output */}
        {result && (
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardHeader className="border-b border-gray-100 pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-black font-medium text-xl">Generated Summary</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(result.summary)}
                  className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="bg-gray-50 border border-gray-200 p-8 rounded-xl">
                <p className="whitespace-pre-wrap leading-relaxed text-gray-800 text-base">{result.summary}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
