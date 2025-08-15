import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Dropbox integration is disabled' }, { status: 404 })
}
