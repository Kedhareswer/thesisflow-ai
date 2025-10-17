"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"

interface PreviewRendererProps {
  content: string
  title: string
  template?: string
  className?: string
}

export function PreviewRenderer({ content, title, template = "ieee", className }: PreviewRendererProps) {
  const [isRendering, setIsRendering] = useState(false)
  const [renderedHtml, setRenderedHtml] = useState("")
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const renderPreview = async () => {
      setIsRendering(true)
      try {
        // Convert LaTeX/Markdown to HTML preview
        // For now, we'll do a simple conversion - in production, you'd use a proper LaTeX/Markdown parser
        let html = content
          // LaTeX section commands
          .replace(/\\section\{([^}]+)\}/g, '<h2 class="text-2xl font-bold mt-6 mb-3">$1</h2>')
          .replace(/\\subsection\{([^}]+)\}/g, '<h3 class="text-xl font-semibold mt-4 mb-2">$1</h3>')
          .replace(/\\subsubsection\{([^}]+)\}/g, '<h4 class="text-lg font-medium mt-3 mb-2">$1</h4>')
          // LaTeX formatting
          .replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
          .replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>')
          .replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>')
          .replace(/\\texttt\{([^}]+)\}/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
          // LaTeX lists
          .replace(/\\begin\{itemize\}/g, '<ul class="list-disc ml-6 my-3 space-y-1">')
          .replace(/\\end\{itemize\}/g, '</ul>')
          .replace(/\\begin\{enumerate\}/g, '<ol class="list-decimal ml-6 my-3 space-y-1">')
          .replace(/\\end\{enumerate\}/g, '</ol>')
          .replace(/\\item\s*/g, '<li>')
          // LaTeX equations (inline and display)
          .replace(/\$\$([^$]+)\$\$/g, '<div class="my-4 p-3 bg-gray-50 rounded text-center font-mono text-sm">$1</div>')
          .replace(/\$([^$]+)\$/g, '<span class="font-mono text-sm">$1</span>')
          // LaTeX citations
          .replace(/\\cite\{([^}]+)\}/g, '<sup class="text-blue-600">[<a href="#ref-$1">$1</a>]</sup>')
          // LaTeX quotes
          .replace(/``([^']+)''/g, '"$1"')
          .replace(/`([^']+)'/g, "'$1'")
          // Paragraphs (double newline)
          .replace(/\n\n+/g, '</p><p class="mb-3">')
          // Single newlines to <br>
          .replace(/\n/g, '<br />')

        // Wrap in paragraph tags
        html = `<p class="mb-3">${html}</p>`

        // Add template-specific styling
        const templateStyles = getTemplateStyles(template)

        setRenderedHtml(`
          <div class="${templateStyles}">
            <h1 class="text-4xl font-bold mb-2 text-gray-900">${title}</h1>
            <div class="text-sm text-gray-600 mb-6">Preview Mode</div>
            <div class="prose max-w-none">
              ${html}
            </div>
          </div>
        `)
      } catch (error) {
        console.error("Error rendering preview:", error)
        setRenderedHtml(`<p class="text-red-500">Error rendering preview</p>`)
      } finally {
        setIsRendering(false)
      }
    }

    // Debounce rendering
    const timer = setTimeout(renderPreview, 300)
    return () => clearTimeout(timer)
  }, [content, title, template])

  const getTemplateStyles = (tpl: string): string => {
    const baseStyles = "p-8 bg-white min-h-full"
    switch (tpl) {
      case 'ieee':
        return `${baseStyles} font-serif text-justify`
      case 'acm':
        return `${baseStyles} font-sans text-justify`
      case 'elsevier':
        return `${baseStyles} font-serif`
      case 'springer':
        return `${baseStyles} font-sans`
      default:
        return `${baseStyles} font-serif`
    }
  }

  if (isRendering) {
    return (
      <div className={`flex items-center justify-center h-full bg-white ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-gray-600">Rendering preview...</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className={`h-full ${className}`}>
      <div
        ref={previewRef}
        className="preview-content"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
        style={{
          lineHeight: '1.6',
          color: '#1a1a1a',
        }}
      />
    </ScrollArea>
  )
}
