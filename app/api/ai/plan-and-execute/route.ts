import { NextRequest } from 'next/server'
import { supabase } from '@/integrations/supabase/client'
import { TaskPlannerService } from '@/lib/services/task-planner.service'
import TaskOrchestratorService, { OrchestratorEvent } from '@/lib/services/task-orchestrator.service'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { 
      want,
      use = [],
      make = [],
      subject,
      prompt,
      provider,
      model,
      execute = true
    } = await req.json()

    if (!want || !subject || !prompt) {
      return new Response('Missing required fields', { status: 400 })
    }

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Initialize services
          const plannerService = new TaskPlannerService()
          const orchestratorService = TaskOrchestratorService
          
          // Send initial planning message
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'status',
              message: 'Generating task plan...',
              timestamp: new Date()
            })}\n\n`
          ))

          // Step 1: Generate initial plan
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'plan_started',
              message: 'Analyzing requirements and generating task plan...'
            })}\n\n`
          ))

          const plan = await plannerService.generatePlan(want, use, make, subject, prompt, {
            provider,
            model
          })

          // Send plan created event
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'plan_created',
              plan
            })}\n\n`
          ))

          // Step 2: Validate the plan
          const validation = await plannerService.validatePlan(plan.steps, want, use, make)
          const isValid = validation.isValid

          // Send validation result
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'validation_complete',
              validation
            })}\n\n`
          ))

          // Refine if needed
          if (!isValid) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({
                type: 'status',
                message: 'Refining plan based on validation...',
                timestamp: new Date()
              })}\n\n`
            ))

            // Step 3: Refine plan if needed
            const refinedSteps = await plannerService.refinePlan(plan.steps, validation)
            const refinedPlan = { ...plan, steps: refinedSteps }
            const finalValidation = await plannerService.validatePlan(refinedSteps, want, use, make)
            
            if (finalValidation.isValid) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'plan_refined',
                  plan: refinedPlan,
                  timestamp: new Date()
                })}\n\n`
              ))
            }
          }

          // Execute the plan if requested
          if (execute && validation.isValid) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({
                type: 'status',
                message: 'Starting execution...',
                timestamp: new Date()
              })}\n\n`
            ))

            // Set up event listener for orchestrator events
            const eventHandler = (event: OrchestratorEvent) => {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify(event)}\n\n`
              ))
            }

            orchestratorService.on('orchestrator-event', eventHandler)

            try {
              // Execute the plan
              const execution = await orchestratorService.executePlan(plan, {
                parallel: false,
                continueOnError: true
              })

              // Send final execution result
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'execution_complete',
                  execution,
                  timestamp: new Date()
                })}\n\n`
              ))
            } finally {
              orchestratorService.removeListener('orchestrator-event', eventHandler)
            }
          }

          // Send completion message
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'complete',
              message: 'Task planning and execution completed',
              timestamp: new Date()
            })}\n\n`
          ))

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Error in plan-and-execute:', error)
          
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date()
            })}\n\n`
          ))
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      }
    })
  } catch (error) {
    console.error('Error in plan-and-execute:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
