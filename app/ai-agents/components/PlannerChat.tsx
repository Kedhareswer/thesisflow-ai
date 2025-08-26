"use client"

import React from 'react'
import { ChevronDown, ChevronUp, ChevronRight, Play, Pause, Square, RefreshCw, Brain, CheckCircle, Clock, AlertCircle, Loader2, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { TaskPlan } from '@/lib/services/task-planner.service'
import { OrchestratorEvent } from '@/lib/services/task-orchestrator.service'
import { TaskTodoList } from './TaskTodoList'

import { AIProvider } from '@/lib/ai-providers'

interface PlanSection {
  id: string
  title: string
  type: 'planning' | 'validation' | 'execution' | 'result'
  content: string | React.ReactNode
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  expanded: boolean
  timestamp: Date
}

interface PlannerChatProps {
  plan?: TaskPlan
  events: OrchestratorEvent[]
  isPlanning: boolean
  isExecuting: boolean
  onSendMessage?: (message: string) => void
  onRetryStep?: (stepId: string) => void
  onCancelExecution?: () => void
  className?: string
  // Deep search integration
  deepSearchResults?: {
    items: any[]
    summary?: string
    isLoading?: boolean
    error?: string
    progress?: any
  }
}

export function PlannerChat({
  plan,
  events,
  isPlanning,
  isExecuting,
  onSendMessage,
  onRetryStep,
  onCancelExecution,
  className,
  deepSearchResults
}: PlannerChatProps) {
  const [sections, setSections] = React.useState<PlanSection[]>([])
  const [input, setInput] = React.useState('')
  const [executionResults, setExecutionResults] = React.useState<Map<string, any>>(new Map())
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Process events into sections
  React.useEffect(() => {
    if (!plan && !deepSearchResults) return

    const newSections: PlanSection[] = []

    // Show deep search results as part of planning workflow
    if (deepSearchResults && (deepSearchResults.items.length > 0 || deepSearchResults.summary || deepSearchResults.isLoading)) {
      newSections.push({
        id: 'deep-search',
        title: '🔍 Deep Search & Research',
        type: 'execution',
        content: (
          <div className="space-y-3">
            {deepSearchResults.isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching and analyzing sources...
              </div>
            )}

            {deepSearchResults.error && (
              <div className="text-sm text-red-700 p-2 bg-red-50 rounded">
                {deepSearchResults.error}
              </div>
            )}

            {deepSearchResults.progress?.message && (
              <div className="text-xs text-gray-600">
                {deepSearchResults.progress.message}
                {deepSearchResults.progress.total && ` • ${deepSearchResults.progress.total} items`}
              </div>
            )}

            {deepSearchResults.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-800">Found {deepSearchResults.items.length} sources:</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {deepSearchResults.items.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                      <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline">
                        {item.title}
                      </a>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="bg-white px-2 py-0.5 rounded border">{item.source}</span>
                        {item.kind && <span className="bg-white px-2 py-0.5 rounded border capitalize">{item.kind}</span>}
                      </div>
                      {item.snippet && <p className="mt-1 text-xs text-gray-600 line-clamp-2">{item.snippet}</p>}
                    </div>
                  ))}
                  {deepSearchResults.items.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      ... and {deepSearchResults.items.length - 5} more sources
                    </p>
                  )}
                </div>
              </div>
            )}

            {deepSearchResults.summary && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm font-medium text-green-800 mb-2">Research Summary:</p>
                <div className="text-sm text-green-700 prose prose-sm max-w-none" 
                     dangerouslySetInnerHTML={{ __html: deepSearchResults.summary.replace(/\n/g, '<br/>') }} />
              </div>
            )}
          </div>
        ),
        status: deepSearchResults.isLoading ? 'in_progress' : 'completed',
        expanded: true,
        timestamp: new Date()
      })
    }

    if (plan) {
      // Planning section
      newSections.push({
        id: 'planning',
        title: '🧠 Task Analysis & Planning',
        type: 'planning',
        content: (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <div><span className="font-medium">Description:</span> {plan.description}</div>
            </div>
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-2">Analyzing your request:</p>
              <p>Breaking down your request into structured, actionable steps...</p>
            </div>
            
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-2">Generated {plan.steps.length} steps:</p>
              <ol className="space-y-1 ml-4 list-decimal">
                {plan.steps.slice(0, 5).map(step => (
                  <li key={step.id} className="text-gray-600">
                    {step.title}
                  </li>
                ))}
                {plan.steps.length > 5 && (
                  <li className="text-gray-500 italic">
                    ... and {plan.steps.length - 5} more steps
                  </li>
                )}
              </ol>
            </div>
          </div>
        ),
        status: isPlanning ? 'in_progress' : 'completed',
        expanded: true,
        timestamp: plan.createdAt
      })

      // Validation section (if plan has validation)
      if (plan.validation) {
        newSections.push({
          id: 'validation',
          title: '✅ Plan Validation',
          type: 'validation',
          content: (
            <div className="space-y-2">
              <div className="text-sm">
                <span className={`font-medium ${plan.validation.isValid ? 'text-green-700' : 'text-red-700'}`}>
                  Status: {plan.validation.isValid ? 'Valid' : 'Issues Found'}
                </span>
              </div>
              
              {plan.validation.issues && plan.validation.issues.length > 0 && (
                <div className="text-sm text-red-700">
                  <p className="font-medium mb-1">Issues:</p>
                  <ul className="ml-4 space-y-1 list-disc">
                    {plan.validation.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {plan.validation.suggestions && plan.validation.suggestions.length > 0 && (
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Suggestions:</p>
                  <ul className="ml-4 space-y-1 list-disc">
                    {plan.validation.suggestions.map((suggestion, i) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ),
          status: plan.validation.isValid ? 'completed' : 'failed',
          expanded: !plan.validation.isValid,
          timestamp: plan.createdAt
        })
      }
    }

    setSections(newSections)
  }, [plan, isPlanning, deepSearchResults])

  // Process orchestrator events
  React.useEffect(() => {
    const latestEvent = events[events.length - 1]
    if (!latestEvent) return

    switch (latestEvent.type) {
      case 'step_started':
        // Add execution update
        setSections(prev => {
          const executionSection = prev.find(s => s.id === 'execution')
          if (!executionSection) {
            return [...prev, {
              id: 'execution',
              title: '⚡ Execution Progress',
              type: 'execution',
              content: `Starting: ${latestEvent.data?.title}`,
              status: 'in_progress',
              expanded: true,
              timestamp: latestEvent.timestamp
            }]
          }
          return prev.map(s => 
            s.id === 'execution' 
              ? { ...s, content: `Executing: ${latestEvent.data?.title}` }
              : s
          )
        })
        break

      case 'step_completed':
        if (latestEvent.data?.result) {
          setExecutionResults(prev => new Map(prev).set(latestEvent.stepId!, latestEvent.data.result))
        }
        break

      case 'plan_completed':
        setSections(prev => [...prev, {
          id: 'result',
          title: '🎉 Task Completed',
          type: 'result',
          content: (
            <div className="space-y-3">
              <p className="text-sm text-green-700">
                Successfully completed all {plan?.steps.length} steps
              </p>
              {executionResults.size > 0 && (
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-2">Key Results:</p>
                  <div className="space-y-2">
                    {Array.from(executionResults.entries()).slice(0, 3).map(([stepId, result]) => (
                      <div key={stepId} className="p-2 bg-gray-50 rounded">
                        <pre className="text-xs overflow-auto">
                          {JSON.stringify(result, null, 2).slice(0, 200)}...
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ),
          status: 'completed',
          expanded: true,
          timestamp: latestEvent.timestamp
        }])
        break

      case 'plan_failed':
        setSections(prev => [...prev, {
          id: 'error',
          title: '❌ Execution Failed',
          type: 'result',
          content: (
            <div className="text-sm text-red-600">
              <p className="font-medium">Error:</p>
              <p>{latestEvent.data?.error || 'Unknown error occurred'}</p>
            </div>
          ),
          status: 'failed',
          expanded: true,
          timestamp: latestEvent.timestamp
        }])
        break
    }
  }, [events, plan])

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sections])

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, expanded: !s.expanded } : s
    ))
  }

  const handleSend = () => {
    if (input.trim() && onSendMessage) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {/* Initial Planning Message */}
        {isPlanning && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200">
              <Brain className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Planning your task...</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                  <span className="text-xs text-gray-500">
                    {plan ? `Created ${formatDistanceToNow(plan.createdAt, { addSuffix: true })}` : 'Planning...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Sections */}
        {sections.map(section => (
          <div key={section.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  'transition-transform',
                  section.expanded ? 'rotate-90' : ''
                )}>
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </div>
                <span className="font-medium text-gray-900">{section.title}</span>
                {section.status === 'in_progress' && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
              </div>
              <span className="text-xs text-gray-500">
                {section.timestamp.toLocaleTimeString()}
              </span>
            </button>
            
            {section.expanded && (
              <div className="px-4 py-3 border-t border-gray-100">
                {typeof section.content === 'string' ? (
                  <p className="text-sm text-gray-700">{section.content}</p>
                ) : (
                  section.content
                )}
              </div>
            )}
          </div>
        ))}

        {/* Todo List */}
        {plan && plan.steps.length > 0 && (
          <TaskTodoList
            steps={plan.steps}
            onRetry={onRetryStep}
            className="shadow-sm"
            defaultExpanded={isExecuting}
          />
        )}

        {/* Execution Controls */}
        {isExecuting && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onCancelExecution}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel Execution
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Provide additional instructions or context..."
              className="w-full px-3 py-2 text-sm text-[#ee691a] caret-[#ee691a] border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={2}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              'bg-gradient-to-br from-orange-400 to-orange-600 text-white',
              'hover:from-orange-500 hover:to-orange-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
