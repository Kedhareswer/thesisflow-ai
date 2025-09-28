import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser, createSupabaseAdmin } from '@/lib/auth-utils'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const ticketSchema = z.object({
  email: z.string().email().optional(),
  subject: z.string().min(3).max(200),
  category: z.enum(['bug', 'billing', 'feature', 'other']).default('other'),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
  description: z.string().min(10).max(5000),
  pageUrl: z.string().url().optional(),
  browser: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// Local JSON fallback store
const storeDir = path.join(process.cwd(), 'data', 'support', '_store')
const ticketsFile = path.join(storeDir, 'tickets.json')

async function ensureStore() {
  try { await fs.mkdir(storeDir, { recursive: true }) } catch {}
  try { await fs.access(ticketsFile) } catch { await fs.writeFile(ticketsFile, '[]', 'utf8') }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const userId = user?.id || null

    // If Supabase configured, read from there
    const supabase = createSupabaseAdmin()
    if (supabase) {
      const url = new URL(request.url)
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '20')))
      const status = url.searchParams.get('status') || undefined
      let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(limit)
      if (userId) query = query.eq('user_id', userId)
      if (status) query = query.eq('status', status)
      const { data, error } = await query
      if (!error && data) return NextResponse.json({ success: true, tickets: data })
      // fallthrough on error
    }

    // Fallback: local file store
    await ensureStore()
    const raw = await fs.readFile(ticketsFile, 'utf8').catch(() => '[]')
    const list = JSON.parse(raw) as any[]
    const filtered = userId ? list.filter(it => it.user_id === userId) : list
    return NextResponse.json({ success: true, tickets: filtered.slice(0, 50) })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = ticketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
    }
    const user = await getAuthUser(request)
    const userId = user?.id || null

    const ticket = {
      id: randomUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'open',
      ...parsed.data,
    }

    const supabase = createSupabaseAdmin()
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').insert(ticket).select('*').single()
      if (!error && data) {
        return NextResponse.json({ success: true, ticket: data })
      }
      // fall back on error
    }

    // Fallback to local file store
    await ensureStore()
    const raw = await fs.readFile(ticketsFile, 'utf8').catch(() => '[]')
    const list = JSON.parse(raw) as any[]
    list.unshift(ticket)
    await fs.writeFile(ticketsFile, JSON.stringify(list, null, 2), 'utf8')

    return NextResponse.json({ success: true, ticket })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
