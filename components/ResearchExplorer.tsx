import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Paper {
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  url: string;
  citations: number;
  journal: string;
}

interface Author {
  name: string;
  affiliation: string;
  interests: string[];
  citations: number;
  publications: number;
}

export function ResearchExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [authorQuery, setAuthorQuery] = useState('');
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchPapers = async () => {
    if (!searchQuery) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:8000/api/scholarly/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery, limit: 10 }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch papers');
      }
      
      const data = await response.json();
      setPapers(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const searchAuthor = async () => {
    if (!authorQuery) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:8000/api/scholarly/author', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: authorQuery }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch author information');
      }
      
      const data = await response.json();
      setAuthor(data.author);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Research Explorer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Search Papers</h3>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter search query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button onClick={searchPapers} disabled={loading}>
                Search
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Search Author</h3>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter author name..."
                value={authorQuery}
                onChange={(e) => setAuthorQuery(e.target.value)}
              />
              <Button onClick={searchAuthor} disabled={loading}>
                Search
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-red-500">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-gray-500">
              Loading...
            </div>
          )}

          {author && (
            <Card>
              <CardHeader>
                <CardTitle>{author.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p><strong>Affiliation:</strong> {author.affiliation}</p>
                <p><strong>Citations:</strong> {author.citations}</p>
                <p><strong>Publications:</strong> {author.publications}</p>
                <div className="mt-2">
                  <strong>Research Interests:</strong>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {author.interests.map((interest, index) => (
                      <Badge key={index} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {papers.map((paper, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {paper.title}
                      </a>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      {paper.authors.join(', ')} ({paper.year})
                    </p>
                    <p className="mt-2">{paper.abstract}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <Badge variant="outline">
                        {paper.journal}
                      </Badge>
                      <Badge variant="secondary">
                        Citations: {paper.citations}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 