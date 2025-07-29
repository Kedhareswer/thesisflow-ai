"use client"

import React, { useEffect, useRef } from "react"
import mermaid from "mermaid"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface MermaidChartProps {
  code: string
  index: number
  className?: string
}

export function MermaidChart({ code, index, className = "" }: MermaidChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [isRendered, setIsRendered] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  useEffect(() => {
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#1f2937',
        primaryBorderColor: '#3b82f6',
        lineColor: '#6b7280',
        secondaryColor: '#f3f4f6',
        tertiaryColor: '#ffffff'
      }
    })

    const renderChart = async () => {
      if (!chartRef.current) return

      try {
        setError(null)
        
        // Clear previous content
        chartRef.current.innerHTML = ''
        
        // Generate unique ID for the chart
        const chartId = `mermaid-chart-${index}-${Date.now()}`
        chartRef.current.id = chartId
        
        // Render the mermaid chart
        const { svg } = await mermaid.render(chartId, code)
        chartRef.current.innerHTML = svg
        
        setIsRendered(true)
      } catch (err) {
        console.error('Error rendering mermaid chart:', err)
        setError(err instanceof Error ? err.message : 'Failed to render chart')
        setIsRendered(false)
      }
    }

    renderChart()
  }, [code, index])

  if (error) {
    return (
      <Card className={`my-4 border-red-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <FileText className="h-4 w-4 text-red-600" />
            <Badge variant="outline" className="text-xs text-red-600 border-red-300">
              Flowchart {index + 1} (Error)
            </Badge>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to render flowchart: {error}
            </AlertDescription>
          </Alert>
          <div className="mt-3 p-3 bg-gray-50 rounded border">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
              {code}
            </pre>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`my-4 border-gray-200 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-3">
          <FileText className="h-4 w-4 text-gray-600" />
          <Badge variant="outline" className="text-xs">
            Flowchart {index + 1}
          </Badge>
        </div>
        <div className="flex justify-center">
          <div 
            ref={chartRef} 
            className={`mermaid-chart-container ${!isRendered ? 'min-h-[200px] flex items-center justify-center bg-gray-50 rounded' : ''}`}
          >
            {!isRendered && (
              <div className="text-gray-500 text-sm">
                Rendering chart...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
