"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, TrendingUp, Copy, CheckCircle, Download, Share2, FileText, BarChart3 } from "lucide-react"
import { SkeletonCard } from "@/components/common/SkeletonCard"

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

interface SummaryOutputPanelProps {
  result: SummaryResult | null
  loading: boolean
  copied: boolean
  onCopyToClipboard: (text: string) => void
  onDownloadSummary: () => void
  onShareSummary: () => void
  getWordCount: (text: string) => number
}

export function SummaryOutputPanel({
  result,
  loading,
  copied,
  onCopyToClipboard,
  onDownloadSummary,
  onShareSummary,
  getWordCount,
}: SummaryOutputPanelProps) {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={6} />
        <SkeletonCard lines={8} />
      </div>
    )
  }

  if (!result) {
    return (
      <Card className="border-gray-200 shadow-sm bg-white h-96 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Summary Yet</h3>
          <p className="text-sm">Add content and generate a summary to see results here</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <Card className="border-gray-200 shadow-sm bg-white">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Summary Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Reading Time</span>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{result.readingTime} min</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Compression</span>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{result.compressionRatio}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Word Count</span>
              <span className="text-sm font-medium text-gray-900">{getWordCount(result.summary)} words</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Difficulty</span>
              {result.difficulty && (
                <Badge className={getDifficultyColor(result.difficulty)}>{result.difficulty}</Badge>
              )}
            </div>
          </div>

          {result.sentiment && (
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-600">Sentiment</span>
              <Badge className={getSentimentColor(result.sentiment)}>{result.sentiment}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topics */}
      {result.topics && result.topics.length > 0 && (
        <Card className="border-gray-200 shadow-sm bg-white">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-lg font-medium text-gray-900">Key Topics</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2">
              {result.topics.map((topic, index) => (
                <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800 border border-blue-300">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Points */}
      <Card className="border-gray-200 shadow-sm bg-white">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-lg font-medium text-gray-900">Key Points</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {result.keyPoints && result.keyPoints.length > 0 ? (
            <ul className="space-y-3">
              {result.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-800 leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-400 text-sm">No key points available.</div>
          )}
        </CardContent>
      </Card>

      {/* Tables */}
      {Array.isArray((result as any).tables) && (result as any).tables.length > 0 && (
        <Card className="border-gray-200 shadow-sm bg-white">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-lg font-medium text-gray-900">Tables</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {(result as any).tables.map((table: any, idx: number) => (
              <div key={idx} className="overflow-x-auto">
                <div className="font-semibold mb-2">{table.title}</div>
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr>
                      {table.headers.map((header: string, hidx: number) => (
                        <th key={hidx} className="border px-2 py-1 bg-gray-50">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row: any[], ridx: number) => (
                      <tr key={ridx}>
                        {row.map((cell, cidx) => (
                          <td key={cidx} className="border px-2 py-1">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Graphs */}
      {Array.isArray((result as any).graphs) && (result as any).graphs.length > 0 && (
        <Card className="border-gray-200 shadow-sm bg-white">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-lg font-medium text-gray-900">Graphs</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {(result as any).graphs.map((graph: any, idx: number) => (
              <div key={idx} className="mb-4">
                <div className="font-semibold mb-2">{graph.title} <span className="text-xs text-gray-500">({graph.type})</span></div>
                {/* Placeholder for actual chart rendering */}
                <div className="w-full h-40 bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                  Graph preview unavailable
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Generated Summary */}
      <Card className="border-gray-200 shadow-sm bg-white">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-gray-900">Generated Summary</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopyToClipboard(result.summary)}
                className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDownloadSummary}
                className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 bg-white"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onShareSummary}
                className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 bg-white"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
            {result.summary && result.summary.trim().length > 0 ? (
              result.summary.split("\n").map((paragraph, index) => (
                <p key={index} className="mb-3 last:mb-0">
                  {paragraph}
                </p>
              ))
            ) : (
              <div className="text-gray-400 text-sm">No summary available.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
