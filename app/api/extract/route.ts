/**
 * File extraction API route
 * Handles multi-format document extraction with real-time progress
 */

import { NextRequest, NextResponse } from 'next/server';
// Authentication will be handled by middleware or other means
import { supabase } from '@/integrations/supabase/client';
import { ExtractionOrchestrator } from '@/lib/services/file-extraction/extraction-orchestrator';
import { DataExtractionService } from '@/lib/services/data-extraction.service';

const orchestrator = new ExtractionOrchestrator();
const dataExtractionService = new DataExtractionService();

export async function POST(request: NextRequest) {
  try {
    // Note: Authentication should be handled by middleware
    // For now, proceeding without auth check

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const extractionType = formData.get('extractionType') as string || 'summary';
    const outputFormat = formData.get('outputFormat') as string || 'json';
    const ocrEnabled = formData.get('ocrEnabled') === 'true';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Enforce 10MB size limit to avoid platform-level 413 errors
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum allowed size is 10MB.' },
        { status: 413 }
      );
    }

    // Check if file type is supported
    if (!orchestrator.isSupported(file.name)) {
      return NextResponse.json({ 
        error: `File type not supported. Supported types: ${orchestrator.getSupportedExtensions().join(', ')}` 
      }, { status: 400 });
    }

    // Convert file to buffer
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Failed to read uploaded file.' },
        { status: 400 }
      );
    }

    // Configure extraction options
    const extractionOptions = {
      extractText: true,
      extractTables: true,
      extractImages: true,
      extractMetadata: true,
      ocrEnabled: ocrEnabled,
      language: 'eng'
    };

    // Create extraction job
    const jobId = orchestrator.createJob(file.name, buffer, extractionOptions);

    // Execute extraction
    const extractedContent = await orchestrator.executeJob(jobId);

    // Process extracted content with data extraction service
    let processedResult;
    
    switch (extractionType) {
      case 'summary':
        processedResult = await dataExtractionService.extractFromText(extractedContent.text, { type: 'summary' });
        break;
      case 'tables':
        processedResult = {
          text: extractedContent.text,
          tables: extractedContent.tables || [],
          metadata: extractedContent.metadata
        };
        break;
      case 'entities':
        processedResult = await dataExtractionService.extractFromText(extractedContent.text, { type: 'all' });
        break;
      case 'structured':
        processedResult = await dataExtractionService.extractFromText(extractedContent.text, { type: 'all', extractTables: true });
        break;
      default:
        processedResult = extractedContent;
    }

    // Attempt to persist the extraction summary/result to Supabase (best-effort)
    let extractionId: string | null = null;
    try {
      // Build a short summary if available
      const summaryText = typeof (processedResult as any)?.summary === 'string'
        ? (processedResult as any).summary as string
        : (typeof (processedResult as any)?.text === 'string' ? ((processedResult as any).text as string).slice(0, 600) : null);

      const { data: inserted, error: insertError } = await supabase
        .from('extractions' as any)
        .insert({
          user_id: null,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          summary: summaryText,
          result_json: {
            result: processedResult,
            metadata: {
              fileSize: file.size,
              fileType: file.type,
              extractedAt: new Date().toISOString(),
              wordCount: (extractedContent as any)?.metadata?.wordCount,
              pageCount: (extractedContent as any)?.metadata?.pageCount || (extractedContent as any)?.metadata?.slideCount,
              tableCount: extractedContent.tables?.length || 0,
              ocrEnabled
            }
          }
        })
        .select('id')
        .single();

      if (!insertError && inserted?.id) {
        extractionId = inserted.id as string;
      }
    } catch (dbErr) {
      console.warn('Skipping DB persistence for extraction (non-fatal):', dbErr);
    }

    // Return formatted result based on output format
    const response = {
      success: true,
      jobId,
      filename: file.name,
      extractionType,
      outputFormat,
      result: processedResult,
      metadata: {
        fileSize: file.size,
        fileType: file.type,
        extractedAt: new Date().toISOString(),
        wordCount: extractedContent.metadata?.wordCount,
        pageCount: extractedContent.metadata?.pageCount || extractedContent.metadata?.slideCount,
        tableCount: extractedContent.tables?.length || 0,
        ocrEnabled
      },
      extractionId
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Extraction failed' 
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Note: Authentication should be handled by middleware

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get specific job status
    if (jobId) {
      const job = orchestrator.getJob(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ job });
    }

    // Note: Database queries disabled until auth is configured
    const extractions: any[] = [];

    // Get statistics
    const stats = orchestrator.getStatistics();

    return NextResponse.json({
      success: true,
      extractions,
      statistics: stats,
      supportedExtensions: orchestrator.getSupportedExtensions()
    });

  } catch (error) {
    console.error('Get extractions error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get extractions' 
      }, 
      { status: 500 }
    );
  }
}
