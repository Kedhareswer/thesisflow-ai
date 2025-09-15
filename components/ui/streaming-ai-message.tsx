"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { 
  Bot, 
  Sparkles, 
  Copy, 
  Check,
  Loader2,
  MoreVertical,
  Reply,
  Pin,
  Brain
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MessageWithMentions } from './mention-input'
import { MarkdownRenderer } from './markdown-renderer'

interface StreamingAIMessageProps {
  messageId: string
  isStreaming: boolean
  content: string
  timestamp: string
  onComplete?: (finalContent: string) => void
  onReply?: (messageId: string) => void
  onPin?: (messageId: string) => void
  onAIAssist?: (messageId: string, context: string) => void
  className?: string
}

export function StreamingAIMessage({
  messageId,
  isStreaming,
  content,
  timestamp,
  onComplete,
  onReply,
  onPin,
  onAIAssist,
  className
}: StreamingAIMessageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const [displayedContent, setDisplayedContent] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLSpanElement>(null)

  // Typewriter effect for streaming content
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content)
      onComplete?.(content)
      return
    }

    let currentIndex = 0
    const typewriterInterval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedContent(content.slice(0, currentIndex + 1))
        currentIndex++
        
        // Scroll to bottom as content grows
        if (contentRef.current) {
          contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
      } else {
        clearInterval(typewriterInterval)
        onComplete?.(content)
      }
    }, 5) // Much faster typewriter effect

    return () => clearInterval(typewriterInterval)
  }, [content, isStreaming, onComplete])

  // Cursor blinking effect
  useEffect(() => {
    if (!isStreaming) return

    const cursorInterval = setInterval(() => {
      if (cursorRef.current) {
        cursorRef.current.style.opacity = cursorRef.current.style.opacity === '0' ? '1' : '0'
      }
    }, 500)

    return () => clearInterval(cursorInterval)
  }, [isStreaming])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const formatTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return '00:00'
    }
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "group relative flex gap-3 px-4 py-1 hover:bg-muted/30 transition-colors border-l-2 border-l-transparent border-l-blue-500/20",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* AI Avatar */}
        <div className="flex-shrink-0">
          <div className="relative">
            <Avatar className="h-8 w-8 ring-2 ring-blue-500">
              <AvatarImage src="/assistant-avatar.svg" />
              <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                <Bot className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            {isStreaming && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-background animate-pulse">
                <Loader2 className="w-2 h-2 text-white animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-blue-600 dark:text-blue-400">
              Nova Assistant
            </span>
            <Sparkles className="w-3 h-3 text-blue-500" />
            <Badge variant="outline" className="text-xs px-1.5 py-0 text-blue-600 border-blue-300">
              {isStreaming ? 'thinking...' : 'online'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatTime(timestamp)}
            </span>
          </div>

          {/* Message Body */}
          <div 
            ref={contentRef}
            className="text-sm text-foreground leading-relaxed"
          >
            <MarkdownRenderer 
              content={displayedContent} 
              className=""
            />
            {isStreaming && (
              <span 
                ref={cursorRef}
                className="inline-block w-0.5 h-4 bg-blue-500 ml-1 animate-pulse"
                style={{ opacity: 1 }}
              />
            )}
          </div>

          {/* Message Actions */}
          {isHovered && !isStreaming && (
            <div className="absolute -top-2 right-4 bg-background border rounded-lg shadow-lg flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? 'Copied!' : 'Copy message'}</p>
                </TooltipContent>
              </Tooltip>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onReply?.(messageId)}
              >
                <Reply className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onAIAssist?.(messageId, content)}
                title="Ask Nova about this"
              >
                <Brain className="h-3 w-3 text-blue-500" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onPin?.(messageId)}
              >
                <Pin className="h-3 w-3" />
              </Button>
              
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
