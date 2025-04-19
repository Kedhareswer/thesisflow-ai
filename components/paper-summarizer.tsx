"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { FileText, Loader2, Copy, Save, Upload, LinkIcon } from "lucide-react"

export default function PaperSummarizer() {
  const [apiKey, setApiKey] = useState("")
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

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!paperText.trim() && !paperUrl.trim()) || !apiKey.trim()) return

    setIsLoading(true)
    setSummary("")

    try {
      // In a real implementation, this would call the Gemini API
      const mockSummary = await mockSummarizePaper(
        paperText || `Content from URL: ${paperUrl}`,
        summaryLength,
        {
          includeKeywords,
          includeCitations,
          includeMethodology,
        },
        apiKey,
      )
      setSummary(mockSummary)
    } catch (error) {
      setSummary("Error: Failed to summarize paper. Please check your API key and try again.")
    } finally {
      setIsLoading(false)
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
    alert("Summary saved successfully!")
  }

  const handleViewSummary = (summary: { title: string; summary: string }) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${summary.title}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-50 p-8">
          <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
            ${summary.summary}
          </div>
        </body>
      </html>
    `
    const blob = new Blob([htmlContent], { type: 'text/html' })
    window.open(URL.createObjectURL(blob), '_blank')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // In a real implementation, this would parse the PDF or document
    // For now, we'll just set a placeholder
    setPaperTitle(file.name.replace(/\.[^/.]+$/, ""))
    setPaperText(`[Content of ${file.name} would be extracted here in a real implementation]`)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Copied to clipboard!")
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
      })
  }

  // Mock function to simulate API call for paper summarization
  const mockSummarizePaper = async (
    text: string,
    length: number,
    options: {
      includeKeywords: boolean
      includeCitations: boolean
      includeMethodology: boolean
    },
    key: string,
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 2500)) // Simulate network delay

    const title = paperTitle || "Research Paper"
    const lengthText = length <= 1 ? "very concise" : length <= 3 ? "concise" : "detailed"

    const summary = `<article class="prose prose-slate max-w-none rounded-lg bg-white shadow-sm overflow-hidden">
      <header class="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 mb-4">${title}</h1>
        ${options.includeKeywords ? `
        <div class="flex flex-wrap gap-2">
          <span class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">Research Methodology</span>
          <span class="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">Data Analysis</span>
          <span class="inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">Machine Learning</span>
          <span class="inline-flex items-center rounded-full bg-pink-50 px-3 py-1 text-sm font-medium text-pink-700 ring-1 ring-inset ring-pink-600/20">Academic Research</span>
        </div>` : ''}
      </header>

      <div class="p-6 space-y-6">
        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-3">Main Findings</h2>
          <p class="text-gray-700 leading-relaxed">This paper investigates ${text.split(" ").slice(0, 10).join(" ")}... and presents significant findings related to the field. The authors demonstrate that their approach offers improvements over existing methods, particularly in terms of efficiency and accuracy.</p>
        </section>

        ${length > 1 ? `
        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-3">Background</h2>
          <p class="text-gray-700 leading-relaxed">The research builds upon previous work in the field, addressing key limitations identified in earlier studies. The authors position their work within the broader context of ongoing research efforts.</p>
        </section>` : ''}

        ${options.includeMethodology ? `
        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-3">Methodology</h2>
          <p class="text-gray-700 leading-relaxed">The study employs a ${length > 3 ? "sophisticated" : "straightforward"} methodology involving data collection, preprocessing, and analysis. ${length > 2 ? "The researchers utilize both quantitative and qualitative approaches to ensure comprehensive results. Their experimental design includes appropriate controls and validation techniques." : ""}</p>
        </section>` : ''}

        ${length > 2 ? `
        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-3">Results</h2>
          <p class="text-gray-700 leading-relaxed">The findings indicate statistically significant improvements in performance metrics compared to baseline approaches. The authors report a ${Math.floor(Math.random() * 30) + 15}% increase in efficiency and enhanced accuracy across multiple test scenarios.</p>
        </section>` : ''}

        ${length > 4 ? `
        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-3">Discussion</h2>
          <p class="text-gray-700 leading-relaxed">The paper thoroughly discusses the implications of these findings for both theory and practice. The authors acknowledge certain limitations of their approach and suggest potential avenues for future research.</p>
        </section>` : ''}

        ${options.includeCitations ? `
        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-3">Key Citations</h2>
          <ul class="list-inside space-y-2 text-gray-700">
            <li class="flex items-start">
              <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mr-2">1</span>
              <span>Smith et al. (2021) - Foundational work in the field</span>
            </li>
            <li class="flex items-start">
              <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mr-2">2</span>
              <span>Johnson & Williams (2022) - Comparative methodology</span>
            </li>
            <li class="flex items-start">
              <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mr-2">3</span>
              <span>Zhang et al. (2023) - Related findings in adjacent domain</span>
            </li>
          </ul>
        </section>` : ''}
      </div>
    </article>`

    return summary
  }

  return (
    <div className="space-y-6">
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
                <Label htmlFor="apiKey">Gemini API Key</Label>
                <Input
                  id="apiKey"
                  placeholder="Enter your Gemini API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Your API key is required to use the Gemini AI model</p>
              </div>

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
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="url">Enter URL</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paperText">Paper Content</Label>
                    <Textarea
                      id="paperText"
                      placeholder="Paste the paper content here..."
                      value={paperText}
                      onChange={(e) => setPaperText(e.target.value)}
                      className="min-h-[200px]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paperFile">Upload Paper (PDF, DOCX)</Label>
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
                          <p className="text-xs text-muted-foreground">PDF, DOCX (MAX. 20MB)</p>
                        </div>
                        <input
                          id="paperFile"
                          type="file"
                          accept=".pdf,.docx"
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
                    onValueChange={(value: React.SetStateAction<number>[]) => setSummaryLength(value[0])}
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
                        <Button variant="ghost" size="sm" onClick={() => handleViewSummary(item)}>
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
