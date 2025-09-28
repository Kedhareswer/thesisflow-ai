/**
 * Extract Data v2 - Streaming extraction API
 * Phase 1: Real-time extraction with SSE events
 * Based on existing streaming patterns from plan-and-execute/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { ExtractionOrchestrator } from '@/lib/services/file-extraction/extraction-orchestrator';
import { DataExtractionService } from '@/lib/services/data-extraction.service';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { timelinePersistence } from '@/lib/services/timeline-persistence';
import { extractionTelemetry } from '@/lib/services/extraction-telemetry';
import { 
  StreamInitEvent, 
  StreamProgressEvent, 
  StreamParseEvent, 
  StreamTablesEvent, 
  StreamEntitiesEvent, 
  StreamCitationsEvent, 
  StreamInsightEvent, 
  StreamDoneEvent, 
  StreamErrorEvent 
} from '@/lib/types/extract-stream';

const orchestrator = new ExtractionOrchestrator();
const dataExtractionService = new DataExtractionService();

export async function POST(request: NextRequest) {
  let encoder: TextEncoder;
  let controller: ReadableStreamDefaultController;
  let heartbeatInterval: NodeJS.Timeout;
  let abortController: AbortController;

  try {
    // Require authentication
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    // Parse request body
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const sessionId = formData.get('sessionId') as string || `session_${Date.now()}`;
    const extractionType = formData.get('extractionType') as string || 'summary';
    const ocrEnabled = formData.get('ocrEnabled') === 'true';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate file sizes
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > MAX_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      return NextResponse.json({
        error: `Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Maximum 10MB per file.`
      }, { status: 413 });
    }

    // Check supported file types
    const unsupportedFiles = files.filter(file => !orchestrator.isSupported(file.name));
    if (unsupportedFiles.length > 0) {
      return NextResponse.json({
        error: `Unsupported file types: ${unsupportedFiles.map(f => f.name).join(', ')}`
      }, { status: 400 });
    }

    // Set up SSE stream
    encoder = new TextEncoder();
    abortController = new AbortController();

    const stream = new ReadableStream({
      start(ctrl) {
        controller = ctrl;
        
        // Send initial event
        const initEvent: StreamInitEvent = {
          sessionId,
          files: files.map((file, index) => ({
            fileId: `file_${sessionId}_${index}`,
            name: file.name,
            size: file.size,
            type: file.type
          }))
        };
        
        sendEvent('init', initEvent);
        
        // Start heartbeat
        heartbeatInterval = setInterval(() => {
          if (!abortController.signal.aborted) {
            sendEvent('ping', {});
          }
        }, 15000);
        
        // Process files
        processFiles(files, sessionId, extractionType, ocrEnabled, user.id);
      },
      
      cancel() {
        cleanup();
      }
    });

    // Helper function to send SSE events
    function sendEvent(type: string, data: any) {
      if (controller && !abortController.signal.aborted) {
        const eventData = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(eventData));
      }
    }

    // Helper function to persist timeline events (Phase 2)
    async function persistTimelineEvent(
      eventType: string, 
      data: any, 
      sessionId: string, 
      extractionId?: string
    ) {
      try {
        await timelinePersistence.saveEvent({
          extraction_id: extractionId || 'pending',
          session_id: sessionId,
          file_id: data.fileId,
          event_type: eventType,
          phase: data.phase || 'queued',
          message: data.message || `${eventType} event`,
          event_data: data,
        });
      } catch (error) {
        console.warn('Timeline persistence failed (non-fatal):', error);
      }
    }

    // Process files sequentially
    async function processFiles(files: File[], sessionId: string, extractionType: string, ocrEnabled: boolean, userId: string) {
      try {
        // Track extraction start
        await extractionTelemetry.trackExtractionStart(
          sessionId, 
          userId, 
          files.map((file, i) => ({ id: `file_${sessionId}_${i}`, size: file.size }))
        );

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileId = `file_${sessionId}_${i}`;
          
          if (abortController.signal.aborted) break;
          
          await processFile(file, fileId, extractionType, ocrEnabled, userId);
        }
      } catch (error) {
        const errorEvent: StreamErrorEvent = {
          message: error instanceof Error ? error.message : 'Processing failed',
          recoverable: false
        };
        sendEvent('error', errorEvent);
      } finally {
        cleanup();
      }
    }

    // Process individual file
    async function processFile(file: File, fileId: string, extractionType: string, ocrEnabled: boolean, userId: string) {
      try {
        // Progress: Starting
        const startProgressData = {
          fileId,
          pct: 0,
          phase: 'parsing',
          message: `Starting extraction of ${file.name}`
        } as StreamProgressEvent;
        sendEvent('progress', startProgressData);
        await persistTimelineEvent('progress', startProgressData, sessionId);

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Configure extraction options
        const extractionOptions = {
          extractText: true,
          extractTables: true,
          extractImages: false,
          extractMetadata: true,
          ocrEnabled,
          language: 'eng'
        };

        // Progress: Parsing
        sendEvent('progress', {
          fileId,
          pct: 20,
          phase: 'parsing',
          message: 'Parsing document structure...'
        } as StreamProgressEvent);

        // Create and execute extraction job
        const jobId = orchestrator.createJob(file.name, buffer, extractionOptions);
        const extractedContent = await orchestrator.executeJob(jobId, (progress) => {
          sendEvent('progress', {
            fileId,
            pct: 20 + (progress.current / progress.total) * 40,
            phase: progress.phase as any,
            message: progress.message
          } as StreamProgressEvent);
        });

        // Send parse event
        const parseEvent: StreamParseEvent = {
          fileId,
          metadata: {
            wordCount: extractedContent.metadata?.wordCount,
            pageCount: extractedContent.metadata?.pageCount,
            fileType: file.type,
            ocr: ocrEnabled
          },
          preview: extractedContent.text?.slice(0, 2000)
        };
        sendEvent('parse', parseEvent);

        // Progress: Analyzing
        sendEvent('progress', {
          fileId,
          pct: 60,
          phase: 'analyzing',
          message: 'Analyzing content...'
        } as StreamProgressEvent);

        // Extract tables
        if (extractedContent.tables && extractedContent.tables.length > 0) {
          const tablesEvent: StreamTablesEvent = {
            fileId,
            count: extractedContent.tables.length,
            sample: extractedContent.tables[0] ? {
              headers: extractedContent.tables[0].headers || [],
              rows: extractedContent.tables[0].rows?.slice(0, 3) || []
            } : undefined
          };
          sendEvent('tables', tablesEvent);
          
          // Send complete table data as a custom event for Phase 2
          sendEvent('tables_complete', {
            fileId,
            tables: extractedContent.tables.map((table, index) => ({
              id: `table_${fileId}_${index}`,
              headers: table.headers || [],
              rows: table.rows || []
            }))
          });
        }

        // Progress: Extracting entities
        sendEvent('progress', {
          fileId,
          pct: 70,
          phase: 'entities',
          message: 'Extracting entities...'
        } as StreamProgressEvent);

        // Process with DataExtractionService for AI analysis
        const processedResult = await dataExtractionService.extractFromText(
          extractedContent.text, 
          { type: extractionType as any }
        );

        // Extract entities
        if (processedResult.entities && processedResult.entities.length > 0) {
          const entitiesEvent: StreamEntitiesEvent = {
            fileId,
            count: processedResult.entities.length,
            sample: processedResult.entities.slice(0, 5).map(e => ({
              type: e.type,
              value: e.value,
              count: e.count
            }))
          };
          sendEvent('entities', entitiesEvent);
        }

        // Progress: Extracting citations
        sendEvent('progress', {
          fileId,
          pct: 80,
          phase: 'citations',
          message: 'Detecting citations...'
        } as StreamProgressEvent);

        // Extract citations (basic implementation)
        const citations = extractCitations(extractedContent.text);
        if (citations.length > 0) {
          const citationsEvent: StreamCitationsEvent = {
            fileId,
            items: citations
          };
          sendEvent('citations', citationsEvent);
        }

        // Progress: Generating insights
        sendEvent('progress', {
          fileId,
          pct: 90,
          phase: 'summarizing',
          message: 'Generating insights...'
        } as StreamProgressEvent);

        // Send insights
        if (processedResult.summary || processedResult.keyPoints) {
          const insightEvent: StreamInsightEvent = {
            fileId,
            summary: processedResult.summary || '',
            keyPoints: processedResult.keyPoints || [],
            aiSummarySource: (processedResult as any).aiSummarySource
          };
          sendEvent('insight', insightEvent);
        }

        // Save to database (best effort)
        let extractionId: string | null = null;
        try {
          const admin = getSupabaseAdmin();
          const { data: inserted } = await admin
            .from('extractions' as any)
            .insert({
              user_id: userId,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              summary: processedResult.summary?.slice(0, 600),
              result_json: {
                result: processedResult,
                metadata: extractedContent.metadata,
                citations,
                sessionId
              }
            })
            .select('id')
            .single();
          
          if (inserted?.id) {
            extractionId = inserted.id as string;
          }
        } catch (dbErr) {
          console.warn('DB save failed (non-fatal):', dbErr);
        }

        // Progress: Complete
        sendEvent('progress', {
          fileId,
          pct: 100,
          phase: 'completed',
          message: 'Extraction completed'
        } as StreamProgressEvent);

        // Send done event
        const doneEvent: StreamDoneEvent = {
          fileId,
          extractionId: extractionId || `temp_${fileId}`
        };
        sendEvent('done', doneEvent);

      } catch (error) {
        const errorEvent: StreamErrorEvent = {
          fileId,
          message: error instanceof Error ? error.message : 'File processing failed',
          recoverable: true
        };
        sendEvent('error', errorEvent);
      }
    }

    // Basic citation extraction
    function extractCitations(text: string): Array<{ kind: 'doi' | 'url' | 'ref'; value: string; title?: string }> {
      const citations: Array<{ kind: 'doi' | 'url' | 'ref'; value: string; title?: string }> = [];
      
      // Extract DOIs
      const doiRegex = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/gi;
      const dois = text.match(doiRegex) || [];
      dois.forEach(doi => {
        citations.push({ kind: 'doi', value: doi });
      });
      
      // Extract URLs
      const urlRegex = /https?:\/\/[^\s)]+/gi;
      const urls = text.match(urlRegex) || [];
      urls.forEach(url => {
        citations.push({ kind: 'url', value: url });
      });
      
      // Extract reference patterns (basic)
      const refRegex = /^\[\d+\].*$/gm;
      const refs = text.match(refRegex) || [];
      refs.slice(0, 10).forEach(ref => { // Limit to 10 refs
        citations.push({ kind: 'ref', value: ref });
      });
      
      return citations;
    }

    // Cleanup function
    function cleanup() {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (controller) {
        try {
          controller.close();
        } catch (e) {
          // Controller already closed
        }
      }
    }

    // Handle client disconnect
    request.signal.addEventListener('abort', () => {
      abortController.abort();
      cleanup();
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Extraction stream error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Stream setup failed' 
      }, 
      { status: 500 }
    );
  }
}
