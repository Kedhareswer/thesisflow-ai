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
import { FileText, Upload, Link, Clock, TrendingUp, AlertCircle, Loader2, Copy, CheckCircle } from "lucide-react"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import { useToast } from "@/hooks/use-toast"

interface SummaryResult {
  summary: string
  keyPoints: string[]
  readingTime: number
  sentiment?: 'positive' | 'neutral' | 'negative'
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
  const [summaryStyle, setSummaryStyle] = useState<'academic' | 'executive' | 'bullet-points' | 'detailed'>('academic')
  const [summaryLength, setSummaryLength] = useState<'brief' | 'medium' | 'comprehensive'>('medium')
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError("File size must be less than 10MB")
      return
    }

    const allowedTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a text file, PDF, or Word document")
      return
    }

    setFile(selectedFile)
    setError(null)

    // Extract text content
    try {
      let textContent = ""
      
      if (selectedFile.type === 'text/plain') {
        textContent = await selectedFile.text()
      } else {
        // For PDF and Word docs, we'll use a simple fallback
        textContent = await selectedFile.text()
      }
      
      setContent(textContent)
      toast({
        title: "File uploaded",
        description: `${selectedFile.name} has been processed`,
      })
    } catch (error) {
      setError("Failed to process file content")
      setFile(null)
    }
  }

  const handleUrlFetch = async () => {
    if (!url.trim()) {
      setError("Please enter a valid URL")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch URL content')
      }

      const data = await response.json()
      setContent(data.content || data.text)
      
      toast({
        title: "Content fetched",
        description: "URL content has been extracted successfully",
      })
    } catch (error) {
      console.error('URL fetch error:', error)
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
        length: summaryLength
      })

             const originalLength = content.length
       const summaryTextLength = summaryResult.summary.length
       const compressionRatio = ((originalLength - summaryTextLength) / originalLength * 100).toFixed(1)

       setResult({
         ...summaryResult,
         originalLength,
         summaryLength: summaryTextLength,
         compressionRatio: `${compressionRatio}%`
       })

      toast({
        title: "Summary generated!",
        description: `Content summarized with ${compressionRatio}% compression`,
      })
    } catch (error) {
      console.error('Summarization error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate summary'
      setError(errorMessage)
      
      if (errorMessage.includes('No AI providers available')) {
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
      case 'positive': return 'bg-green-100 text-green-800'
      case 'negative': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-3xl font-bold">AI Summarizer</h1>
          <p className="text-muted-foreground">Intelligently summarize documents, articles, and content</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Input</CardTitle>
              <CardDescription>
                Provide content through text input, file upload, or URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text">Text Input</TabsTrigger>
                  <TabsTrigger value="file">File Upload</TabsTrigger>
                  <TabsTrigger value="url">From URL</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <Textarea
                    placeholder="Paste your content here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={12}
                    className="resize-none"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{getWordCount(content)} words</span>
                    <span>{content.length} characters</span>
                  </div>
                </TabsContent>

                <TabsContent value="file" className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload a text file, PDF, or Word document
                    </p>
                    <Input
                      type="file"
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                  {file && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="url" className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/article"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !loading && handleUrlFetch()}
                    />
                    <Button 
                      onClick={handleUrlFetch} 
                      disabled={loading || !url.trim()}
                      variant="outline"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter a URL to automatically extract and summarize its content
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Summary Configuration</CardTitle>
              <CardDescription>
                Customize how your content is summarized
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Summary Style</label>
                <Select value={summaryStyle} onValueChange={(value: any) => setSummaryStyle(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="bullet-points">Bullet Points</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Summary Length</label>
                <Select value={summaryLength} onValueChange={(value: any) => setSummaryLength(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief">Brief</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={generateSummary} 
            disabled={loading || !content.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Summary...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Summary
              </>
            )}
          </Button>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {result && (
            <>
              {/* Summary Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Summary Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Reading Time</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-sm font-medium">{result.readingTime} min</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Compression</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-sm font-medium">{result.compressionRatio}</span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Word Count</span>
                    <span className="text-sm font-medium">
                      {getWordCount(result.summary)} words
                    </span>
                  </div>

                  {result.sentiment && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Sentiment</span>
                      <Badge className={getSentimentColor(result.sentiment)}>
                        {result.sentiment}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Key Points */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Key Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                        <span className="text-sm leading-relaxed">{point}</span>
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Summary</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(result.summary)}
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none bg-muted/20 p-4 rounded-lg">
              <p className="whitespace-pre-wrap leading-relaxed">{result.summary}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
