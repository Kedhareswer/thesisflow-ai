import { NextRequest, NextResponse } from 'next/server'
import { paraphraserService } from '@/lib/services/paraphraser.service'

// Simple in-memory rate limit per IP
const rateLimit = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 200 // 200 requests/hour per IP (batch counts as N items)
const RATE_LIMIT_WINDOW = 60 * 60 * 1000

function checkRateLimit(ip: string, cost = 1): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || entry.resetTime < now) {
    rateLimit.set(ip, { count: cost, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count + cost > RATE_LIMIT) return false
  entry.count += cost
  return true
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'

    const body = await request.json()
    const {
      texts,
      mode = 'academic',
      preserveLength = false,
      variationLevel = 'medium',
      provider,
      model,
    } = body || {}

    if (!Array.isArray(texts)) {
      return NextResponse.json({ error: 'texts array is required' }, { status: 400 })
    }

    const normalized = texts
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t.length > 0)
      .slice(0, 50) // limit to 50 items per request

    if (normalized.length === 0) {
      return NextResponse.json({ error: 'No valid texts provided' }, { status: 400 })
    }

    // Rate limit cost equals number of items
    if (!checkRateLimit(ip, normalized.length)) {
      const resetSec = Math.ceil((rateLimit.get(ip)?.resetTime || Date.now()) - Date.now()) / 1000
      return new NextResponse(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: {
          'Retry-After': Math.max(1, Math.floor(resetSec)).toString(),
          'Content-Type': 'application/json',
        },
      })
    }

    const results: any[] = []

    for (const text of normalized) {
      if (text.length > 5000) {
        results.push({ error: 'Text too long (max 5000 chars)', original: text })
        continue
      }

      try {
        const res = await paraphraserService.paraphrase(text, {
          mode,
          preserveLength,
          variations: 1,
          variationLevel,
          provider,
          model,
        })
        results.push(res)
      } catch (e: any) {
        results.push({ error: e?.message || 'Paraphrase failed', original: text })
      }

      // Small delay between items to avoid provider rate limits
      await new Promise((r) => setTimeout(r, 150))
    }

    return NextResponse.json({ count: results.length, results })
  } catch (error) {
    console.error('Batch paraphraser API error:', error)
    return NextResponse.json({ error: 'Failed to process batch paraphrase' }, { status: 500 })
  }
}
