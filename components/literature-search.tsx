'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, ExternalLink, Clock, Database, Zap, BookOpen, Users, Calendar, Quote } from 'lucide-react';
import { useLiteratureSearch, Paper } from '@/hooks/use-literature-search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface LiteratureSearchProps {
  userId?: string;
  className?: string;
  onPaperSelect?: (paper: Paper) => void;
  defaultQuery?: string;
  maxResults?: number;
  sessionId?: string;
}

export function LiteratureSearch({
  userId,
  className = '',
  onPaperSelect,
  defaultQuery = '',
  maxResults = 10,
  sessionId
}: LiteratureSearchProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    results,
    isLoading,
    error,
    searchTime,
    source,
    cached,
    rateLimitInfo,
    search,
    searchWithDebounce,
    clearResults,
    retry,
    isRateLimited,
    aggregateWindowMs
  } = useLiteratureSearch({
    defaultLimit: maxResults,
    debounceMs: 1200,
    aggregateWindowMs: 120000, // 2 minutes
    ignoreWhileAggregating: true,
    sessionId,
    autoPreloadSession: true,
    userIdForSession: userId,
    onSuccess: (result) => {
      console.log(`Literature search completed in ${result.searchTime}ms from ${result.source}`);
    },
    onError: (error) => {
      console.error('Literature search error:', error);
    }
  });

  useEffect(() => {
    if (defaultQuery) {
      setQuery(defaultQuery);
      search(defaultQuery, maxResults, userId);
    }
  }, [defaultQuery, maxResults, userId, search]);

  const handleSearch = () => {
    if (query.trim().length >= 3) {
      search(query, maxResults, userId);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length >= 3) {
      searchWithDebounce(value, maxResults, userId);
    } else if (value.trim().length === 0) {
      clearResults();
    }
  };

  const handlePaperClick = (paper: Paper) => {
    setSelectedPaper(paper);
    if (onPaperSelect) {
      onPaperSelect(paper);
    }
  };

  const getSourceBadge = (source: string, cached: boolean) => {
    const sourceConfig = {
      openalex: { label: 'OpenAlex', color: 'bg-blue-100 text-blue-800' },
      arxiv: { label: 'arXiv', color: 'bg-green-100 text-green-800' },
      crossref: { label: 'CrossRef', color: 'bg-purple-100 text-purple-800' },
      combined: { label: 'Multiple', color: 'bg-orange-100 text-orange-800' },
      aggregate: { label: 'Multiple Sources', color: 'bg-orange-100 text-orange-800' },
      'openalex-fast': { label: 'OpenAlex Fast', color: 'bg-blue-100 text-blue-800' },
      'openalex-fallback': { label: 'OpenAlex', color: 'bg-blue-100 text-blue-800' },
      'arxiv-fallback': { label: 'arXiv', color: 'bg-green-100 text-green-800' }
    };

    const config = sourceConfig[source as keyof typeof sourceConfig] || {
      label: source,
      color: 'bg-gray-100 text-gray-800'
    };

    return (
      <div className="flex items-center gap-1">
        <Badge className={`${config.color} text-xs`}>
          {config.label}
        </Badge>
        {cached && (
          <Badge className="bg-yellow-100 text-yellow-800 text-xs">
            <Database className="w-3 h-3 mr-1" />
            Cached
          </Badge>
        )}
      </div>
    );
  };

  const formatSearchTime = (time: number) => {
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(1)}s`;
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Enhanced Literature Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Enter your research query (e.g., 'machine learning in healthcare')..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
                disabled={isLoading || isRateLimited}
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isLoading || query.trim().length < 3 || isRateLimited}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Searching...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </div>
              )}
            </Button>
          </div>

          {/* Aggregation hint */}
          {isLoading && aggregateWindowMs > 0 && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Aggregating results from multiple sources (up to {Math.round(aggregateWindowMs / 60000)} min)...
            </div>
          )}

          {/* Search Stats */}
          {(results.length > 0 || searchTime > 0) && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {results.length} papers found
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatSearchTime(searchTime)}
                </span>
                {getSourceBadge(source, cached)}
              </div>
              {rateLimitInfo && (
                <span className="text-xs text-gray-500">
                  Rate limit: {rateLimitInfo.remaining}/{rateLimitInfo.limit}
                </span>
              )}
            </div>
          )}

          {/* Rate Limited Warning */}
          {isRateLimited && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                You've reached the search limit. Please try again in a few minutes.
                {rateLimitInfo && (
                  <span className="block mt-1 text-xs">
                    Reset time: {new Date(rateLimitInfo.resetTime).toLocaleTimeString()}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={retry} disabled={isRateLimited}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-16 w-full mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !isLoading && (
        <div className="space-y-4">
          {results.map((paper, index) => (
            <Card 
              key={paper.id || index} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handlePaperClick(paper)}
            >
              <CardContent className="p-6">
                <div className="space-y-3">
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                    {paper.title || 'Untitled'}
                  </h3>

                  {/* Authors and Year */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {paper.authors.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {paper.authors.slice(0, 3).join(', ')}
                        {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                      </span>
                    )}
                    {paper.year && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {paper.year}
                      </span>
                    )}
                    {paper.citations > 0 && (
                      <span className="flex items-center gap-1">
                        <Quote className="h-4 w-4" />
                        {paper.citations.toLocaleString()} citations
                      </span>
                    )}
                  </div>

                  {/* Abstract */}
                  {paper.abstract && (
                    <p className="text-gray-700 leading-relaxed">
                      {truncateText(paper.abstract)}
                    </p>
                  )}

                  {/* Journal and Links */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {paper.journal && (
                        <Badge variant="outline" className="text-xs">
                          {paper.journal}
                        </Badge>
                      )}
                      <Badge className={`text-xs ${
                        paper.source === 'openalex' ? 'bg-blue-100 text-blue-800' :
                        paper.source === 'arxiv' ? 'bg-green-100 text-green-800' :
                        paper.source === 'crossref' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {paper.source}
                      </Badge>
                    </div>

                    {paper.url && (
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Paper
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {results.length === 0 && !isLoading && !error && query.trim().length >= 3 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No papers found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search terms or using different keywords.
            </p>
            <Button variant="outline" onClick={retry} disabled={isRateLimited}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Getting Started Help */}
      {query.trim().length === 0 && results.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <BookOpen className="h-12 w-12 text-blue-500 mx-auto" />
              <h3 className="text-lg font-semibold">Start Your Literature Search</h3>
              <p className="text-gray-600">
                Search across millions of research papers from OpenAlex, arXiv, and CrossRef.
                Get results in seconds with intelligent caching and parallel API calls.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQueryChange('machine learning')}
                >
                  machine learning
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQueryChange('artificial intelligence')}
                >
                  artificial intelligence
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQueryChange('neural networks')}
                >
                  neural networks
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
