"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Paperclip, Smile, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChatBubble, ChatMessage } from "./chat-bubble"
import { AgentPlan } from "./agent-plan"

interface EnhancedChatProps {
  className?: string
  onSendMessage?: (message: string) => Promise<void>
  messages?: ChatMessage[]
  isLoading?: boolean
  placeholder?: string
  showAgentPlan?: boolean
}

export function EnhancedChat({
  className,
  onSendMessage,
  messages = [],
  isLoading = false,
  placeholder = "Ask a question about your research...",
  showAgentPlan = true
}: EnhancedChatProps) {
  const [inputValue, setInputValue] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [localMessages])

  // Update local messages when prop changes
  useEffect(() => {
    setLocalMessages(messages)
  }, [messages])

  // Handle thinking process completion
  const handleThinkingComplete = () => {
    setIsThinking(false)
    // The parent component will handle AI response generation
    // No need to add a hardcoded message here
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      status: 'sent'
    }

    setLocalMessages(prev => [...prev, userMessage])
    setInputValue("")

    // Start thinking process
    if (showAgentPlan) {
      setIsThinking(true)
    }

    // Call the actual send handler
    if (onSendMessage) {
      try {
        await onSendMessage(inputValue.trim())
      } catch (error) {
        console.error('Failed to send message:', error)
        // Add error message
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Sorry, I encountered an error while processing your request. Please try again.",
          timestamp: new Date(),
          status: 'error'
        }
        setLocalMessages(prev => [...prev, errorMessage])
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {localMessages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              showTimestamp={true}
              showStatus={true}
            />
          ))}
        </AnimatePresence>

        {/* Agent Planning Component */}
        <AnimatePresence>
          {isThinking && showAgentPlan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AgentPlan
                isVisible={isThinking}
                onComplete={handleThinkingComplete}
                className="mb-4"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && !isThinking && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-muted text-foreground rounded-2xl px-4 py-3 shadow-sm mr-12">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                </motion.div>
                <span className="text-sm">AI is responding...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="min-h-[44px] max-h-[120px] resize-none pr-12"
              disabled={isLoading || isThinking}
            />
            
            {/* Input Actions */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={isLoading || isThinking}
              >
                <Paperclip className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={isLoading || isThinking}
              >
                <Smile className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={isLoading || isThinking}
              >
                <Mic className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || isThinking}
            size="sm"
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Character count and status */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{inputValue.length} characters</span>
          <span>
            {isThinking ? "AI is thinking..." : 
             isLoading ? "Processing..." : 
             "Press Enter to send"}
          </span>
        </div>
      </div>
    </div>
  )
} 