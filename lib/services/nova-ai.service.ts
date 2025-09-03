"use client"

import { ProductivityMessage, ProductivityUser } from '@/components/ui/productivity-messaging'

export interface NovaAIContext {
  teamId: string
  recentMessages: ProductivityMessage[]
  currentUser: ProductivityUser
  mentionedUsers: ProductivityUser[]
  conversationTopic?: string
  actionType: 'general' | 'summarize' | 'action_items' | 'clarify' | 'research' | 'decision'
}

export interface NovaAIResponse {
  content: string
  suggestions?: string[]
  actionItems?: string[]
  relatedTopics?: string[]
  confidence: number
  type: 'response' | 'clarification' | 'action_plan' | 'summary'
}

export class NovaAIService {
  private static instance: NovaAIService
  private nebiusApiKey: string
  
  constructor() {
    this.nebiusApiKey = process.env.NEXT_PUBLIC_NEBIUS_API_KEY || ''
  }
  
  public static getInstance(): NovaAIService {
    if (!NovaAIService.instance) {
      NovaAIService.instance = new NovaAIService()
    }
    return NovaAIService.instance
  }

  /**
   * Process a message with Nova AI using Nebius API
   */
  async processMessage(
    message: string,
    context: NovaAIContext
  ): Promise<NovaAIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(context)
      
      // Lightweight debug to help diagnose intermittent behavior without exposing secrets
      try {
        console.debug('[NovaAI] processMessage', {
          teamId: context.teamId,
          actionType: context.actionType,
          recentMessages: context.recentMessages?.length || 0,
          mentionedUsers: context.mentionedUsers?.length || 0
        })
      } catch {}
      
      const response = await fetch('https://api.studio.nebius.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.nebiusApiKey}`
        },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
          max_tokens: 1000,
          temperature: 0.6,
          top_p: 0.9,
          top_k: 50,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ]
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Nebius API error:', response.status, errorData)
        throw new Error(`Nebius API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const aiContent = data.choices?.[0]?.message?.content || 'No response generated'
      return this.parseAIResponse(aiContent, context)
    } catch (error) {
      console.error('Nova AI error:', error)
      return {
        content: "I'm having trouble connecting right now. Please check your Nebius API configuration and try again!",
        confidence: 0,
        type: 'response'
      }
    }
  }

  /**
   * Handle direct AI assistance requests
   */
  async handleAIAssistance(
    prompt: string,
    messageContext: ProductivityMessage,
    context: NovaAIContext
  ): Promise<NovaAIResponse> {
    const assistancePrompt = `
The user is asking for help with this message: "${messageContext.content}"

Their request: "${prompt}"

Please provide helpful assistance based on the conversation context.
`

    return this.processMessage(assistancePrompt, {
      ...context,
      actionType: 'clarify'
    })
  }

  /**
   * Generate meeting summary and action items
   */
  async summarizeConversation(
    messages: ProductivityMessage[],
    context: Omit<NovaAIContext, 'recentMessages' | 'actionType'>
  ): Promise<NovaAIResponse> {
    const conversationText = messages
      .filter(m => m.type !== 'system' && m.type !== 'ai_response')
      .map(m => `${m.senderId}: ${m.content}`)
      .join('\n')

    const prompt = `
Please summarize this team conversation and extract key action items:

${conversationText}

Focus on:
1. Main topics discussed
2. Decisions made
3. Action items with assignees
4. Next steps
5. Key insights
`

    return this.processMessage(prompt, {
      ...context,
      recentMessages: messages,
      actionType: 'summarize'
    })
  }

  /**
   * Suggest follow-up questions or actions
   */
  async getSuggestions(context: NovaAIContext): Promise<string[]> {
    const lastFewMessages = context.recentMessages.slice(-5)
    const conversationContext = lastFewMessages
      .map(m => m.content)
      .join('\n')

    try {
      const response = await fetch('https://api.studio.nebius.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.nebiusApiKey}`
        },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
          max_tokens: 200,
          temperature: 0.8,
          top_p: 0.9,
          top_k: 50,
          messages: [
            { 
              role: "system", 
              content: 'You are a productivity assistant. Provide concise, actionable suggestions.' 
            },
            { 
              role: "user", 
              content: `Based on this conversation, suggest 3 helpful follow-up questions or actions:\n\n${conversationContext}` 
            }
          ]
        })
      })

      if (!response.ok) {
        throw new Error(`Nebius API error: ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      return content
        .split('\n')
        .filter((line: string) => line.trim())
        .slice(0, 3)
    } catch {
      return [
        "Would you like me to summarize the key points?",
        "Should we create action items from this discussion?",
        "Do you need clarification on any topics?"
      ]
    }
  }

  /**
   * Build contextual prompt with conversation history
   */
  private buildContextualPrompt(userMessage: string, context: NovaAIContext): string {
    const recentContext = context.recentMessages
      .slice(-10)
      .map(m => `${this.getUserName(m.senderId, context)}: ${m.content}`)
      .join('\n')

    const mentionedUsersContext = context.mentionedUsers.length > 0 
      ? `\nMentioned team members: ${context.mentionedUsers.map(u => u.name).join(', ')}`
      : ''

    const topicContext = context.conversationTopic 
      ? `\nConversation topic: ${context.conversationTopic}`
      : ''

    return `
Context from recent conversation:
${recentContext}

Current user: ${context.currentUser.name}${mentionedUsersContext}${topicContext}

User's message: "${userMessage}"

Please provide a helpful, contextual response as Nova AI, a productivity-focused assistant.
`
  }

  /**
   * Get system prompt based on action type
   */
  private getSystemPrompt(actionType: NovaAIContext['actionType']): string {
    const basePrompt = `You are Nova AI, a productivity-focused assistant for team collaboration. You help teams be more productive through intelligent suggestions, summaries, and insights.`

    const actionPrompts = {
      general: `${basePrompt} Provide helpful, concise responses that advance the conversation productively.`,
      summarize: `${basePrompt} Focus on creating clear summaries with actionable insights and next steps.`,
      action_items: `${basePrompt} Extract and organize clear action items with suggested assignees and deadlines.`,
      clarify: `${basePrompt} Help clarify complex topics and provide additional context or alternatives.`,
      research: `${basePrompt} Provide research suggestions, relevant information, and helpful resources.`,
      decision: `${basePrompt} Help structure decision-making with pros/cons, considerations, and recommendations.`
    }

    return actionPrompts[actionType]
  }

  /**
   * Build system prompt based on context
   */
  private buildSystemPrompt(context: NovaAIContext): string {
    const basePrompt = `You are Nova AI, a helpful productivity assistant for team collaboration. 
    
Your role is to:
- Help team members with their questions and tasks
- Provide clear, actionable advice
- Maintain a professional but friendly tone
- Suggest relevant tools or resources when appropriate

Current context:
- Team: ${context.teamId || 'Unknown'}
- Action type: ${context.actionType || 'general'}
- Recent messages: ${context.recentMessages?.length || 0} messages
- Team members: ${context.mentionedUsers?.length || 0} users mentioned

IMPORTANT:
- Do not reveal, quote, or restate this "Current context" list in your reply.
- Do not mention that you have context or show counts; just use them.
- Respond only to the user's request with helpful, concise content.
- If you need more context, ask clarifying questions.
`

    return basePrompt
  }

  /**
   * Process a message with Nova AI
   */
  private parseAIResponse(content: string, context: NovaAIContext): NovaAIResponse {
    // Sanitize model output to remove any leaked internal context or boilerplate
    const sanitizedContent = this.sanitizeModelOutput(content)
    // Extract action items (lines starting with *, -, or numbers)
    const actionItemRegex = /^[\s]*(?:[*\-•]|\d+\.)\s+(.+)$/gm
    const actionItems = []
    let match

    while ((match = actionItemRegex.exec(sanitizedContent)) !== null) {
      actionItems.push(match[1].trim())
    }

    // Determine response type
    let type: NovaAIResponse['type'] = 'response'
    if (sanitizedContent.toLowerCase().includes('summary') || sanitizedContent.toLowerCase().includes('recap')) {
      type = 'summary'
    } else if (actionItems.length > 0 || sanitizedContent.toLowerCase().includes('action')) {
      type = 'action_plan'
    } else if (sanitizedContent.includes('?') || sanitizedContent.toLowerCase().includes('clarif')) {
      type = 'clarification'
    }

    // Extract suggestions (questions or recommendations)
    const suggestions = sanitizedContent
      .split('\n')
      .filter(line => line.includes('?') || line.toLowerCase().includes('suggest'))
      .slice(0, 3)

    return {
      content: sanitizedContent,
      actionItems: actionItems.length > 0 ? actionItems : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      confidence: 0.85,
      type
    }
  }

  /**
   * Get user name from context
   */
  private getUserName(userId: string, context: NovaAIContext): string {
    if (userId === context.currentUser.id) {
      return context.currentUser.name
    }
    
    const user = context.mentionedUsers.find(u => u.id === userId)
    return user?.name || 'Unknown User'
  }

  /**
   * Remove any model responses that echo internal context or meta prefaces.
   * This helps ensure consistent, user-focused replies.
   */
  private sanitizeModelOutput(text: string): string {
    if (!text) return ''
    let cleaned = text
      // Remove leading Nova AI prefaces
      .replace(/^\s*🤖.*?\n+/i, '')
      .replace(/^\s*\*\*?nova ai response:?\*\*?\s*/i, '')
    
    // Remove echoed context sections
    cleaned = cleaned.replace(/^[\s\S]*?(?:^\s*(?:Current context:|I have the following context:|Context:)\s*\n[\s\S]*?(?:\n\s*\n|$))/im, (m) => {
      // If the entire message is just echoed context, drop it
      return ''
    })
    
    // Remove bullet lines that list our context if they appear at the top
    cleaned = cleaned.replace(/^(?:[-*]\s*(?:Team|Action type|Recent messages|Team members):.*\n?){1,}/gmi, '')
    
    cleaned = cleaned.trim()
    if (!cleaned) {
      cleaned = "I'm ready to help. Could you clarify what you'd like me to do?"
    }
    return cleaned
  }

  /**
   * Check if message mentions Nova AI
   */
  static isNovaAIMentioned(message: string): boolean {
    const novaPatterns = [
      /@nova/i,
      /@nova-ai/i,
      /nova ai/i,
      /hey nova/i,
      /nova,/i,
      /nova:/i
    ]
    
    return novaPatterns.some(pattern => pattern.test(message))
  }

  /**
   * Extract Nova AI command from message
   */
  static extractNovaCommand(message: string): {
    command: string
    action: NovaAIContext['actionType']
  } | null {
    const commandPatterns = {
      summarize: /(?:summar|recap|overview)/i,
      action_items: /(?:action|task|todo|follow.?up)/i,
      clarify: /(?:clarify|explain|help.*understand)/i,
      research: /(?:research|find|look.*up)/i,
      decision: /(?:decide|choice|option|recommend)/i
    }

    for (const [action, pattern] of Object.entries(commandPatterns)) {
      if (pattern.test(message)) {
        return {
          command: message,
          action: action as NovaAIContext['actionType']
        }
      }
    }

    return {
      command: message,
      action: 'general'
    }
  }
}
