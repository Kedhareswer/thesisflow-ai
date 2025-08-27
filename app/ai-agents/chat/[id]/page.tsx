"use client"

import React from "react"
import { useParams, useRouter } from "next/navigation"
import { useAIChat } from "@/lib/hooks/use-ai-chat"
import { ChatMessage } from "@/lib/types/ai-chat"
import { ArrowLeft, Send, Loader2 } from "lucide-react"
import ReasoningSteps from '../components/ReasoningSteps'
import RichContentRenderer from '../../../../components/research/RichContentRenderer'
import Sidebar from '../../components/Sidebar'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params?.id as string
  
  const { currentSession, loadSession, addMessage, simulateDeepResearch, isLoading, progress } = useAIChat()
  const [collapsed, setCollapsed] = React.useState(false)
  const [input, setInput] = React.useState("")
  const [reasoningSteps, setReasoningSteps] = React.useState<any[]>([])
  
  React.useEffect(() => {
    if (chatId) {
      const session = loadSession(chatId)
      if (!session) {
        // If session doesn't exist, redirect back to AI agents page
        router.push("/ai-agents")
      } else if (session && session.messages.length === 0) {
        // Initialize reasoning steps
        setReasoningSteps([
          { id: 'search', title: 'Database Search', description: 'Searching academic databases...', status: 'pending' },
          { id: 'expand', title: 'Search Expansion', description: 'Finding related terms and expanding search...', status: 'pending' },
          { id: 'analyze', title: 'Quality Analysis', description: 'Filtering and ranking papers by relevance...', status: 'pending' },
          { id: 'extract', title: 'Insight Extraction', description: 'Analyzing abstracts and extracting key themes...', status: 'pending' },
          { id: 'synthesize', title: 'Report Generation', description: 'Synthesizing findings into comprehensive summary...', status: 'pending' }
        ])
        
        // Auto-start research with initial query for new sessions
        simulateDeepResearch(chatId, session.taskConfig.query)
      }
    }
  }, [chatId, loadSession, router, simulateDeepResearch])

  // Update reasoning steps based on progress
  React.useEffect(() => {
    if (progress && reasoningSteps.length > 0) {
      setReasoningSteps(prev => prev.map(step => {
        switch (progress.phase) {
          case 'searching':
            if (step.id === 'search') {
              return { 
                ...step, 
                status: 'active',
                description: progress.message,
                sources: progress.sources,
                progress: progress.progress,
                duration: 'in progress...'
              }
            }
            return step
          case 'analyzing':
            if (step.id === 'search') {
              return { ...step, status: 'completed', duration: '2.3s' }
            }
            if (step.id === 'expand') {
              return { ...step, status: 'completed', duration: '1.8s' }
            }
            if (step.id === 'analyze') {
              return { 
                ...step, 
                status: 'active',
                description: progress.message,
                progress: progress.progress,
                duration: 'in progress...'
              }
            }
            return step
          case 'synthesizing':
            if (step.id === 'analyze') {
              return { ...step, status: 'completed', duration: '3.1s' }
            }
            if (step.id === 'extract') {
              return { ...step, status: 'completed', duration: '2.7s' }
            }
            if (step.id === 'synthesize') {
              return { 
                ...step, 
                status: 'active',
                description: progress.message,
                progress: progress.progress,
                duration: 'in progress...'
              }
            }
            return step
          case 'completed':
            return step.status !== 'completed' ? { ...step, status: 'completed', duration: step.id === 'synthesize' ? '4.2s' : step.duration } : step
          default:
            return step
        }
      }))
    }
  }, [progress, reasoningSteps.length])

  const handleSendMessage = async () => {
    if (!input.trim() || !chatId || isLoading) return
    
    const message = input.trim()
    setInput("")
    
    // For now, simulate deep research for any input
    await simulateDeepResearch(chatId, message)
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const renderMessage = (message: ChatMessage) => {
    switch (message.role) {
      case 'user':
        return (
          <div key={message.id} className="flex justify-end mb-4">
            <div className="max-w-[70%] bg-orange-500 text-white rounded-lg px-4 py-2">
              <div className="text-sm">{message.content}</div>
              <div className="text-xs opacity-75 mt-1">{formatTimestamp(message.timestamp)}</div>
            </div>
          </div>
        )
      
      case 'system':
        return (
          <div key={message.id} className="flex justify-center mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center">
              <div className="text-sm text-blue-800 font-medium">{message.content}</div>
              {message.metadata?.progress && (
                <div className="mt-2">
                  <div className="w-32 bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${message.metadata.progress}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="text-xs text-blue-600 mt-1">{formatTimestamp(message.timestamp)}</div>
            </div>
          </div>
        )
      
      case 'assistant':
        const isComprehensiveReport = message.metadata?.taskType === 'deep-research' && 
          message.metadata?.comprehensiveReport

        return (
          <div key={message.id} className="flex justify-start mb-4">
            <div className="max-w-[95%] bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              {isComprehensiveReport ? (
                <RichContentRenderer
                  content={message.content}
                  metadata={{
                    totalPapers: message.metadata?.totalPapers,
                    sources: message.metadata?.sources,
                    keyFindings: message.metadata?.keyFindings,
                    executiveSummary: message.metadata?.executiveSummary
                  }}
                  tables={message.metadata?.tables || []}
                  charts={message.metadata?.charts || []}
                  highlights={message.metadata?.highlights || []}
                />
              ) : (
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700">
                  <div 
                    className="text-sm text-gray-900"
                    dangerouslySetInnerHTML={{ 
                      __html: message.content
                        .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-gray-900 mb-3 mt-0">$1</h1>')
                        .replace(/^## (.*$)/gim, '<h2 class="text-base font-semibold text-gray-800 mb-2 mt-4">$1</h2>')
                        .replace(/^### (.*$)/gim, '<h3 class="text-sm font-medium text-gray-700 mb-2 mt-3">$1</h3>')
                        .replace(/^\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>')
                        .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-gray-700">$1</li>')
                        .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 list-decimal text-gray-700">$2</li>')
                        .replace(/\n/g, '<br>')
                    }}
                  />
                </div>
              )}
              
              {message.metadata?.sources && !isComprehensiveReport && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Sources:</span> {message.metadata.sources.join(", ")}
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-2">{formatTimestamp(message.timestamp)}</div>
            </div>
          </div>
        )
    }
  }

  if (!currentSession) {
    return (
      <div className="flex min-h-screen bg-[#F8F9FA]">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <div className="text-gray-600">Loading chat session...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex h-screen flex-1 flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/ai-agents")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Tasks</span>
            </button>
            <div className="h-4 w-px bg-gray-300" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{currentSession.title}</h1>
              <div className="text-xs text-gray-500">
                Started {currentSession.createdAt.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {currentSession.messages.map(renderMessage)}
            
            {/* Reasoning Steps - shown during research */}
            {isLoading && reasoningSteps.length > 0 && (
              <div className="mb-6">
                <ReasoningSteps 
                  steps={reasoningSteps}
                  isComplete={!isLoading}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sticky Input Area */}
        <div className="sticky bottom-0 z-10 border-t border-gray-200/50 bg-white/80 backdrop-blur-md px-6 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a follow-up question or request additional analysis..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="self-end rounded-lg bg-orange-500 p-3 text-white shadow hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
