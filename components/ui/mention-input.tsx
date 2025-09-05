"use client"

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { User, Bot, FileText, File, Image, X } from 'lucide-react'
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
    if (!query) return getAllMentions()
    
    const lowercaseQuery = query.toLowerCase()
    return getAllMentions().filter(item =>
      item.name.toLowerCase().includes(lowercaseQuery) ||
      item.email?.toLowerCase().includes(lowercaseQuery)
    )
  }

  // Render highlighted content (@mentions colored)
  const renderHighlighted = (text: string) => {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')
    return escaped.replace(/@(\w+)/g, '<span class="bg-primary/10 text-primary px-1 rounded">@$1</span>')
  }

  // Sync external value into editor
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    // Avoid flicker: only update if text differs from innerText
    if (el.innerText !== value) {
      el.innerHTML = renderHighlighted(value)
    }
  }, [value])

  // Handle contenteditable input
  const handleEditorInput = () => {
    const el = editorRef.current
    if (!el) return
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
    placeCaretAtEnd(el)
    onChange(parsed.text, parsed.mentions)
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
    const nextText = `${before}${mentionText} ${afterWithoutQuery}`
    el.innerHTML = renderHighlighted(nextText)
    placeCaretAtEnd(el)
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
          "min-h-[42px] px-4 py-2 rounded-lg border bg-background outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all",
          "placeholder:text-muted-foreground",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
      />
      
      {/* Suggestions dropdown anchored to input */}
      {showSuggestions && (
        <div 
          className="absolute bottom-full mb-2 left-0 bg-background border border-border rounded-lg shadow-lg p-3 z-[1000] w-[320px]"
        >
          <div className="text-sm font-semibold mb-2 text-blue-600">
            🎯 Mention Someone!
          </div>
          
          {/* Users */}
          {users.map(user => (
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
          
          {/* Files */}
          {files.slice(0, 5).map(file => (
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
      return <span className={className}>{content}</span>
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
              "inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 text-xs",
              // Highlight mentions of the current user
              currentUserId && mentionData.id === currentUserId
                ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                : "bg-primary/10 text-primary"
            )}
          >
            {getMentionIcon(mentionData)}
            <span>{name}</span>
          </Badge>
        )
      } else {
        // Fallback: just show the @name if mention data not found
        parts.push(
          <span key={`mention-${id}-${match.index}`} className="text-muted-foreground">
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
    
    return <span className={className}>{parts}</span>
  }

  return renderContent()
}

function getMentionIcon(mention: MentionData, currentUserId?: string) {
  switch (mention.type) {
    case 'user':
      return (
        <Avatar className="h-3 w-3">
          <AvatarImage src={mention.avatar} />
          <AvatarFallback className="text-xs">
            {mention.name.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )
    case 'ai':
      return <Bot className="h-3 w-3 text-blue-500" />
    case 'file':
      return <FileText className="h-3 w-3 text-green-500" />
    default:
      return <User className="h-3 w-3" />
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
