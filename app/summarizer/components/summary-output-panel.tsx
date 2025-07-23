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
  summaryStyle?: "academic" | "executive" | "bullet-points" | "detailed"
  summaryLength?: "brief" | "medium" | "comprehensive"
}

export function SummaryOutputPanel({
  result,
  loading,
  copied,
  onCopyToClipboard,
  onDownloadSummary,
  onShareSummary,
  getWordCount,
  summaryStyle,
  summaryLength,
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

  // Helper to get style-specific formatting
  const getStyleFormatting = (style: string, length: string) => {
    const baseClasses = "prose prose-lg max-w-none leading-relaxed font-light"
    
    switch (style) {
      case "academic":
        return {
          container: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200",
          header: "text-blue-900",
          content: `${baseClasses} text-blue-800`,
          badge: "bg-blue-100 text-blue-800 border-blue-300",
          icon: "text-blue-600"
        }
      case "executive":
        return {
          container: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
          header: "text-green-900",
          content: `${baseClasses} text-green-800`,
          badge: "bg-green-100 text-green-800 border-green-300",
          icon: "text-green-600"
        }
      case "bullet-points":
        return {
          container: "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200",
          header: "text-purple-900",
          content: `${baseClasses} text-purple-800`,
          badge: "bg-purple-100 text-purple-800 border-purple-300",
          icon: "text-purple-600"
        }
      case "detailed":
        return {
          container: "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200",
          header: "text-orange-900",
          content: `${baseClasses} text-orange-800`,
          badge: "bg-orange-100 text-orange-800 border-orange-300",
          icon: "text-orange-600"
        }
      default:
        return {
          container: "bg-white border-gray-200",
          header: "text-black",
          content: `${baseClasses} text-gray-900`,
          badge: "bg-gray-100 text-gray-800 border-gray-300",
          icon: "text-gray-600"
        }
    }
  }

  // Helper to get length-specific styling
  const getLengthStyling = (length: string) => {
    switch (length) {
      case "brief":
        return {
          padding: "p-6",
          fontSize: "text-base",
          spacing: "space-y-2"
        }
      case "medium":
        return {
          padding: "p-8",
          fontSize: "text-lg",
          spacing: "space-y-3"
        }
      case "comprehensive":
        return {
          padding: "p-10",
          fontSize: "text-xl",
          spacing: "space-y-4"
        }
      default:
        return {
          padding: "p-8",
          fontSize: "text-lg",
          spacing: "space-y-3"
        }
    }
  }

  const styleFormatting = getStyleFormatting(summaryStyle || "detailed", summaryLength || "medium")
  const lengthStyling = getLengthStyling(summaryLength || "medium")

  return (
    <div className="space-y-8">
      {/* Primary Summary */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
          <h2 className="text-2xl font-light text-black tracking-tight">Summary</h2>
            {summaryStyle && summaryLength && (
              <p className="text-sm text-gray-600 font-light mt-1">
                {summaryStyle.charAt(0).toUpperCase() + summaryStyle.slice(1)} • {summaryLength.charAt(0).toUpperCase() + summaryLength.slice(1)}
              </p>
            )}
          </div>
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
        
        <div className={`${styleFormatting.container} rounded-sm border`}>
          <div className={`${lengthStyling.padding} ${styleFormatting.header}`}>
            <h3 className="text-2xl font-light tracking-tight">Summary</h3>
            {summaryStyle && summaryLength && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm font-light px-2 py-1 rounded ${styleFormatting.badge}`}>
                  {summaryStyle.charAt(0).toUpperCase() + summaryStyle.slice(1)} • {summaryLength.charAt(0).toUpperCase() + summaryLength.slice(1)}
                </span>
              </div>
            )}
          </div>
          
          <div className={`${lengthStyling.padding} pt-0`}>
            <div className={`${styleFormatting.content} ${lengthStyling.fontSize}`}>
              {summaryStyle === "bullet-points" ? (
                // Special formatting for bullet points
                <div className={lengthStyling.spacing}>
                  {result.summary.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 ${styleFormatting.icon.replace('text-', 'bg-')}`} />
                        <span className="leading-relaxed">{paragraph}</span>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                // Regular paragraph formatting for other styles
                <div className={lengthStyling.spacing}>
              {result.summary.split('\n').map((paragraph, index) => (
                paragraph.trim() && (
                  <p key={index} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                )
              ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className={`border-t px-8 py-4 ${styleFormatting.container.replace('bg-gradient-to-br', 'bg-opacity-50')}`}>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => onCopyToClipboard(result.summary)}
                variant="outline"
                size="sm"
                className={`border ${styleFormatting.badge} hover:bg-white font-light`}
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                onClick={onDownloadSummary}
                variant="outline"
                size="sm"
                className={`border ${styleFormatting.badge} hover:bg-white font-light`}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={onShareSummary}
                variant="outline"
                size="sm"
                className={`border ${styleFormatting.badge} hover:bg-white font-light`}
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
          <h3 className={`text-xl font-light mb-4 tracking-tight ${styleFormatting.header}`}>Key Points</h3>
          <Card className={`${styleFormatting.container} border`}>
            <CardContent className={`${lengthStyling.padding}`}>
              <ul className={lengthStyling.spacing}>
                {result.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 ${styleFormatting.icon.replace('text-', 'bg-')}`} />
                    <span className={`leading-relaxed font-light ${styleFormatting.content}`}>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Statistics */}
      <div>
        <h3 className={`text-xl font-light mb-4 tracking-tight ${styleFormatting.header}`}>Statistics</h3>
        <Card className={`${styleFormatting.container} border`}>
          <CardContent className={`${lengthStyling.padding}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`text-2xl font-light mb-1 ${styleFormatting.header}`}>{result.readingTime}</div>
                <div className={`text-sm font-light ${styleFormatting.content}`}>Minutes</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-light mb-1 ${styleFormatting.header}`}>{result.compressionRatio}</div>
                <div className={`text-sm font-light ${styleFormatting.content}`}>Compressed</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-light mb-1 ${styleFormatting.header}`}>{getWordCount(result.summary)}</div>
                <div className={`text-sm font-light ${styleFormatting.content}`}>Words</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-light mb-1 ${styleFormatting.header}`}>{result.originalLength}</div>
                <div className={`text-sm font-light ${styleFormatting.content}`}>Original</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topics */}
      {result.topics && result.topics.length > 0 && (
        <div>
          <h3 className={`text-xl font-light mb-4 tracking-tight ${styleFormatting.header}`}>Topics</h3>
          <Card className={`${styleFormatting.container} border`}>
            <CardContent className={`${lengthStyling.padding}`}>
              <div className="flex flex-wrap gap-2">
                {result.topics.map((topic, index) => (
                  <span
                    key={index}
                    className={`px-3 py-1 text-sm font-light border rounded-sm ${styleFormatting.badge}`}
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
          <h3 className={`text-xl font-light mb-4 tracking-tight ${styleFormatting.header}`}>Tables</h3>
          <div className="space-y-6">
            {(result as any).tables.map((table: any, idx: number) => (
              <Card key={idx} className={`${styleFormatting.container} border`}>
                <CardContent className={`${lengthStyling.padding}`}>
                  <div className={`font-light text-lg mb-4 ${styleFormatting.header}`}>{table.title}</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          {table.headers.map((header: string, hidx: number) => (
                            <th key={hidx} className={`border px-4 py-2 text-left font-light ${styleFormatting.badge}`}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row: any[], ridx: number) => (
                          <tr key={ridx}>
                            {row.map((cell: any, cidx: number) => (
                              <td key={cidx} className={`border px-4 py-2 font-light ${styleFormatting.content}`}>
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
