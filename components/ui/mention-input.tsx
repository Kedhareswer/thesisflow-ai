"use client"

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { User, Bot, FileText, File, Image, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MentionData {
  id: string
  type: 'user' | 'ai' | 'file'
  name: string
  avatar?: string
  email?: string
  fileType?: string
  fileSize?: string
  fileUrl?: string
}

export interface MentionInputProps {
  value: string
  onChange: (value: string, mentions: MentionData[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  users?: MentionData[]
  files?: MentionData[]
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
}

interface ParsedContent {
  text: string
  mentions: MentionData[]
}



export function MentionInput({
  value,
  onChange,
  placeholder = "Type your message...",
  disabled = false,
  className = "",
  users = [],
  files = [],
  onKeyDown
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionQuery, setSuggestionQuery] = useState("")
  const [suggestions, setSuggestions] = useState<MentionData[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const pendingCaretRef = useRef<number | null>(null)

  // Simplified logs removed for production

  // Parse content to extract mentions and clean text
  const parseContent = (content: string): ParsedContent => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentions: MentionData[] = []
    let cleanText = content

    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      const [fullMatch, name, id] = match
      
      // Find mention data
      let mentionData: MentionData | undefined
      
      mentionData = [...users, ...files].find(item => item.id === id)
      
      if (mentionData) {
        mentions.push(mentionData)
        cleanText = cleanText.replace(fullMatch, `@${name}`)
      }
    }

    return { text: cleanText, mentions }
  }

  // Get all available mention options
  const getAllMentions = (): MentionData[] => {
    return [...users, ...files]
  }

  // Filter suggestions based on query
  const filterSuggestions = (query: string): MentionData[] => {
    const all = getAllMentions()
    if (!query) return all
    const q = query.toLowerCase()
    return all.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.email ? item.email.toLowerCase().includes(q) : false)
    )
  }

  // Render highlighted content (@mentions colored)
  const renderHighlighted = (text: string) => {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')
    // highlight @mentions with broader charset
    return escaped.replace(
      /@([A-Za-z0-9._-]+)/g,
      // prettier pill styling inspired by shadcn badge
      '<span class="inline-flex items-center px-1.5 py-[1px] rounded-full bg-primary/10 border border-primary/20 text-primary font-medium align-baseline">@$1</span>'
    )
  }

  // Sync external value into editor
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    // Avoid flicker: only update if text differs from innerText
    if (el.innerText !== value) {
      el.innerHTML = renderHighlighted(value)
    }
    // If we have a pending caret position (e.g., after inserting a mention), restore it now
    if (pendingCaretRef.current !== null) {
      const pos = Math.min(pendingCaretRef.current, el.innerText.length)
      try {
        el.focus()
        setCaretOffset(el, pos)
      } finally {
        pendingCaretRef.current = null
      }
    }
    // Check overflow on external updates
    setIsOverflowing(el.scrollHeight > el.clientHeight + 1)
  }, [value])

  // Handle contenteditable input
  const getCaretOffset = (el: HTMLElement) => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return el.innerText.length
    const range = sel.getRangeAt(0)
    const preRange = range.cloneRange()
    preRange.selectNodeContents(el)
    preRange.setEnd(range.endContainer, range.endOffset)
    return preRange.toString().length
  }

  const setCaretOffset = (el: HTMLElement, offset: number) => {
    el.focus()
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null)
    let currentOffset = 0
    let node: Node | null = null
    while ((node = walker.nextNode())) {
      const textLen = (node.nodeValue || '').length
      if (currentOffset + textLen >= offset) {
        const range = document.createRange()
        range.setStart(node, Math.max(0, offset - currentOffset))
        range.collapse(true)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
        return
      }
      currentOffset += textLen
    }
    // fallback to end
    placeCaretAtEnd(el)
  }

  const handleEditorInput = () => {
    const el = editorRef.current
    if (!el) return
    const caretBefore = getCaretOffset(el)
    const text = el.innerText
    // Detect mention query near caret (simple: use end of text)
    const match = text.match(/@([^@\s]*)$/)
    if (match) {
      setSuggestionQuery(match[1])
      setSuggestions(filterSuggestions(match[1]))
      setShowSuggestions(true)
      setSelectedIndex(0)
    } else {
      setShowSuggestions(false)
    }
    const parsed = parseContent(text)
    // Re-apply highlighting
    el.innerHTML = renderHighlighted(parsed.text)
    setCaretOffset(el, Math.min(caretBefore, el.innerText.length))
    onChange(parsed.text, parsed.mentions)
    setIsOverflowing(el.scrollHeight > el.clientHeight + 1)
  }

  // Handle key down events
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (suggestions[selectedIndex]) {
          insertMention(suggestions[selectedIndex])
        }
        return
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
      }
    }
    
    onKeyDown?.(e)
  }

  // Insert mention at cursor position
  const insertMention = (mention: MentionData) => {
    const el = editorRef.current
    if (!el) return
    const text = el.innerText
    const atIndex = text.lastIndexOf('@')
    const before = atIndex >= 0 ? text.substring(0, atIndex) : text
    let after = atIndex >= 0 ? text.substring(atIndex) : ''
    // Remove the @partial token fully (from @ up to first whitespace or end)
    const tokenMatch = after.match(/^@[^\s]*/)
    const tokenLength = tokenMatch ? tokenMatch[0].length : 0
    const afterWithoutQuery = after.substring(tokenLength)
    // Use proper mention format that parseContent expects
    const mentionText = `@[${mention.name}](${mention.id})`
    const insertion = `${mentionText} `
    const nextText = `${before}${insertion}${afterWithoutQuery}`
    el.innerHTML = renderHighlighted(nextText)
    // place caret just after what will be rendered ("@name ") not the token length
    const displayInsertion = `@${mention.name} `
    const caretPos = (before + displayInsertion).length
    // Set caret immediately and schedule a restore after React state update
    el.focus()
    setCaretOffset(el, caretPos)
    pendingCaretRef.current = caretPos
    // In case React re-render happens after this tick, enforce caret again on next frame
    requestAnimationFrame(() => {
      const node = editorRef.current
      if (node) setCaretOffset(node, Math.min(caretPos, node.innerText.length))
    })
    const parsed = parseContent(nextText)
    onChange(parsed.text, parsed.mentions)
    setShowSuggestions(false)
  }

  // Get file icon based on type
  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="h-4 w-4" />
    
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />
    }
    
    return <FileText className="h-4 w-4" />
  }

  // Get mention icon
  const getMentionIcon = (mention: MentionData) => {
    switch (mention.type) {
      case 'user':
        return (
          <Avatar className="h-4 w-4">
            <AvatarImage src={mention.avatar} />
            <AvatarFallback className="text-xs">
              {mention.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )
      case 'ai':
        return <Bot className="h-4 w-4 text-blue-500" />
      case 'file':
        return getFileIcon(mention.fileType)
      default:
        return <User className="h-4 w-4" />
    }
  }

  // Format file size
  const formatFileSize = (size?: string) => {
    if (!size) return ''
    const bytes = parseInt(size)
    if (isNaN(bytes)) return size
    
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  return (
    <div className="relative">
      <div
        ref={editorRef}
        role="textbox"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleEditorInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={cn(
          "min-h-[42px] px-4 py-2 rounded-lg border bg-background outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all w-full overflow-y-auto",
          "placeholder:text-muted-foreground",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        style={{
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word'
        }}
      />

      {isOverflowing && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-lg bg-gradient-to-t from-background to-transparent" />
      )}

      {isOverflowing && (
        <button
          type="button"
          onClick={() => {
            const el = editorRef.current
            if (el) el.scrollTop = el.scrollHeight
          }}
          className="absolute bottom-1 right-1 h-6 w-6 grid place-items-center rounded-md border bg-background hover:bg-muted text-muted-foreground"
          aria-label="Scroll to bottom"
          title="Scroll"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
      
      {/* Suggestions dropdown anchored to input */}
      {showSuggestions && (
        <div 
          className="absolute bottom-full mb-2 left-0 bg-background border border-border rounded-lg shadow-lg p-3 z-[1000] w-[320px]"
        >
          <div className="text-sm font-semibold mb-2 text-blue-600">
            🎯 Mention Someone!
          </div>
          
          {/* Filtered users first */}
          {suggestions.filter(s => s.type !== 'file').map(user => (
            <div 
              key={user.id}
              className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer rounded transition-colors"
              onClick={() => insertMention(user)}
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-xs">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
            </div>
          ))}
          
          {/* Filtered files (limit 5) */}
          {suggestions.filter(s => s.type === 'file').slice(0, 5).map(file => (
            <div 
              key={file.id}
              className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer rounded transition-colors"
              onClick={() => insertMention(file)}
            >
              <FileText className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm">{file.name}</div>
                <div className="text-xs text-muted-foreground">File</div>
              </div>
            </div>
          ))}
          
          {suggestions.length === 0 && (
            <div className="text-xs text-muted-foreground mt-1">No matches</div>
          )}
          <div className="text-xs text-muted-foreground mt-2">
            Users: {users.length} | Files: {files.length}
          </div>
        </div>
      )}
    </div>
  )
}

// Component to render mentions in messages
export interface MessageWithMentionsProps {
  content: string
  mentions?: MentionData[]
  className?: string
  currentUserId?: string
}

export function MessageWithMentions({ 
  content, 
  mentions = [], 
  className = "", 
  currentUserId 
}: MessageWithMentionsProps) {
  // Parse content and render with mention chips
  const renderContent = () => {
    if (!mentions.length) {
      // Generic pillify for @handles even without metadata
      // Require a non-word boundary before @ to avoid emails and code like object@property
      const genericRegex = /(^|[^\w])@([A-Za-z0-9._-]+)/gi
      const parts: React.ReactNode[] = []
      let idx = 0
      let m: RegExpExecArray | null
      while ((m = genericRegex.exec(content)) !== null) {
        const start = m.index
        const end = start + m[0].length
        if (start > idx) {
          parts.push(<span key={`gt-${idx}`}>{content.substring(idx, start)}</span>)
        }
        // m[1] is the leading non-word or start, m[2] is the handle
        if (m[1]) {
          parts.push(<span key={`g-lead-${start}`}>{m[1]}</span>)
        }
        parts.push(
          <span
            key={`g-${start}`}
            className="inline-flex items-center mx-0.5 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
          >
            @{m[2]}
          </span>
        )
        idx = end
      }
      if (idx < content.length) {
        parts.push(<span key={`gt-${idx}`}>{content.substring(idx)}</span>)
      }
      return <span className={className}>{parts}</span>
    }

    const parts = []
    let lastIndex = 0
    
    // Find all @[name](id) patterns
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      const [fullMatch, name, id] = match
      const mentionData = mentions.find(m => m.id === id)
      
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
          </span>
        )
      }
      
      // Add mention chip only if mentionData exists
      if (mentionData) {
        parts.push(
          <Badge
            key={`mention-${id}-${match.index}`}
            variant="secondary"
            className={cn(
              "inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 text-xs rounded-full border",
              // Highlight mentions of the current user
              currentUserId && mentionData.id === currentUserId
                ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                : "bg-primary/10 text-primary border-primary/20"
            )}
          >
            {getMentionIcon(mentionData)}
            <span>{name}</span>
          </Badge>
        )
      } else {
        // Fallback: just show the @name if mention data not found
        parts.push(
          <span
            key={`mention-${id}-${match.index}`}
            className="inline-flex items-center mx-0.5 px-2 py-0.5 text-xs rounded-full bg-muted text-foreground/80 border border-border"
          >
            @{name}
          </span>
        )
      }
      
      lastIndex = match.index + fullMatch.length
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.substring(lastIndex)}
        </span>
      )
    }
    
    // If we didn't find any token-based mentions, try highlighting plain @names
    if (parts.length === 1 && parts[0]?.key?.toString().startsWith('text-')) {
      const names = Array.from(
        new Map(mentions.map(m => [m.name, m])).keys()
      )
      if (names.length) {
        const escapedNames = names
          .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .sort((a, b) => b.length - a.length) // longer first
        // Match followed by end or whitespace/punctuation, case-insensitive
        const re = new RegExp(`@(${escapedNames.join('|')})(?=$|[\\s,.:;!?()\\[\\]{}<>])`, 'gi')
        const text = content
        const plainParts: React.ReactNode[] = []
        let idx = 0
        let m: RegExpExecArray | null
        while ((m = re.exec(text)) !== null) {
          const [full, name] = m
          const start = m.index
          const end = start + full.length
          if (start > idx) {
            plainParts.push(<span key={`pt-${idx}`}>{text.substring(idx, start)}</span>)
          }
          const md = mentions.find(mm => mm.name === name)
          if (md) {
            plainParts.push(
              <Badge
                key={`p-${start}-${md.id}`}
                variant="secondary"
                className={cn(
                  "inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 text-xs rounded-full border",
                  currentUserId && md.id === currentUserId
                    ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                    : "bg-primary/10 text-primary border-primary/20"
                )}
              >
                {getMentionIcon(md)}
                <span>{name}</span>
              </Badge>
            )
          } else {
            plainParts.push(
              <span
                key={`pf-${start}`}
                className="inline-flex items-center mx-0.5 px-2 py-0.5 text-xs rounded-full bg-muted text-foreground/80 border border-border"
              >
                @{name}
              </span>
            )
          }
          idx = end
        }
        if (idx < text.length) {
          plainParts.push(<span key={`pt-${idx}`}>{text.substring(idx)}</span>)
        }
        return <span className={className}>{plainParts}</span>
      }
    }
    
    return <span className={className}>{parts}</span>
  }

  return renderContent()
}

function getMentionIcon(mention: MentionData, currentUserId?: string) {
  switch (mention.type) {
    case 'user':
      return (
        <Avatar className="h-4 w-4">
          <AvatarImage src={mention.avatar} />
          <AvatarFallback className="text-xs">
            {mention.name.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )
    case 'ai':
      return <Bot className="h-4 w-4 text-blue-500" />
    case 'file':
      return <FileText className="h-4 w-4 text-green-500" />
    default:
      return <User className="h-4 w-4" />
  }
}

function placeCaretAtEnd(el: HTMLElement) {
  try {
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  } catch {}
}
