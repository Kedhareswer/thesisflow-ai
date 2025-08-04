import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Info, Brain, BookOpen, Lightbulb, Settings, Trash2 } from 'lucide-react'
import { useResearchSession, useResearchContext } from '@/components/research-session-provider'
import { UserProfileAvatar } from '@/components/user-profile-avatar'
import { ToggleGroup, ToggleGroupItem } from '@/components/animate-ui/base/toggle-group'
import { IconButton } from '@/components/animate-ui/buttons/icon'
import { Smile, User as UserIcon, Zap, MessageCircle } from 'lucide-react'
import { EnhancedChat } from '@/components/ui/enhanced-chat'
import { ChatMessage } from '@/components/ui/chat-bubble'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

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
    systemPrompt: 'You are a warm, supportive, and encouraging research assistant. Use friendly language, positive reinforcement, and be genuinely helpful. Always provide actionable insights and encourage further exploration.'
  },
  {
    key: 'formal',
    name: 'Formal',
    description: 'Professional, precise, and neutral.',
    icon: UserIcon,
    color: [59,130,246],
    systemPrompt: 'You are a professional, precise, and neutral research assistant. Use formal academic language, maintain objectivity, and provide well-structured, evidence-based responses.'
  },
  {
    key: 'motivational',
    name: 'Motivational',
    description: 'Energetic, inspiring, and positive.',
    icon: Zap,
    color: [245,158,11],
    systemPrompt: 'You are an energetic, inspiring, and positive research assistant. Motivate the user, highlight opportunities, and encourage innovative thinking. Be enthusiastic about research possibilities.'
  },
  {
    key: 'critical',
    name: 'Critical',
    description: 'Analytical, direct, and honest.',
    icon: Brain,
    color: [239,68,68],
    systemPrompt: 'You are an analytical, direct, and honest research assistant. Provide critical analysis, identify potential issues, and offer constructive feedback. Be thorough in your evaluation.'
  },
  {
    key: 'playful',
    name: 'Playful',
    description: 'Fun, witty, and creative.',
    icon: MessageCircle,
    color: [168,85,247],
    systemPrompt: 'You are a fun, witty, and creative research assistant. Use playful language when appropriate, make research engaging, and spark creative thinking while maintaining academic rigor.'
  },
]

export function ResearchChatbot({ topic, papers, ideas, context, personality: initialPersonality }: ResearchChatbotProps) {
  const { 
    session, 
    addChatMessage, 
    buildResearchContext,
    clearChatHistory
  } = useResearchSession()
  const { hasContext, contextSummary, currentTopic } = useResearchContext()
  const { toast } = useToast()
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Initialize with session chat history or default message
    if (session.chatHistory.length > 0) {
      return session.chatHistory.map((msg, index) => ({
        id: `msg-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        status: 'sent' as const
      }))
    }
    
    return [{
      id: `msg-${Date.now()}-welcome-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant' as const,
      content: "Hello! I'm your AI research assistant. I can help you with your research questions, analyze papers, provide insights, and guide your research journey. What would you like to explore today?",
      timestamp: new Date(),
      status: 'sent' as const
    }]
  })

  const [selectedPersonality, setSelectedPersonality] = useState<string>(initialPersonality?.key || 'friendly')
  const [isLoading, setIsLoading] = useState(false)
  const [useFullContext, setUseFullContext] = useState(true)
  const [responseCount, setResponseCount] = useState(0)
  const [processingMessage, setProcessingMessage] = useState<string | null>(null)

  const selectedPersonalityData = PERSONALITIES.find(p => p.key === selectedPersonality) || PERSONALITIES[0]

  // Enhanced context building with better structure
  const buildPromptContext = () => {
    const contextParts: string[] = []
    
    if (useFullContext && hasContext) {
      contextParts.push(`Research Context: ${contextSummary}`)
      
      if (session.selectedPapers.length > 0) {
        const selectedPaperObjects = session.papers.filter(p => session.selectedPapers.includes(p.id))
        const paperTitles = selectedPaperObjects.map(p => p.title || 'Untitled').join(', ')
        contextParts.push(`Selected Papers: ${paperTitles}`)
      }
      
      if (session.selectedIdeas.length > 0) {
        const selectedIdeaObjects = session.ideas.filter(i => session.selectedIdeas.includes(i.id))
        const ideaTitles = selectedIdeaObjects.map(i => i.title || 'Untitled').join(', ')
        contextParts.push(`Research Ideas: ${ideaTitles}`)
      }
    }
    
    if (topic) {
      contextParts.push(`Current Topic: ${topic}`)
    }
    
    return contextParts.join('\n')
  }

  // Enhanced AI response generation with proper service integration
  const generateAIResponse = async (userMessage: string, context: string, personality: Personality): Promise<string> => {
    try {
      // Build comprehensive prompt with system instructions
      const systemPrompt = `${personality.systemPrompt}

You are a specialized research assistant helping with academic research. Your responses should be:
- Relevant to the user's research context
- Well-structured and easy to follow
- Actionable and specific
- Engaging and helpful
- Based on the provided research context when available

Current Research Context:
${context || 'No specific research context provided'}

Recent conversation history:
${messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

User's question: ${userMessage}

Please provide a comprehensive, helpful response that addresses the user's question while considering their research context and maintaining the specified personality tone.`

      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('AI Response: Session check:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        tokenLength: session?.access_token?.length || 0
      })
      
      if (!session?.access_token) {
        throw new Error('No authentication session found')
      }

      console.log('AI Response: Making API call with token length:', session.access_token.length)

      // Call AI service with proper authentication
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: systemPrompt,
          maxTokens: 800,
          temperature: 0.7,
          personality: personality.key
        })
      })

      console.log('AI Response: API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('AI Response: API error:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('AI Response: API response data:', {
        success: data.success,
        hasResponse: !!data.response,
        responseLength: data.response?.length || 0
      })
      
      if (!data.response) {
        throw new Error('No response content received')
      }
      
      return data.response

    } catch (error) {
      console.error('Error generating AI response:', error)
      
      // Fallback response based on personality
      const fallbackResponses = {
        friendly: `I'd love to help you with "${userMessage}"! While I'm having some technical difficulties right now, I can see you're working on some interesting research. Could you tell me more about what specific aspect you'd like to explore?`,
        formal: `Regarding your query about "${userMessage}", I'm experiencing some technical limitations at the moment. However, I can assist you with your research. Please provide more details about your specific research question.`,
        motivational: `What an exciting question about "${userMessage}"! I'm having a brief technical moment, but I'm eager to help you advance your research. What specific area would you like to dive into?`,
        critical: `Your question about "${userMessage}" is important. I'm currently experiencing technical difficulties, but I can provide analytical assistance. Please specify what aspect of your research you'd like to examine.`,
        playful: `Oh, "${userMessage}" - that's a fun one! I'm having a little technical hiccup right now, but I'm ready to help you explore this creatively. What's the most interesting part of this for you?`
      }
      
      return fallbackResponses[personality.key as keyof typeof fallbackResponses] || fallbackResponses.friendly
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return
    
    // Prevent duplicate processing of the same message
    if (processingMessage === message || isLoading) {
      return
    }
    
    setIsLoading(true)
    setProcessingMessage(message)
    
    try {
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user-${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: message,
        timestamp: new Date(),
        status: 'sent'
      }
      
      setMessages(prev => [...prev, userMessage])
      
      // Add to research session
      addChatMessage('user', message)
      
      // Build context for AI
      const context = buildPromptContext()
      
      // Generate AI response
      const aiResponse = await generateAIResponse(message, context, selectedPersonalityData)
      
      // Create unique AI message ID to prevent duplicates
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai-${responseCount}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        status: 'sent'
      }
      
      setMessages(prev => [...prev, aiMessage])
      addChatMessage('assistant', aiResponse)
      setResponseCount(prev => prev + 1)
      
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setProcessingMessage(null)
    }
  }

  // Clear chat function
  const handleClearChat = () => {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to clear all chat messages? This action cannot be undone.')) {
      return
    }
    
    // Clear messages from state
    setMessages([])
    
    // Clear chat history from research session
    clearChatHistory()
    
    // Reset response count
    setResponseCount(0)
    
    toast({
      title: "Chat Cleared",
      description: "All chat messages have been cleared.",
    })
  }

  // Keyboard shortcut for clearing chat
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+C to clear chat
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault()
        handleClearChat()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-1 p-0 flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageCircle className="h-5 w-5 text-blue-600" />
            </div>
    <div>
              <h3 className="text-lg font-semibold text-gray-900">Research Assistant</h3>
              <p className="text-sm text-gray-600">Get AI-powered assistance for your research questions.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Message Count and Clear Chat Button */}
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {messages.length} message{messages.length !== 1 ? 's' : ''}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChat}
                className="text-gray-600 hover:text-red-600 hover:border-red-300 transition-colors"
                disabled={messages.length === 0}
                title="Clear all chat messages (Ctrl+Shift+C)"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear Chat
              </Button>
            </div>
            
      {/* Personality Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Personality:</span>
        <ToggleGroup
          value={[selectedPersonality]}
                onValueChange={(value) => {
                  if (value && value.length > 0) {
                    setSelectedPersonality(value[0])
                  }
                }}
                className="bg-gray-50 rounded-lg p-1"
              >
                {PERSONALITIES.map((p) => (
            <ToggleGroupItem key={p.key} value={p.key}>
                    <div className="relative group">
                      <p.icon
                        className="h-4 w-4"
                        style={{ color: `rgb(${p.color.join(',')})` }}
                      />
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {p.name}
                      </div>
                    </div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
          </div>
        </div>

        {/* Context Banner */}
      {hasContext && (
          <div className="p-4 border-b bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Brain className="h-4 w-4 text-green-600" />
                </div>
              <div>
                  <p className="text-sm font-medium text-green-800">
                    Enhanced Context Available: {contextSummary}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-context"
                  checked={useFullContext}
                  onCheckedChange={(checked) => setUseFullContext(checked as boolean)}
                />
                <label htmlFor="use-context" className="text-sm text-green-700">
                  Use full context
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          <EnhancedChat
            className="flex-1"
            onSendMessage={handleSendMessage}
            messages={messages}
            isLoading={isLoading}
            placeholder="Ask a question about your research..."
            showAgentPlan={true}
          />
          
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No messages yet</h3>
                <p className="text-sm">Start a conversation with your AI research assistant</p>
              </div>
          </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
