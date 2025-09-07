import { NextRequest, NextResponse } from 'next/server';
import { paraphraserService } from '@/lib/services/paraphraser.service';

// Rate limiting
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 50; // 50 requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimit.get(ip);

  if (!userLimit || userLimit.resetTime < now) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'anonymous';

    // Rate limiting
    if (!checkRateLimit(ip)) {
      const resetSec = Math.ceil((rateLimit.get(ip)?.resetTime || Date.now()) - Date.now()) / 1000;
      return new NextResponse(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: {
          'Retry-After': Math.max(1, Math.floor(resetSec)).toString(),
          'Content-Type': 'application/json',
        },
      });
    }

    const body = await request.json();
    const {
      text,
      mode = 'academic',
      preserveLength = false,
      variations = 1,
      variationLevel = 'medium',
      provider,
      model,
    } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 5000 characters allowed.' },
        { status: 400 }
      );
    }

    const validModes = ['academic', 'casual', 'formal', 'creative', 'technical', 'simple', 'fluent'];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Choose from: ' + validModes.join(', ') },
        { status: 400 }
      );
    }

    // Call paraphraser service
    const result = await paraphraserService.paraphrase(text, {
      mode,
      preserveLength,
      variations: Math.min(variations, 5), // Max 5 variations
      variationLevel,
      provider,
      model,
    });

    // Log usage (optional - for analytics)
    console.log(`Paraphrase request: ip=${ip}, mode=${mode}, length=${text.length}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Paraphraser API error:', error);
    return NextResponse.json(
      { error: 'Failed to paraphrase text. Please try again.' },
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
