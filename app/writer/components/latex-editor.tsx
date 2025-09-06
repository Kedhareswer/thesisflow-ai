"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Eye,
  Edit3,
  Maximize2,
  Minimize2,
  Type,
  AlignLeft,
  Bold,
  Italic,
  List,
  Link,
  ImageIcon,
  Code,
  Heading1,
  Quote,
  Table,
  Subscript,
  Superscript,
  Sigma,
  FileText,
  Users,
  Save,
  Download,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import katex from "katex"
import "katex/dist/katex.min.css"

interface LaTeXEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  onCollaboratorJoin?: (user: any) => void
  collaborators?: any[]
}

export function LaTeXEditor({ 
  value, 
  onChange, 
  className,
  onCollaboratorJoin,
  collaborators = []
}: LaTeXEditorProps) {
  const [viewMode, setViewMode] = useState<"split" | "edit" | "preview">("split")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [compiledHTML, setCompiledHTML] = useState("")
  const [compileError, setCompileError] = useState<string | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // Compile LaTeX to HTML with math rendering
  const compileLatex = useCallback((latex: string) => {
    try {
      // Basic LaTeX to HTML conversion
      let html = latex
      
      // Convert LaTeX document structure
      html = html.replace(/\\documentclass\{[^}]+\}/g, "")
      html = html.replace(/\\usepackage\{[^}]+\}/g, "")
      html = html.replace(/\\begin\{document\}/g, "")
      html = html.replace(/\\end\{document\}/g, "")
      
      // Convert sections and headings
      html = html.replace(/\\section\{([^}]+)\}/g, "<h1>$1</h1>")
      html = html.replace(/\\subsection\{([^}]+)\}/g, "<h2>$1</h2>")
      html = html.replace(/\\subsubsection\{([^}]+)\}/g, "<h3>$1</h3>")
      html = html.replace(/\\paragraph\{([^}]+)\}/g, "<h4>$1</h4>")
      
      // Convert text formatting
      html = html.replace(/\\textbf\{([^}]+)\}/g, "<strong>$1</strong>")
      html = html.replace(/\\textit\{([^}]+)\}/g, "<em>$1</em>")
      html = html.replace(/\\underline\{([^}]+)\}/g, "<u>$1</u>")
      html = html.replace(/\\texttt\{([^}]+)\}/g, "<code>$1</code>")
      
      // Convert lists
      html = html.replace(/\\begin\{itemize\}/g, "<ul>")
      html = html.replace(/\\end\{itemize\}/g, "</ul>")
      html = html.replace(/\\begin\{enumerate\}/g, "<ol>")
      html = html.replace(/\\end\{enumerate\}/g, "</ol>")
      html = html.replace(/\\item\s+/g, "<li>")
      
      // Convert quotes
      html = html.replace(/\\begin\{quote\}/g, "<blockquote>")
      html = html.replace(/\\end\{quote\}/g, "</blockquote>")
      
      // Convert citations
      html = html.replace(/\\cite\{([^}]+)\}/g, "<cite>[$1]</cite>")
      html = html.replace(/\\ref\{([^}]+)\}/g, "<ref>$1</ref>")
      html = html.replace(/\\label\{([^}]+)\}/g, "")
      
      // Convert line breaks and paragraphs
      html = html.replace(/\\\\/g, "<br/>")
      html = html.replace(/\\newpage/g, "<hr/>")
      html = html.replace(/\\par\s+/g, "</p><p>")
      
      // Handle math equations
      // Display math: $$ ... $$ or \[ ... \]
      html = html.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
        try {
          return `<div class="math-display">${katex.renderToString(math, { displayMode: true, throwOnError: false })}</div>`
        } catch {
          return `<div class="math-display math-error">${match}</div>`
        }
      })
      
      html = html.replace(/\\\[([^\]]+)\\\]/g, (match, math) => {
        try {
          return `<div class="math-display">${katex.renderToString(math, { displayMode: true, throwOnError: false })}</div>`
        } catch {
          return `<div class="math-display math-error">${match}</div>`
        }
      })
      
      // Inline math: $ ... $
      html = html.replace(/\$([^$]+)\$/g, (match, math) => {
        try {
          return `<span class="math-inline">${katex.renderToString(math, { displayMode: false, throwOnError: false })}</span>`
        } catch {
          return `<span class="math-inline math-error">${match}</span>`
        }
      })
      
      // Wrap in paragraphs
      const lines = html.split('\n').filter(line => line.trim())
      html = lines.map(line => {
        if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('<ol') || 
            line.startsWith('<blockquote') || line.startsWith('<div') || line.startsWith('<hr')) {
          return line
        }
        return `<p>${line}</p>`
      }).join('\n')
      
      setCompiledHTML(html)
      setCompileError(null)
    } catch (error) {
      setCompileError(`Compilation error: ${error}`)
      console.error("LaTeX compilation error:", error)
    }
  }, [])

  // Compile LaTeX whenever value changes
  useEffect(() => {
    compileLatex(value)
  }, [value, compileLatex])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const insertLatex = useCallback((command: string, placeholder = "") => {
    if (!editorRef.current) return
    
    const textarea = editorRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end) || placeholder
    
    let insertion = ""
    
    switch (command) {
      case "bold":
        insertion = `\\textbf{${selectedText}}`
        break
      case "italic":
        insertion = `\\textit{${selectedText}}`
        break
      case "section":
        insertion = `\\section{${selectedText || "Section Title"}}`
        break
      case "subsection":
        insertion = `\\subsection{${selectedText || "Subsection Title"}}`
        break
      case "itemize":
        insertion = `\\begin{itemize}\n\\item ${selectedText || "First item"}\n\\item Second item\n\\end{itemize}`
        break
      case "enumerate":
        insertion = `\\begin{enumerate}\n\\item ${selectedText || "First item"}\n\\item Second item\n\\end{enumerate}`
        break
      case "equation":
        insertion = `$$\n${selectedText || "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"}\n$$`
        break
      case "inline-math":
        insertion = `$${selectedText || "x^2 + y^2 = z^2"}$`
        break
      case "table":
        insertion = `\\begin{tabular}{|c|c|c|}
\\hline
Header 1 & Header 2 & Header 3 \\\\
\\hline
Cell 1 & Cell 2 & Cell 3 \\\\
\\hline
\\end{tabular}`
        break
      case "citation":
        insertion = `\\cite{${selectedText || "reference"}}`
        break
      case "figure":
        insertion = `\\begin{figure}[h]
\\centering
\\includegraphics[width=0.8\\textwidth]{${selectedText || "image.png"}}
\\caption{${selectedText || "Figure caption"}}
\\label{fig:${selectedText || "label"}}
\\end{figure}`
        break
      case "code":
        insertion = `\\begin{verbatim}\n${selectedText || "code here"}\n\\end{verbatim}`
        break
      case "quote":
        insertion = `\\begin{quote}\n${selectedText || "Quote text"}\n\\end{quote}`
        break
    }
    
    const newValue = value.substring(0, start) + insertion + value.substring(end)
    onChange(newValue)
    
    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + insertion.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
    
    toast({
      title: "LaTeX inserted",
      description: `${command} formatting added to document.`,
    })
  }, [value, onChange, toast])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editorRef.current || document.activeElement !== editorRef.current) return
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault()
            insertLatex("bold")
            break
          case 'i':
            e.preventDefault()
            insertLatex("italic")
            break
          case 'm':
            e.preventDefault()
            insertLatex("inline-math")
            break
          case 'e':
            if (e.shiftKey) {
              e.preventDefault()
              insertLatex("equation")
            }
            break
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [insertLatex])

  return (
    <div
      className={`${className} bg-white rounded-lg border border-gray-200 overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      }`}
    >
      {/* Enhanced LaTeX Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* View Mode Selector */}
            <div className="flex items-center bg-white border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode("edit")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "edit" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Edit3 className="h-4 w-4 mr-1.5 inline" />
                Edit
              </button>
              <button
                onClick={() => setViewMode("split")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "split"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <AlignLeft className="h-4 w-4 mr-1.5 inline" />
                Split
              </button>
              <button
                onClick={() => setViewMode("preview")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "preview"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Eye className="h-4 w-4 mr-1.5 inline" />
                Preview
              </button>
            </div>

            {/* LaTeX Quick Format Buttons */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertLatex("bold")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Bold (Ctrl+B)"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertLatex("italic")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Italic (Ctrl+I)"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertLatex("section")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Section"
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertLatex("itemize")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertLatex("table")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Table"
              >
                <Table className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertLatex("inline-math")}
                className="h-8 px-2 hover:bg-gray-200"
                title="Inline Math (Ctrl+M)"
              >
                <Sigma className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertLatex("equation")}
                className="h-8 px-2 hover:bg-gray-200"
                title="Display Equation (Ctrl+Shift+E)"
              >
                <span className="text-xs font-mono">$$</span>
              </Button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertLatex("citation")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Citation"
              >
                <Quote className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertLatex("figure")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Figure"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertLatex("code")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Code Block"
              >
                <Code className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Collaborators */}
            {collaborators.length > 0 && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <div className="flex -space-x-2">
                  {collaborators.slice(0, 3).map((user, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium border-2 border-white"
                      title={user.name}
                    >
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {collaborators.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-medium border-2 border-white">
                      +{collaborators.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Word Count Badge */}
            <Badge variant="outline" className="bg-white text-gray-600 border-gray-300">
              <Type className="h-3 w-3 mr-1" />
              {value.split(/\s+/).filter(word => word.length > 0).length} words
            </Badge>

            {/* Compilation Status */}
            {compileError ? (
              <Badge variant="destructive" className="text-xs">
                Compilation Error
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <FileText className="h-3 w-3 mr-1" />
                LaTeX Ready
              </Badge>
            )}

            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0 hover:bg-gray-200"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className={`${isFullscreen ? "h-[calc(100vh-73px)]" : "h-[600px]"}`}>
        {viewMode === "split" && (
          <div className="grid grid-cols-2 h-full">
            {/* LaTeX Editor Panel */}
            <div className="border-r border-gray-200 bg-white">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 flex items-center">
                  <Edit3 className="h-4 w-4 mr-2" />
                  LaTeX Editor
                </h3>
              </div>
              <div className="h-[calc(100%-41px)] p-4">
                <Textarea
                  ref={editorRef}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full h-full font-mono text-sm resize-none border-none focus:ring-0 focus:outline-none"
                  placeholder="% Start writing your LaTeX document here...\n\documentclass{article}\n\begin{document}\n\n\section{Introduction}\nYour content here...\n\n\end{document}"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Preview Panel */}
            <div className="bg-white">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </h3>
              </div>
              <div className="h-[calc(100%-41px)] overflow-auto p-6">
                {compileError ? (
                  <div className="text-red-600 p-4 bg-red-50 rounded-lg">
                    <p className="font-semibold mb-2">Compilation Error</p>
                    <p className="text-sm">{compileError}</p>
                  </div>
                ) : (
                  <div 
                    className="prose prose-lg max-w-none latex-preview"
                    dangerouslySetInnerHTML={{ __html: compiledHTML || "<p><em>Start writing your LaTeX document...</em></p>" }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === "edit" && (
          <div className="h-full p-4 bg-white">
            <Textarea
              ref={editorRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-full font-mono text-sm resize-none border-none focus:ring-0 focus:outline-none"
              placeholder="% Start writing your LaTeX document here...\n\documentclass{article}\n\begin{document}\n\n\section{Introduction}\nYour content here...\n\n\end{document}"
              spellCheck={false}
            />
          </div>
        )}

        {viewMode === "preview" && (
          <div className="h-full overflow-auto p-8 bg-white">
            <div className="max-w-4xl mx-auto">
              {compileError ? (
                <div className="text-red-600 p-4 bg-red-50 rounded-lg">
                  <p className="font-semibold mb-2">Compilation Error</p>
                  <p className="text-sm">{compileError}</p>
                </div>
              ) : (
                <div 
                  className="prose prose-lg max-w-none latex-preview"
                  dangerouslySetInnerHTML={{ __html: compiledHTML || "<p><em>Start writing your LaTeX document...</em></p>" }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Mode: {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</span>
            <span>•</span>
            <span>Lines: {value.split("\n").length}</span>
            <span>•</span>
            <span>Characters: {value.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>LaTeX Document</span>
            {!compileError && <div className="w-2 h-2 bg-green-500 rounded-full" title="Compiled Successfully" />}
            {compileError && <div className="w-2 h-2 bg-red-500 rounded-full" title="Compilation Error" />}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .latex-preview h1 {
          font-size: 2rem;
          font-weight: bold;
          margin: 1.5rem 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e5e5;
        }
        .latex-preview h2 {
          font-size: 1.5rem;
          font-weight: semibold;
          margin: 1.25rem 0 0.75rem;
        }
        .latex-preview h3 {
          font-size: 1.25rem;
          font-weight: semibold;
          margin: 1rem 0 0.5rem;
        }
        .latex-preview h4 {
          font-size: 1.1rem;
          font-weight: semibold;
          margin: 0.75rem 0 0.5rem;
        }
        .latex-preview p {
          margin: 0.75rem 0;
          line-height: 1.6;
        }
        .latex-preview ul, .latex-preview ol {
          margin: 0.75rem 0 0.75rem 1.5rem;
        }
        .latex-preview li {
          margin: 0.25rem 0;
        }
        .latex-preview blockquote {
          margin: 1rem 0;
          padding: 0.5rem 1rem;
          border-left: 4px solid #e5e5e5;
          background: #f9f9f9;
          font-style: italic;
        }
        .latex-preview code {
          background: #f4f4f4;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875em;
        }
        .latex-preview .math-display {
          margin: 1rem 0;
          text-align: center;
          overflow-x: auto;
        }
        .latex-preview .math-inline {
          display: inline-block;
          margin: 0 0.125rem;
        }
        .latex-preview .math-error {
          color: #dc2626;
          background: #fee2e2;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
        }
        .latex-preview cite {
          color: #3b82f6;
          font-style: normal;
        }
        .latex-preview hr {
          margin: 2rem 0;
          border: none;
          border-top: 1px solid #e5e5e5;
        }
      `}</style>
    </div>
  )
}

export default LaTeXEditor
