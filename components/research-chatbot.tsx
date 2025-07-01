import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Send, Bot, User } from 'lucide-react'
import { api } from '@/lib/utils/api'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ResearchChatbotProps {
  topic?: string
  papers?: any[]
  ideas?: string
  context?: string
}

export function ResearchChatbot({ topic, papers, ideas, context }: ResearchChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: `Hi! I'm your research assistant. You can ask me questions about ${topic || 'your research topic'}, related literature, or research ideas. How can I help you today?` 
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Build context from the current research session
  const buildPromptContext = () => {
    let contextStr = ''
    
    if (topic) {
      contextStr += `Main research topic: "${topic}"\n\n`
    }
    
    if (papers && papers.length > 0) {
      contextStr += "Related papers:\n"
      papers.slice(0, 5).forEach((paper, i) => {
        if (paper.title) {
          contextStr += `${i + 1}. ${paper.title}\n`
          if (paper.abstract) {
            contextStr += `   Abstract: ${paper.abstract.substring(0, 200)}...\n`
          }
        }
      })
      contextStr += "\n"
    }
    
    if (ideas) {
      contextStr += "Generated research ideas:\n"
      contextStr += `${ideas.substring(0, 500)}${ideas.length > 500 ? '...' : ''}\n\n`
    }

    if (context) {
      contextStr += `Additional context: ${context}\n\n`
    }
    
    return contextStr
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    
    // Add user message to chat
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    
    // Show loading state
    setIsLoading(true)
    
    try {
      // Build the conversation context
      const sessionContext = buildPromptContext()
      
      // Create a history of previous messages for context
      const messageHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
      
      // Send request to AI
      const response = await api.post('/api/ai/generate', {
        prompt: `You are a helpful research assistant chatbot. Your goal is to help the user with their research by answering questions, explaining concepts, suggesting directions, or clarifying information.

Context about the current research session:
${sessionContext}

Previous conversation:
${messageHistory}

User's question: ${userMessage}

Provide a helpful, informative, and concise response. If you don't know something, admit it rather than making up information.`,
      })

      // Extract content from response
      let responseContent = ''
      if (response && typeof response === 'object' && 'content' in response) {
        responseContent = String(response.content)
      } else if (response && typeof response === 'object' && 'data' in response) {
        const data = response.data
        if (data && typeof data === 'object' && 'content' in data) {
          responseContent = String(data.content)
        } else {
          responseContent = String(data)
        }
      } else {
        responseContent = String(response)
      }

      // Add assistant message to chat
      setMessages((prev) => [...prev, { role: 'assistant', content: responseContent }])
    } catch (error) {
      console.error('Error in chat:', error)
      setMessages((prev) => [
        ...prev, 
        { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error processing your request. Please try again.' 
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <div className="flex flex-col h-[400px]">
          <div className="flex-1 overflow-y-auto mb-4 pr-2">
            {messages.map((message, index) => (
              <div 
                key={index}
                className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`flex items-start gap-2 max-w-[80%] ${
                    message.role === 'user' 
                      ? 'bg-blue-100 text-gray-800' 
                      : 'bg-white border border-gray-200'
                  } p-3 rounded-lg shadow-sm`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {message.role === 'user' ? (
                      <User className="h-5 w-5 text-blue-700" />
                    ) : (
                      <Bot className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    {message.role === 'assistant' ? (
                      <div className="prose max-w-none text-sm">
                        {message.content.split('\n').map((line, i) => {
                          // Check if line is a heading
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return <h4 key={i} className="font-semibold mt-3 mb-1">{line.replace(/\*\*/g, '')}</h4>
                          }
                          // Regular paragraph with content
                          else if (line.trim()) {
                            return <p key={i} className="mb-2">{line}</p>
                          }
                          // Empty line
                          return <div key={i} className="h-1"></div>
                        })}
                      </div>
                    ) : (
                      <div className="text-sm">{message.content}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSubmit} className="flex space-x-2 mt-2">
            <Input
              placeholder="Ask a question about your research..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
