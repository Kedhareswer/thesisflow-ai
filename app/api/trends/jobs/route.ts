import { NextRequest, NextResponse } from 'next/server'
import { withTokenValidation } from '@/lib/middleware/token-middleware'
import { createTrendsJob, getTrendsJob } from '@/lib/services/trends-job.store'
import { runTrendsJob } from '@/lib/services/trends-runner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const POST = withTokenValidation(
  'trends_job',
  async (userId: string, request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json().catch(() => ({} as any))
      const query = (body.query || '').trim()
      const timeframeMonths = Math.max(1, Math.min(24, parseInt(body.timeframeMonths || '12', 10) || 12))
      const quality = (body.quality === 'Enhanced' ? 'Enhanced' : 'Standard') as 'Standard' | 'Enhanced'
      if (!query || query.length < 3) {
        return NextResponse.json({ success: false, error: 'Query must be at least 3 characters' }, { status: 400 })
      }
      const job = createTrendsJob({ userId, query, timeframeMonths, quality })

      // Kick off async runner (fire-and-forget)
      setTimeout(() => {
        try { runTrendsJob(job.id) } catch (e) { /* best effort */ }
      }, 0)

      return NextResponse.json({ success: true, jobId: job.id })
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 })
    }
  },
  {
    context: { origin: 'trends', feature: 'job' },
    requiredTokens: 0,
    skipDeduction: true,
  }
)