"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Clock, AlertCircle, Send } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error'
  isStreaming?: boolean
  streamedContent?: string
}

interface ChatBubbleProps {
  message: ChatMessage
  className?: string
  showTimestamp?: boolean
  showStatus?: boolean
}

const statusIcons = {
  sending: Clock,
  sent: Send,
  delivered: CheckCircle2,
  read: CheckCircle2,
  error: AlertCircle
}

const statusColors = {
  sending: "text-muted-foreground",
  sent: "text-muted-foreground",
  delivered: "text-blue-500",
  read: "text-green-500",
  error: "text-red-500"
}

export function ChatBubble({ 
  message, 
  className,
  showTimestamp = true,
  showStatus = true 
}: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const StatusIcon = statusIcons[message.status]
  
  return (
    <motion.div
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start",
        className
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        ease: [0.2, 0.65, 0.3, 0.9]
      }}
    >
      <div className={cn(
        "flex max-w-[80%] flex-col",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Message Bubble */}
        <div className={cn(
          "relative rounded-2xl px-4 py-3 shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground ml-12" 
            : "bg-muted text-foreground mr-12"
        )}>
          {/* Content */}
          <div className="break-words">
            {message.isStreaming && message.streamedContent ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="whitespace-pre-wrap"
              >
                {message.streamedContent}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="inline-block w-2 h-4 bg-current ml-1"
                />
              </motion.div>
            ) : (
              <div className="whitespace-pre-wrap">{message.content}</div>
            )}
          </div>
          
          {/* Status Indicators */}
          {showStatus && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs",
              isUser ? "justify-end" : "justify-start"
            )}>
              {message.status === 'error' && (
                <span className="text-red-500 text-xs">Failed to send</span>
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={message.status}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex items-center gap-1",
                    statusColors[message.status]
                  )}
                >
                  <StatusIcon className="h-3 w-3" />
                  {message.status === 'read' && (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        {showTimestamp && (
          <motion.div
            className={cn(
              "text-xs text-muted-foreground mt-1",
              isUser ? "text-right" : "text-left"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
} 