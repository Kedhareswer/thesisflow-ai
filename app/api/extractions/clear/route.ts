import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if ('error' in auth) return auth.error
    const { user } = auth

    const admin = getSupabaseAdmin()
    const { error } = await admin.from('extractions' as any).delete().eq('user_id', user.id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
