import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Send, Bot, User, Info, Brain, BookOpen, Lightbulb, Settings } from 'lucide-react'
import { useResearchSession, useResearchContext } from '@/components/research-session-provider'

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
  const { 
    session, 
    addChatMessage, 
    buildResearchContext
  } = useResearchSession()
  const { hasContext, contextSummary, currentTopic } = useResearchContext()
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Initialize with session chat history or default message
    if (session.chatHistory.length > 0) {
      return session.chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    }
    
    return [{
      role: 'assistant',
      content: `Hi! I'm your context-aware research assistant. I have access to your research session and can help you with questions about your literature, ideas, topics, and research direction. How can I help you today?`
    }]
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useFullContext, setUseFullContext] = useState(hasContext)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Build enhanced context from research session
  const buildPromptContext = () => {
    if (useFullContext && hasContext) {
      return buildResearchContext()
    }
    
    // Fallback to legacy context for backward compatibility
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
    
    // Add user message to chat and session
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    addChatMessage('user', userMessage)
    
    // Show loading state
    setIsLoading(true)
    
    try {
      // Build the conversation context
      const sessionContext = buildPromptContext()
      
      // Create a history of previous messages for context
      const messageHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
      
      // Determine context sources used
      const contextSources: string[] = []
      if (useFullContext && hasContext) {
        if (session.selectedPapers.length > 0) contextSources.push('literature')
        if (session.selectedIdeas.length > 0) contextSources.push('ideas')
        if (session.topics.length > 0) contextSources.push('topics')
        if (session.searchSessions.length > 0) contextSources.push('searches')
      }
      
      // Enhanced prompt with better context awareness
      const enhancedPrompt = `Research Assistant | Context-aware response

${sessionContext ? `CONTEXT:\n${sessionContext}\n` : ''}CONVERSATION:\n${messageHistory}\n
QUERY: ${userMessage}

RESPONSE GUIDELINES:
- Reference user's papers/ideas/topics when relevant
- Suggest research connections
- Concise, actionable insights
- Acknowledge limitations honestly
- Guide research direction

Response:`

      // Use enhanced AI service directly for better performance and authentication
      const { enhancedAIService } = await import('@/lib/enhanced-ai-service')
      
      console.log("Research Chatbot: Calling enhanced AI service...")
      
      const result = await enhancedAIService.generateText({
        prompt: enhancedPrompt,
        maxTokens: 1500,
        temperature: 0.7
      })

      console.log("Research Chatbot: AI service result:", {
        success: result.success,
        contentLength: result.content?.length,
        error: result.error
      })

      let responseContent = ''
      if (result.success && result.content) {
        responseContent = result.content
      } else {
        responseContent = `Sorry, I encountered an error: ${result.error || 'Unknown error'}. Please try again.`
      }

      console.log("Research Chatbot: Final response content:", responseContent.substring(0, 200) + "...")

      // Add assistant message to chat and session
      setMessages((prev) => [...prev, { role: 'assistant', content: responseContent }])
      addChatMessage('assistant', responseContent, contextSources)
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
    <div>
      {/* Research Context Status */}
      {hasContext && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <Brain className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Enhanced Context Available:</strong> {contextSummary}
                <br />
                <span className="text-sm text-green-600">
                  {session.selectedPapers.length} papers • {session.selectedIdeas.length} ideas • {session.topics.length} topics
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-full-context-chat"
                  checked={useFullContext}
                  onCheckedChange={(checked) => setUseFullContext(checked as boolean)}
                />
                <label htmlFor="use-full-context-chat" className="text-sm font-medium">
                  Use full context
                </label>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
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
    </div>
  )
}
