/**
 * Simplified file extraction API route
 * Works with existing data-extraction.service.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { SimpleExtractor } from '@/lib/services/file-extraction/simple-extractor';
import { DataExtractionService } from '@/lib/services/data-extraction.service';

const simpleExtractor = new SimpleExtractor();
const dataExtractionService = new DataExtractionService();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const extractionType = formData.get('extractionType') as string || 'summary';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Enforce max upload size (10MB) before further processing
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (typeof file.size === 'number' && file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum allowed size is 10MB.' },
        { status: 413 }
      );
    }

    // Check if file type is supported
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !simpleExtractor.getSupportedExtensions().includes(extension)) {
      return NextResponse.json({ 
        error: `File type not supported. Supported types: ${simpleExtractor.getSupportedExtensions().join(', ')}` 
      }, { status: 400 });
    }

    // Extract content using simple extractor
    const extractedContent = await simpleExtractor.extract(file);

    // Process extracted content based on type
    let result;
    
    switch (extractionType) {
      case 'summary':
        result = await dataExtractionService.extractFromText(extractedContent.text, { type: 'summary' });
        break;
      case 'tables':
        result = {
          text: extractedContent.text,
          tables: extractedContent.tables || [],
          metadata: extractedContent.metadata
        };
        break;
      case 'entities':
        result = await dataExtractionService.extractFromText(extractedContent.text, { type: 'all' });
        break;
      case 'structured':
        result = await dataExtractionService.extractFromText(extractedContent.text, { type: 'all', extractTables: true });
        break;
      default:
        result = extractedContent;
    }

    // Return response
    const response = {
      success: true,
      filename: file.name,
      extractionType,
      result,
      metadata: extractedContent.metadata
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

export async function GET() {
  try {
    const extractor = new SimpleExtractor();
    
    return NextResponse.json({
      success: true,
      supportedExtensions: extractor.getSupportedExtensions(),
      extractionTypes: [
        { value: 'summary', label: 'Summary' },
        { value: 'tables', label: 'Tables' },
        { value: 'entities', label: 'Entities' },
        { value: 'structured', label: 'Structured' }
      ]
    });

  } catch (error) {
    console.error('Get info error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get extraction info' 
      }, 
      { status: 500 }
    );
  }
}
