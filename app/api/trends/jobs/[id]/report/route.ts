import { NextRequest, NextResponse } from 'next/server'
import { withTokenValidation } from '@/lib/middleware/token-middleware'
import { getTrendsJob } from '@/lib/services/trends-job.store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = withTokenValidation(
  'trends_job_report',
  async (userId: string, request: NextRequest): Promise<NextResponse> => {
    try {
      const url = new URL(request.url)
      // Path: /api/trends/jobs/:id/report
      const parts = url.pathname.split('/').filter(Boolean)
      const id = parts[parts.indexOf('jobs') + 1]
      if (!id) return NextResponse.json({ success: false, error: 'Missing job id' }, { status: 400 })
      const job = getTrendsJob(id)
      if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
      if (job.userId !== userId) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

      return NextResponse.json({ success: true, report: job.report || { markdown: '', html: '' } })
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 })
    }
  },
  { context: { origin: 'trends', feature: 'report' } }
)
