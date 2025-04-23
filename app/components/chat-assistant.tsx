/*
"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useChatMemory, ChatMessage } from "../../lib/chat-memory"
import { Loader2, Send, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ChatAssistantProps {
  topic?: string;
  placeholder?: string;
  className?: string;
  contextWindowSize?: number;
}

export function ChatAssistant({ topic = "general", placeholder = "Ask me anything...", className = "", contextWindowSize = 3 }: ChatAssistantProps) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  
  const {
    addMessage,
    getContextForTopic,
    setCurrentTopic,
    clearTopic,
  } = useChatMemory()

  const messages = getContextForTopic(topic)

  useEffect(() => {
    setCurrentTopic(topic)
  }, [topic, setCurrentTopic])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setIsLoading(true)
    const userMessage = input.trim()
    setInput("")

    try {
      // Add user message to memory
      try {
        addMessage({
          role: "user",
          content: userMessage,
          topic,
        })
      } catch (error) {
        console.error("Error adding user message:", error)
        throw new Error("Failed to save your message")
      }

      // Create prompt with context from previous messages
      const context = messages
        .slice(-contextWindowSize)
        .map((msg: ChatMessage) => `${msg.role}: ${msg.content}`)
        .join("\n")

      // Generate AI response
      const aiResult = await generateAIResponse(userMessage, context)
      
      if (aiResult.error) {
        throw new Error(aiResult.error)
      }

      // Add AI response to memory
      try {
        addMessage({
          role: "assistant",
          content: aiResult.content,
          topic,
        })
      } catch (error) {
        console.error("Error adding AI response:", error)
        throw new Error("Failed to save AI response")
      }

      // Update UI
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    } catch (error) {
      console.error("Error handling chat submission:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while processing your request.",
        variant: "destructive",
      })

      // Try to recover the chat state
      try {
        const currentMessages = getContextForTopic(topic)
        if (currentMessages.length === 0) {
          setCurrentTopic(topic)
        }
      } catch (recoveryError) {
        console.error("Error recovering chat state:", recoveryError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center space-y-4 p-4">
          {messages.map((message: ChatMessage, index: number) => (
            <div key={index} className={`flex flex-col items-start ${message.role === "user" ? "self-end" : "self-start"}`}>
              <div className="flex items-center space-x-2">
                {message.role === "user" ? (
                  <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                    {/* User icon */}
/*
                  </div>
                ) : (
                  <div className="h-8 w-8 bg-gray-500 rounded-full flex items-center justify-center">
                    {/* AI icon */}
/*
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  {message.role === "user" ? "You" : "AI"}
                </div>
              </div>
              <div className="mt-1 p-2 rounded-lg bg-gray-200 text-sm">
                {message.content}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-0 p-4">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder={placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 
