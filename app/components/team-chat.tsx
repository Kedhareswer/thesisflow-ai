"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSocket } from "@/components/socket-provider"
import { useToast } from "@/hooks/use-toast"
import { MessageSquare, Bot, Send } from "lucide-react"

interface Message {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: string
  isAI?: boolean
}

interface User {
  id: string
  name: string
  avatar?: string | null
}

export default function TeamChat() {
  const { socket, sendEvent } = useSocket()
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentUser] = useState<User>({
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    name: `User ${Math.floor(Math.random() * 1000)}`,
    avatar: null
  })

  const handleSendMessage = async () => {
    if (!message.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      content: message,
      timestamp: new Date().toISOString(),
    }

    // Check if message mentions AI
    if (message.toLowerCase().includes("@ai")) {
      // Send message to chat
      setMessages(prev => [...prev, newMessage])
      
      // Process AI response
      try {
        const aiQuery = message.split("@ai")[1].trim()
        const response = await fetch("/api/explore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: aiQuery,
            options: {
              temperature: 0.7,
              maxTokens: 1024,
            },
          }),
        })

        if (!response.ok) throw new Error("Failed to get AI response")
        
        const data = await response.json()
        
        // Add AI response to chat
        const aiResponse: Message = {
          id: Date.now().toString(),
          userId: "ai",
          userName: "AI Assistant",
          content: data.result,
          timestamp: new Date().toISOString(),
          isAI: true
        }
        
        setMessages(prev => [...prev, aiResponse])
        
        // Emit message to other users
        sendEvent("chat_message", { message: aiResponse })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to get AI response. Please try again.",
          variant: "destructive",
        })
      }
    } else {
      // Regular message
      setMessages(prev => [...prev, newMessage])
      sendEvent("chat_message", { message: newMessage })
    }

    setMessage("")
  }

  // Listen for new messages
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (data: { message: Message }) => {
      if (data.message.userId !== currentUser.id) {
        setMessages(prev => [...prev, data.message])
      }
    }

    socket.on("chat_message", handleNewMessage)

    return () => {
      socket.off("chat_message", handleNewMessage)
    }
  }, [socket, currentUser.id])

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Team Chat
        </CardTitle>
        <CardDescription>
          Chat with your team and get AI assistance. Use @ai to ask questions.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.userId === currentUser.id ? "justify-end" : "justify-start"
                }`}
              >
                {msg.userId !== currentUser.id && (
                  <Avatar className="h-8 w-8">
                    {msg.isAI ? (
                      <Bot className="h-5 w-5 text-primary" />
                    ) : (
                      <AvatarFallback>
                        {msg.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}
                <div
                  className={`rounded-lg px-3 py-2 max-w-[80%] ${
                    msg.userId === currentUser.id
                      ? "bg-primary text-primary-foreground"
                      : msg.isAI
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {msg.userId === currentUser.id ? "You" : msg.userName}
                    </span>
                    <span className="text-xs opacity-70">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.userId === currentUser.id && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {currentUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Type a message... (Use @ai for AI assistance)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
          />
          <Button onClick={handleSendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 