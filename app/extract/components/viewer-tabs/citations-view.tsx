/**
 * Extract Data v2 - Citations View Tab
 * Phase 0: Empty state placeholder (citations detection in Phase 2)
 */

import React from 'react';
import { ExternalLink, Copy, BookOpen } from 'lucide-react';

interface Citation {
  kind: 'doi' | 'url' | 'ref';
  value: string;
  title?: string;
}

interface CitationsViewProps {
  citations?: Citation[];
}

export function CitationsView({ citations = [] }: CitationsViewProps) {
  const handleOpenCitation = (citation: Citation) => {
    if (citation.kind === 'url') {
      window.open(citation.value, '_blank', 'noopener,noreferrer');
    } else if (citation.kind === 'doi') {
      window.open(`https://doi.org/${citation.value}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyCitation = async (citation: Citation) => {
    try {
      await navigator.clipboard.writeText(citation.value);
      // TODO: Add toast notification in Phase 2
    } catch (err) {
      console.error('Failed to copy citation:', err);
    }
  };

  if (citations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4 text-lg font-medium">No Citations Found</div>
          <div className="mt-1 text-sm">
            Citations and references will appear here after document processing.
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Supports DOIs, URLs, and reference patterns
          </div>
        </div>
      </div>
    );
  }

  // Group citations by type
  const groupedCitations = citations.reduce((acc, citation) => {
    if (!acc[citation.kind]) {
      acc[citation.kind] = [];
    }
    acc[citation.kind].push(citation);
    return acc;
  }, {} as Record<string, Citation[]>);

  const getCitationIcon = (kind: string) => {
    switch (kind) {
      case 'doi':
        return <BookOpen className="h-4 w-4" />;
      case 'url':
        return <ExternalLink className="h-4 w-4" />;
      case 'ref':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getCitationLabel = (kind: string) => {
    switch (kind) {
      case 'doi':
        return 'DOIs';
      case 'url':
        return 'URLs';
      case 'ref':
        return 'References';
      default:
        return 'Citations';
    }
  };

  return (
    <div className="h-full overflow-auto bg-white p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Citations & References ({citations.length})
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Extracted citations, DOIs, URLs, and references from the document.
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedCitations).map(([kind, citationList]) => (
          <div key={kind}>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900">
              {getCitationIcon(kind)}
              {getCitationLabel(kind)} ({citationList.length})
            </h4>
            
            <div className="space-y-2">
              {citationList.map((citation, index) => (
                <div
                  key={`${citation.kind}-${index}`}
                  className="flex items-start justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    {citation.title && (
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {citation.title}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 break-all">
                      {citation.value}
                    </div>
                    <div className="mt-1 text-xs text-gray-400 uppercase">
                      {citation.kind}
                    </div>
                  </div>
                  
                  <div className="ml-3 flex items-center gap-1">
                    {(citation.kind === 'url' || citation.kind === 'doi') && (
                      <button
                        onClick={() => handleOpenCitation(citation)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Open"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyCitation(citation)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
