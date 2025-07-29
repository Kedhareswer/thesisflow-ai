"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Code } from "lucide-react"

interface MermaidChartProps {
  code: string
  index: number
  className?: string
}

export function MermaidChart({ code, index, className = "" }: MermaidChartProps) {
  return (
    <Card className={`my-4 border-gray-200 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Code className="h-4 w-4 text-gray-600" />
          <Badge variant="outline" className="text-xs">
            Flowchart {index + 1} (Code)
          </Badge>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Mermaid Flowchart Code:</span>
            <Badge variant="outline" className="text-xs text-gray-500">
              Code Only
            </Badge>
          </div>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-white p-3 rounded border overflow-x-auto">
            {code}
          </pre>
          <div className="mt-3 text-xs text-gray-500">
            <p>💡 This is the Mermaid flowchart code. You can copy this code and paste it into any Mermaid-compatible editor to visualize the chart.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
