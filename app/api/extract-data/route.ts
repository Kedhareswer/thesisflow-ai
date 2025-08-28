import { NextRequest, NextResponse } from 'next/server';
import { DataExtractionService } from '@/lib/services/data-extraction.service';
import { createClient } from '@supabase/supabase-js';

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // 30 requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limit
    const now = Date.now();
    const userLimit = rateLimitMap.get(ip);
    
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= RATE_LIMIT) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { status: 429 }
          );
        }
        userLimit.count++;
      } else {
        // Reset the limit
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }

    // Parse request body
    const body = await req.json();
    const { text, options } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input. Text is required.' },
        { status: 400 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 50,000 characters allowed.' },
        { status: 400 }
      );
    }

    // Set default options
    const extractionOptions = {
      type: options?.type || 'all',
      format: options?.format || 'json',
      extractImages: options?.extractImages || false,
      extractTables: options?.extractTables || true
    };

    // Check authentication (optional)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabase.auth.getUser();

    // Initialize extraction service
    const extractionService = new DataExtractionService();

    // Perform extraction
    const extractedData = await extractionService.extractFromText(
      text,
      extractionOptions
    );

    // Format output
    const formattedOutput = extractionService.formatOutput(
      extractedData,
      extractionOptions.format
    );

    // Log usage if user is authenticated
    if (user) {
      try {
        await supabase.from('extraction_usage').insert({
          user_id: user.id,
          input_length: text.length,
          extraction_type: extractionOptions.type,
          output_format: extractionOptions.format,
          created_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to log usage:', error);
      }
    }

    // Return based on format
    if (extractionOptions.format === 'json') {
      return NextResponse.json({
        success: true,
        data: extractedData,
        formatted: formattedOutput
      });
    } else {
      return new NextResponse(formattedOutput, {
        status: 200,
        headers: {
          'Content-Type': extractionOptions.format === 'csv' 
            ? 'text/csv' 
            : extractionOptions.format === 'markdown'
            ? 'text/markdown'
            : 'text/plain',
          'Content-Disposition': `attachment; filename="extracted-data.${extractionOptions.format}"`
        }
      });
    }

  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract data. Please try again.' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
