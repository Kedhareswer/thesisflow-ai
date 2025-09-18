import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if ('error' in auth) return auth.error
    const { user } = auth

    const { searchParams } = new URL(request.url)
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10')))

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('extractions' as any)
      .select('id, file_name, file_type, file_size, summary, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, items: data || [] })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
