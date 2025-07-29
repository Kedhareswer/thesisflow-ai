"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, BarChart3, AlertCircle } from "lucide-react"
import { MermaidChart } from "./mermaid-chart"

interface VisualContentRendererProps {
  content: string
  className?: string
}

export function VisualContentRenderer({ content, className = "" }: VisualContentRendererProps) {
  // Extract tables from markdown content
  const extractTables = (text: string) => {
    const tableRegex = /\|(.+)\|\n\|[\s\-:]+\|\n((?:\|.+\|\n?)+)/g
    const tables: string[] = []
    let match

    while ((match = tableRegex.exec(text)) !== null) {
      tables.push(match[0])
    }

    return tables
  }

  // Extract mermaid flowcharts from markdown content
  const extractFlowcharts = (text: string) => {
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g
    const flowcharts: string[] = []
    let match

    while ((match = mermaidRegex.exec(text)) !== null) {
      flowcharts.push(match[1])
    }

    return flowcharts
  }

  // Parse table string into structured data
  const parseTable = (tableString: string) => {
    const lines = tableString.trim().split('\n')
    if (lines.length < 3) return null

    const headers = lines[0].split('|').filter(cell => cell.trim()).map(cell => cell.trim())
    const data: string[][] = []

    // Skip header and separator lines, start from data rows
    for (let i = 2; i < lines.length; i++) {
      const cells = lines[i].split('|').filter(cell => cell.trim()).map(cell => cell.trim())
      if (cells.length > 0) {
        data.push(cells)
      }
    }

    return { headers, data }
  }

  // Render table as React component
  const renderTable = (tableString: string, index: number) => {
    const tableData = parseTable(tableString)
    if (!tableData) return null

    return (
      <Card key={`table-${index}`} className="my-4 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <BarChart3 className="h-4 w-4 text-gray-600" />
            <Badge variant="outline" className="text-xs">
              Table {index + 1}
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {tableData.headers.map((header, idx) => (
                    <TableHead key={idx} className="font-medium text-gray-900">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.data.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <TableCell key={cellIdx} className="text-sm">
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render flowchart as React component
  const renderFlowchart = (flowchartCode: string, index: number) => {
    return (
      <MermaidChart 
        key={`flowchart-${index}`}
        code={flowchartCode} 
        index={index} 
      />
    )
  }

  // Extract and render visual content
  const tables = extractTables(content)
  const flowcharts = extractFlowcharts(content)

  // Remove visual content from text content for display
  const textContent = content
    .replace(/\|(.+)\|\n\|[\s\-:]+\|\n((?:\|.+\|\n?)+)/g, '') // Remove tables
    .replace(/```mermaid\n([\s\S]*?)\n```/g, '') // Remove flowcharts
    .trim()

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Text Content */}
      {textContent && (
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
            {textContent}
          </div>
        </div>
      )}

      {/* Tables */}
      {tables.map((table, index) => renderTable(table, index))}

      {/* Flowcharts */}
      {flowcharts.map((flowchart, index) => renderFlowchart(flowchart, index))}

      {/* No Visual Content Alert */}
      {tables.length === 0 && flowcharts.length === 0 && content.includes('table') && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No structured tables or flowcharts were generated. The AI may have mentioned tables or flowcharts in the text but didn't create them in the proper format.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
} 