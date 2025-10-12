import { NextRequest, NextResponse } from 'next/server'
import { withTokenValidation } from '@/lib/middleware/token-middleware'
import { getTrendsJob } from '@/lib/services/trends-job.store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = withTokenValidation(
  'trends_job_status',
  async (_userId: string, request: NextRequest): Promise<NextResponse> => {
    try {
      const url = new URL(request.url)
      const id = url.pathname.split('/').filter(Boolean).slice(-2, -1)[0] // /api/trends/jobs/:id/status
      if (!id) return NextResponse.json({ success: false, error: 'Missing job id' }, { status: 400 })
      const job = getTrendsJob(id)
      if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
      return NextResponse.json({ success: true, job: {
        id: job.id,
        status: job.status,
        stage: job.stage,
        progress: job.progress,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        error: job.error,
        counts: { items: job.items.length, clusters: job.clusters?.length || 0 }
      } })
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 })
    }
  },
  { context: { origin: 'trends', feature: 'status' }, requiredTokens: 0, skipDeduction: true }
)
