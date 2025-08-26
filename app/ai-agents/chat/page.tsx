"use client"

import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Copy, Download, ChevronRight, CornerRightDown, PlusCircle, ListPlus, Loader2, Bot, Paperclip, Image as ImageIcon, Smile, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import SearchBox from '@/app/ai-agents/components/SearchBox'
import { AnimatePresence, motion } from 'framer-motion'
import { useDeepSearch } from '@/hooks/use-deep-search'
import { AIProvider } from '@/lib/ai-providers'
import { PlannerChat } from '../components/PlannerChat'
import { TaskPlan } from '@/lib/services/task-planner.service'
import { OrchestratorEvent } from '@/lib/services/task-orchestrator.service'

function stripTrailingSuffix(text: string): string {
  return text.replace(/\s+(using\s+[^.]+)?(\s+and create\s+[^.]+)?\s*\.*\s*$/i, "")
}
function extractSubjectFromPrompt(prompt: string): string {
  const cleaned = stripTrailingSuffix(prompt || "")
  const preps = [" on ", " for ", " from ", " about ", " related to "]
  let idx = -1
  let found = ""
  for (const p of preps) {
    const i = cleaned.toLowerCase().lastIndexOf(p)
    if (i > idx) {
      idx = i
      found = p
    }
  }
  if (idx >= 0) {
    const after = cleaned.slice(idx + found.length)
    const nextUsing = after.toLowerCase().indexOf(" using ")
    const nextCreate = after.toLowerCase().indexOf(" and create ")
    const nextDot = after.indexOf(".")
    const stops = [nextUsing, nextCreate, nextDot].filter((n) => n >= 0)
    const stopAt = stops.length ? Math.min(...stops) : -1
    const subject = (stopAt >= 0 ? after.slice(0, stopAt) : after).trim()
    return subject || "Topic"
  }
  return cleaned.trim() || "Topic"
}
function toTitleCase(input: string) {
  return (input || "").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const startedRef = React.useRef(false)
  const searchBoxRef = useRef<any>(null)
  const providerParam = React.useMemo(() => (searchParams?.get("provider") || undefined) as AIProvider | undefined, [searchParams])
  const modelParam = React.useMemo(() => searchParams?.get("model") || undefined, [searchParams])
  
  // Shared UI state
  const [deepOn, setDeepOn] = React.useState(true)
  const [input, setInput] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  
  // AI provider/model state
  const [selectedProvider, setSelectedProvider] = React.useState<string>(providerParam || "")
  const [selectedModel, setSelectedModel] = React.useState<string>(modelParam || "")
  
  // Always use planning workflow - no separate simple mode
  
  // Planning and execution state
  const [isPlanning, setIsPlanning] = React.useState(false)
  const [isExecuting, setIsExecuting] = React.useState(false)
  const [currentPlan, setCurrentPlan] = React.useState<TaskPlan | undefined>()
  const [orchestratorEvents, setOrchestratorEvents] = React.useState<OrchestratorEvent[]>([])
  // Always show planning view
  
  // Deep search hook - now integrated into planning workflow
  const {
    items,
    summary,
    progress,
    warnings,
    notices,
    infos,
    isLoading,
    error,
    provider,
    model,
    start,
    reset,
    isStreaming,
    stop,
  } = useDeepSearch()

  const handlePlanAndExecute = async (want: string, use: string[], make: string[], subject: string, prompt: string) => {
    setIsPlanning(true)
    setIsExecuting(false)
    setOrchestratorEvents([])
    setCurrentPlan(undefined)

    try {
      const response = await fetch('/api/ai/plan-and-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          want,
          use,
          make,
          subject,
          prompt,
          provider: selectedProvider,
          model: selectedModel,
          execute: true
        })
      })

      if (!response.ok) throw new Error('Failed to start planning')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              setIsPlanning(false)
              setIsExecuting(false)
              continue
            }

            try {
              const event = JSON.parse(data)
              
              if (event.type === 'plan_created' || event.type === 'plan_refined') {
                setCurrentPlan(event.plan)
                setIsPlanning(false)
                setIsExecuting(true)
              } else if (event.type === 'validation_complete') {
                if (currentPlan) {
                  setCurrentPlan(prev => ({ ...prev!, validation: event.validation }))
                }
              } else if (['step_started', 'step_completed', 'step_failed', 'plan_completed', 'plan_failed'].includes(event.type)) {
                setOrchestratorEvents(prev => [...prev, event])
                
                // Update step status in plan
                if (event.stepId && currentPlan) {
                  setCurrentPlan(prev => {
                    if (!prev) return prev
                    const updatedSteps = prev.steps.map(step => {
                      if (step.id === event.stepId) {
                        if (event.type === 'step_started') {
                          return { ...step, status: 'in_progress' as const }
                        } else if (event.type === 'step_completed') {
                          return { ...step, status: 'completed' as const, result: event.data }
                        } else if (event.type === 'step_failed') {
                          return { ...step, status: 'failed' as const, error: event.data?.error }
                        }
                      }
                      return step
                    })
                    return { ...prev, steps: updatedSteps }
                  })
                }
              }
            } catch (e) {
              console.error('Failed to parse event:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Plan and execute error:', error)
      setIsPlanning(false)
      setIsExecuting(false)
    }
  }
  
  const addRecentChat = (chat: any) => {
    // Add to recent chats if service is available
    try {
      // Placeholder for recent chat service integration
      console.log('Adding to recent chats:', chat)
    } catch (e) {
      console.error('Failed to add recent chat:', e)
    }
  }

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) return

    // Get current SearchBox state
    const searchBoxState = (searchBoxRef.current as any)?.getState?.()
    const hasSelections = searchBoxState?.want || (searchBoxState?.use?.length > 0) || (searchBoxState?.make?.length > 0)

    // Always use planning workflow - either with SearchBox selections or defaults
    if (hasSelections) {
      const want = searchBoxState?.want || ''
      const use = searchBoxState?.use || []
      const make = searchBoxState?.make || []
      const subject = extractSubjectFromPrompt(input)
      handlePlanAndExecute(want, use, make, subject, input)
    } else {
      // For queries without SearchBox selections, use default planning approach
      const subject = extractSubjectFromPrompt(input)
      const defaultWant = deepOn ? 'search_papers' : 'write_report'
      const defaultUse = ['arxiv', 'pubmed']
      const defaultMake = ['pdf_report']
      handlePlanAndExecute(defaultWant, defaultUse, defaultMake, subject, input)
    }
  }

  // stop streaming if Deep Search toggled off
  React.useEffect(() => {
    if (!deepOn) {
      stop()
    }
  }, [deepOn, stop])

  // Read query from URL and optionally auto-start deep search
  React.useEffect(() => {
    if (!searchParams) return
    const q = (searchParams.get("query") || "").trim()
    const deep = searchParams.get("deep") === "1"
    if (q) setInput((prev) => (prev?.trim() ? prev : q))
    if (typeof deep === "boolean") setDeepOn(deep)
    if (q && deep && !startedRef.current) {
      startedRef.current = true
      try { addRecentChat({ query: q, provider: providerParam, model: modelParam, deep: true }) } catch {}
      start({ query: q, provider: providerParam, model: modelParam, limit: 20 })
    }
  }, [searchParams, start, providerParam, modelParam])

  // Derive dynamic title/tag from current input or URL query
  const topicBase = input?.trim() || searchParams?.get("query") || "Topic"
  const subject = React.useMemo(() => extractSubjectFromPrompt(topicBase), [topicBase])
  const topicTitle = React.useMemo(() => toTitleCase(subject), [subject])
  const topicTag = React.useMemo(() => {
    const words = (subject || "").split(/\s+/).filter(Boolean)
    return words.slice(0, 2).join(" ").toLowerCase() || "topic"
  }, [subject])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top toolbar area */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        {/* Always show Planner View for consistent workflow */}
        <PlannerChat
          plan={currentPlan}
          events={orchestratorEvents}
          isPlanning={isPlanning}
          isExecuting={isExecuting}
          deepSearchResults={{
            items,
            summary,
            isLoading,
            error: error || undefined,
            progress
          }}
          onSendMessage={(msg) => {
            // Handle additional messages during execution
            console.log('Additional message during execution:', msg)
          }}
          onRetryStep={(stepId) => {
            // Implement retry logic
            console.log('Retry step:', stepId)
          }}
          onCancelExecution={() => {
            setIsExecuting(false)
            setCurrentPlan(undefined)
            setOrchestratorEvents([])
          }}
          className="flex-1"
        />
      </div>

      {/* Main content area */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-5">
        <div className="mx-auto max-w-3xl pb-36 pt-5">
          {/* Topic pill, right aligned similar to screenshot */}
          <div className="mb-4 flex justify-end">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">{topicTag}</span>
          </div>

          {/* Assistant preamble card */}
          <div className="relative">
            <div className="mb-3 text-gray-500">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white">🧩</span>
            </div>
            <div className="space-y-4 leading-relaxed text-[15px] text-gray-800">
              <p>
                I understand you’re interested in deep learning research! Since you’ve mentioned preferring deep
                review, I’d like to ask some clarifying questions to help me provide the most valuable and focused
                assistance for your deep learning inquiry.
              </p>
              <p>Here are a few questions to help narrow down your research focus:</p>
              <ol className="list-decimal space-y-3 pl-6">
                <li>
                  <span className="font-semibold">What specific aspect of deep learning interests you most?</span>{" "}
                  Are you looking for technical fundamentals (neural network architectures, optimization algorithms),
                  practical applications (computer vision, NLP, robotics), or emerging trends (transformer models,
                  generative AI, federated learning)?
                </li>
                <li>
                  <span className="font-semibold">What’s your primary goal with this research?</span> Are you seeking to
                  understand the field for academic purposes, looking to implement solutions for a specific project, or
                  trying to stay current with the latest developments in the field?
                </li>
                <li>
                  <span className="font-semibold">Which application domains or use cases are most relevant to you?</span>{" "}
                  For example, are you focusing on healthcare, finance, education, autonomous systems, or another area?
                </li>
              </ol>
            </div>
          </div>

        </div>
      </main>

      {/* Sticky bottom chat composer */}
      <form onSubmit={onSubmit} className="sticky bottom-0 z-10 w-full bg-transparent">
        <div className="mx-auto max-w-3xl px-4 py-3">
          {/* container */}
          <div className="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or give follow up task..."
              className="min-h-[88px] w-full resize-none rounded-md p-3 text-[15px] leading-relaxed text-[#ee691a] caret-[#ee691a] outline-none placeholder:text-gray-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  onSubmit()
                }
              }}
            />

            {/* bottom controls */}
            <div className="mt-2 flex items-center gap-2 border-t border-gray-100 px-2 pt-2">
              {/* left accessories */}
              <div className="flex items-center gap-1 text-gray-500">
                <button type="button" className="rounded-md p-1 hover:bg-gray-100" title="Attach">
                  <Paperclip className="h-4 w-4 text-gray-500" />
                </button>
                <button type="button" className="rounded-md p-1 hover:bg-gray-100" title="Insert image">
                  <ImageIcon className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-md p-1 hover:bg-gray-100" title="Emoji">
                  <Smile className="h-4 w-4" />
                </button>
              </div>

              {/* Deep Search pill */}
              <button
                type="button"
                onClick={() => setDeepOn((v) => !v)}
                className={`ml-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
                  deepOn ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
                title="Deep Search"
              >
                <span className={`h-2 w-2 rounded-full ${deepOn ? "bg-orange-500" : "bg-gray-300"}`} />
                Deep Search
              </button>

              {/* grow */}
              <div className="flex-1" />

              {/* right side counters and submit */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-gray-200 bg-gray-50">🗎</span>
                  76
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-md bg-gradient-to-br from-orange-400 to-orange-600 px-3 py-2 text-sm font-semibold text-white shadow hover:from-orange-500 hover:to-orange-700"
                >
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
