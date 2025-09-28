/**
 * Extract Data v2 - Extraction streaming hook
 * Phase 1: Real SSE implementation with fetch-based client
 */

import { useState, useCallback, useRef } from 'react';
import { ExtractionStreamState, ExtractPhase } from '@/lib/types/extract-stream';

export interface UseExtractionStreamOptions {
  sessionId?: string;
  ocrEnabled?: boolean;
  extractionType?: 'summary' | 'tables' | 'entities' | 'structured';
}

export interface UseExtractionStreamReturn {
  state: ExtractionStreamState;
  start: (files: File[] | string[], options?: UseExtractionStreamOptions) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useExtractionStream(): UseExtractionStreamReturn {
  const [state, setState] = useState<ExtractionStreamState>({
    isStreaming: false,
    files: [],
    insights: [],
    tables: [],
    entities: [],
    citations: [],
    timeline: [],
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const start = useCallback(async (
    files: File[] | string[], 
    options?: UseExtractionStreamOptions
  ) => {
    // Only support File[] for now (Phase 1)
    if (!Array.isArray(files) || files.length === 0 || !(files[0] instanceof File)) {
      console.error('useExtractionStream: Only File[] is supported in Phase 1');
      return;
    }

    const fileList = files as File[];
    const sessionId = options?.sessionId || `session-${Date.now()}`;

    // Reset state
    setState({
      isStreaming: true,
      sessionId,
      files: fileList.map((file, index) => ({
        fileId: `file_${sessionId}_${index}`,
        name: file.name,
        size: file.size,
        phase: 'queued',
        progress: 0,
      })),
      insights: [],
      tables: [],
      entities: [],
      citations: [],
      timeline: [{
        timestamp: new Date(),
        phase: 'queued',
        message: `Starting extraction of ${fileList.length} file(s)`,
      }],
    });

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Prepare form data
      const formData = new FormData();
      fileList.forEach(file => {
        formData.append('files', file);
      });
      formData.append('sessionId', sessionId);
      formData.append('extractionType', options?.extractionType || 'summary');
      formData.append('ocrEnabled', String(options?.ocrEnabled || false));

      // Start SSE stream
      const response = await fetch('/api/extract/stream', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for SSE stream');
      }

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentEventType = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
            continue;
          }
          
          if (line.startsWith('data: ')) {
            const eventData = line.slice(6).trim();
            if (!eventData) continue;
            
            try {
              const data = JSON.parse(eventData);
              handleSSEEvent(currentEventType, data);
            } catch (e) {
              console.error('Failed to parse SSE data:', e, eventData);
            }
          }
        }
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Extraction stream aborted');
      } else {
        console.error('Extraction stream error:', error);
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Stream failed',
        }));
      }
    }

    // Helper function to handle SSE events
    function handleSSEEvent(eventType: string, data: any) {
      switch (eventType) {
        case 'init':
          // Already handled in initial state
          break;
          
        case 'progress':
          setState(prev => ({
            ...prev,
            files: prev.files.map(f => 
              f.fileId === data.fileId 
                ? { ...f, phase: data.phase, progress: data.pct }
                : f
            ),
            timeline: [...prev.timeline, {
              timestamp: new Date(),
              fileId: data.fileId,
              phase: data.phase,
              message: data.message || `${data.phase} - ${data.pct}%`,
            }],
          }));
          break;
          
        case 'parse':
          setState(prev => ({
            ...prev,
            timeline: [...prev.timeline, {
              timestamp: new Date(),
              fileId: data.fileId,
              phase: 'parsing',
              message: `Parsed ${data.metadata?.wordCount || 0} words, ${data.metadata?.pageCount || 0} pages`,
            }],
          }));
          break;
          
        case 'tables':
          setState(prev => ({
            ...prev,
            tables: [...prev.tables, {
              fileId: data.fileId,
              count: data.count,
              data: data.sample ? [{
                id: `table_${data.fileId}_0`,
                headers: data.sample.headers || [],
                rows: data.sample.rows || []
              }] : []
            }],
            timeline: [...prev.timeline, {
              timestamp: new Date(),
              fileId: data.fileId,
              phase: 'tables',
              message: `Found ${data.count} table(s)`,
              data: data
            }],
          }));
          break;
          
        case 'entities':
          setState(prev => ({
            ...prev,
            entities: [...prev.entities, {
              fileId: data.fileId,
              count: data.count,
              data: data.sample || []
            }],
            timeline: [...prev.timeline, {
              timestamp: new Date(),
              fileId: data.fileId,
              phase: 'entities',
              message: `Extracted ${data.count} entities`,
              data: data
            }],
          }));
          break;
          
        case 'citations':
          setState(prev => ({
            ...prev,
            citations: [...prev.citations, {
              fileId: data.fileId,
              data: data.items || []
            }],
            timeline: [...prev.timeline, {
              timestamp: new Date(),
              fileId: data.fileId,
              phase: 'citations',
              message: `Found ${data.items?.length || 0} citations`,
              data: data
            }],
          }));
          break;
          
        case 'insight':
          setState(prev => ({
            ...prev,
            insights: [...prev.insights, {
              fileId: data.fileId,
              summary: data.summary,
              keyPoints: data.keyPoints,
            }],
            timeline: [...prev.timeline, {
              timestamp: new Date(),
              fileId: data.fileId,
              phase: 'summarizing',
              message: `Generated summary with ${data.keyPoints?.length || 0} key points`,
            }],
          }));
          break;
          
        case 'done':
          setState(prev => ({
            ...prev,
            files: prev.files.map(f => 
              f.fileId === data.fileId 
                ? { ...f, phase: 'completed', progress: 100, extractionId: data.extractionId }
                : f
            ),
            timeline: [...prev.timeline, {
              timestamp: new Date(),
              fileId: data.fileId,
              phase: 'completed',
              message: 'Extraction completed successfully',
            }],
          }));
          
          // Check if all files are done
          setState(prev => {
            const allCompleted = prev.files.every(f => f.phase === 'completed' || f.phase === 'failed');
            return {
              ...prev,
              isStreaming: !allCompleted,
            };
          });
          break;
          
        case 'error':
          setState(prev => ({
            ...prev,
            files: prev.files.map(f => 
              f.fileId === data.fileId 
                ? { ...f, phase: 'failed', error: data.message }
                : f
            ),
            timeline: [...prev.timeline, {
              timestamp: new Date(),
              fileId: data.fileId,
              phase: 'failed',
              message: `Error: ${data.message}`,
            }],
            error: data.recoverable ? undefined : data.message,
          }));
          break;
          
        case 'tables_complete':
          // Phase 2: Handle complete table data
          setState(prev => ({
            ...prev,
            tables: prev.tables.map(t => 
              t.fileId === data.fileId 
                ? { ...t, data: data.tables || [] }
                : t
            ),
          }));
          break;
          
        case 'ping':
          // Heartbeat - no action needed
          break;
          
        default:
          console.log('Unknown SSE event:', eventType, data);
      }
    }

  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({
      isStreaming: false,
      files: [],
      insights: [],
      tables: [],
      entities: [],
      citations: [],
      timeline: [],
    });
  }, []);

  return {
    state,
    start,
    stop,
    reset,
  };
}
