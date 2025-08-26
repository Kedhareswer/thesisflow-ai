import { TaskPlan, TaskStep, TaskPlannerService } from './task-planner.service'
import { EventEmitter } from 'events'

export interface OrchestratorEvent {
  type: 'plan_created' | 'step_started' | 'step_completed' | 'step_failed' | 'plan_completed' | 'plan_failed' | 'progress_update'
  planId: string
  stepId?: string
  data?: any
  timestamp: Date
}

export interface ExecutionContext {
  plan: TaskPlan
  results: Map<string, any>
  currentStepIndex: number
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  pausedAt?: Date
}

export class TaskOrchestratorService extends EventEmitter {
  private static instance: TaskOrchestratorService
  private executions: Map<string, ExecutionContext> = new Map()
  private planner: TaskPlannerService
  private abortControllers: Map<string, AbortController> = new Map()

  private constructor() {
    super()
    this.planner = TaskPlannerService.getInstance()
  }

  static getInstance(): TaskOrchestratorService {
    if (!TaskOrchestratorService.instance) {
      TaskOrchestratorService.instance = new TaskOrchestratorService()
    }
    return TaskOrchestratorService.instance
  }

  /**
   * Execute a complete plan with multi-step orchestration
   */
  async executePlan(
    plan: TaskPlan,
    options: {
      parallel?: boolean
      continueOnError?: boolean
      maxRetries?: number
    } = {}
  ): Promise<ExecutionContext> {
    const execution: ExecutionContext = {
      plan,
      results: new Map(),
      currentStepIndex: 0,
      status: 'running',
      startedAt: new Date()
    }

    this.executions.set(plan.id, execution)
    this.abortControllers.set(plan.id, new AbortController())

    // Emit plan created event
    this.emitEvent({
      type: 'plan_created',
      planId: plan.id,
      data: plan,
      timestamp: new Date()
    })

    try {
      // Execute steps based on dependencies
      const executedSteps = new Set<string>()
      
      while (executedSteps.size < plan.steps.length) {
        const signal = this.abortControllers.get(plan.id)?.signal
        if (signal?.aborted) {
          throw new Error('Execution aborted')
        }

        // Find steps ready to execute (dependencies satisfied)
        const readySteps = plan.steps.filter(step => {
          if (executedSteps.has(step.id)) return false
          if (!step.dependencies || step.dependencies.length === 0) return true
          return step.dependencies.every(dep => executedSteps.has(dep))
        })

        if (readySteps.length === 0 && executedSteps.size < plan.steps.length) {
          throw new Error('Circular dependency detected or unresolvable dependencies')
        }

        // Execute ready steps
        if (options.parallel) {
          // Execute in parallel
          const stepPromises = readySteps.map(step => 
            this.executeStep(plan.id, step, execution.results)
          )
          const results = await Promise.allSettled(stepPromises)
          
          results.forEach((result, index) => {
            const step = readySteps[index]
            if (result.status === 'fulfilled') {
              execution.results.set(step.id, result.value.result)
              executedSteps.add(step.id)
              
              // Update step in plan
              const stepIndex = plan.steps.findIndex(s => s.id === step.id)
              if (stepIndex !== -1) {
                plan.steps[stepIndex] = result.value
              }
            } else if (!options.continueOnError) {
              throw new Error(`Step ${step.id} failed: ${result.reason}`)
            }
          })
        } else {
          // Execute sequentially
          for (const step of readySteps) {
            try {
              const updatedStep = await this.executeStep(plan.id, step, execution.results)
              execution.results.set(step.id, updatedStep.result)
              executedSteps.add(step.id)
              
              // Update step in plan
              const stepIndex = plan.steps.findIndex(s => s.id === step.id)
              if (stepIndex !== -1) {
                plan.steps[stepIndex] = updatedStep
              }
              
              execution.currentStepIndex++
              
              // Emit progress
              this.emitEvent({
                type: 'progress_update',
                planId: plan.id,
                data: {
                  completed: executedSteps.size,
                  total: plan.steps.length,
                  percentage: Math.round((executedSteps.size / plan.steps.length) * 100)
                },
                timestamp: new Date()
              })
            } catch (error) {
              if (!options.continueOnError) {
                throw error
              }
              // Mark step as failed but continue
              const stepIndex = plan.steps.findIndex(s => s.id === step.id)
              if (stepIndex !== -1) {
                plan.steps[stepIndex].status = 'failed'
                plan.steps[stepIndex].error = error instanceof Error ? error.message : String(error)
              }
              executedSteps.add(step.id)
            }
          }
        }
      }

      // All steps completed
      execution.status = 'completed'
      execution.completedAt = new Date()
      
      this.emitEvent({
        type: 'plan_completed',
        planId: plan.id,
        data: execution,
        timestamp: new Date()
      })

      return execution
    } catch (error) {
      execution.status = 'failed'
      execution.completedAt = new Date()
      
      this.emitEvent({
        type: 'plan_failed',
        planId: plan.id,
        data: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date()
      })

      throw error
    } finally {
      this.abortControllers.delete(plan.id)
    }
  }

  /**
   * Execute a single step with context from previous steps
   */
  private async executeStep(
    planId: string,
    step: TaskStep,
    previousResults: Map<string, any>
  ): Promise<TaskStep> {
    this.emitEvent({
      type: 'step_started',
      planId,
      stepId: step.id,
      data: step,
      timestamp: new Date()
    })

    try {
      // Build context from previous results
      const context = this.buildStepContext(step, previousResults)
      
      // Execute the step using the planner service
      const updatedStep = await this.planner.executeStep(step, context)
      
      this.emitEvent({
        type: 'step_completed',
        planId,
        stepId: step.id,
        data: updatedStep,
        timestamp: new Date()
      })

      return updatedStep
    } catch (error) {
      this.emitEvent({
        type: 'step_failed',
        planId,
        stepId: step.id,
        data: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date()
      })
      throw error
    }
  }

  /**
   * Build context for a step from previous results
   */
  private buildStepContext(step: TaskStep, previousResults: Map<string, any>): any {
    const context: any = {
      stepId: step.id,
      title: step.title,
      description: step.description,
      dependencies: {}
    }

    // Include results from dependencies
    if (step.dependencies) {
      for (const depId of step.dependencies) {
        if (previousResults.has(depId)) {
          context.dependencies[depId] = previousResults.get(depId)
        }
      }
    }

    // Include all previous results for context
    context.previousResults = Array.from(previousResults.entries()).map(([id, result]) => ({
      stepId: id,
      result
    }))

    return context
  }

  /**
   * Pause execution of a plan
   */
  pauseExecution(planId: string): boolean {
    const execution = this.executions.get(planId)
    if (!execution || execution.status !== 'running') {
      return false
    }

    execution.status = 'paused'
    execution.pausedAt = new Date()
    
    // Abort any ongoing operations
    const controller = this.abortControllers.get(planId)
    if (controller) {
      controller.abort()
    }

    return true
  }

  /**
   * Resume execution of a paused plan
   */
  async resumeExecution(planId: string): Promise<void> {
    const execution = this.executions.get(planId)
    if (!execution || execution.status !== 'paused') {
      throw new Error('Execution is not paused')
    }

    execution.status = 'running'
    delete execution.pausedAt
    
    // Create new abort controller
    this.abortControllers.set(planId, new AbortController())
    
    // Continue execution from where it left off
    await this.executePlan(execution.plan, { continueOnError: true })
  }

  /**
   * Cancel execution of a plan
   */
  cancelExecution(planId: string): boolean {
    const execution = this.executions.get(planId)
    if (!execution) {
      return false
    }

    const controller = this.abortControllers.get(planId)
    if (controller) {
      controller.abort()
    }

    execution.status = 'failed'
    execution.completedAt = new Date()
    
    this.emitEvent({
      type: 'plan_failed',
      planId,
      data: { error: 'Execution cancelled by user' },
      timestamp: new Date()
    })

    return true
  }

  /**
   * Get execution status
   */
  getExecution(planId: string): ExecutionContext | undefined {
    return this.executions.get(planId)
  }

  /**
   * Get all executions
   */
  getAllExecutions(): ExecutionContext[] {
    return Array.from(this.executions.values())
  }

  /**
   * Clear completed executions
   */
  clearCompletedExecutions(): void {
    for (const [planId, execution] of this.executions.entries()) {
      if (execution.status === 'completed' || execution.status === 'failed') {
        this.executions.delete(planId)
      }
    }
  }

  /**
   * Emit orchestrator events
   */
  private emitEvent(event: OrchestratorEvent): void {
    this.emit('orchestrator-event', event)
  }

  /**
   * Stream execution events
   */
  streamExecution(planId: string): ReadableStream<OrchestratorEvent> {
    const execution = this.executions.get(planId)
    if (!execution) {
      throw new Error('Execution not found')
    }

    return new ReadableStream<OrchestratorEvent>({
      start: (controller) => {
        const handler = (event: OrchestratorEvent) => {
          if (event.planId === planId) {
            controller.enqueue(event)
            
            // Close stream on completion
            if (event.type === 'plan_completed' || event.type === 'plan_failed') {
              controller.close()
              this.removeListener('orchestrator-event', handler)
            }
          }
        }

        this.on('orchestrator-event', handler)
      }
    })
  }
}

export default TaskOrchestratorService.getInstance()
