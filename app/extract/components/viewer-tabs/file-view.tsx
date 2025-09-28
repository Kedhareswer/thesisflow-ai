/**
 * Extract Data v2 - File View Tab
 * Phase 0: Mounts existing search/zoom preview from current page
 */

import React, { useRef, useState } from 'react';
import { ChevronDown, MoreHorizontal, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FileViewProps {
  previewLoading: boolean;
  previewType: 'pdf' | 'image' | 'text' | 'csv' | 'none' | 'unsupported';
  previewUrl?: string;
  previewText?: string;
  searchQuery: string;
  currentMatch: number;
  zoom: number;
  showZoomMenu: boolean;
  onSearchChange: (query: string) => void;
  onNextMatch: (totalMatches: number) => void;
  onPrevMatch: (totalMatches: number) => void;
  onZoomChange: (zoom: number) => void;
  onShowZoomMenu: (show: boolean) => void;
  onExplainMathTables: () => void;
  renderHighlightedText: (text: string, query: string) => React.ReactNode;
  countOccurrences: (text: string, query: string) => number;
  matchRefs: React.MutableRefObject<HTMLElement[]>;
}

export function FileView({
  previewLoading,
  previewType,
  previewUrl,
  previewText,
  searchQuery,
  currentMatch,
  zoom,
  showZoomMenu,
  onSearchChange,
  onNextMatch,
  onPrevMatch,
  onZoomChange,
  onShowZoomMenu,
  onExplainMathTables,
  renderHighlightedText,
  countOccurrences,
  matchRefs,
}: FileViewProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-200 p-3">
        <button 
          onClick={onExplainMathTables} 
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Sparkles className="h-4 w-4 text-purple-600" />
          Explain math & table
        </button>
        
        <div className="relative ml-1 flex-1">
          <div className="flex items-center gap-2">
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search in file"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {(previewType === 'text' || previewType === 'csv') && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <button
                  onClick={() => onPrevMatch(countOccurrences(previewText || '', searchQuery))}
                  className="rounded border border-gray-200 bg-white px-2 py-1 hover:bg-gray-50"
                  title="Previous"
                >
                  Prev
                </button>
                <span className="min-w-[70px] text-center">
                  {searchQuery ? `${Math.min(currentMatch + 1, Math.max(1, countOccurrences(previewText || '', searchQuery)))} / ${countOccurrences(previewText || '', searchQuery)}` : ''}
                </span>
                <button
                  onClick={() => onNextMatch(countOccurrences(previewText || '', searchQuery))}
                  className="rounded border border-gray-200 bg-white px-2 py-1 hover:bg-gray-50"
                  title="Next"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Zoom control */}
        <div className="relative">
          <button
            onClick={() => onShowZoomMenu(!showZoomMenu)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            {zoom}%
            <ChevronDown className="h-4 w-4" />
          </button>
          {showZoomMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-24 overflow-hidden rounded-md border border-gray-200 bg-white shadow">
              {[50, 80, 100, 125, 150].map((z) => (
                <button
                  key={z}
                  onClick={() => { 
                    onZoomChange(z); 
                    onShowZoomMenu(false); 
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${zoom === z ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  {z}%
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-[#FAFAFA]">
        <div className="mx-auto max-w-4xl px-4 py-4">
          {previewLoading && (
            <div className="h-[580px] w-full overflow-hidden rounded-md border bg-white p-4">
              <div className="space-y-3">
                <Skeleton className="h-5 w-1/3" />
                {Array.from({ length: 14 }).map((_, i) => (
                  <Skeleton key={i} className={`h-4 ${i % 3 === 0 ? 'w-5/6' : i % 3 === 1 ? 'w-3/4' : 'w-full'}`} />
                ))}
              </div>
            </div>
          )}
          
          {!previewLoading && previewType === 'pdf' && previewUrl && (
            <iframe
              src={`${previewUrl}#toolbar=0&zoom=${zoom}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
              className="h-[580px] w-full rounded-md border"
              title="PDF Preview"
            />
          )}
          
          {!previewLoading && previewType === 'image' && previewUrl && (
            <div className="h-[580px] w-full overflow-auto rounded-md border bg-white p-2">
              <img
                src={previewUrl}
                alt="Image preview"
                className="rounded"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
              />
            </div>
          )}
          
          {!previewLoading && previewType === 'text' && typeof previewText === 'string' && (
            <pre
              className="h-[580px] w-full overflow-auto rounded-md border bg-white p-4 text-gray-800 whitespace-pre-wrap"
              style={{ fontSize: `${zoom}%` }}
            >
              {renderHighlightedText(previewText, searchQuery)}
            </pre>
          )}
          
          {!previewLoading && previewType === 'csv' && typeof previewText === 'string' && (
            <div className="h-[580px] w-full overflow-auto rounded-md border bg-white p-4" style={{ fontSize: `${zoom}%` }}>
              <table className="min-w-full border-collapse text-sm">
                <tbody>
                  {previewText.split('\n').slice(0, 100).map((line, i) => (
                    <tr key={i}>
                      {line.split(',').map((cell, j) => {
                        if (!searchQuery) return (
                          <td key={j} className="border px-2 py-1">{cell}</td>
                        );
                        // highlight matches in cell
                        const parts: React.ReactNode[] = [];
                        const lower = cell.toLowerCase();
                        const q = searchQuery.toLowerCase();
                        let k = 0;
                        let pos = 0;
                        while (true) {
                          const idx = lower.indexOf(q, pos);
                          if (idx === -1) break;
                          parts.push(cell.slice(pos, idx));
                          const seg = cell.slice(idx, idx + q.length);
                          parts.push(
                            <mark
                              key={`c-${i}-${j}-${k++}`}
                              ref={(el) => { if (el) matchRefs.current.push(el); }}
                              className="bg-yellow-200 px-0.5"
                            >
                              {seg}
                            </mark>
                          );
                          pos = idx + q.length;
                        }
                        parts.push(cell.slice(pos));
                        return (
                          <td key={j} className="border px-2 py-1">{parts}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {!previewLoading && (previewType === 'none' || previewType === 'unsupported') && (
            <div className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              No preview available. Upload a supported file to preview it here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
