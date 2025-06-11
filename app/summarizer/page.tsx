"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, Link, Copy, Download, Clock, BookOpen, ArrowRight } from "lucide-react"
import { useSocket } from "@/components/socket-provider"
import { useToast } from "@/hooks/use-toast"

interface Summary {
  id: string
  title: string
  originalText: string
  summary: string
  keyPoints: string[]
  timestamp: Date
  source: "text" | "file" | "url"
  readingTime: number
}

export default function PaperSummarizer() {
  const [inputText, setInputText] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [currentSummary, setCurrentSummary] = useState<Summary | null>(null)
  const { socket } = useSocket()
  const { toast } = useToast()

  const handleSummarizeText = async () => {
    if (!inputText.trim()) return

    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const summary: Summary = {
        id: Date.now().toString(),
        title: "Text Summary",
        originalText: inputText,
        summary:
          "This comprehensive analysis explores the fundamental concepts presented in the provided text. The content demonstrates significant insights into the research domain, highlighting key methodologies and findings that contribute to our understanding of the subject matter. The analysis reveals important patterns and relationships that have implications for future research directions.",
        keyPoints: [
          "Primary research findings and their significance",
          "Methodological approaches and their effectiveness",
          "Key insights and theoretical contributions",
          "Implications for future research and applications",
          "Limitations and areas for further investigation",
        ],
        timestamp: new Date(),
        source: "text",
        readingTime: Math.ceil(inputText.length / 1000),
      }

      setSummaries((prev) => [summary, ...prev])
      setCurrentSummary(summary)

      if (socket) {
        socket.emit("paper_summarized", {
          title: summary.title,
          source: summary.source,
          length: inputText.length,
        })
      }

      toast({
        title: "Summary generated",
        description: "Your text has been successfully summarized",
      })
    } catch (error) {
      toast({
        title: "Summarization failed",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSummarizeUrl = async () => {
    if (!fileUrl.trim()) return

    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const summary: Summary = {
        id: Date.now().toString(),
        title: "Research Paper Analysis",
        originalText: "Content extracted from the provided URL...",
        summary:
          "This research paper presents a novel approach to addressing key challenges in the field. The authors introduce innovative methodologies and provide comprehensive experimental validation. The findings demonstrate significant improvements over existing approaches and offer valuable insights for practitioners and researchers alike.",
        keyPoints: [
          "Novel algorithmic approach with theoretical foundations",
          "Comprehensive experimental evaluation on benchmark datasets",
          "Significant performance improvements over state-of-the-art methods",
          "Practical applications and real-world implementation considerations",
          "Future research directions and potential extensions",
        ],
        timestamp: new Date(),
        source: "url",
        readingTime: 8,
      }

      setSummaries((prev) => [summary, ...prev])
      setCurrentSummary(summary)

      if (socket) {
        socket.emit("paper_summarized", {
          title: summary.title,
          source: summary.source,
          url: fileUrl,
        })
      }

      toast({
        title: "Paper summarized",
        description: "The paper from the URL has been successfully summarized",
      })
    } catch (error) {
      toast({
        title: "Summarization failed",
        description: "Could not process the URL. Please check the link and try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2500))

      const summary: Summary = {
        id: Date.now().toString(),
        title: file.name,
        originalText: "Content extracted from the uploaded file...",
        summary:
          "This document provides a comprehensive overview of the research topic, presenting detailed analysis and findings. The content demonstrates thorough investigation of the subject matter with well-structured arguments and evidence-based conclusions. The document contributes valuable insights to the field and offers practical implications for future work.",
        keyPoints: [
          "Comprehensive literature review and background analysis",
          "Detailed methodology and research design",
          "Significant findings and data analysis results",
          "Practical implications and real-world applications",
          "Recommendations for future research and development",
        ],
        timestamp: new Date(),
        source: "file",
        readingTime: 12,
      }

      setSummaries((prev) => [summary, ...prev])
      setCurrentSummary(summary)

      if (socket) {
        socket.emit("paper_summarized", {
          title: summary.title,
          source: summary.source,
          fileName: file.name,
        })
      }

      toast({
        title: "File summarized",
        description: `"${file.name}" has been successfully summarized`,
      })
    } catch (error) {
      toast({
        title: "File processing failed",
        description: "Could not process the uploaded file",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copySummary = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "Summary has been copied to your clipboard",
    })
  }

  const downloadSummary = (summary: Summary) => {
    const content = `Title: ${summary.title}\n\nSummary:\n${summary.summary}\n\nKey Points:\n${summary.keyPoints.map((point) => `• ${point}`).join("\n")}\n\nGenerated: ${summary.timestamp.toLocaleString()}`
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${summary.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_summary.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getSourceIcon = (source: Summary["source"]) => {
    switch (source) {
      case "text":
        return <FileText className="h-4 w-4" />
      case "file":
        return <Upload className="h-4 w-4" />
      case "url":
        return <Link className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-8 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-sm mb-8">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-5xl font-light text-black mb-6 tracking-tight">AI Paper Summarizer</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed font-light">
            Transform lengthy research papers into concise, actionable summaries with AI-powered analysis
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-5">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-8">
            <Tabs defaultValue="text" className="space-y-8">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
                <TabsTrigger
                  value="text"
                  className="data-[state=active]:bg-white data-[state=active]:text-black font-medium"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Text
                </TabsTrigger>
                <TabsTrigger
                  value="file"
                  className="data-[state=active]:bg-white data-[state=active]:text-black font-medium"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  File
                </TabsTrigger>
                <TabsTrigger
                  value="url"
                  className="data-[state=active]:bg-white data-[state=active]:text-black font-medium"
                >
                  <Link className="h-4 w-4 mr-2" />
                  URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-8">
                <div className="border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-black flex items-center gap-3">
                      <div className="w-1 h-6 bg-black"></div>
                      Paste Your Text
                    </h3>
                    <p className="text-gray-600 text-sm mt-2 font-light">
                      Paste research content, abstracts, or any text you want to summarize
                    </p>
                  </div>
                  <div className="p-6 space-y-6">
                    <Textarea
                      placeholder="Paste your research paper, article, or text content here..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      rows={12}
                      className="resize-none border-gray-300 focus:border-black focus:ring-black font-light"
                    />
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{inputText.length} characters</span>
                      <span>~{Math.ceil(inputText.length / 1000)} min read</span>
                    </div>
                    <Button
                      onClick={handleSummarizeText}
                      disabled={loading || !inputText.trim()}
                      className="w-full bg-black hover:bg-gray-800 text-white font-medium py-4"
                    >
                      {loading ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing Text...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Generate Summary
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="file" className="space-y-8">
                <div className="border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-black flex items-center gap-3">
                      <div className="w-1 h-6 bg-black"></div>
                      Upload Document
                    </h3>
                    <p className="text-gray-600 text-sm mt-2 font-light">
                      Upload PDF, DOC, DOCX, or TXT files for AI-powered summarization
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 transition-colors">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 mb-4">
                        <Upload className="h-6 w-6 text-gray-600" />
                      </div>
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-lg font-medium text-black block mb-2">
                          Drop files here or click to upload
                        </span>
                        <span className="text-sm text-gray-500">Supports PDF, DOC, DOCX, TXT up to 10MB</span>
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-8">
                <div className="border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-black flex items-center gap-3">
                      <div className="w-1 h-6 bg-black"></div>
                      Research Paper URL
                    </h3>
                    <p className="text-gray-600 text-sm mt-2 font-light">
                      Enter a URL to research papers from arXiv, ACM, IEEE, or other academic sources
                    </p>
                  </div>
                  <div className="p-6 space-y-6">
                    <Input
                      placeholder="https://arxiv.org/abs/2301.00001"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      className="border-gray-300 focus:border-black focus:ring-black font-light"
                    />
                    <div className="text-sm text-gray-500">
                      <p className="mb-3 font-medium">Supported sources:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {["arXiv", "ACM Digital Library", "IEEE Xplore", "PubMed", "ResearchGate"].map((source) => (
                          <Badge key={source} variant="outline" className="text-xs justify-center py-1">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={handleSummarizeUrl}
                      disabled={loading || !fileUrl.trim()}
                      className="w-full bg-black hover:bg-gray-800 text-white font-medium py-4"
                    >
                      {loading ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Processing URL...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Summarize from URL
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Summary Display */}
          <div className="lg:col-span-3 space-y-8">
            {currentSummary ? (
              <div className="border border-gray-200">
                <div className="p-8 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-2 bg-black text-white">{getSourceIcon(currentSummary.source)}</div>
                        <div>
                          <h2 className="text-2xl font-light text-black">{currentSummary.title}</h2>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {currentSummary.readingTime} min read
                            </span>
                            <span>{currentSummary.timestamp.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copySummary(currentSummary.summary)}
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSummary(currentSummary)}
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-8 space-y-10">
                  {/* Summary */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-black flex items-center gap-3">
                      <div className="w-1 h-6 bg-black"></div>
                      Executive Summary
                    </h3>
                    <div className="bg-gray-50 p-6 border border-gray-200">
                      <p className="text-gray-800 leading-relaxed font-light">{currentSummary.summary}</p>
                    </div>
                  </div>

                  {/* Key Points */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-black flex items-center gap-3">
                      <div className="w-1 h-6 bg-gray-400"></div>
                      Key Insights
                    </h3>
                    <div className="space-y-3">
                      {currentSummary.keyPoints.map((point, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-4 border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-shrink-0 w-6 h-6 bg-black text-white text-sm font-medium flex items-center justify-center">
                            {index + 1}
                          </div>
                          <p className="text-gray-700 leading-relaxed font-light">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Source Badge */}
                  <div className="text-center pt-6 border-t border-gray-200">
                    <Badge variant="outline" className="px-4 py-2">
                      {currentSummary.source === "text" && "Text Input"}
                      {currentSummary.source === "file" && "File Upload"}
                      {currentSummary.source === "url" && "URL Source"}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              /* Welcome State */
              <div className="border border-gray-200">
                <div className="text-center py-20 px-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 mb-8">
                    <BookOpen className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="text-2xl font-light text-black mb-4">Ready to Summarize</h3>
                  <p className="text-gray-600 max-w-md mx-auto leading-relaxed font-light mb-8">
                    Upload a document, paste text, or provide a URL to get started with AI-powered summarization
                  </p>
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-black mb-2 mx-auto"></div>
                      <span className="text-xs text-gray-600 uppercase tracking-wide">Text Analysis</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-gray-300 mb-2 mx-auto"></div>
                      <span className="text-xs text-gray-600 uppercase tracking-wide">File Processing</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-gray-500 mb-2 mx-auto"></div>
                      <span className="text-xs text-gray-600 uppercase tracking-wide">URL Extraction</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Summaries */}
            {summaries.length > 0 && (
              <div className="border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-black">Recent Summaries</h3>
                  <p className="text-gray-600 text-sm mt-1">Your latest AI-generated summaries</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {summaries.slice(0, 5).map((summary) => (
                      <div
                        key={summary.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100"
                        onClick={() => setCurrentSummary(summary)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-gray-100">{getSourceIcon(summary.source)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{summary.title}</p>
                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                              <span>{summary.timestamp.toLocaleDateString()}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {summary.readingTime} min
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {summary.source}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
