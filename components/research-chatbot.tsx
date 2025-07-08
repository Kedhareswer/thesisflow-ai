import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Send, Bot, User, Info, Brain, BookOpen, Lightbulb, Settings } from 'lucide-react'
import { useResearchSession, useResearchContext } from '@/components/research-session-provider'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { UserProfileAvatar } from '@/components/user-profile-avatar'
import { ToggleGroup, ToggleGroupItem } from '@/components/animate-ui/base/toggle-group'
import { IconButton } from '@/components/animate-ui/buttons/icon'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/animate-ui/base/tooltip'
import { Smile, User as UserIcon, Zap, MessageCircle } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Personality {
  key: string;
  name: string;
  description: string;
  icon: any;
  color: [number, number, number];
  systemPrompt: string;
}

interface ResearchChatbotProps {
  topic?: string
  papers?: any[]
  ideas?: string
  context?: string
  personality?: Personality
}

// Personalities definition
const PERSONALITIES: Personality[] = [
  {
    key: 'friendly',
    name: 'Friendly',
    description: 'Warm, supportive, and encouraging.',
    icon: Smile,
    color: [34,197,94],
    systemPrompt: 'You are a warm, supportive, and encouraging assistant. Use friendly language and positive reinforcement.'
  },
  {
    key: 'formal',
    name: 'Formal',
    description: 'Professional, precise, and neutral.',
    icon: UserIcon,
    color: [59,130,246],
    systemPrompt: 'You are a professional, precise, and neutral assistant. Use formal language and maintain objectivity.'
  },
  {
    key: 'motivational',
    name: 'Motivational',
    description: 'Energetic, inspiring, and positive.',
    icon: Zap,
    color: [245,158,11],
    systemPrompt: 'You are an energetic, inspiring, and positive assistant. Motivate the user and encourage progress.'
  },
  {
    key: 'critical',
    name: 'Critical',
    description: 'Analytical, direct, and honest.',
    icon: Brain,
    color: [239,68,68],
    systemPrompt: 'You are an analytical, direct, and honest assistant. Provide critical feedback and point out flaws constructively.'
  },
  {
    key: 'playful',
    name: 'Playful',
    description: 'Fun, witty, and creative.',
    icon: MessageCircle,
    color: [168,85,247],
    systemPrompt: 'You are a fun, witty, and creative assistant. Use playful language and humor when appropriate.'
  },
]

export function ResearchChatbot({ topic, papers, ideas, context, personality: initialPersonality }: ResearchChatbotProps) {
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
  const [selectedPersonality, setSelectedPersonality] = useState<string>(
    initialPersonality?.key || PERSONALITIES[0].key
  )
  const personality = PERSONALITIES.find(p => p.key === selectedPersonality) || PERSONALITIES[0]
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

  // Add a helper to detect if user wants details
  function wantsDetails(message: string) {
    const keywords = ['details', 'explain', 'table', 'chart', 'expand', 'why', 'how', 'step', 'list', 'show', 'compare']
    return keywords.some(k => message.toLowerCase().includes(k))
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
      
      const isDetail = wantsDetails(userMessage)
      const shortStyle = 'Respond in a short, WhatsApp-style message (1-2 sentences, friendly, concise).'
      const detailStyle = 'If the user requests details, provide a longer, structured answer. Use markdown tables or code blocks for data/charts if helpful.'
      const systemPersonality = personality?.systemPrompt || ''
      const systemPrompt = `${systemPersonality}\n${shortStyle}\n${detailStyle}`
      const enhancedPrompt = `${systemPrompt}\n\nResearch Assistant | Context-aware response\n\n${sessionContext ? `CONTEXT:\n${sessionContext}\n` : ''}CONVERSATION:\n${messageHistory}\n\nQUERY: ${userMessage}\n\nRESPONSE GUIDELINES:\n- Reference user's papers/ideas/topics when relevant\n- Suggest research connections\n- Concise, actionable insights\n- Acknowledge limitations honestly\n- Guide research direction\n${isDetail ? '\n- Provide detailed, structured answer as requested.' : ''}\n\nResponse:`

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
      {/* Personality Selector */}
      <div className="flex items-center gap-2 mb-4 justify-center">
        <ToggleGroup
          value={[selectedPersonality]}
          onValueChange={(val: string[]) => val && val[0] && setSelectedPersonality(val[0])}
          variant="outline"
          size="sm"
        >
          {PERSONALITIES.map(p => (
            <ToggleGroupItem key={p.key} value={p.key}>
              <Tooltip>
                <TooltipTrigger>
                  <IconButton
                    icon={p.icon}
                    color={p.color}
                    size="sm"
                    active={selectedPersonality === p.key}
                    aria-label={p.name}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground max-w-xs">{p.description}</div>
                </TooltipContent>
              </Tooltip>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
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
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end mb-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <img
                    src="/assistant-avatar.svg"
                    alt="Assistant"
                    className="w-8 h-8 rounded-full mr-2 border border-gray-300 bg-white"
                    style={{ minWidth: 32 }}
                  />
                )}
                <div className={`rounded-lg px-3 py-2 max-w-[80%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-100 text-right' : 'bg-gray-100 text-left'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
                {msg.role === 'user' && (
                  <div className="ml-2">
                    <UserProfileAvatar size="sm" />
                  </div>
                )}
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
