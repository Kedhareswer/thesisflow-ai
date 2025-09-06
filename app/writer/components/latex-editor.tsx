"use client"

import type React from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu"
import { useResearchSession } from "@/components/research-session-provider"
import { searchSemanticScholar, getCitationData } from "@/app/explorer/semantic-scholar"
import { Input } from "@/components/ui/input"

interface LaTeXEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  onCollaboratorJoin?: (user: any) => void
  collaborators?: any[]
  template?: string
  onTemplateChange?: (tpl: string) => void
}

export function LaTeXEditor({ 
  value, 
  onChange, 
  className,
  onCollaboratorJoin,
  collaborators = [],
  template: templateProp = "ieee",
  onTemplateChange,
}: LaTeXEditorProps) {
  const [viewMode, setViewMode] = useState<"split" | "edit" | "preview">("split")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [compiledHTML, setCompiledHTML] = useState("")
  const [compileError, setCompileError] = useState<string | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const { getSelectedPapers } = useResearchSession()
  const [template, setTemplate] = useState<string>(templateProp)

  useEffect(() => setTemplate(templateProp), [templateProp])
  useEffect(() => { if (onTemplateChange) onTemplateChange(template) }, [template, onTemplateChange])

  // Context menu state for inline citations
  const [isCiteDialogOpen, setIsCiteDialogOpen] = useState(false)
  const [selectedLineRange, setSelectedLineRange] = useState<{start: number; end: number} | null>(null)
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([])
  const [perLineMode, setPerLineMode] = useState<boolean>(true)
  const [advancedCiteMapping, setAdvancedCiteMapping] = useState(false)
  const [lineMappings, setLineMappings] = useState<Record<number, string[]>>({})
  const [isRefDialogOpen, setIsRefDialogOpen] = useState(false)
  const [refToInsert, setRefToInsert] = useState<string>("")
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false)
  const [labelType, setLabelType] = useState<'eq'|'fig'|'tab'|'sec'>('eq')
  const [labelText, setLabelText] = useState('')
  // Cite by DOI/Title
  const [isCiteLookupOpen, setIsCiteLookupOpen] = useState(false)
  const [citeQuery, setCiteQuery] = useState("")
  const [citeQueryType, setCiteQueryType] = useState<'doi'|'title'>('doi')
  const [citeLookupLoading, setCiteLookupLoading] = useState(false)
  const [citeLookupResult, setCiteLookupResult] = useState<any | null>(null)

  // Simple cite completion overlay (Ctrl+Space when inside \cite{ )
  const [citeCompletionOpen, setCiteCompletionOpen] = useState(false)
  const [citeCompletionOptions, setCiteCompletionOptions] = useState<string[]>([])

  // Format bibliography item based on template
  const formatBibItem = useCallback((tpl: string, n: number, paper: any) => {
    const authors = Array.isArray(paper.authors)
      ? paper.authors.map((a: any) => (typeof a === 'string' ? a : a?.name || '')).filter(Boolean).join(', ')
      : ''
    const title = paper.title || 'Untitled'
    const journal = paper.journal?.title || paper.journal || paper.venue || ''
    const year = paper.year || paper.publication_year || ''
    const doi = paper.doi ? ` doi: ${paper.doi}.` : ''
    const url = paper.url ? ` URL: ${paper.url}.` : ''
    if (tpl === 'ieee' || tpl === 'elsevier' || tpl === 'springer' || tpl === 'acm') {
      return `\\bibitem{ref${n}} ${authors}, "${title}," ${journal ? `\\textit{${journal}}, ` : ''}${year}.${doi}`
    }
    // default/author-year minimal fallback
    return `\\bibitem{ref${n}} ${authors} (${year}). ${title}.${journal ? ` ${journal}.` : ''}${doi || url}`
  }, [])

  // Collect reference keys from document
  const collectRefKeys = useCallback(() => {
    return Array.from(new Set((value.match(/\\bibitem\{(ref\d+)\}/g) || []).map(m => (m.match(/ref\d+/) || [''])[0]))).filter(Boolean)
  }, [value])

  // Collect labels from document
  const collectLabels = useCallback(() => {
    return Array.from(new Set((value.match(/\\label\{([^}]+)\}/g) || []).map(m => (m.match(/\{([^}]+)\}/)?.[1] || '')))).filter(Boolean)
  }, [value])

  // Handle textarea key events
  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Open cite completion with Ctrl+Space when inside \cite{
    if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
      const ta = editorRef.current
      if (!ta) return
      const pos = ta.selectionStart
      const before = value.slice(0, pos)
      const citeStart = before.lastIndexOf('\\cite{')
      if (citeStart !== -1 && before.indexOf('}', citeStart) === -1) {
        setCiteCompletionOptions(collectRefKeys())
        setCiteCompletionOpen(true)
        e.preventDefault()
      }
    }
    if (e.key === 'Escape' && citeCompletionOpen) {
      setCiteCompletionOpen(false)
    }
  }, [value, collectRefKeys, citeCompletionOpen])

  // Insert a single reference (used by Cite by DOI/Title and cite completion)
  const insertSingleReference = useCallback((paper: any, citeInPlace = true, addBib = true) => {
    if (!editorRef.current) return
    // compute next refN
    const refRegex = /\\bibitem\{ref(\d+)\}/g
    const existing = Array.from(value.matchAll(refRegex)).map(m => parseInt(m[1], 10))
    const nextIndex = existing.length > 0 ? Math.max(...existing) + 1 : 1
    const k = `ref${nextIndex}`
    const bibItem = formatBibItem(template, nextIndex, paper) + '\n'

    // ensure bibliography exists and append (optional)
    let newValue = value
    if (addBib) {
      if (/\\begin\{thebibliography\}/.test(newValue)) {
        newValue = newValue.replace(/\\end\{thebibliography\}/, `${bibItem}\\end{thebibliography}`)
      } else {
        newValue += `\n\n\\section*{References}\n\\begin{thebibliography}{99}\n${bibItem}\\end{thebibliography}`
      }
    }

    // optionally insert cite key at caret inside \cite{...}
    if (citeInPlace) {
      const ta = editorRef.current
      const pos = ta.selectionStart
      const before = newValue.slice(0, pos)
      const after = newValue.slice(pos)
      const citeStart = before.lastIndexOf('\\cite{')
      if (citeStart !== -1 && before.indexOf('}', citeStart) === -1) {
        // inside braces, insert with comma if needed
        const closePos = newValue.indexOf('}', citeStart)
        const inside = newValue.slice(citeStart + 6, closePos)
        const prefix = inside.trim() ? inside.trim() + ',' : ''
        newValue = newValue.slice(0, citeStart + 6) + prefix + k + newValue.slice(closePos)
        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(citeStart + 6 + (prefix ? prefix.length : 0) + k.length, citeStart + 6 + (prefix ? prefix.length : 0) + k.length)
        }, 0)
      } else {
        // insert cite at caret
        const citeText = `\\cite{${k}}`
        newValue = before + citeText + after
        setTimeout(() => {
          ta.focus();
          const newPos = pos + citeText.length
          ta.setSelectionRange(newPos, newPos)
        }, 0)
      }
    }

    onChange(newValue)
    toast({ title: 'Citation inserted', description: `Added ${k} and updated References.` })
  }, [value, formatBibItem, template, onChange, toast])

  // Listen for external requests to insert/replace references (from Citation Manager)
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const detail = e?.detail || {}
        const refsText = String(detail.refsText || '').trim()
        const mode = detail.mode || 'insert'
        if (!refsText) return
        let nv = value
        if (mode === 'replace' && /\\begin\{thebibliography\}/.test(nv)) {
          nv = nv.replace(/\\begin\{thebibliography\}[\s\S]*?\\end\{thebibliography\}/, refsText)
        } else {
          nv += (nv.endsWith('\n') ? '' : '\n') + '\n' + refsText
        }
        onChange(nv)
        toast({ title: 'References updated', description: mode==='replace'? 'Replaced existing thebibliography.' : 'Inserted thebibliography at end of document.' })
      } catch (err) { console.error(err) }
    }
    window.addEventListener('writer-insert-references' as any, handler as any)
    return () => window.removeEventListener('writer-insert-references' as any, handler as any)
  }, [value, onChange, toast])

  // Compile LaTeX to HTML with math rendering
  const compileLatex = useCallback((latex: string) => {
    try {
      // Basic LaTeX to HTML conversion
      let html = latex

      // Build bibliography meta map for author-year rendering
      const refMeta: Record<string, { author: string; year: string; title?: string; journal?: string; doi?: string; url?: string }> = {}
      try {
        const bibRegex = /\\bibitem\{(ref\d+)\}([\s\S]*?)(?=(\\bibitem\{|\\end\{thebibliography\}))/g
        let m: RegExpExecArray | null
        while ((m = bibRegex.exec(latex)) !== null) {
          const key = m[1]
          const body = m[2].replace(/\n/g, ' ').trim()
          // Extract first author surname and year
          let author = ''
          const authorPart = body.split(/[\.\(]/)[0] || ''
          author = (authorPart.split(',')[0] || authorPart).trim()
          const yearMatch = body.match(/\b(19|20)\d{2}\b/)
          const year = yearMatch ? yearMatch[0] : ''
          const titleMatch = body.match(/"([^"]+)"/)
          const journalMatch = body.match(/\\textit\{([^}]+)\}/)
          const doiMatch = body.match(/doi:\s*([\w.\/-]+)/i)
          const urlMatch = body.match(/https?:[^\s]+/i)
          refMeta[key] = { author, year, title: titleMatch?.[1], journal: journalMatch?.[1], doi: doiMatch?.[1], url: urlMatch?.[0] }
        }
      } catch {}

      // Convert LaTeX document structure
      html = html.replace(/\\documentclass\{[^}]+\}/g, "")
      html = html.replace(/\\usepackage\{[^}]+\}/g, "")
      html = html.replace(/\\begin\{document\}/g, "")
      html = html.replace(/\\end\{document\}/g, "")

      // Convert LaTeX document structure
      html = html.replace(/\\documentclass\{[^}]+\}/g, "")
      html = html.replace(/\\usepackage\{[^}]+\}/g, "")
      html = html.replace(/\\begin\{document\}/g, "")
      html = html.replace(/\\end\{document\}/g, "")
      
      // Convert sections and headings
      html = html.replace(/\\section\{([^}]+)\}/g, "<h1>$1</h1>")
      html = html.replace(/\\section\*\{([^}]+)\}/g, "<h1>$1</h1>")
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
      
      // Convert tables
      html = html.replace(/\\begin\{table\}(\[[^\]]*\])?/g, '<div class="latex-table">')
      html = html.replace(/\\end\{table\}/g, '</div>')
      html = html.replace(/\\centering\s*/g, '')
      
      // Convert tabular environments to HTML tables
      html = html.replace(/\\begin\{tabular\}\{[^}]*\}/g, '<table class="latex-tabular border-collapse border border-gray-300 w-full">')
      html = html.replace(/\\end\{tabular\}/g, '</table>')
      html = html.replace(/\\hline\s*/g, '')
      
      // Convert table rows and cells
      html = html.replace(/([^\\]|^)&/g, '$1</td><td class="border border-gray-300 px-2 py-1">')
      html = html.replace(/\\\\\s*/g, '</td></tr>\n<tr><td class="border border-gray-300 px-2 py-1">')
      
      // Wrap first row in proper table structure
      html = html.replace(/(<table[^>]*>)\s*([^<\n]+)/g, '$1\n<tbody>\n<tr><td class="border border-gray-300 px-2 py-1 font-semibold bg-gray-50">$2')
      html = html.replace(/(<\/table>)/g, '</td></tr>\n</tbody>\n$1')
      
      // Convert captions
      html = html.replace(/\\caption\{([^}]+)\}/g, '<div class="latex-caption text-center text-sm font-medium text-gray-700 mt-2 mb-4">$1</div>')
      
      // Convert figures
      html = html.replace(/\\begin\{figure\}(\[[^\]]*\])?/g, '<div class="latex-figure my-6">')
      html = html.replace(/\\end\{figure\}/g, '</div>')
      html = html.replace(/\\includegraphics(\[[^\]]*\])?\{([^}]+)\}/g, '<img src="$2" alt="Figure" class="max-w-full h-auto mx-auto block border border-gray-200 rounded shadow-sm" />')
      
      // Convert labels and refs with hover previews
      html = html.replace(/\\ref\{([^}]+)\}/g, (match, key) => {
        // Find context around the label
        const labelRegex = new RegExp(`\\\\label\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}([\\s\\S]*?)(?=\\\\label\\{|\\\\section|\\\\subsection|\\\\end\\{|$)`, 'i')
        const labelMatch = latex.match(labelRegex)
        const context = labelMatch ? labelMatch[1].trim().slice(0, 100) + '...' : 'Label not found'
        return `<span class="ref-hover" data-tip="${key}: ${context}"><a href="#${key}">${key}</a></span>`
      })
      html = html.replace(/\\label\{([^}]+)\}/g, (_match, key) => `<span id="${key}"></span>`)
      
      // Convert citations depending on template
      const buildTip = (k: string) => {
        const meta = refMeta[k]
        if (!meta) return ''
        const parts = [
          meta.title ? `Title: ${meta.title}` : '',
          meta.author || meta.year ? `By: ${meta.author || ''}${meta.year ? ` (${meta.year})` : ''}` : '',
          meta.journal ? `Journal: ${meta.journal}` : '',
          meta.doi ? `DOI: ${meta.doi}` : (meta.url ? `URL: ${meta.url}` : ''),
        ].filter(Boolean)
        return parts.join(' \n ')
      }

      if (["apa","mla","chicago","harvard"].includes(template)) {
        html = html.replace(/\\cite\{([^}]+)\}/g, (_m, keys) => {
          const parts = String(keys).split(',').map((k: string) => k.trim())
          const formatted = parts.map((k) => {
            if (k.startsWith('ref')) {
              const meta = refMeta[k]
              if (meta && (meta.author || meta.year)) {
                const tip = buildTip(k)
                return `<span class="ref-hover" data-tip="${tip}"><a href="#${k}">${meta.author}${meta.year ? ' ' + meta.year : ''}</a></span>`
              }
              const n = k.replace('ref','')
              return `<span class="ref-hover" data-tip=""><a href="#${k}">[${n}]</a></span>`
            }
            // unknown key fallback
            return `<span class="ref-hover" data-tip="">[${k}]</span>`
          }).join('; ')
          return `(${formatted})`
        })
      } else {
        // Numeric styles
        html = html.replace(/\\cite\{src(\d+)\}/g, (_m, n) => `<span class="ref-hover" data-tip=""><sup><a href="#ref${n}">[${n}]<\/a><\/sup></span>`)
        html = html.replace(/\\cite\{ref(\d+)\}/g, (_m, n) => {
          const k = `ref${n}`
          const tip = buildTip(k)
          return `<span class=\"ref-hover\" data-tip=\"${tip}\"><sup><a href=\"#${k}\">[${n}]<\/a><\/sup></span>`
        })
        html = html.replace(/\\cite\{([^}]+)\}/g, (_m, key) => `<cite>[${key}]</cite>`)
      }

      // Convert bracketed retrieval markers to numeric citations
      html = html.replace(/\[?\s*RETRIEVED\s+SOURCE\s*(\d+)\s*\]?/gi, (_m, n) => `<sup>[${n}]</sup>`)

      // Abstract environment
      html = html.replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g, (_m, inner) => {
        const body = inner.trim()
        return `<div class="latex-abstract"><h3>Abstract</h3><div>${body}</div></div>`
      })

      // Bibliography environment
      html = html.replace(/\\begin\{thebibliography\}\{[^}]*\}/g, '<ol class="latex-bibliography">')
      html = html.replace(/\\end\{thebibliography\}/g, '</ol>')
      html = html.replace(/\\bibitem\{([^}]+)\}\s*/g, (_m, key) => `<li id="${key}">`)
      // Close list items when another bibitem or end encountered (now looking for </ol> as end marker)
      html = html.replace(/\n(?=\\bibitem\{|<\/ol>)/g, '</li>\n')
      // Ensure last list item is closed before </ol>
      html = html.replace(/(<li[^>]*>[^]*?)(<\/ol>)/g, (m, liPart, endTag) => liPart.endsWith('</li>') ? m : `${liPart}</li>${endTag}`)

      // Equation environments
      html = html.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (match, math) => {
        try {
          return `<div class="math-display">${katex.renderToString(math, { displayMode: true, throwOnError: false })}</div>`
        } catch {
          return `<div class="math-display math-error">${match}</div>`
        }
      })
      
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

      // Inline math variant: \( ... \)
      html = html.replace(/\\\(([^)]+)\\\)/g, (match, math) => {
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
  }, [template])

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

  // Helpers for inline citation creation
  const getSelectionLineRange = () => {
    if (!editorRef.current) return null
    const text = value
    const start = editorRef.current.selectionStart
    const end = editorRef.current.selectionEnd
    if (start === end) return null
    const pre = text.slice(0, start)
    const sel = text.slice(start, end)
    const startLine = pre.split('\n').length
    const selLines = sel.split('\n').length
    return { start: startLine, end: startLine + selLines - 1 }
  }

  const handleContextMenuOpen = () => {
    const range = getSelectionLineRange()
    setSelectedLineRange(range)
  }


  const insertAtCaret = (text: string) => {
    if (!editorRef.current) return
    const ta = editorRef.current
    const pos = ta.selectionStart
    const nv = value.slice(0, pos) + text + value.slice(pos)
    onChange(nv)
    setTimeout(()=>{ ta.focus(); const np = pos + text.length; ta.setSelectionRange(np, np) },0)
  }

  const handleInsertLabel = () => {
    const base = labelText.trim().replace(/\s+/g,'-').replace(/[^a-zA-Z0-9-_:.]/g,'').toLowerCase() || 'label'
    const key = `${labelType}:${base}`
    insertAtCaret(`\\label{${key}}`)
    setIsLabelDialogOpen(false); setLabelText('')
    toast({ title: 'Label inserted', description: `Inserted \\label{${key}}` })
  }

  const handleInsertRef = () => {
    if (!refToInsert) { setIsRefDialogOpen(false); return }
    insertAtCaret(`\\ref{${refToInsert}}`)
    setIsRefDialogOpen(false); setRefToInsert('')
    toast({ title: 'Reference inserted', description: `Inserted \\ref{${refToInsert}}` })
  }

  const handleInsertCitations = () => {
    if (!editorRef.current) { setIsCiteDialogOpen(false); return }
    const textarea = editorRef.current

    // Ensure something selected to cite
    const anySelected = advancedCiteMapping && selectedLineRange
      ? Object.values(lineMappings).some(arr => (arr?.length || 0) > 0)
      : selectedPaperIds.length > 0
    if (!anySelected) { setIsCiteDialogOpen(false); return }

    // Determine next reference indices by scanning existing \bibitem{refN}
    const refRegex = /\\bibitem\{ref(\d+)\}/g
    const existing = Array.from(value.matchAll(refRegex)).map(m => parseInt(m[1], 10))
    let nextIndex = existing.length > 0 ? Math.max(...existing) + 1 : 1

    const selectedPapers = getSelectedPapers()
    const desiredIds: string[] = advancedCiteMapping && selectedLineRange
      ? Array.from(new Set(Object.values(lineMappings).flat()))
      : selectedPaperIds

    // Map paper id -> refKey and build bib items once
    const idToKey = new Map<string,string>()
    let bibItems = ''
    for (const id of desiredIds) {
      const p = selectedPapers.find((x:any)=> String(x.id)===String(id))
      if (!p) continue
      const k = `ref${nextIndex}`
      idToKey.set(String(id), k)
      bibItems += formatBibItem(template, nextIndex, p) + '\n'
      nextIndex++
    }

    const citeKeys = Array.from(idToKey.values())
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const citeText = `\\cite{${citeKeys.join(',')}}`

    let newValue = value
    if ((advancedCiteMapping && selectedLineRange) || (perLineMode && selectedLineRange)) {
      const lines = value.split('\n')
      const sIndex = Math.max(0, selectedLineRange.start - 1)
      const eIndex = Math.min(lines.length - 1, selectedLineRange.end - 1)
      for (let i = sIndex; i <= eIndex; i++) {
        let keysForLine = citeText
        if (advancedCiteMapping) {
          const ids = lineMappings[i+1] || selectedPaperIds // fallback same
          const keys = ids.map(id=> idToKey.get(String(id))).filter(Boolean).join(',')
          keysForLine = keys ? `\\cite{${keys}}` : ''
        }
        if (keysForLine) lines[i] = lines[i].replace(/\s*$/, '') + ' ' + keysForLine
      }
      newValue = lines.join('\n')
    } else {
      // Insert once at selection end
      newValue = value.slice(0, end) + citeText + value.slice(end)
    }

    // Ensure bibliography section
    const hasBiblio = /\\begin\{thebibliography\}/.test(newValue)
    let withBiblio = newValue
    if (!hasBiblio) {
      withBiblio += `\n\n\\section*{References}\n\\begin{thebibliography}{99}\n${bibItems}\\end{thebibliography}`
    } else {
      withBiblio = withBiblio.replace(/\\end\{thebibliography\}/, `${bibItems}\\end{thebibliography}`)
    }

    onChange(withBiblio)
    setIsCiteDialogOpen(false)
    setSelectedPaperIds([])
    // restore cursor roughly after citation
    setTimeout(() => {
      textarea.focus()
      const pos = end + citeText.length
      textarea.setSelectionRange(pos, pos)
    }, 0)
    toast({ title: 'Citations inserted', description: 'Inline citations and references added.' })
  }

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
            {selectedLineRange && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <input id="adv-map" type="checkbox" className="h-4 w-4" checked={advancedCiteMapping} onChange={(e)=>setAdvancedCiteMapping(e.target.checked)} />
                  <Label htmlFor="adv-map" className="text-sm">Map different citations per line (max 2 per line)</Label>
                </div>
                {advancedCiteMapping && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(() => { const lines = value.split('\n'); const s=selectedLineRange.start-1; const e=selectedLineRange.end-1; return lines.slice(s,e+1).map((ln, idx)=>{
                      const lineIndex = s+idx+1
                      const chosen = new Set(lineMappings[lineIndex]||[])
                      const papers = getSelectedPapers()
                      return (
                        <div key={lineIndex} className="text-xs bg-gray-50 p-2 rounded border">
                          <div className="font-medium truncate mb-1">Line {lineIndex}: {ln.trim().slice(0,80) || '(blank)'}</div>
                          <div className="flex flex-wrap gap-2">
                            {papers.map((p:any)=>{
                              const id = String(p.id)
                              const checked = chosen.has(id)
                              return (
                                <label key={id} className="flex items-center gap-1">
                                  <input type="checkbox" checked={checked} onChange={(e)=>{
                                    setLineMappings(prev=>{ const cur = new Set(prev[lineIndex]||[]); if(e.target.checked){ if(cur.size<2) cur.add(id) } else { cur.delete(id) } return {...prev, [lineIndex]: Array.from(cur)} })
                                  }} />
                                  <span>{p.title?.slice(0,20) || 'Untitled'}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }) })()}
                  </div>
                )}
              </div>
            )}
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
            {/* Academic Template Selector (replaces word count + ready) */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-600">Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="h-8 min-w-[160px]">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ieee">IEEE</SelectItem>
                  <SelectItem value="acm">ACM</SelectItem>
                  <SelectItem value="springer">Springer</SelectItem>
                  <SelectItem value="elsevier">Elsevier</SelectItem>
                  <SelectItem value="apa">APA</SelectItem>
                  <SelectItem value="mla">MLA</SelectItem>
                  <SelectItem value="chicago">Chicago</SelectItem>
                  <SelectItem value="harvard">Harvard</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => {
                try {
                  // Renumber bibitems to sequential ref1..refN and update cites
                  const items = Array.from(value.matchAll(/\\bibitem\{(ref\d+)\}/g)).map(m=>m[1])
                  const mapping: Record<string,string> = {}
                  let idx=1
                  for(const old of items){ mapping[old] = `ref${idx++}` }
                  let nv = value.replace(/\\bibitem\{(ref\d+)\}/g, (_m, k)=> `\\bibitem{${mapping[k]||k}}`)
                  nv = nv.replace(/\\cite\{([^}]+)\}/g, (_m, group: string)=>{
                    const parts = group.split(',').map((s: string)=>s.trim())
                    const mapped = parts.map((p: string)=> mapping[p]||p).join(',')
                    return `\\cite{${mapped}}`
                  })
                  onChange(nv)
                  toast({title:'Reformatted', description:'Citations and references renumbered for current template.'})
                } catch(err){ console.error(err); toast({title:'Reformat failed', description:'Could not reformat citations.' , variant:'destructive'}) }
              }}>Reformat now</Button>
            </div>

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
                <ContextMenu onOpenChange={(open)=> open && handleContextMenuOpen()}>
                  <ContextMenuTrigger className="w-full h-full">
                    <Textarea
                      ref={editorRef}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      onKeyDown={handleTextareaKeyDown}
                      className="w-full h-full font-mono text-sm resize-none border-none focus:ring-0 focus:outline-none"
                      placeholder="% Start writing your LaTeX document here...\n\\documentclass{article}\n\\begin{document}\n\n\\section{Introduction}\nYour content here...\n\n\\end{document}"
                      spellCheck={false}
                    />
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    <div className="px-2 py-1.5 text-xs text-gray-500">Selection tools</div>
                    <ContextMenuItem
                      inset
                      disabled={!selectedLineRange || (selectedLineRange.end - selectedLineRange.start + 1) > 4}
                      onClick={() => {
                        setIsCiteDialogOpen(true)
                      }}
                    >
                      Mark citations (max 4 lines)
                    </ContextMenuItem>
                    <ContextMenuItem inset onClick={() => setIsCiteLookupOpen(true)}>Cite by DOI/Title</ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem inset onClick={() => setIsLabelDialogOpen(true)}>Insert label (section/eq/fig/tab)</ContextMenuItem>
                    <ContextMenuItem inset onClick={() => { setRefToInsert(collectLabels()[0] || ''); setIsRefDialogOpen(true) }}>Insert \\ref to…</ContextMenuItem>
                    <ContextMenuItem inset onClick={() => insertLatex('inline-math')}>Inline math $...$</ContextMenuItem>
                    <ContextMenuItem inset onClick={() => insertLatex('equation')}>Display equation $$...$$</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
                {citeCompletionOpen && (
                  <div className="absolute left-6 bottom-6 z-50 bg-white border border-gray-200 rounded shadow p-2 text-xs w-64 max-h-40 overflow-auto">
                    <div className="font-semibold mb-1">Citations</div>
                    {citeCompletionOptions.length > 0 ? (
                    citeCompletionOptions.map((k) => (
                      <div key={k} className="px-1 py-0.5 cursor-pointer hover:bg-gray-100 rounded" onClick={() => {
                        // Insert key into existing \cite{...} braces only (no new bib)
                        const ta = editorRef.current; if (!ta) return; const pos = ta.selectionStart; const before = value.slice(0,pos); const citeStart = before.lastIndexOf('\\cite{'); if (citeStart!==-1 && before.indexOf('}', citeStart)===-1){ const closePos = value.indexOf('}', citeStart); const inside = value.slice(citeStart+6, closePos); const prefix = inside.trim()? inside.trim()+',': ''; const nv = value.slice(0, citeStart+6)+prefix+k+value.slice(closePos); onChange(nv); setCiteCompletionOpen(false);} }}>
                        {k}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">No existing refs. Select papers and use Mark citations, or use Cite by DOI/Title.</div>
                  )}
                    {getSelectedPapers().length > 0 && (
                      <>
                        <div className="font-semibold mt-2 mb-1">Selected Papers</div>
                        {getSelectedPapers().slice(0,6).map((p:any, i:number) => (
                          <div key={p.id || i} className="px-1 py-0.5 cursor-pointer hover:bg-gray-100 rounded" onClick={() => { insertSingleReference(p, true); setCiteCompletionOpen(false); }}>
                            + {p.title}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Preview Panel */}
            <div className={`bg-white ${template ? `latex-template-${template}` : ''}`}>
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
            <ContextMenu onOpenChange={(open)=> open && handleContextMenuOpen()}>
              <ContextMenuTrigger className="w-full h-full">
                <Textarea
                  ref={editorRef}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  className="w-full h-full font-mono text-sm resize-none border-none focus:ring-0 focus:outline-none"
                  placeholder="% Start writing your LaTeX document here...\n\\documentclass{article}\n\\begin{document}\n\n\\section{Introduction}\nYour content here...\n\n\\end{document}"
                  spellCheck={false}
                />
              </ContextMenuTrigger>
              <ContextMenuContent className="w-56">
                <div className="px-2 py-1.5 text-xs text-gray-500">Selection tools</div>
                <ContextMenuItem
                  inset
                  disabled={!selectedLineRange || (selectedLineRange.end - selectedLineRange.start + 1) > 4}
                  onClick={() => setIsCiteDialogOpen(true)}
                >
                  Mark citations (max 4 lines)
                </ContextMenuItem>
                <ContextMenuItem inset onClick={() => setIsCiteLookupOpen(true)}>Cite by DOI/Title</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem inset onClick={() => setIsLabelDialogOpen(true)}>Insert label (section/eq/fig/tab)</ContextMenuItem>
                <ContextMenuItem inset onClick={() => { setRefToInsert(collectLabels()[0] || ''); setIsRefDialogOpen(true) }}>Insert \\ref to…</ContextMenuItem>
                <ContextMenuItem inset onClick={() => insertLatex('inline-math')}>Inline math $...$</ContextMenuItem>
                <ContextMenuItem inset onClick={() => insertLatex('equation')}>Display equation $$...$$</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
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
            <span>•</span>
            <span>Words: {value.split(/\s+/).filter(w=>w).length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>LaTeX • {template.toUpperCase()}</span>
            {!compileError && <div className="w-2 h-2 bg-green-500 rounded-full" title="Compiled Successfully" />}
            {compileError && <div className="w-2 h-2 bg-red-500 rounded-full" title="Compilation Error" />}
          </div>
        </div>
      </div>

      {/* Dialog: Mark citations */}
      <Dialog open={isCiteDialogOpen} onOpenChange={setIsCiteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark citations for selected text</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose up to 4 papers to cite. They will be inserted as LaTeX citations and added to the References section.</p>
            <div className="max-h-56 overflow-y-auto space-y-2">
              {getSelectedPapers().length === 0 && (
                <div className="text-sm text-muted-foreground">No selected papers available. Add papers in Explorer first.</div>
              )}
              {getSelectedPapers().map((p: any, idx: number) => (
                <label key={String(p.id) || idx} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPaperIds.includes(String(p.id))}
                    onChange={(e) => {
                      const id = String(p.id)
                      if (e.target.checked) {
                        if (selectedPaperIds.length < 4) setSelectedPaperIds([...selectedPaperIds, id])
                        else toast({ title: 'Limit reached', description: 'Select at most 4 references.' })
                      } else {
                        setSelectedPaperIds(selectedPaperIds.filter(x => x !== id))
                      }
                    }}
                  />
                  <span>
                    <span className="font-medium">{p.title || 'Untitled'}</span>
                    <span className="block text-xs text-muted-foreground">
                      {(Array.isArray(p.authors) ? p.authors.slice(0, 3).map((a:any)=> typeof a === 'string' ? a : a?.name || '').filter(Boolean).join(', ') : '')}
                      {p.year ? ` (${p.year})` : ''}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCiteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInsertCitations} disabled={selectedPaperIds.length === 0}>Insert \cite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Insert label */}
      <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Insert label</DialogTitle></DialogHeader>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Type</Label>
            <Select value={labelType} onValueChange={(v)=>setLabelType(v as any)}>
              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="eq">Equation</SelectItem>
                <SelectItem value="fig">Figure</SelectItem>
                <SelectItem value="tab">Table</SelectItem>
                <SelectItem value="sec">Section</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="identifier (e.g., energy-balance)" value={labelText} onChange={(e)=>setLabelText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setIsLabelDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInsertLabel}>Insert \\label</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Insert \ref */}
      <Dialog open={isRefDialogOpen} onOpenChange={setIsRefDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Insert reference (\\ref)</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">Choose label</Label>
            <Select value={refToInsert} onValueChange={(v)=>setRefToInsert(v)}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Select label" /></SelectTrigger>
              <SelectContent>
                {collectLabels().map((k)=> (<SelectItem key={k} value={k}>{k}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setIsRefDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInsertRef}>Insert \\ref</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cite by DOI/Title */}
      <Dialog open={isCiteLookupOpen} onOpenChange={setIsCiteLookupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cite by DOI or Title</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Type</Label>
              <Select value={citeQueryType} onValueChange={(v)=>setCiteQueryType(v as any)}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="doi">DOI</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
              <Input value={citeQuery} onChange={(e)=>setCiteQuery(e.target.value)} placeholder={citeQueryType==='doi'? '10.xxxx/...' : 'Paper title'} className="flex-1" />
              <Button onClick={async ()=>{
                try{
                  setCiteLookupLoading(true); setCiteLookupResult(null)
                  let paper:any = null
                  if(citeQueryType==='doi'){
                    const d = await getCitationData(citeQuery,'doi')
                    paper = d ? { title:d.title, authors:d.authors||[], year:d.year, journal:d.journal, doi:d.doi, url:d.url } : null
                  }else{
                    const res = await searchSemanticScholar(citeQuery,1)
                    if(res && res[0]){ 
                      const r = res[0] as any
                      const doi = (r as any).doi || (r as any).externalIds?.DOI
                      const url = (r as any).url || (Array.isArray((r as any).urls) ? (r as any).urls[0] : undefined)
                      paper = { title:r.title, authors:r.authors||[], year:r.year, journal:r.journal, doi, url }
                    }
                  }
                  setCiteLookupResult(paper)
                }catch(err){ console.error(err); toast({title:'Lookup failed', description:'Could not find the paper. Try a more specific query.', variant:'destructive'}) }
                finally{ setCiteLookupLoading(false) }
              }} disabled={!citeQuery || citeLookupLoading}>{citeLookupLoading? 'Searching...' : 'Search'}</Button>
            </div>
            {citeLookupResult && (
              <div className="p-3 bg-gray-50 rounded border text-sm">
                <div className="font-medium">{citeLookupResult.title || 'Untitled'}</div>
                <div className="text-gray-600">{Array.isArray(citeLookupResult.authors)? citeLookupResult.authors.slice(0,3).map((a:any)=> typeof a==='string'? a : a?.name || '').join(', ') : ''}{citeLookupResult.year? ` (${citeLookupResult.year})` : ''}</div>
                {citeLookupResult.doi && <div className="text-xs">DOI: {citeLookupResult.doi}</div>}
                {citeLookupResult.url && <div className="text-xs truncate">URL: {citeLookupResult.url}</div>}
                <div className="pt-2 text-right">
                  <Button size="sm" onClick={()=>{ insertSingleReference(citeLookupResult, true); setIsCiteLookupOpen(false) }}>Insert \cite</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .latex-preview h1 {
          font-size: 2rem;
          font-weight: bold;
          margin: 1.5rem 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e5e5;
        }
        .latex-preview .latex-abstract {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem 1.25rem;
          margin: 1rem 0 1.25rem;
        }
        .latex-preview .latex-abstract h3 {
          margin: 0 0 0.5rem 0;
          font-weight: 600;
          color: #111827;
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
        .latex-preview .latex-table {
          margin: 1.5rem 0;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }
        .latex-preview .latex-tabular {
          margin: 0 auto;
          background: white;
          border-radius: 0.375rem;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        .latex-preview .latex-tabular td {
          padding: 0.75rem 1rem;
        }
        .latex-preview .latex-caption {
          font-weight: 600;
          color: #374151;
          margin-bottom: 1rem;
        }
        .latex-preview .latex-figure {
          text-align: center;
          margin: 2rem 0;
        }
        .latex-preview .latex-figure img {
          max-width: 80%;
          height: auto;
        }
        .latex-preview .ref-hover {
          color: #2563eb;
          cursor: pointer;
          text-decoration: underline;
        }
        .latex-preview .ref-hover:hover {
          color: #1d4ed8;
          background-color: #eff6ff;
          padding: 0 2px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  )
}

export default LaTeXEditor
