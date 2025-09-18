import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request)
    if ('error' in auth) return auth.error
    const { user } = auth

    const id = params.id
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })

    const admin = getSupabaseAdmin()
    // Ensure the extraction belongs to this user
    const { data: row, error: selErr } = await admin
      .from('extractions' as any)
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (selErr || !row) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    if (row.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { error: delErr } = await admin.from('extractions' as any).delete().eq('id', id)
    if (delErr) return NextResponse.json({ success: false, error: delErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
