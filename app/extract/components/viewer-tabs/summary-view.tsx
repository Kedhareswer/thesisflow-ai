/**
 * Extract Data v2 - Summary View Tab
 * Phase 0: Renders from extractedData props (reuses existing logic)
 */

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface SummaryViewProps {
  isExtracting: boolean;
  extractedData?: {
    summary?: string;
    keyPoints?: string[];
    statistics?: {
      totalWords: number;
      readingTime?: number;
    };
    metadata?: {
      wordCount?: number;
      pageCount?: number;
      fileType?: string;
      fileSize?: number;
    };
    aiSummarySource?: 'openrouter' | 'heuristic';
  };
}

export function SummaryView({ isExtracting, extractedData }: SummaryViewProps) {
  return (
    <div className="h-full overflow-auto bg-white p-4">
      <div className="prose prose-sm max-w-none">
        <h3 className="mb-2 font-semibold text-gray-900">
          {extractedData?.aiSummarySource === 'openrouter' ? 'AI Summary' : 'Summary'}
        </h3>
        
        {isExtracting && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className={`h-4 ${i % 3 === 0 ? 'w-5/6' : i % 3 === 1 ? 'w-3/4' : 'w-full'}`} />
            ))}
          </div>
        )}
        
        {!isExtracting && extractedData ? (
          <div>
            {extractedData.summary && (
              <p className="text-[15px] leading-7 text-gray-700">{extractedData.summary}</p>
            )}
            
            {Array.isArray(extractedData.keyPoints) && extractedData.keyPoints.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-1 font-semibold flex items-center gap-2">
                  <span>Key Points</span>
                  {extractedData?.aiSummarySource === 'openrouter' && (
                    <span className="inline-flex items-center rounded bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200">
                      AI
                    </span>
                  )}
                </h4>
                <ul className="list-disc pl-5 text-gray-700">
                  {extractedData.keyPoints.map((point: string, idx: number) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {extractedData.statistics && (
              <div className="mt-4 text-sm text-gray-600">
                <div>Total Words: {extractedData.statistics.totalWords}</div>
                {'readingTime' in extractedData.statistics && (
                  <div>Reading Time: {extractedData.statistics.readingTime} min</div>
                )}
              </div>
            )}
            
            {extractedData.metadata && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                {'wordCount' in extractedData.metadata && (
                  <div>Word Count: {extractedData.metadata.wordCount}</div>
                )}
                {'pageCount' in extractedData.metadata && (
                  <div>Pages/Slides: {extractedData.metadata.pageCount}</div>
                )}
                {'fileType' in extractedData.metadata && (
                  <div>File Type: {extractedData.metadata.fileType}</div>
                )}
                {'fileSize' in extractedData.metadata && extractedData.metadata.fileSize && (
                  <div>File Size: {Math.round((extractedData.metadata.fileSize / 1024 / 1024) * 100) / 100} MB</div>
                )}
              </div>
            )}
          </div>
        ) : (!isExtracting && (
          <p className="text-[15px] leading-7 text-gray-700">
            Document summary and key findings will appear here after processing.
          </p>
        ))}
      </div>
    </div>
  );
}
