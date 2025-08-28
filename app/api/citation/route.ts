import { NextRequest, NextResponse } from 'next/server';
import { citationService } from '@/lib/services/citation.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, type = 'auto' } = body;

    // Validate input
    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Input is required (DOI, URL, or manual data)' },
        { status: 400 }
      );
    }

    let citation;
    
    // Auto-detect input type
    if (type === 'auto' || type === 'doi') {
      // Check if it's a DOI
      if (input.includes('10.') || input.toLowerCase().includes('doi')) {
        citation = await citationService.fetchFromDOI(input);
      }
    }
    
    if (!citation && (type === 'auto' || type === 'url')) {
      // Check if it's a URL
      if (input.startsWith('http') || input.includes('.org') || input.includes('.com')) {
        citation = await citationService.fetchFromURL(input);
      }
    }

    if (!citation) {
      // Try as DOI one more time (in case it's just the DOI number)
      if (input.match(/^10\.\d{4,}/)) {
        citation = await citationService.fetchFromDOI(input);
      }
    }

    if (!citation) {
      return NextResponse.json(
        { error: 'Could not fetch citation data. Please check the DOI/URL or enter manually.' },
        { status: 404 }
      );
    }

    // Format citation in all styles
    const formatted = citationService.formatCitation(citation);

    return NextResponse.json({
      citation,
      formatted
    });

  } catch (error) {
    console.error('Citation API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate citation. Please try again.' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
