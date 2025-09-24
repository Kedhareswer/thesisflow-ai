"use client"

import { useState, useEffect, useRef } from 'react'
import { MoreVertical, ThumbsUp, ThumbsDown, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { supportEngine, type Message, type ConversationState, type QuickReply } from '@/lib/services/support-engine'

interface SupportPanelProps {
  onClose: () => void
  prefillMessage?: string
  onClearPrefill?: () => void
}

function SupportPanel({ 
  onClose, 
  prefillMessage = '', 
  onClearPrefill 
}: SupportPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversationState, setConversationState] = useState<ConversationState>({
    messages: [],
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  })
  const [showBroadcast, setShowBroadcast] = useState(true)
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Initialize conversation and handle prefill
  useEffect(() => {
    initializeConversation()
    
    if (prefillMessage) {
      setInputValue(prefillMessage)
      onClearPrefill?.()
      // Auto-focus input after a short delay
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [prefillMessage, onClearPrefill])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages])

  // Prevent background scroll when scrolling in chat
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current
    if (!messagesContainer) return

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer
      const isScrollingUp = e.deltaY < 0
      const isScrollingDown = e.deltaY > 0
      const isAtTop = scrollTop === 0
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1

      // Prevent background scroll when:
      // - Scrolling up and not at top
      // - Scrolling down and not at bottom
      if ((isScrollingUp && !isAtTop) || (isScrollingDown && !isAtBottom)) {
        e.stopPropagation()
      }
    }

    messagesContainer.addEventListener('wheel', handleWheel, { passive: false })
    return () => messagesContainer.removeEventListener('wheel', handleWheel)
  }, [])

  // Load conversation from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('support:conversation:v1')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setMessages(data.messages || [])
        setConversationState(data.conversationState || conversationState)
      } catch (error) {
        console.warn('Failed to load saved conversation:', error)
      }
    }
  }, [])

  // Save conversation to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      const data = {
        messages,
        conversationState: {
          ...conversationState,
          messages
        }
      }
      localStorage.setItem('support:conversation:v1', JSON.stringify(data))
    }
  }, [messages, conversationState])

  const initializeConversation = () => {
    // Don't re-initialize if we already have messages
    if (messages.length > 0) return

    // If a saved conversation exists, restore it instead of greeting again
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('support:conversation:v1') : null
      if (saved) {
        const data = JSON.parse(saved)
        const savedMessages = Array.isArray(data?.messages) ? data.messages : []
        if (savedMessages.length > 0) {
          setMessages(savedMessages)
          setConversationState(prev => ({
            ...prev,
            ...(data?.conversationState || {}),
            messages: savedMessages
          }))
          return
        }
      }
    } catch {}

    // Get automated welcome response
    const welcomeResponse = supportEngine.generateResponse('greeting', '', conversationState)

    const welcomeMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: welcomeResponse.text,
      timestamp: new Date(),
      intent: 'greeting'
    }

    setMessages([welcomeMessage])
    setConversationState(prev => ({
      ...prev,
      messages: [welcomeMessage],
      activeIntent: 'greeting'
    }))
  }

  const handleSendMessage = async (content?: string) => {
    const messageContent = content || inputValue.trim()
    if (!messageContent) return

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Analyze intent and generate response
    try {
      const { intent, confidence } = supportEngine.analyzeIntent(messageContent, conversationState)
      
      const updatedState: ConversationState = {
        ...conversationState,
        messages: [...messages, userMessage],
        activeIntent: intent
      }

      // Generate instant response
      const response = supportEngine.generateResponse(intent, messageContent, updatedState)

      // Minimal typing delay for natural feel
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))
      
      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        intent,
        confidence
      }

      setMessages(prev => [...prev, assistantMessage])
      setConversationState({
        ...updatedState,
        messages: [...updatedState.messages, assistantMessage],
        activeIntent: intent
      })

      // Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'support_message', {
          event_category: 'support',
          event_label: intent,
          value: Math.round(confidence * 100)
        })
      }

    } catch (error) {
      console.error('Error processing message:', error)
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: "I'm Nova, and I'm sorry - I encountered an error. Please try again or contact support@thesisflow-ai.com for assistance.",
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleQuickReply = (reply: QuickReply) => {
    if (reply.action === 'external_link' && reply.url) {
      window.open(reply.url, '_blank')
      
      // Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'support_quick_reply_external', {
          event_category: 'support',
          event_label: reply.url
        })
      }
    } else if (reply.action === 'custom' && reply.data) {
      const { type, text } = reply.data as { type: 'copy' | 'prefill'; text: string }
      if (type === 'copy' && text) {
        try {
          navigator.clipboard.writeText(text)
          const assistantMessage: Message = {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `Copied to clipboard: ${text}`,
            timestamp: new Date(),
            intent: 'contact'
          }
          setMessages(prev => [...prev, assistantMessage])
        } catch (e) {
          const assistantMessage: Message = {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `Please copy this email: ${text}`,
            timestamp: new Date(),
            intent: 'contact'
          }
          setMessages(prev => [...prev, assistantMessage])
        }
      }
      if (type === 'prefill' && text) {
        setInputValue(text)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      // Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'support_quick_reply_custom', {
          event_category: 'support',
          event_label: type
        })
      }
    } else if (reply.intent) {
      handleSendMessage(reply.text)
      
      // Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'support_quick_reply', {
          event_category: 'support',
          event_label: reply.intent
        })
      }
    }
  }

  const handleFeedback = (messageId: string, rating: 'up' | 'down') => {
    setFeedback(prev => ({ ...prev, [messageId]: rating }))
    
    // Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'support_feedback', {
        event_category: 'support',
        event_label: rating,
        value: rating === 'up' ? 1 : 0
      })
    }
  }

  const clearConversation = () => {
    setMessages([])
    setConversationState({
      messages: [],
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })
    localStorage.removeItem('support:conversation:v1')
    initializeConversation()
  }

  const exportConversation = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        intent: m.intent
      }))
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `thesisflow-support-chat-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const deleteData = () => {
    if (confirm('Are you sure you want to delete all your support chat data? This cannot be undone.')) {
      localStorage.removeItem('support:conversation:v1')
      localStorage.removeItem('support:dismissed-broadcasts')
      localStorage.removeItem('support:last-visit')
      clearConversation()
    }
  }

  // Get quick replies for current context
  const getQuickReplies = (): QuickReply[] => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')
    if (lastAssistantMessage?.intent) {
      return supportEngine.generateQuickReplies(lastAssistantMessage.intent, conversationState)
    }
    return [
      { text: "Pricing", intent: "pricing" },
      { text: "Features", intent: "about" },
      { text: "Token Usage", intent: "tokens" },
      { text: "What's New?", intent: "changelog" }
    ]
  }

  return (
    <div className="flex flex-col h-[600px] max-h-[600px] md:h-[600px] md:max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#FF6B2C] text-white text-sm">
              N
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-sm">Nova - ThesisFlow Support</div>
            <div className="text-xs text-gray-500">AI Assistant • Instant responses</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
            align="end"
          >
            <DropdownMenuItem onClick={clearConversation}>
              Clear conversation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportConversation}>
              Export conversation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={deleteData} className="text-red-600">
              Delete my data
            </DropdownMenuItem>
          </DropdownMenu>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0 hidden md:flex"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Broadcast Banner */}
      {showBroadcast && (
        <div className="p-3 bg-blue-50 border-b border-blue-200 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="font-medium text-blue-900">🚀 New release v1.3 shipped</div>
              <div className="text-blue-700">Enhanced Research Assistant with better context understanding</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBroadcast(false)}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 overscroll-contain"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            {message.role === 'assistant' && (
              <Avatar className="h-6 w-6 mt-1">
                <AvatarFallback className="bg-[#FF6B2C] text-white text-xs">
                  N
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className={cn(
              "max-w-[80%] rounded-lg px-3 py-2 text-sm",
              message.role === 'user' 
                ? "bg-[#FF6B2C] text-white" 
                : "bg-gray-100 text-gray-900"
            )}>
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* Feedback buttons for assistant messages */}
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Was this helpful?</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback(message.id, 'up')}
                    className={cn(
                      "h-6 w-6 p-0",
                      feedback[message.id] === 'up' && "text-green-600"
                    )}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback(message.id, 'down')}
                    className={cn(
                      "h-6 w-6 p-0",
                      feedback[message.id] === 'down' && "text-red-600"
                    )}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3 justify-start">
            <Avatar className="h-6 w-6 mt-1">
              <AvatarFallback className="bg-[#FF6B2C] text-white text-xs">
                N
              </AvatarFallback>
            </Avatar>
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-2">
          {getQuickReplies().map((reply, index) => (
            <Badge
              key={index}
              variant="outline"
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleQuickReply(reply)}
            >
              {reply.text}
            </Badge>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Ask Nova anything..."
            className="flex-1"
            disabled={isTyping}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isTyping}
            size="sm"
            className="bg-[#FF6B2C] hover:bg-[#FF6B2C]/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SupportPanel
