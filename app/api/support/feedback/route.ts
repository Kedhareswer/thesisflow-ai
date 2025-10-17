import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser, createSupabaseAdmin } from '@/lib/auth-utils'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const feedbackSchema = z.object({
  email: z.string().email().optional(),
  subject: z.string().min(3).max(200),
  category: z.enum(['uiux', 'functionality', 'performance', 'content', 'other']).default('other'),
  rating: z.number().int().min(1).max(5).optional(),
  description: z.string().min(5).max(5000),
  pageUrl: z.string().url().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// Local JSON fallback store - use runtime data directory or system temp to avoid committing PII
const getRuntimeDataDir = () => {
  // Prefer environment-defined runtime data directory
  if (process.env.RUNTIME_DATA_DIR) {
    return process.env.RUNTIME_DATA_DIR
  }
  // Fallback to system temp directory
  return process.platform === 'win32' ? process.env.TEMP || os.tmpdir() : '/tmp'
}

const storeDir = path.join(getRuntimeDataDir(), 'thesisflow-support')
const feedbackFile = path.join(storeDir, 'feedback.json')

async function ensureStore() {
  try { await fs.mkdir(storeDir, { recursive: true }) } catch {}
  try { await fs.access(feedbackFile) } catch { await fs.writeFile(feedbackFile, '[]', 'utf8') }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const userId = user?.id || null

    const supabase = createSupabaseAdmin()
    if (supabase) {
      const url = new URL(request.url)
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '20')))
      let query = supabase.from('support_feedback').select('*').order('created_at', { ascending: false }).limit(limit)
      if (userId) query = query.eq('user_id', userId)
      const { data, error } = await query
      if (!error && data) return NextResponse.json({ success: true, feedback: data })
    }

    await ensureStore()
    const raw = await fs.readFile(feedbackFile, 'utf8').catch(() => '[]')
    const list = JSON.parse(raw) as any[]
    const filtered = userId ? list.filter(it => it.user_id === userId) : list
    return NextResponse.json({ success: true, feedback: filtered.slice(0, 50) })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = feedbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
    }
    const user = await getAuthUser(request)
    const userId = user?.id || null

    const feedback = {
      id: randomUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...parsed.data,
    }

    const supabase = createSupabaseAdmin()
    if (supabase) {
      const { data, error } = await supabase.from('support_feedback').insert(feedback).select('*').single()
      if (!error && data) {
        return NextResponse.json({ success: true, feedback: data })
      }
    }

    await ensureStore()
    const raw = await fs.readFile(feedbackFile, 'utf8').catch(() => '[]')
    const list = JSON.parse(raw) as any[]
    list.unshift(feedback)
    await fs.writeFile(feedbackFile, JSON.stringify(list, null, 2), 'utf8')

    return NextResponse.json({ success: true, feedback })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
