import { NextRequest, NextResponse } from 'next/server'
import { ErrorHandler } from '@/lib/utils/error-handler'
import { enhancedAIService } from '@/lib/enhanced-ai-service'
import { DeepResearcherService } from '@/lib/services/deep-researcher.service'
import { TokenMiddleware } from '@/lib/middleware/token-middleware'

// Nova-based plan generation function
async function generatePlanWithNova(options: {
  topic: string
  description: string
  selectedTools: string[]
  maxTasks: number
  userId: string
  signal?: AbortSignal
}) {
  const { topic, description, selectedTools, maxTasks, userId } = options
  
  const prompt = `You are an expert research planner. Generate a structured research plan in JSON format.

Topic: ${topic}
Description: ${description}
Selected Tools: ${selectedTools.join(', ')}
Max Tasks: ${maxTasks}

Return ONLY valid JSON with this exact structure:
{
  "id": "plan_[timestamp]",
  "title": "Research Plan: [topic]",
  "description": "[brief description]",
  "tasks": [
    {
      "id": "task_1",
      "title": "[task title]",
      "description": "[task description]",
      "tool": "[tool name from selected tools]",
      "priority": "high|medium|low",
      "estimatedTime": "[time estimate]",
      "dependencies": [],
      "status": "pending"
    }
  ],
  "metadata": {
    "totalTasks": [number],
    "estimatedDuration": "[total time estimate]",
    "complexity": "low|medium|high",
    "createdAt": "[ISO timestamp]"
  }
}

Guidelines:
- Create ${Math.min(maxTasks, 15)} practical, actionable tasks
- Use only tools from the selected tools list
- Ensure logical task ordering and dependencies
- Include diverse research approaches (literature review, data analysis, synthesis)
- Each task should be specific and measurable`

  const result = await enhancedAIService.generateText({
    prompt,
    provider: "groq",
    model: "llama-3.3-70b-versatile", // Use larger model for structured output
    maxTokens: 2500,
    temperature: 0.1, // Low temperature for consistent JSON structure
    userId
  })

  if (!result.success || !result.content) {
    throw new Error(`Plan generation failed: ${result.error || 'No content returned'}`)
  }

  try {
    const plan = JSON.parse(result.content)
    
    // Validate and sanitize the plan structure
    if (!plan.id) plan.id = `plan_${Date.now()}`
    if (!plan.title) plan.title = `Research Plan: ${topic}`
    if (!plan.description) plan.description = description || `Research plan for ${topic}`
    if (!Array.isArray(plan.tasks)) plan.tasks = []
    
    // Ensure tasks have required fields and clamp to maxTasks
    plan.tasks = plan.tasks.slice(0, maxTasks).map((task: any, index: number) => ({
      id: task.id || `task_${index + 1}`,
      title: task.title || `Task ${index + 1}`,
      description: task.description || '',
      tool: task.tool || selectedTools[0] || 'manual',
      priority: ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
      estimatedTime: task.estimatedTime || '30 minutes',
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
      status: 'pending'
    }))
    
    // Ensure metadata exists
    if (!plan.metadata) plan.metadata = {}
    plan.metadata.totalTasks = plan.tasks.length
    plan.metadata.estimatedDuration = plan.metadata.estimatedDuration || `${plan.tasks.length * 30} minutes`
    plan.metadata.complexity = plan.metadata.complexity || 'medium'
    plan.metadata.createdAt = new Date().toISOString()
    
    return plan
  } catch (parseError) {
    // Fallback: create a basic plan if JSON parsing fails
    console.error('Plan JSON parsing failed, creating fallback plan:', parseError)
    return {
      id: `plan_${Date.now()}`,
      title: `Research Plan: ${topic}`,
      description: description || `Research plan for ${topic}`,
      tasks: [
        {
          id: 'task_1',
          title: 'Literature Review',
          description: `Conduct comprehensive literature review on ${topic}`,
          tool: selectedTools[0] || 'manual',
          priority: 'high',
          estimatedTime: '2 hours',
          dependencies: [],
          status: 'pending'
        },
        {
          id: 'task_2',
          title: 'Data Analysis',
          description: `Analyze relevant data and findings for ${topic}`,
          tool: selectedTools[1] || selectedTools[0] || 'manual',
          priority: 'medium',
          estimatedTime: '1.5 hours',
          dependencies: ['task_1'],
          status: 'pending'
        },
        {
          id: 'task_3',
          title: 'Synthesis and Report',
          description: `Synthesize findings and prepare final report on ${topic}`,
          tool: selectedTools[2] || selectedTools[0] || 'manual',
          priority: 'high',
          estimatedTime: '1 hour',
          dependencies: ['task_1', 'task_2'],
          status: 'pending'
        }
      ],
      metadata: {
        totalTasks: 3,
        estimatedDuration: '4.5 hours',
        complexity: 'medium',
        createdAt: new Date().toISOString()
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse JSON body for tokens context
    const { userQuery, description = '', maxTasks = 30, selectedTools = [], useDeepResearch = false, maxIterations = 4 } = await request.json()

    // Validate inputs early (before token deduction)
    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length < 3) {
      const validationError = ErrorHandler.processError('userQuery must be a non-empty string (min 3 chars)', {
        operation: 'plan-and-execute-validation',
        userId: 'unknown',
      })
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }
    
    // Validate description type
    if (description !== null && description !== undefined && typeof description !== 'string') {
      const validationError = ErrorHandler.processError('description must be a string', {
        operation: 'plan-and-execute-validation',
        userId: 'unknown',
      })
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }
    
    if (!Array.isArray(selectedTools) || selectedTools.some(t => typeof t !== 'string')) {
      const validationError = ErrorHandler.processError('selectedTools must be an array of strings', {
        operation: 'plan-and-execute-validation',
        userId: 'unknown',
      })
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }
    
    // Guardrails: clamp inputs to safe ranges
    const clampedMaxTasks = Math.max(5, Math.min(50, Number(maxTasks) || 30))
    const clampedMaxIterations = Math.max(1, Math.min(Number(maxIterations) || 1, 5))

    // Use token middleware with dynamic feature and requiredTokens
    const featureName = useDeepResearch ? 'deep_research' : 'plan_and_execute'
    const requiredTokens = useDeepResearch ? 4 : 2

    return TokenMiddleware.withTokens(
      request,
      { featureName, requiredTokens, context: { max_iterations: clampedMaxIterations } },
      async (userId: string): Promise<NextResponse> => {
        // 5) Prepare SSE stream
    const startTime = Date.now()
    const encoder = new TextEncoder()
    let controller: ReadableStreamDefaultController<Uint8Array>
    let closed = false

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
          maxIterations: useDeepResearch ? clampedMaxIterations : 0,
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
                clampedMaxIterations,
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
              // Planner generation via Nova (Groq) for reliable, fast planning
              // Send a few progress updates while preparing and requesting the model
              controller.enqueue(encoder.encode(`event: progress\n`))
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', message: 'Preparing prompt…', overallProgress: 10 })}\n\n`))
              controller.enqueue(encoder.encode(`event: progress\n`))
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', message: 'Requesting Nova model…', overallProgress: 25 })}\n\n`))
              
              const plan = await generatePlanWithNova({
                topic: String(userQuery),
                description: String(description || ''),
                selectedTools: selectedTools as string[],
                maxTasks: clampedMaxTasks,
                userId,
                signal: request.signal,
              })
              
              controller.enqueue(encoder.encode(`event: progress\n`))
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', message: 'Validating plan…', overallProgress: 80 })}\n\n`))
              controller.enqueue(encoder.encode(`event: plan\n`))
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(plan)}\n\n`))
              controller.enqueue(encoder.encode(`event: progress\n`))
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', message: 'Finalizing…', overallProgress: 95 })}\n\n`))
              // Done event (we don't execute here; apply happens client-side)
              const donePayload = {
                type: 'done',
                planId: plan.id,
                totalTasks: plan.tasks?.length || 0,
                processingTime: Date.now() - startTime,
                resultsCount: 0,
                overallProgress: 100,
                isComplete: true,
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
