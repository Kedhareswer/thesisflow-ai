"use client"

import React from "react"
import { useParams, useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"
import { useAIChat } from "@/lib/hooks/use-ai-chat"
import { ChatMessage } from "@/lib/types/ai-chat"
import { ArrowLeft, Send, Loader2 } from "lucide-react"

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params?.id as string
  
  const { currentSession, loadSession, addMessage, simulateDeepResearch, isLoading, progress } = useAIChat()
  const [collapsed, setCollapsed] = React.useState(false)
  const [input, setInput] = React.useState("")
  
  React.useEffect(() => {
    if (chatId) {
      loadSession(chatId)
    }
  }, [chatId, loadSession])

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
        return (
          <div key={message.id} className="flex justify-start mb-4">
            <div className="max-w-[85%] bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="prose prose-sm max-w-none">
                <div className="text-sm text-gray-900 whitespace-pre-wrap">{message.content}</div>
              </div>
              {message.metadata?.sources && (
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
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
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

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-4xl mx-auto">
            {currentSession.messages.map(renderMessage)}
            
            {/* Loading indicator */}
            {isLoading && progress && (
              <div className="flex justify-center mb-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-center">
                  <div className="flex items-center gap-2 text-sm text-yellow-800 font-medium">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {progress.message}
                  </div>
                  {progress.sources && (
                    <div className="text-xs text-yellow-600 mt-1">
                      {progress.sources.map(source => `${source.name}: ${source.count} papers`).join(" • ")}
                    </div>
                  )}
                  <div className="mt-2">
                    <div className="w-48 bg-yellow-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
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
