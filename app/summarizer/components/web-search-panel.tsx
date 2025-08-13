"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Loader2, Search, Globe, ExternalLink } from "lucide-react"
import { ErrorHandler, type UserFriendlyError } from "@/lib/utils/error-handler"
import { InlineError } from "./error-display"

interface SearchResult {
  title: string;
  url: string;
  description: string;
  source: string;
}

interface WebSearchPanelProps {
  onSelectUrl: (url: string) => void;
}

export function WebSearchPanel({ onSelectUrl }: WebSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UserFriendlyError | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/search/web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle structured error responses from the error handling system
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
          setError(structuredError);
          return;
        }
        
        // Fallback for legacy error responses
        throw new Error(errorData.error || `Failed to search: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || []);
      
      if (data.results?.length === 0) {
        const noResultsError = ErrorHandler.processError(
          "No results found for your search query",
          {
            operation: 'web-search-no-results'
          }
        );
        setError(noResultsError);
      }
    } catch (error) {
      console.error("Search error:", error);
      const processedError = ErrorHandler.processError(error, {
        operation: 'web-search'
      });
      setError(processedError);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelectResult = (url: string, index: number) => {
    setSelectedIndex(index);
    
    // Add a small delay to show the selection animation
    setTimeout(() => {
      onSelectUrl(url);
      
      // Reset selection after a moment
      setTimeout(() => {
        setSelectedIndex(null);
      }, 2000);
    }, 300);
  };

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium flex items-center">
          <Globe className="h-4 w-4 mr-2" />
          Smart Web Search
        </CardTitle>
        <CardDescription>
          Search for articles, research papers, or news to automatically summarize
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search for topics, articles, research papers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-gray-50 pr-10 focus:bg-white border-gray-200 focus:ring-0 focus:border-gray-300 transition-all"
                disabled={loading}
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                </div>
              )}
            </div>
            <Button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || loading}
              className="bg-gray-900 hover:bg-gray-800"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <InlineError error={error} className="mt-2" />
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-4">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-gray-500" />
              <p className="text-sm text-gray-500">Searching the web...</p>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="space-y-3 mt-2">
              <p className="text-xs text-gray-500 font-medium">
                {results.length} results found
              </p>
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-3 border rounded-lg transition-all duration-300 ${selectedIndex === index 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-sm line-clamp-1">{result.title}</h3>
                      <p className="text-xs text-gray-500 mb-1">{result.source}</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 px-2 text-xs ${selectedIndex === index ? 'bg-green-100 text-green-700' : ''}`}
                        onClick={() => handleSelectResult(result.url, index)}
                        disabled={selectedIndex !== null}
                      >
                        {selectedIndex === index ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Using...
                          </>
                        ) : (
                          'Use'
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
                  <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                    {result.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && searchQuery.trim() !== "" && !error && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">
                No results found. Try different search terms.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
