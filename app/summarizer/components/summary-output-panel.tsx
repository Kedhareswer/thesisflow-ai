"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Download, Share2, Clock, FileText } from "lucide-react"
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
  showAdvancedStats?: boolean
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
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="text-center py-24">
        <FileText className="h-16 w-16 mx-auto mb-6 text-gray-300" />
        <h3 className="text-2xl font-light text-gray-900 mb-3">No Summary Yet</h3>
        <p className="text-gray-600 font-light">Add content and generate a summary to see results here</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Primary Summary */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-light text-black tracking-tight">Summary</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-light flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {result.readingTime} min read
            </span>
            <span className="text-sm text-gray-600 font-light">
              {getWordCount(result.summary)} words
            </span>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-sm">
          <div className="p-8">
            <div className="prose prose-lg max-w-none text-gray-900 leading-relaxed font-light">
              {result.summary.split('\n').map((paragraph, index) => (
                paragraph.trim() && (
                  <p key={index} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                )
              ))}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="border-t border-gray-200 px-8 py-4 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => onCopyToClipboard(result.summary)}
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-white text-gray-700 font-light"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                onClick={onDownloadSummary}
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-white text-gray-700 font-light"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={onShareSummary}
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-white text-gray-700 font-light"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Points */}
      {result.keyPoints && result.keyPoints.length > 0 && (
        <div>
          <h3 className="text-xl font-light text-black mb-4 tracking-tight">Key Points</h3>
          <Card className="border-gray-200 bg-white">
            <CardContent className="p-6">
              <ul className="space-y-3">
                {result.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-black rounded-full mt-2.5 flex-shrink-0" />
                    <span className="text-gray-800 leading-relaxed font-light">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Statistics */}
      <div>
        <h3 className="text-xl font-light text-black mb-4 tracking-tight">Statistics</h3>
        <Card className="border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-light text-black mb-1">{result.readingTime}</div>
                <div className="text-sm text-gray-600 font-light">Minutes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-light text-black mb-1">{result.compressionRatio}</div>
                <div className="text-sm text-gray-600 font-light">Compressed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-light text-black mb-1">{getWordCount(result.summary)}</div>
                <div className="text-sm text-gray-600 font-light">Words</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-light text-black mb-1">{result.originalLength}</div>
                <div className="text-sm text-gray-600 font-light">Original</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topics */}
      {result.topics && result.topics.length > 0 && (
        <div>
          <h3 className="text-xl font-light text-black mb-4 tracking-tight">Topics</h3>
          <Card className="border-gray-200 bg-white">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-2">
                {result.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-light border border-gray-200 rounded-sm"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tables */}
      {Array.isArray((result as any).tables) && (result as any).tables.length > 0 && (
        <div>
          <h3 className="text-xl font-light text-black mb-4 tracking-tight">Tables</h3>
          <div className="space-y-6">
            {(result as any).tables.map((table: any, idx: number) => (
              <Card key={idx} className="border-gray-200 bg-white">
                <CardContent className="p-6">
                  <div className="font-light text-lg mb-4 text-black">{table.title}</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          {table.headers.map((header: string, hidx: number) => (
                            <th key={hidx} className="border border-gray-300 px-4 py-2 bg-gray-50 text-left font-light text-black">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row: any[], ridx: number) => (
                          <tr key={ridx}>
                            {row.map((cell: any, cidx: number) => (
                              <td key={cidx} className="border border-gray-300 px-4 py-2 text-gray-800 font-light">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
