"use client"

import React, { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { User, Bot, FileText, File, Image, X } from 'lucide-react'

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
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}

interface ParsedContent {
  text: string
  mentions: MentionData[]
}

// Nova AI default mention
const NOVA_AI: MentionData = {
  id: 'nova-ai',
  type: 'ai',
  name: 'Nova AI',
  avatar: '/assistant-avatar.svg'
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
  const [cursorPosition, setCursorPosition] = useState(0)
  const [suggestions, setSuggestions] = useState<MentionData[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // DEBUG: Log props on mount and input changes
  React.useEffect(() => {
    console.log('MentionInput mounted with props:', { users, files, usersLength: users.length, filesLength: files.length })
  }, [users, files])

  React.useEffect(() => {
    console.log('Value changed:', value, 'Contains @:', value.includes('@'))
  }, [value])

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
      
      if (id === 'nova-ai') {
        mentionData = NOVA_AI
      } else {
        mentionData = [...users, ...files].find(item => item.id === id)
      }
      
      if (mentionData) {
        mentions.push(mentionData)
        cleanText = cleanText.replace(fullMatch, `@${name}`)
      }
    }

    return { text: cleanText, mentions }
  }

  // Get all available mention options
  const getAllMentions = (): MentionData[] => {
    return [NOVA_AI, ...users, ...files]
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

  // Handle input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart || 0
    
    setCursorPosition(cursorPos)
    
    // Check if we're typing a mention
    const beforeCursor = newValue.substring(0, cursorPos)
    const mentionMatch = beforeCursor.match(/@([^@\s]*)$/)
    
    console.log('Input changed:', { newValue, beforeCursor, mentionMatch })
    
    if (mentionMatch) {
      const query = mentionMatch[1]
      const filteredSuggestions = filterSuggestions(query)
      console.log('Mention detected:', { query, filteredSuggestions, allMentions: getAllMentions() })
      
      setSuggestionQuery(query)
      setSuggestions(filteredSuggestions)
      setShowSuggestions(true)
      setSelectedIndex(0)
    } else {
      setShowSuggestions(false)
    }

    const parsed = parseContent(newValue)
    onChange(newValue, parsed.mentions)
  }

  // Handle key down events
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
    const input = inputRef.current
    if (!input) return

    const beforeCursor = value.substring(0, cursorPosition)
    const afterCursor = value.substring(cursorPosition)
    
    // Find the @ symbol that started the mention
    const mentionStart = beforeCursor.lastIndexOf('@')
    if (mentionStart === -1) return

    const beforeMention = value.substring(0, mentionStart)
    const mentionText = `@[${mention.name}](${mention.id})`
    const newValue = beforeMention + mentionText + afterCursor

    const parsed = parseContent(newValue)
    onChange(newValue, parsed.mentions)
    
    setShowSuggestions(false)
    
    // Set cursor position after the mention
    setTimeout(() => {
      const newCursorPos = beforeMention.length + mentionText.length
      input.setSelectionRange(newCursorPos, newCursorPos)
      input.focus()
    }, 0)
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
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      
      {/* Always show popup when typing @ */}
      {value.includes('@') && (
        <div 
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-[10000] min-w-[300px]"
          style={{
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          <div className="text-sm font-semibold mb-2 text-blue-600">
            🎯 Mention Someone!
          </div>
          
          {/* Nova AI */}
          <div 
            className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer rounded"
            onClick={() => insertMention(NOVA_AI)}
          >
            <Bot className="h-4 w-4 text-blue-500" />
            <span>Nova AI - AI Assistant</span>
          </div>
          
          {/* Users */}
          {users.map(user => (
            <div 
              key={user.id}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer rounded"
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
              className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer rounded"
              onClick={() => insertMention(file)}
            >
              <FileText className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm">{file.name}</div>
                <div className="text-xs text-gray-500">File</div>
              </div>
            </div>
          ))}
          
          <div className="text-xs text-gray-400 mt-2">
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
}

export function MessageWithMentions({ 
  content, 
  mentions = [], 
  className = "" 
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
      const mentionData = mentions.find(m => m.id === id) || NOVA_AI
      
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
          </span>
        )
      }
      
      // Add mention chip
      parts.push(
        <Badge
          key={`mention-${id}-${match.index}`}
          variant="secondary"
          className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 text-xs"
        >
          {getMentionIcon(mentionData)}
          <span>{name}</span>
        </Badge>
      )
      
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

function getMentionIcon(mention: MentionData) {
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
