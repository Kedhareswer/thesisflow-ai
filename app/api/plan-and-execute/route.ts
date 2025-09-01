import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth-utils'
import { ErrorHandler } from '@/lib/utils/error-handler'
import { PlanningService } from '@/lib/services/planning.service'
import { ExecutingService, ExecutionProgress } from '@/lib/services/executing.service'
import { DeepResearcherService, DeepResearchResult } from '@/lib/services/deep-researcher.service'

// Supabase client (service role) for rate limiting and optional usage tracking
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RateLimitResult {
  allowed: boolean
  current_count: number
  reset_time: string
}

export async function POST(request: NextRequest) {
  try {
    // 1) Parse JSON body
    const { userQuery, selectedTools = [], useDeepResearch = false, maxIterations = 4 } = await request.json()

    // 2) Require auth (reject unauthenticated)
    const user = await requireAuth(request, 'plan-and-execute')
    const userId = user.id

    // 3) Validate inputs
    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length < 3) {
      const validationError = ErrorHandler.processError('userQuery must be a non-empty string (min 3 chars)', {
        operation: 'plan-and-execute-validation',
        userId,
      })
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }
    if (!Array.isArray(selectedTools) || selectedTools.some(t => typeof t !== 'string')) {
      const validationError = ErrorHandler.processError('selectedTools must be an array of strings', {
        operation: 'plan-and-execute-validation',
        userId,
      })
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }

    // 4) Rate limit check (consistent with literature stream route)
    const clientIP = getClientIP(request)
    const rateLimit = await checkRateLimit(userId, clientIP)
    if (!rateLimit.allowed) {
      const rlError = ErrorHandler.processError('Rate limit exceeded', {
        operation: 'plan-and-execute-rate-limit',
        userId,
      })
      const retryAfterSeconds = Math.max(
        0,
        Math.ceil((new Date(rateLimit.reset_time).getTime() - Date.now()) / 1000)
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(rlError),
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.reset_time).getTime().toString(),
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      )
    }

    // 5) Prepare SSE stream
    const startTime = Date.now()
    const encoder = new TextEncoder()
    let controller: ReadableStreamDefaultController<Uint8Array>
    let closed = false

    const planningService = new PlanningService()
    const executingService = new ExecutingService()
    const deepResearcherService = new DeepResearcherService()

    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c

        // Recommend client reconnection wait time if disconnected
        controller.enqueue(encoder.encode(`retry: 15000\n\n`))

        // Send init event with meta
        const initPayload = {
          type: 'init',
          userId,
          useDeepResearch,
          maxIterations: useDeepResearch ? maxIterations : 0,
          rateLimit: {
            limit: 100,
            remaining: Math.max(0, 100 - rateLimit.current_count),
            resetTime: rateLimit.reset_time,
          },
        }
        controller.enqueue(encoder.encode(`event: init\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initPayload)}\n\n`))

        // Heartbeat
        const interval = setInterval(() => {
          if (closed) return
          controller.enqueue(encoder.encode(`event: ping\n`))
          controller.enqueue(encoder.encode(`data: {}\n\n`))
        }, 15000)

        // Abort handling
        const abort = () => {
          if (closed) return
          closed = true
          clearInterval(interval)
          try { controller.close() } catch {}
        }
        request.signal.addEventListener('abort', abort)

        // Choose research approach
        const run = async () => {
          try {
            if (useDeepResearch) {
              // Deep Research Approach
              const onDeepProgress = (progress: any) => {
                if (closed) return
                const progressData = {
                  type: 'deep_progress',
                  ...progress
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`))
              }

              const deepResult = await deepResearcherService.conductDeepResearch(
                String(userQuery),
                '', // initialContext
                maxIterations,
                userId,
                onDeepProgress
              )

              // Send deep research result
              const deepResultPayload = {
                type: 'deep_research_complete',
                result: deepResult,
                processingTime: Date.now() - startTime,
                totalIterations: deepResult.research_iterations.length,
                totalSources: deepResult.meta_analysis.total_sources,
                qualityScore: deepResult.meta_analysis.research_quality_score
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(deepResultPayload)}\n\n`))

            } else {
              // Traditional Plan + Execute Approach
              const plan = await planningService.generateResearchPlan(String(userQuery), selectedTools as string[])

              controller.enqueue(encoder.encode(`event: plan\n`))
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(plan)}\n\n`))

              // Execute plan with streaming progress
              let lastOverall = -1
              const onProgress = (progress: ExecutionProgress) => {
                if (closed) return
                // Optional: reduce noise by only emitting when overall changes or at task boundary
                const shouldEmit = progress.overallProgress !== lastOverall || progress.isComplete
                if (!shouldEmit) return
                lastOverall = progress.overallProgress

                controller.enqueue(encoder.encode(`event: progress\n`))
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`))
              }

              const finalProgress = await executingService.executePlan(plan, onProgress)

              // Done event
              const donePayload = {
                type: 'done',
                planId: finalProgress.planId,
                totalTasks: finalProgress.totalTasks,
                processingTime: Date.now() - startTime,
                resultsCount: finalProgress.results?.length || 0,
                overallProgress: finalProgress.overallProgress,
                isComplete: finalProgress.isComplete,
              }
              controller.enqueue(encoder.encode(`event: done\n`))
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(donePayload)}\n\n`))
            }

            try { controller.close() } catch {}
            closed = true
          } catch (err) {
            if (!closed) {
              const errorPayload = {
                type: 'error',
                message: String(err),
              }
              controller.enqueue(encoder.encode(`event: error\n`))
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`))
              try { controller.close() } catch {}
              closed = true
            }
          }
        }

        run().catch(() => {
          // Already handled inside run
        })
      },
      cancel() {
        closed = true
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': Math.max(0, 100 - rateLimit.current_count).toString(),
        'X-RateLimit-Reset': new Date(rateLimit.reset_time).getTime().toString(),
      },
    })
  } catch (error) {
    // Non-streaming error path (parse/auth/validation failures)
    const processed = ErrorHandler.processError(error, {
      operation: 'plan-and-execute',
      userId: 'unknown',
    })
    let status = 500
    if (processed.errorType === 'authentication') status = 401
    if (processed.errorType === 'validation') status = 400
    if (processed.errorType === 'rate_limit') status = 429

    return NextResponse.json(
      ErrorHandler.formatErrorResponse(processed),
      { status }
    )
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIP) return realIP
  if (cfConnectingIP) return cfConnectingIP
  return '127.0.0.1'
}

async function checkRateLimit(userId: string | null, ipAddress: string): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc('check_literature_search_rate_limit', {
      p_user_id: userId ? userId : null,
      p_ip_address: ipAddress,
      p_limit: 100,
      p_window_minutes: 60,
    })
    if (error) throw error
    return data?.[0] || {
      allowed: true,
      current_count: 0,
      reset_time: new Date(Date.now() + 3600000).toISOString(),
    }
  } catch {
    return {
      allowed: true,
      current_count: 0,
      reset_time: new Date(Date.now() + 3600000).toISOString(),
    }
  }
}
