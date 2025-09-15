"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Search, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Calendar,
  User,
  MessageSquare,
  Filter,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  teamId: string
  type: "text" | "system"
  senderAvatar?: string
}

export interface SearchResult {
  message: ChatMessage
  matchType: 'content' | 'sender' | 'exact'
  matchedText: string
  contextBefore?: string
  contextAfter?: string
}

interface ChatSearchProps {
  messages: ChatMessage[]
  isOpen: boolean
  onClose: () => void
  onMessageSelect: (messageId: string) => void
  className?: string
}

export function ChatSearch({ 
  messages, 
  isOpen, 
  onClose, 
  onMessageSelect,
  className 
}: ChatSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [currentResultIndex, setCurrentResultIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [searchFilters, setSearchFilters] = useState({
    searchInContent: true,
    searchInSender: true,
    caseSensitive: false,
    exactMatch: false,
    dateRange: 'all' // 'all', 'today', 'week', 'month'
  })
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Filter messages based on date range
  const getFilteredMessages = useCallback(() => {
    if (searchFilters.dateRange === 'all') return messages

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    let cutoffDate: Date
    switch (searchFilters.dateRange) {
      case 'today':
        cutoffDate = startOfDay
        break
      case 'week':
        cutoffDate = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        cutoffDate = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        return messages
    }

    return messages.filter(msg => new Date(msg.timestamp) >= cutoffDate)
  }, [messages, searchFilters.dateRange])

  // Perform search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setCurrentResultIndex(0)
      return
    }

    setIsLoading(true)
    
    try {
      const filteredMessages = getFilteredMessages()
      const results: SearchResult[] = []
      
      const searchTerm = searchFilters.caseSensitive ? query : query.toLowerCase()
      
      filteredMessages.forEach(message => {
        const content = searchFilters.caseSensitive ? message.content : message.content.toLowerCase()
        const senderName = searchFilters.caseSensitive ? message.senderName : message.senderName.toLowerCase()
        
        let matchType: SearchResult['matchType'] | null = null
        let matchedText = ''
        
        if (searchFilters.exactMatch) {
          if (searchFilters.searchInContent && content.includes(searchTerm)) {
            matchType = 'exact'
            matchedText = query
          } else if (searchFilters.searchInSender && senderName.includes(searchTerm)) {
            matchType = 'sender'
            matchedText = message.senderName
          }
        } else {
          // Fuzzy search
          if (searchFilters.searchInContent && content.includes(searchTerm)) {
            matchType = 'content'
            // Find the matched text with some context
            const index = content.indexOf(searchTerm)
            const start = Math.max(0, index - 20)
            const end = Math.min(content.length, index + searchTerm.length + 20)
            matchedText = message.content.substring(start, end)
          } else if (searchFilters.searchInSender && senderName.includes(searchTerm)) {
            matchType = 'sender'
            matchedText = message.senderName
          }
        }
        
        if (matchType) {
          results.push({
            message,
            matchType,
            matchedText,
            contextBefore: matchType === 'content' ? message.content.substring(0, content.indexOf(searchTerm)) : '',
            contextAfter: matchType === 'content' ? message.content.substring(content.indexOf(searchTerm) + searchTerm.length) : ''
          })
        }
      })
      
      // Sort by relevance (exact matches first, then by timestamp)
      results.sort((a, b) => {
        if (a.matchType === 'exact' && b.matchType !== 'exact') return -1
        if (b.matchType === 'exact' && a.matchType !== 'exact') return 1
        return new Date(b.message.timestamp).getTime() - new Date(a.message.timestamp).getTime()
      })
      
      setSearchResults(results)
      setCurrentResultIndex(0)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchFilters, getFilteredMessages])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchQuery, performSearch])

  // Navigate search results
  const navigateResult = useCallback((direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return
    
    let newIndex: number
    if (direction === 'next') {
      newIndex = currentResultIndex >= searchResults.length - 1 ? 0 : currentResultIndex + 1
    } else {
      newIndex = currentResultIndex <= 0 ? searchResults.length - 1 : currentResultIndex - 1
    }
    
    setCurrentResultIndex(newIndex)
    
    // Scroll to the result
    const resultId = searchResults[newIndex].message.id
    const resultElement = resultRefs.current[resultId]
    if (resultElement) {
      resultElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [searchResults, currentResultIndex])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && searchResults.length > 0) {
        if (e.shiftKey) {
          navigateResult('prev')
        } else {
          navigateResult('next')
        }
        e.preventDefault()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, navigateResult, searchResults])

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch {
      return 'Unknown time'
    }
  }

  // Highlight matched text
  const highlightMatch = (text: string, query: string, caseSensitive: boolean = false) => {
    if (!query.trim()) return text
    
    const searchTerm = caseSensitive ? query : query.toLowerCase()
    const textToSearch = caseSensitive ? text : text.toLowerCase()
    const index = textToSearch.indexOf(searchTerm)
    
    if (index === -1) return text
    
    const before = text.substring(0, index)
    const match = text.substring(index, index + query.length)
    const after = text.substring(index + query.length)
    
    return (
      <>
        {before}
        <mark className="bg-yellow-200 dark:bg-yellow-800 px-1 py-0.5 rounded">{match}</mark>
        {after}
      </>
    )
  }

  if (!isOpen) return null

  return (
    <div className={cn(
      "absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background/80">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="pl-10 pr-4"
          />
        </div>
        
        {/* Search Navigation */}
        {searchResults.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">
              {currentResultIndex + 1} of {searchResults.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateResult('prev')}
              disabled={searchResults.length === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateResult('next')}
              disabled={searchResults.length === 0}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {/* Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Search in</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={searchFilters.searchInContent}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, searchInContent: e.target.checked }))}
                    />
                    <span className="text-sm">Message content</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={searchFilters.searchInSender}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, searchInSender: e.target.checked }))}
                    />
                    <span className="text-sm">Sender names</span>
                  </label>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Options</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={searchFilters.caseSensitive}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                    />
                    <span className="text-sm">Case sensitive</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={searchFilters.exactMatch}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, exactMatch: e.target.checked }))}
                    />
                    <span className="text-sm">Exact match</span>
                  </label>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Time range</h4>
                <select 
                  value={searchFilters.dateRange}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="week">Past week</option>
                  <option value="month">Past month</option>
                </select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Searching...</div>
          </div>
        ) : searchQuery && searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No messages found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search terms or filters
            </p>
          </div>
        ) : searchResults.length > 0 ? (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {searchResults.map((result, index) => (
                <div
                  key={result.message.id}
                  ref={(el) => {
                    resultRefs.current[result.message.id] = el
                  }}
                  className={cn(
                    "border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md",
                    index === currentResultIndex ? "ring-2 ring-primary bg-primary/5" : "bg-card hover:bg-accent/50"
                  )}
                  onClick={() => onMessageSelect(result.message.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {highlightMatch(result.message.senderName, searchQuery, searchFilters.caseSensitive)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {result.matchType}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-foreground mb-2 line-clamp-3">
                        {result.matchType === 'content' ? (
                          highlightMatch(result.message.content, searchQuery, searchFilters.caseSensitive)
                        ) : (
                          result.message.content
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(result.message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Search messages</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Enter keywords to search through your team's message history. Use filters to narrow down results.
            </p>
            <div className="mt-4 text-xs text-muted-foreground">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+F</kbd> to focus search,{" "}
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> to navigate results
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
