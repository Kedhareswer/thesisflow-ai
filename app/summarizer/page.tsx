"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useSocket } from "@/components/socket-provider"
import { useUser } from "@/components/user-provider"
import { useRouter } from "next/navigation"
import { FileText, Loader2, Copy, Save, Upload, LinkIcon } from "lucide-react"
import { processFile, validateFile } from "@/lib/file-upload"

export default function PaperSummarizer() {
  const { user, isLoading: userLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { sendEvent } = useSocket()
  const [isLoading, setIsLoading] = useState(false)
  const [paperText, setPaperText] = useState("")
  const [paperUrl, setPaperUrl] = useState("")
  const [paperTitle, setPaperTitle] = useState("")
  const [summaryLength, setSummaryLength] = useState(3)
  const [includeKeywords, setIncludeKeywords] = useState(true)
  const [includeCitations, setIncludeCitations] = useState(true)
  const [includeMethodology, setIncludeMethodology] = useState(true)
  const [summary, setSummary] = useState("")
  const [savedSummaries, setSavedSummaries] = useState<
    Array<{
      id: string
      title: string
      summary: string
      date: string
    }>
  >([
    {
      id: "1",
      title: "Machine Learning Applications in Healthcare",
      summary: "This paper explores various applications of machine learning in healthcare...",
      date: "2023-05-15",
    },
    {
      id: "2",
      title: "Sustainable Energy: A Comprehensive Review",
      summary: "A review of sustainable energy sources and their implementation...",
      date: "2023-06-02",
    },
  ])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login")
    }
  }, [user, userLoading, router])

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!paperText.trim() && !paperUrl.trim()) || !paperTitle.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide paper content or URL and a title.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setSummary("")

    try {
      // Compose a detailed prompt for the Gemini API
      const prompt = `Summarize the following research paper.\n\nTitle: ${paperTitle}\n\nContent: ${paperText || `Content from URL: ${paperUrl}`}\n\nInstructions: Provide a structured summary with the following sections: Title, Authors (if available), Abstract, Key Findings, Methods, and Conclusions. Use clear markdown headings. ${includeKeywords ? 'Include a Keywords section.' : ''} ${includeCitations ? 'Include a Key Citations section if references are present.' : ''} ${includeMethodology ? 'Include a Methodology section.' : ''} The summary should be ${summaryLength === 1 ? 'very concise' : summaryLength === 2 ? 'concise' : summaryLength === 3 ? 'moderate in length' : summaryLength === 4 ? 'detailed' : 'very detailed'}.`;

      // Call Gemini API
      const response = await fetch(`/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          options: {
            includeKeywords,
            includeCitations,
            includeMethodology,
            summaryLength
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.summary);

      sendEvent({
        type: "paper_summarized",
        userId: user?.id || '',
        timestamp: new Date().toISOString(),
        payload: {
          title: paperTitle,
          length: summaryLength,
          options: {
            includeKeywords,
            includeCitations,
            includeMethodology,
          },
        },
      });

      toast({
        title: "Summary generated",
        description: "Your paper has been successfully summarized.",
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      setSummary("Error: Failed to summarize paper. Please try again.");
      toast({
        title: "Summarization failed",
        description: "There was an error generating the summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSaveSummary = () => {
    if (!summary.trim() || !paperTitle.trim()) return

    const newSummary = {
      id: Date.now().toString(),
      title: paperTitle,
      summary: summary,
      date: new Date().toISOString().split("T")[0],
    }

    setSavedSummaries([newSummary, ...savedSummaries])

    toast({
      title: "Summary saved",
      description: "Your summary has been saved successfully.",
    })

    // Track the save event
    sendEvent({
      type: "document_edited",
      userId: user?.id || '',
      timestamp: new Date().toISOString(),
      payload: {
        title: paperTitle,
        id: newSummary.id,
        action: 'save'
      },
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateFile(file)
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await processFile(file)
      if (result.error) {
        throw new Error(result.error)
      }
      setPaperTitle(result.title)
      setPaperText(result.text)
      toast({
        title: "File uploaded",
        description: "Your document has been successfully processed.",
      })
    } catch (error) {
      console.error("Error processing file:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Copied to clipboard",
          description: "The summary has been copied to your clipboard.",
        })
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
        toast({
          title: "Copy failed",
          description: "Failed to copy to clipboard. Please try again.",
          variant: "destructive",
        })
      })
  }

  if (userLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Paper Summarizer</h1>
        <p className="text-muted-foreground">
          Extract key insights from research papers using AI. Upload a paper or paste its content to get started.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Paper Summarizer
            </CardTitle>
            <CardDescription>Extract key insights from research papers using AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paperTitle">Paper Title</Label>
                <Input
                  id="paperTitle"
                  placeholder="Enter the title of the paper"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                />
              </div>

              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text">Paste Text</TabsTrigger>
                  <TabsTrigger value="upload">Upload Word (.docx)</TabsTrigger>
                  <TabsTrigger value="url">Enter URL</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paperText">Paper Content</Label>
                    <Textarea
                      id="paperText"
                      placeholder="Paste the paper content here...\nFor best results, include a clear title, author(s), abstract, and section headings. Optionally, add a prompt describing what you want summarized."
                      value={paperText}
                      onChange={(e) => setPaperText(e.target.value)}
                      className="min-h-[200px]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paperFile">Upload Paper (.docx only)</Label>
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="paperFile"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">DOCX only (MAX. 50MB)</p>
                        </div>
                        <input
                          id="paperFile"
                          type="file"
                          accept=".docx"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="url" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paperUrl">Paper URL</Label>
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="paperUrl"
                        placeholder="https://example.com/research-paper.pdf"
                        value={paperUrl}
                        onChange={(e) => setPaperUrl(e.target.value)}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="summaryLength">Summary Length</Label>
                    <span className="text-sm text-muted-foreground">
                      {summaryLength} {summaryLength === 1 ? "paragraph" : "paragraphs"}
                    </span>
                  </div>
                  <Slider
                    id="summaryLength"
                    min={1}
                    max={5}
                    step={1}
                    value={[summaryLength]}
                    onValueChange={(value: number[]) => setSummaryLength(value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Concise</span>
                    <span>Detailed</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Include in Summary</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeKeywords" className="cursor-pointer">
                        Keywords
                      </Label>
                      <Switch id="includeKeywords" checked={includeKeywords} onCheckedChange={setIncludeKeywords} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeCitations" className="cursor-pointer">
                        Key Citations
                      </Label>
                      <Switch id="includeCitations" checked={includeCitations} onCheckedChange={setIncludeCitations} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeMethodology" className="cursor-pointer">
                        Methodology Section
                      </Label>
                      <Switch
                        id="includeMethodology"
                        checked={includeMethodology}
                        onCheckedChange={setIncludeMethodology}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSummarize} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Summarize Paper
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          {summary && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Summary</CardTitle>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(summary)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleSaveSummary}>
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap prose prose-sm max-w-none">{summary}</div>
              </CardContent>
            </Card>
          )}

          {savedSummaries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Saved Summaries</CardTitle>
                <CardDescription>Your previously summarized papers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {savedSummaries.map((item) => (
                    <Card key={item.id} className="bg-muted/50">
                      <CardHeader className="p-3 pb-0">
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <CardDescription>{item.date}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 pt-1">
                        <p className="text-sm line-clamp-3">{item.summary}</p>
                      </CardContent>
                      <CardFooter className="p-3 pt-0 flex justify-end">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
