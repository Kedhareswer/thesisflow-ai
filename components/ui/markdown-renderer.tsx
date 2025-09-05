"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Parse markdown content and render as HTML
  const parseMarkdown = (text: string): React.ReactElement => {
    if (!text) return <></>

    // Split content into lines for processing
    const lines = text.split('\n')
    const elements: React.ReactElement[] = []
    let keyCounter = 0

    const getNextKey = () => `md-${keyCounter++}`

    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()
      
      // Handle tables
      if (line.includes('|') && line.split('|').length >= 3) {
        const tableElements = parseTable(lines, i, getNextKey)
        elements.push(...tableElements.elements)
        i = tableElements.nextIndex
        continue
      }
      
      // Handle headers
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 1
        const headerText = line.replace(/^#+\s*/, '')
        const headerLevel = Math.min(level, 6)
        
        if (headerLevel === 1) {
          elements.push(
            <h1 key={getNextKey()} className={cn("font-bold text-foreground mt-4 mb-2 text-xl")}>
              {headerText}
            </h1>
          )
        } else if (headerLevel === 2) {
          elements.push(
            <h2 key={getNextKey()} className={cn("font-bold text-foreground mt-4 mb-2 text-lg")}>
              {headerText}
            </h2>
          )
        } else if (headerLevel === 3) {
          elements.push(
            <h3 key={getNextKey()} className={cn("font-bold text-foreground mt-4 mb-2 text-base")}>
              {headerText}
            </h3>
          )
        } else {
          elements.push(
            <h4 key={getNextKey()} className={cn("font-bold text-foreground mt-4 mb-2 text-base")}>
              {headerText}
            </h4>
          )
        }
      }
      // Handle bold text
      else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
        const text = line.slice(2, -2)
        elements.push(
          <p key={getNextKey()} className="font-bold text-foreground mb-2">
            {text}
          </p>
        )
      }
      // Handle bullet points
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        const text = line.slice(2)
        elements.push(
          <li key={getNextKey()} className="ml-4 mb-1 text-foreground">
            {text}
          </li>
        )
      }
      // Handle numbered lists
      else if (/^\d+\.\s/.test(line)) {
        const text = line.replace(/^\d+\.\s/, '')
        elements.push(
          <li key={getNextKey()} className="ml-4 mb-1 text-foreground list-decimal">
            {text}
          </li>
        )
      }
      // Handle code blocks
      else if (line.startsWith('```')) {
        const codeElements = parseCodeBlock(lines, i, getNextKey)
        elements.push(...codeElements.elements)
        i = codeElements.nextIndex
        continue
      }
      // Handle inline code
      else if (line.includes('`')) {
        const parts = line.split('`')
        const processedParts = parts.map((part, index) => {
          if (index % 2 === 1) {
            return (
              <code key={`inline-code-${i}-${index}`} className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                {part}
              </code>
            )
          }
          return part
        })
        elements.push(
          <p key={getNextKey()} className="mb-2 text-foreground">
            {processedParts}
          </p>
        )
      }
      // Handle regular paragraphs
      else if (line) {
        elements.push(
          <p key={getNextKey()} className="mb-2 text-foreground">
            {line}
          </p>
        )
      }
      // Handle empty lines
      else {
        elements.push(<br key={getNextKey()} />)
      }
      
      i++
    }

    return <>{elements}</>
  }

  // Parse table from markdown
  const parseTable = (lines: string[], startIndex: number, getNextKey: () => string): { elements: React.ReactElement[], nextIndex: number } => {
    const elements: React.ReactElement[] = []
    const tableRows: string[][] = []
    let i = startIndex

    // Collect table rows
    while (i < lines.length) {
      const line = lines[i].trim()
      if (!line.includes('|') || line.split('|').length < 3) {
        break
      }
      
      // Skip separator rows (like | --- | --- |)
      if (line.includes('---')) {
        i++
        continue
      }
      
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell)
      if (cells.length > 0) {
        tableRows.push(cells)
      }
      i++
    }

    if (tableRows.length === 0) {
      return { elements: [], nextIndex: i }
    }

    // Create table
    const tableElement = (
      <div key={getNextKey()} className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-border rounded-lg">
          <tbody>
            {tableRows.map((row, rowIndex) => (
              <tr key={`table-row-${startIndex}-${rowIndex}`} className={cn(
                "border-b border-border",
                rowIndex === 0 && "bg-muted/50 font-semibold"
              )}>
                {row.map((cell, cellIndex) => (
                  <td key={`table-cell-${startIndex}-${rowIndex}-${cellIndex}`} className="border-r border-border px-3 py-2 text-sm">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )

    return { elements: [tableElement], nextIndex: i }
  }

  // Parse code blocks
  const parseCodeBlock = (lines: string[], startIndex: number, getNextKey: () => string): { elements: React.ReactElement[], nextIndex: number } => {
    const elements: React.ReactElement[] = []
    let i = startIndex + 1
    const codeLines: string[] = []

    // Collect code lines until closing ```
    while (i < lines.length) {
      if (lines[i].trim() === '```') {
        break
      }
      codeLines.push(lines[i])
      i++
    }

    const codeElement = (
      <pre key={getNextKey()} className="bg-muted p-4 rounded-lg overflow-x-auto my-4">
        <code className="text-sm font-mono">
          {codeLines.join('\n')}
        </code>
      </pre>
    )

    return { elements: [codeElement], nextIndex: i + 1 }
  }

  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      {parseMarkdown(content)}
    </div>
  )
}
