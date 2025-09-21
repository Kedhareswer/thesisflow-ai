"use client"

import React, { useEffect, useId, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Circle, AlertCircle, Info, Lightbulb, Target, BookOpen, Zap } from 'lucide-react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Lightweight Mermaid renderer without adding a package dependency.
  // Loads Mermaid UMD from CDN at runtime and renders diagrams to SVG.
  const MermaidBlock: React.FC<{ code: string }> = ({ code }) => {
    const ref = useRef<HTMLDivElement>(null)
    const reactId = useId()
    const domId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`

    useEffect(() => {
      let cancelled = false
      const ensureMermaid = () => new Promise<void>((resolve, reject) => {
        const w = window as any
        if (w.mermaid) return resolve()
        const scriptId = 'mermaid-umd-cdn'
        let s = document.getElementById(scriptId) as HTMLScriptElement | null
        if (!s) {
          s = document.createElement('script')
          s.id = scriptId
          s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js'
          s.async = true
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('Failed to load Mermaid'))
          document.head.appendChild(s)
        } else {
          s.onload ? s.onload(null as any) : resolve()
        }
      })

      const render = async () => {
        try {
          await ensureMermaid()
          const w = window as any
          if (!w.mermaid?.initialize) return
          w.mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })
          if (cancelled || !ref.current) return
          const { svg } = await w.mermaid.render(domId, code)
          if (!cancelled && ref.current) ref.current.innerHTML = svg
        } catch {
          // Fail silently; fallback is raw code block elsewhere
        }
      }
      render()
      return () => { cancelled = true }
    }, [code, domId])

    return <div ref={ref} className="my-6 overflow-x-auto" aria-label="Mermaid Diagram" />
  }

  // Parse markdown content and render as HTML with enhanced styling
  const parseMarkdown = (text: string): React.ReactElement => {
    if (!text) return <></>

    // Split content into lines for processing
    const lines = text.split('\n')
    const elements: React.ReactElement[] = []
    let keyCounter = 0
    let inList = false
    let listItems: React.ReactElement[] = []
    let listType: 'bullet' | 'numbered' = 'bullet'

    const getNextKey = () => `md-${keyCounter++}`

    const flushList = () => {
      if (listItems.length > 0) {
        if (listType === 'numbered') {
          elements.push(
            <ol key={getNextKey()} className="list-decimal list-inside space-y-1 mb-4 ml-4">
              {listItems}
            </ol>
          )
        } else {
          elements.push(
            <ul key={getNextKey()} className="list-disc list-inside space-y-1 mb-4 ml-4">
              {listItems}
            </ul>
          )
        }
        listItems = []
        inList = false
      }
    }

    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()
      
      // Handle tables
      if (line.includes('|') && line.split('|').length >= 3) {
        flushList()
        const tableElements = parseTable(lines, i, getNextKey)
        elements.push(...tableElements.elements)
        i = tableElements.nextIndex
        continue
      }
      
      // Handle headers with enhanced styling
      if (line.startsWith('#')) {
        flushList()
        const level = line.match(/^#+/)?.[0].length || 1
        const headerText = line.replace(/^#+\s*/, '')
        const headerLevel = Math.min(level, 6)
        
        if (headerLevel === 1) {
          elements.push(
            <div key={getNextKey()} className="mb-6 mt-6">
              <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-500" />
                {headerText}
              </h1>
              <Separator className="mb-4" />
            </div>
          )
        } else if (headerLevel === 2) {
          elements.push(
            <h2 key={getNextKey()} className="text-xl font-bold text-foreground mt-6 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              {headerText}
            </h2>
          )
        } else if (headerLevel === 3) {
          elements.push(
            <h3 key={getNextKey()} className="text-lg font-semibold text-foreground mt-4 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              {headerText}
            </h3>
          )
        } else {
          elements.push(
            <h4 key={getNextKey()} className="text-base font-semibold text-foreground mt-4 mb-2">
              {headerText}
            </h4>
          )
        }
      }
      // Handle enhanced bullet points
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        const text = line.slice(2)
        if (!inList || listType !== 'bullet') {
          flushList()
          inList = true
          listType = 'bullet'
        }
        
        // Check for special markers
        let icon = <Circle className="w-3 h-3 text-muted-foreground inline mr-2" />
        let itemClass = "text-foreground"
        
        if (text.toLowerCase().includes('✅') || text.toLowerCase().includes('completed') || text.toLowerCase().includes('done')) {
          icon = <CheckCircle className="w-3 h-3 text-green-500 inline mr-2" />
          itemClass = "text-green-700 dark:text-green-300"
        } else if (text.toLowerCase().includes('❗') || text.toLowerCase().includes('important') || text.toLowerCase().includes('critical')) {
          icon = <AlertCircle className="w-3 h-3 text-red-500 inline mr-2" />
          itemClass = "text-red-700 dark:text-red-300 font-medium"
        } else if (text.toLowerCase().includes('💡') || text.toLowerCase().includes('tip') || text.toLowerCase().includes('suggestion')) {
          icon = <Lightbulb className="w-3 h-3 text-yellow-500 inline mr-2" />
          itemClass = "text-yellow-700 dark:text-yellow-300"
        } else if (text.toLowerCase().includes('ℹ️') || text.toLowerCase().includes('note') || text.toLowerCase().includes('info')) {
          icon = <Info className="w-3 h-3 text-blue-500 inline mr-2" />
          itemClass = "text-blue-700 dark:text-blue-300"
        }
        
        listItems.push(
          <li key={getNextKey()} className={cn("flex items-start gap-1", itemClass)}>
            {icon}
            <span className="flex-1">{text}</span>
          </li>
        )
      }
      // Handle numbered lists
      else if (/^\d+\.\s/.test(line)) {
        const text = line.replace(/^\d+\.\s/, '')
        if (!inList || listType !== 'numbered') {
          flushList()
          inList = true
          listType = 'numbered'
        }
        
        listItems.push(
          <li key={getNextKey()} className="text-foreground">
            {text}
          </li>
        )
      }
      // Handle code blocks with enhanced styling
      else if (line.startsWith('```')) {
        flushList()
        const codeElements = parseCodeBlock(lines, i, getNextKey)
        elements.push(...codeElements.elements)
        i = codeElements.nextIndex
        continue
      }
      // Handle inline formatting (bold, italic, code)
      else if (line.includes('**') || line.includes('*') || line.includes('`')) {
        flushList()
        const formattedContent = parseInlineFormatting(line, i)
        elements.push(
          <p key={getNextKey()} className="mb-3 text-foreground leading-relaxed">
            {formattedContent}
          </p>
        )
      }
      // Handle regular paragraphs with better spacing
      else if (line) {
        flushList()
        elements.push(
          <p key={getNextKey()} className="mb-3 text-foreground leading-relaxed">
            {line}
          </p>
        )
      }
      // Handle empty lines
      else {
        if (!inList) {
          elements.push(<div key={getNextKey()} className="h-2" />)
        }
      }
      
      i++
    }
    
    // Flush any remaining list items
    flushList()

    return <>{elements}</>
  }

  // Enhanced inline formatting parser
  const parseInlineFormatting = (text: string, lineIndex: number): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    let current = ''
    let i = 0
    
    while (i < text.length) {
      // Handle code spans
      if (text[i] === '`') {
        if (current) {
          parts.push(current)
          current = ''
        }
        
        let j = i + 1
        while (j < text.length && text[j] !== '`') {
          j++
        }
        
        if (j < text.length) {
          const codeText = text.slice(i + 1, j)
          parts.push(
            <code key={`code-${lineIndex}-${i}`} className="bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded text-sm font-mono border">
              {codeText}
            </code>
          )
          i = j + 1
        } else {
          current += text[i]
          i++
        }
      }
      // Handle bold text
      else if (text.slice(i, i + 2) === '**') {
        if (current) {
          parts.push(current)
          current = ''
        }
        
        let j = i + 2
        while (j < text.length - 1 && text.slice(j, j + 2) !== '**') {
          j++
        }
        
        if (j < text.length - 1) {
          const boldText = text.slice(i + 2, j)
          parts.push(
            <strong key={`bold-${lineIndex}-${i}`} className="font-semibold text-foreground">
              {boldText}
            </strong>
          )
          i = j + 2
        } else {
          current += text[i]
          i++
        }
      }
      // Handle italic text
      else if (text[i] === '*' && text[i + 1] !== '*') {
        if (current) {
          parts.push(current)
          current = ''
        }
        
        let j = i + 1
        while (j < text.length && text[j] !== '*') {
          j++
        }
        
        if (j < text.length) {
          const italicText = text.slice(i + 1, j)
          parts.push(
            <em key={`italic-${lineIndex}-${i}`} className="italic text-foreground/90">
              {italicText}
            </em>
          )
          i = j + 1
        } else {
          current += text[i]
          i++
        }
      }
      else {
        current += text[i]
        i++
      }
    }
    
    if (current) {
      parts.push(current)
    }
    
    return parts
  }

  // Enhanced table parser with better styling
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

    // Create enhanced table with Card wrapper
    const tableElement = (
      <Card key={getNextKey()} className="my-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {tableRows.length > 0 && (
                  <tr className="border-b bg-muted/50">
                    {tableRows[0].map((cell, cellIndex) => (
                      <th key={`table-header-${startIndex}-${cellIndex}`} className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        {cell}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {tableRows.slice(1).map((row, rowIndex) => (
                  <tr key={`table-row-${startIndex}-${rowIndex}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    {row.map((cell, cellIndex) => (
                      <td key={`table-cell-${startIndex}-${rowIndex}-${cellIndex}`} className="px-4 py-3 text-sm text-foreground">
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
    )

    return { elements: [tableElement], nextIndex: i }
  }

  // Enhanced code block parser with language detection and better styling
  const parseCodeBlock = (lines: string[], startIndex: number, getNextKey: () => string): { elements: React.ReactElement[], nextIndex: number } => {
    const elements: React.ReactElement[] = []
    let i = startIndex + 1
    const codeLines: string[] = []
    
    // Extract language from opening line
    const openingLine = lines[startIndex].trim()
    const language = openingLine.slice(3).trim() || 'text'

    // Collect code lines until closing ```
    while (i < lines.length) {
      if (lines[i].trim() === '```') {
        break
      }
      codeLines.push(lines[i])
      i++
    }

    const code = codeLines.join('\n')

    if (language.toLowerCase() === 'mermaid') {
      const el = (
        <Card key={getNextKey()} className="my-6 overflow-hidden">
          <div className="bg-muted/30 px-4 py-2 border-b flex items-center justify-between">
            <Badge variant="secondary" className="text-xs font-mono">mermaid</Badge>
          </div>
          <CardContent className="p-0">
            <MermaidBlock code={code} />
          </CardContent>
        </Card>
      )
      return { elements: [el], nextIndex: i + 1 }
    }

    const codeElement = (
      <Card key={getNextKey()} className="my-6 overflow-hidden">
        <div className="bg-muted/30 px-4 py-2 border-b flex items-center justify-between">
          <Badge variant="secondary" className="text-xs font-mono">
            {language}
          </Badge>
        </div>
        <CardContent className="p-0">
          <pre className="p-4 overflow-x-auto bg-muted/20">
            <code className="text-sm font-mono text-foreground leading-relaxed">
              {code}
            </code>
          </pre>
        </CardContent>
      </Card>
    )

    return { elements: [codeElement], nextIndex: i + 1 }
  }

  return (
    <div className={cn("max-w-none space-y-1", className)}>
      {parseMarkdown(content)}
    </div>
  )
}
