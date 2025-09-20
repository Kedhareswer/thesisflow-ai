import { NextRequest, NextResponse } from 'next/server'
import { ErrorHandler } from '@/lib/utils/error-handler'
import { PlanningService } from '@/lib/services/planning.service'
import { ExecutingService, ExecutionProgress } from '@/lib/services/executing.service'
import { DeepResearcherService } from '@/lib/services/deep-researcher.service'
import { TokenMiddleware } from '@/lib/middleware/token-middleware'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const params = url.searchParams

    // Parse query params
    const userQuery = params.get('userQuery') || params.get('q') || ''
    const toolsParam = params.get('selectedTools') || ''
    const toolList = params.getAll('tool')
    const selectedTools = (
      (toolsParam ? toolsParam.split(',') : []).concat(toolList)
    )
      .map((t) => t.trim())
      .filter(Boolean)

    const useDeepResearch = (params.get('useDeepResearch') || 'false').toLowerCase() === 'true'
    const maxIterations = Math.max(1, Math.min(32, parseInt(params.get('maxIterations') || '4', 10) || 4))

    // Validate inputs
    if (!userQuery || userQuery.trim().length < 3) {
      const validationError = ErrorHandler.processError('userQuery must be a non-empty string (min 3 chars)', {
        operation: 'plan-and-execute-validation',
        userId: 'unknown',
      })
      return NextResponse.json(ErrorHandler.formatErrorResponse(validationError), { status: 400 })
    }

    if (!Array.isArray(selectedTools) || selectedTools.some((t) => typeof t !== 'string')) {
      const validationError = ErrorHandler.processError('selectedTools must be an array of strings', {
        operation: 'plan-and-execute-validation',
        userId: 'unknown',
      })
      return NextResponse.json(ErrorHandler.formatErrorResponse(validationError), { status: 400 })
    }

    // Feature & token settings
    const featureName = useDeepResearch ? 'deep_research' : 'plan_and_execute'
    const requiredTokens = useDeepResearch ? 4 : 2

    return TokenMiddleware.withTokens(
      request,
      { featureName, requiredTokens, context: { max_iterations: maxIterations } },
      async (userId: string): Promise<NextResponse> => {
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

            // Recommend client reconnection wait time
            controller.enqueue(encoder.encode(`retry: 15000\n\n`))

            // Send init event
            const initPayload = {
              type: 'init',
              userId,
              useDeepResearch,
              maxIterations: useDeepResearch ? maxIterations : 0,
              tokenFeature: featureName,
              tokensCharged: requiredTokens,
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

            // Main runner
            const run = async () => {
              try {
                if (useDeepResearch) {
                  const onDeepProgress = (progress: any) => {
                    if (closed) return
                    const progressData = { type: 'deep_progress', ...progress }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`))
                  }

                  const deepResult = await deepResearcherService.conductDeepResearch(
                    String(userQuery),
                    '',
                    maxIterations,
                    userId,
                    onDeepProgress
                  )

                  const deepResultPayload = {
                    type: 'deep_research_complete',
                    result: deepResult,
                    processingTime: Date.now() - startTime,
                    totalIterations: deepResult.research_iterations.length,
                    totalSources: deepResult.meta_analysis.total_sources,
                    qualityScore: deepResult.meta_analysis.research_quality_score,
                  }
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(deepResultPayload)}\n\n`))
                } else {
                  // Traditional Plan + Execute
                  const plan = await planningService.generateResearchPlan(String(userQuery), selectedTools as string[])

                  controller.enqueue(encoder.encode(`event: plan\n`))
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(plan)}\n\n`))

                  let lastOverall = -1
                  const onProgress = (progress: ExecutionProgress) => {
                    if (closed) return
                    const shouldEmit = progress.overallProgress !== lastOverall || progress.isComplete
                    if (!shouldEmit) return
                    lastOverall = progress.overallProgress

                    controller.enqueue(encoder.encode(`event: progress\n`))
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`))
                  }

                  const finalProgress = await executingService.executePlan(plan, onProgress)

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
                  const errorPayload = { type: 'error', message: String(err) }
                  controller.enqueue(encoder.encode(`event: error\n`))
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`))
                  try { controller.close() } catch {}
                  closed = true
                }
              }
            }

            run().catch(() => { /* no-op */ })
          },
          cancel() {
            closed = true
          },
        })

        return new NextResponse(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        })
      }
    )
  } catch (error) {
    const processed = ErrorHandler.processError(error, {
      operation: 'plan-and-execute-stream',
      userId: 'unknown',
    })
    let status = 500
    if (processed.errorType === 'authentication') status = 401
    if (processed.errorType === 'validation') status = 400
    if (processed.errorType === 'rate_limit') status = 429

    return NextResponse.json(ErrorHandler.formatErrorResponse(processed), { status })
  }
}
