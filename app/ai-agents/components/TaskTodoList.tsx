"use client"

import React from 'react'
import { CheckCircle2, Circle, Clock, AlertCircle, ChevronDown, ChevronRight, Loader2, XCircle, RotateCcw } from 'lucide-react'
import { TaskStep } from '@/lib/services/task-planner.service'
import { cn } from '@/lib/utils'

interface TaskTodoListProps {
  steps: TaskStep[]
  onStepClick?: (step: TaskStep) => void
  onRetry?: (stepId: string) => void
  className?: string
  collapsible?: boolean
  defaultExpanded?: boolean
}

export function TaskTodoList({ 
  steps, 
  onStepClick, 
  onRetry,
  className,
  collapsible = true,
  defaultExpanded = true
}: TaskTodoListProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  
  const statusConfig = {
    pending: {
      icon: Circle,
      color: 'text-gray-400',
      bg: 'bg-gray-50',
      label: 'Pending'
    },
    in_progress: {
      icon: Loader2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      label: 'In Progress',
      animate: true
    },
    completed: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
      label: 'Completed'
    },
    failed: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      label: 'Failed'
    },
    skipped: {
      icon: AlertCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      label: 'Skipped'
    }
  }

  const completedCount = steps.filter(s => s.status === 'completed').length
  const percentage = Math.round((completedCount / steps.length) * 100)

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {collapsible && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-0.5 hover:bg-gray-100 rounded transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}
            <h3 className="font-semibold text-gray-900">Task List</h3>
            <span className="text-xs text-gray-500">
              {completedCount} of {steps.length} completed
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">{percentage}%</span>
          </div>
        </div>
      </div>

      {/* Steps List */}
      {expanded && (
        <div className="divide-y divide-gray-100">
          {steps.map((step, index) => {
            const config = statusConfig[step.status]
            const Icon = config.icon
            
            return (
              <div
                key={step.id}
                className={cn(
                  'px-4 py-3 transition-colors cursor-pointer',
                  'hover:bg-gray-50',
                  step.status === 'in_progress' && 'bg-blue-50/30'
                )}
                onClick={() => onStepClick?.(step)}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className={cn('mt-0.5', config.color)}>
                      <Icon 
                        className={cn(
                          'h-5 w-5',
                          step.status === 'in_progress' && 'animate-spin'
                        )} 
                      />
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {step.title}
                        </h4>
                        <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">
                          {step.description}
                        </p>
                      </div>

                      {/* Priority & Duration */}
                      <div className="flex items-center gap-2 shrink-0">
                        {step.estimatedDuration && step.status === 'pending' && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {step.estimatedDuration}
                          </div>
                        )}
                        
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          step.priority === 'high' && 'bg-red-100 text-red-700',
                          step.priority === 'medium' && 'bg-yellow-100 text-yellow-700',
                          step.priority === 'low' && 'bg-gray-100 text-gray-700'
                        )}>
                          {step.priority}
                        </span>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {/* Status Label */}
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        config.bg,
                        config.color
                      )}>
                        {config.label}
                      </span>

                      {/* Tools */}
                      {step.tools && step.tools.length > 0 && (
                        <div className="flex items-center gap-1">
                          {step.tools.map(tool => (
                            <span key={tool} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                              {tool}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Dependencies */}
                      {step.dependencies && step.dependencies.length > 0 && (
                        <span className="text-xs text-gray-500">
                          Depends on: {step.dependencies.length} task{step.dependencies.length > 1 ? 's' : ''}
                        </span>
                      )}

                      {/* Timing */}
                      {step.completedAt && (
                        <span className="text-xs text-gray-500">
                          Completed in {Math.round((step.completedAt.getTime() - (step.startedAt?.getTime() || 0)) / 1000)}s
                        </span>
                      )}

                      {/* Retry button for failed steps */}
                      {step.status === 'failed' && onRetry && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onRetry(step.id)
                          }}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Retry
                        </button>
                      )}
                    </div>

                    {/* Error Message */}
                    {step.error && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2">
                        {step.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
