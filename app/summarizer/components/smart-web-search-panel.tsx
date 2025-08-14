"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Loader2, 
  ExternalLink, 
  Clock, 
  Bookmark,
  BookmarkCheck,
  History,
  Trash2,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { ErrorHandler, type UserFriendlyError } from "@/lib/utils/error-handler"
import { InlineError } from "./error-display"

export interface SearchResult {
  title: string
  url: string
  description: string
  source: string
}

interface SearchHistoryItem {
  query: string
  timestamp: Date
  resultCount: number
}

interface SavedSearch {
  id: string
  query: string
  name: string
  timestamp: Date
}

interface SmartWebSearchPanelProps {
  onResultSelect: (result: SearchResult) => void
  className?: string
  placeholder?: string
  maxResults?: number
  showHistory?: boolean
  showSavedSearches?: boolean
}

const STORAGE_KEYS = {
  SEARCH_HISTORY: 'summarizer_search_history',
  SAVED_SEARCHES: 'summarizer_saved_searches'
}

// Utility functions for localStorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

export function SmartWebSearchPanel({
  onResultSelect,
  className = "",
  placeholder = "Search for topics, articles, research papers...",
  maxResults = 10,
  showHistory = true,
  showSavedSearches = true
}: SmartWebSearchPanelProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<UserFriendlyError | null>(null)
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null)

  // History and saved searches state
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)
  const [showSavedPanel, setShowSavedPanel] = useState(false)

  // Auto-complete suggestions
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Load history and saved searches on mount
  useEffect(() => {
    const history = loadFromStorage<SearchHistoryItem[]>(STORAGE_KEYS.SEARCH_HISTORY, [])
    const saved = loadFromStorage<SavedSearch[]>(STORAGE_KEYS.SAVED_SEARCHES, [])
    
    setSearchHistory(history)
    setSavedSearches(saved)
  }, [])

  // Generate auto-complete suggestions based on search history
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const matchingSuggestions = searchHistory
        .filter(item => 
          item.query.toLowerCase().includes(searchQuery.toLowerCase()) &&
          item.query.toLowerCase() !== searchQuery.toLowerCase()
        )
        .slice(0, 5)
        .map(item => item.query)
      
      setSuggestions(matchingSuggestions)
      setShowSuggestions(matchingSuggestions.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchQuery, searchHistory])

  // Perform web search
  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResults([])
    setShowSuggestions(false)

    try {
      const response = await fetch("/api/search/web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (errorData.userMessage) {
          const structuredError: UserFriendlyError = {
            title: errorData.error || "Search Failed",
            message: errorData.userMessage,
            actions: errorData.actions || [],
            fallbackOptions: errorData.fallbackOptions,
            helpLinks: errorData.helpLinks,
            errorType: errorData.errorType || 'network',
            technicalDetails: errorData.technicalDetails
          }
          setSearchError(structuredError)
          return
        }

        throw new Error(errorData.error || `Failed to search: ${response.status}`)
      }

      const data = await response.json()
      const results = (data.results || []).slice(0, maxResults)
      setSearchResults(results)

      // Add to search history
      const historyItem: SearchHistoryItem = {
        query: query.trim(),
        timestamp: new Date(),
        resultCount: results.length
      }

      const updatedHistory = [
        historyItem,
        ...searchHistory.filter(item => item.query !== query.trim())
      ].slice(0, 20) // Keep only last 20 searches

      setSearchHistory(updatedHistory)
      saveToStorage(STORAGE_KEYS.SEARCH_HISTORY, updatedHistory)

      if (results.length === 0) {
        const noResultsError = ErrorHandler.processError(
          "No results found for your search query",
          { operation: 'web-search-no-results' }
        )
        setSearchError(noResultsError)
      }
    } catch (error) {
      console.error("Search error:", error)
      const processedError = ErrorHandler.processError(error, {
        operation: 'web-search'
      })
      setSearchError(processedError)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle result selection
  const handleResultSelect = (result: SearchResult, index: number) => {
    setSelectedResultIndex(index)
    
    // Add a small delay to show the selection animation
    setTimeout(() => {
      onResultSelect(result)
      
      // Reset selection after a moment
      setTimeout(() => {
        setSelectedResultIndex(null)
      }, 2000)
    }, 300)
  }

  // Save search for later
  const handleSaveSearch = (query: string) => {
    // Check if query is already saved
    const existingSaved = savedSearches.find(saved => saved.query.toLowerCase() === query.toLowerCase())
    if (existingSaved) {
      // Update timestamp of existing saved search and move to top
      const updatedSaved = [
        { ...existingSaved, timestamp: new Date() },
        ...savedSearches.filter(saved => saved.id !== existingSaved.id)
      ].slice(0, 10)
      setSavedSearches(updatedSaved)
      saveToStorage(STORAGE_KEYS.SAVED_SEARCHES, updatedSaved)
      return
    }

    const savedSearch: SavedSearch = {
      id: Date.now().toString(),
      query,
      name: query.length > 30 ? query.substring(0, 30) + "..." : query,
      timestamp: new Date()
    }

    const updatedSaved = [savedSearch, ...savedSearches].slice(0, 10) // Keep only 10 saved searches
    setSavedSearches(updatedSaved)
    saveToStorage(STORAGE_KEYS.SAVED_SEARCHES, updatedSaved)
  }

  // Remove saved search
  const handleRemoveSavedSearch = (id: string) => {
    const updatedSaved = savedSearches.filter(search => search.id !== id)
    setSavedSearches(updatedSaved)
    saveToStorage(STORAGE_KEYS.SAVED_SEARCHES, updatedSaved)
  }

  // Clear search history
  const handleClearHistory = () => {
    setSearchHistory([])
    saveToStorage(STORAGE_KEYS.SEARCH_HISTORY, [])
  }

  return (
    <Card className={`border-gray-200 bg-white ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-light text-black tracking-tight flex items-center">
          <Search className="h-5 w-5 mr-2" />
          Smart Web Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSearching) {
                    handleSearch()
                  } else if (e.key === "Escape") {
                    setShowSuggestions(false)
                  }
                }}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black text-gray-900 placeholder:text-gray-400 h-10 font-light"
              />
              
              {/* Auto-complete suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {suggestions.map((suggestion, suggestionIndex) => (
                    <button
                      key={suggestionIndex}
                      onClick={() => {
                        setSearchQuery(suggestion)
                        setShowSuggestions(false)
                        handleSearch(suggestion)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-2 text-gray-400" />
                        {suggestion}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <Button
              onClick={() => handleSearch()}
              disabled={isSearching || !searchQuery.trim()}
              variant="outline"
              className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 px-5 bg-white h-10 font-light"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Search Error */}
        {searchError && (
          <InlineError error={searchError} />
        )}

        {/* Search Loading */}
        {isSearching && (
          <div className="text-center py-6">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-gray-500" />
            <p className="text-sm text-gray-500 font-light">Searching the web...</p>
          </div>
        )}

        {/* Search Results */}
        {!isSearching && searchResults.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 font-medium">
                {searchResults.length} results found
              </p>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSaveSearch(searchQuery)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {savedSearches.some(saved => saved.query.toLowerCase() === searchQuery.toLowerCase()) ? (
                    <>
                      <BookmarkCheck className="h-3 w-3 mr-1" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3 w-3 mr-1" />
                      Save Search
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg transition-all duration-300 ${
                    selectedResultIndex === index
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 line-clamp-1 mb-1">
                        {result.title}
                      </h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {result.source}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {result.description}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-7 px-3 text-xs whitespace-nowrap ${
                          selectedResultIndex === index 
                            ? 'bg-green-100 text-green-700 border-green-300' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleResultSelect(result, index)}
                        disabled={selectedResultIndex !== null}
                      >
                        {selectedResultIndex === index ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Using...
                          </>
                        ) : (
                          'Use Content'
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        asChild
                      >
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search History Panel */}
        {showHistory && searchHistory.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <div className="flex items-center">
                <History className="h-4 w-4 mr-2" />
                Recent Searches ({searchHistory.length})
              </div>
              {showHistoryPanel ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {showHistoryPanel && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Last {Math.min(searchHistory.length, 10)} searches
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearHistory}
                    className="text-xs text-gray-500 hover:text-red-600 h-6 px-2"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>
                
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {searchHistory.slice(0, 10).map((item, historyIndex) => (
                    <button
                      key={`${item.query}-${item.timestamp.getTime()}`}
                      onClick={() => {
                        setSearchQuery(item.query)
                        handleSearch(item.query)
                      }}
                      className="w-full text-left p-2 text-xs bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700 truncate">
                          {item.query}
                        </span>
                        <span className="text-gray-500 ml-2 flex-shrink-0">
                          {item.resultCount} results
                        </span>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {new Date(item.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saved Searches Panel */}
        {showSavedSearches && savedSearches.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowSavedPanel(!showSavedPanel)}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <div className="flex items-center">
                <BookmarkCheck className="h-4 w-4 mr-2" />
                Saved Searches ({savedSearches.length})
              </div>
              {showSavedPanel ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {showSavedPanel && (
              <div className="mt-3 space-y-2">
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {savedSearches.map((saved) => (
                    <div
                      key={saved.id}
                      className="flex items-center justify-between p-2 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors group"
                    >
                      <button
                        onClick={() => {
                          setSearchQuery(saved.query)
                          handleSearch(saved.query)
                        }}
                        className="flex-1 text-left min-w-0"
                        title={saved.query}
                      >
                        <div className="text-xs font-medium text-blue-700 truncate">
                          {saved.name}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          {new Date(saved.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveSavedSearch(saved.id)
                        }}
                        className="h-6 w-6 p-0 text-blue-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove saved search"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Usage Tips */}
        {!isSearching && searchResults.length === 0 && !searchError && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Search Tips
            </h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Use specific keywords for better results</li>
              <li>• Try academic terms for research papers</li>
              <li>• Include quotes for exact phrases</li>
              <li>• Save frequently used searches for quick access</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}