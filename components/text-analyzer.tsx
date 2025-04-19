"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FileSearch, Loader2, Copy } from "lucide-react"

export default function TextAnalyzer() {
  const [apiKey, setApiKey] = useState("")
  const [textToAnalyze, setTextToAnalyze] = useState("")
  const [analysis, setAnalysis] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textToAnalyze.trim() || !apiKey.trim()) return

    setIsLoading(true)
    setAnalysis("")

    try {
      // This would use the actual API in production
      const mockAnalysis = await mockAnalyzeText(textToAnalyze, apiKey)
      setAnalysis(mockAnalysis)
    } catch (error) {
      setAnalysis("Error: Failed to analyze text. Please check your API key and try again.")
    } finally {
      setIsLoading(false)
    }
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

  // Mock function to simulate API call for text analysis
  const mockAnalyzeText = async (text: string, key: string) => {
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate network delay

    return `## Text Analysis Results

### Main Themes and Concepts
- ${text.split(" ").slice(0, 3).join(" ")} as a central concept
- Relationship between theory and practice
- Methodological considerations

### Key Arguments
1. The text argues for a more integrated approach to ${text.split(" ").slice(3, 6).join(" ")}
2. It challenges conventional wisdom about ${text.split(" ").slice(-4).join(" ")}
3. It proposes new frameworks for understanding complex phenomena

### Potential Applications
- Educational contexts
- Research methodology
- Policy development
- Technological innovation

### Related Areas for Further Exploration
- Comparative studies across different domains
- Historical development of key concepts
- Ethical implications and considerations
- Quantitative analysis of observed patterns`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="h-5 w-5 text-purple-500" />
          Text Analyzer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="textToAnalyze">Text to Analyze</Label>
            <Textarea
              id="textToAnalyze"
              placeholder="Paste the text you want to analyze here..."
              value={textToAnalyze}
              onChange={(e) => setTextToAnalyze(e.target.value)}
              className="min-h-[200px]"
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <FileSearch className="mr-2 h-4 w-4" />
                Analyze Text
              </>
            )}
          </Button>
        </form>

        {analysis && (
          <div className="relative mt-4">
            <div className="whitespace-pre-wrap bg-muted p-4 rounded-md">{analysis}</div>
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(analysis)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
