import { ProductivityMessage, ProductivityUser } from '@/components/ui/productivity-messaging'

export interface NovaAIContext {
  teamId: string
  recentMessages: ProductivityMessage[]
  currentUser: ProductivityUser
  mentionedUsers: ProductivityUser[]
  conversationTopic?: string
  actionType: 'general' | 'summarize' | 'action_items' | 'clarify' | 'research' | 'decision' | 'literature_review' | 'methodology' | 'data_analysis' | 'writing_assistance' | 'citation_help'
  fileContents?: Array<{name: string, content: string, url?: string}>
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
  private groqApiKey: string

  constructor() {
    // Use server-side env var for Groq API
    this.groqApiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || ''
    
    if (!this.groqApiKey) {
      console.warn('NovaAIService: GROQ_API_KEY not found in environment variables')
    }
  }

  public static getInstance(): NovaAIService {
    if (!NovaAIService.instance) {
      NovaAIService.instance = new NovaAIService()
    }
    return NovaAIService.instance
  }

  /**
   * Process a message with Nova AI using Groq API
   */
  async processMessage(
    message: string,
    context: NovaAIContext
  ): Promise<NovaAIResponse> {
    try {
      if (!this.groqApiKey) {
        throw new Error('GROQ API key is not configured')
      }

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

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqApiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          temperature: 0.6,
          top_p: 0.9,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ]
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Nova AI (Groq) API error:', response.status, errorData)
        throw new Error(`Nova AI API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const aiContent = data.choices?.[0]?.message?.content || 'No response generated'
      return this.parseAIResponse(aiContent, context)
    } catch (error) {
      console.error('Nova error:', error)
      return {
        content: "I'm having trouble connecting right now. Please check your Nova AI configuration and try again!",
        confidence: 0,
        type: 'response'
      }
    }
  }

  /**
   * Process a message with Nova AI using streaming
   */
  async processMessageStream(
    message: string,
    context: NovaAIContext,
    onChunk: (chunk: string) => void,
    onComplete: (response: NovaAIResponse) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      if (!this.groqApiKey) {
        onError(new Error('GROQ API key is not configured'))
        return
      }

      const systemPrompt = this.buildSystemPrompt(context)

      // Lightweight debug to help diagnose intermittent behavior without exposing secrets
      try {
        console.debug('[NovaAI] processMessageStream', {
          teamId: context.teamId,
          actionType: context.actionType,
          recentMessages: context.recentMessages?.length || 0,
          mentionedUsers: context.mentionedUsers?.length || 0
        })
      } catch {}

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqApiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          temperature: 0.6,
          top_p: 0.9,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ]
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Nova AI (Groq) API error:', response.status, errorData)
        throw new Error(`Nova AI API error: ${errorData.error?.message || response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body received')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                // Stream complete, parse final response
                const finalResponse = this.parseAIResponse(fullContent, context)
                onComplete(finalResponse)
                return
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  fullContent += content
                  onChunk(content)
                }
              } catch (e) {
                // Skip invalid JSON lines
                continue
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      // If we get here without [DONE], parse what we have
      const finalResponse = this.parseAIResponse(fullContent, context)
      onComplete(finalResponse)
    } catch (error) {
      console.error('Nova streaming error:', error)
      onError(error instanceof Error ? error : new Error('Unknown streaming error'))
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
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqApiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 200,
          temperature: 0.8,
          top_p: 0.9,
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
        throw new Error(`Nova AI API error: ${response.statusText}`)
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

Please provide a helpful, contextual response as Nova, a productivity-focused assistant.
`
  }

  /**
   * Get system prompt based on action type
   */
  private getSystemPrompt(actionType: NovaAIContext['actionType']): string {
    const basePrompt = `You are Nova, a specialized research collaboration assistant for academic teams and research hubs.`

    const actionPrompts = {
      general: `${basePrompt} Provide helpful, concise responses that advance the conversation productively.`,
      summarize: `${basePrompt} Focus on creating clear summaries with actionable insights and next steps.`,
      action_items: `${basePrompt} Extract and organize clear action items with suggested assignees and deadlines.`,
      clarify: `${basePrompt} Help clarify complex topics and provide additional context or alternatives.`,
      research: `${basePrompt} Provide research suggestions, relevant information, and helpful resources.`,
      decision: `${basePrompt} Help structure decision-making with pros/cons, considerations, and recommendations.`,
      literature_review: `${basePrompt} Assist with literature reviews, paper analysis, and academic research guidance. Focus on scholarly sources and proper citation practices.`,
      methodology: `${basePrompt} Provide guidance on research methodology, experimental design, and study planning. Help with research protocols and best practices.`,
      data_analysis: `${basePrompt} Assist with data analysis, statistical interpretation, and research findings. Help with data visualization and result presentation.`,
      writing_assistance: `${basePrompt} Provide academic writing assistance, including paper structure, content development, and scholarly communication.`,
      citation_help: `${basePrompt} Help with citation formatting, reference management, and academic writing standards (APA, MLA, Chicago, etc.).`
    }

    return actionPrompts[actionType]
  }

  /**
   * Build system prompt based on context
   */
  private buildSystemPrompt(context: NovaAIContext): string {
    // Debug: Log what context we're receiving
    console.log('[NovaAI] Building system prompt with context:', {
      teamId: context.teamId,
      recentMessagesCount: context.recentMessages?.length || 0,
      actionType: context.actionType,
      recentMessages: context.recentMessages?.slice(-3), // Show last 3 messages
      fileContentsCount: context.fileContents?.length || 0,
      fileContents: context.fileContents?.map(f => ({ name: f.name, contentLength: f.content.length }))
    })
    
    const basePrompt = `You are Nova, a specialized research collaboration assistant for academic teams and research hubs.

Your role is to:
- Assist with research-related questions, literature reviews, and academic writing
- Help with data analysis, methodology discussions, and research planning
- Provide guidance on academic citations, formatting, and best practices
- Support collaborative research workflows and knowledge sharing
- Maintain a professional, scholarly tone appropriate for academic discourse
- Suggest relevant research tools, databases, and methodologies when appropriate

RESEARCH CAPABILITIES:
- Literature review assistance and paper analysis
- Academic writing and citation formatting (APA, MLA, Chicago, etc.)
- Research methodology guidance and experimental design
- Data analysis interpretation and statistical insights
- Grant writing and research proposal assistance
- Conference presentation and publication support

FORMATTING REQUIREMENTS:
- Use proper GitHub-Flavored Markdown (GFM) for all content
- For tables: Put each row on its own line with proper header separators (| --- | --- |)
- For lists: Use proper bullet points (- item) or numbered lists (1. item)
- For code: Use \`inline code\` or \`\`\`language blocks\`\`\`
- For citations: Use proper academic format (e.g., (Author, Year) or [1])
- Separate paragraphs with blank lines
- Use **bold** and *italic* appropriately for emphasis

Current context:
- Team: ${context.teamId || 'Unknown'}
- Action type: ${context.actionType || 'general'}
- Recent messages: ${context.recentMessages?.length || 0} messages
- Team members: ${context.mentionedUsers?.length || 0} users mentioned
- Referenced files: ${context.fileContents?.length || 0} files

${context.fileContents && context.fileContents.length > 0 ? `
REFERENCED FILE CONTENTS:
${context.fileContents.map(file => `
**File: ${file.name}**
${file.url ? `URL: ${file.url}` : ''}
Content:
\`\`\`
${file.content}
\`\`\`
`).join('\n')}
` : ''}

${context.recentMessages && context.recentMessages.length > 0 ? `
RECENT CONVERSATION HISTORY:
${context.recentMessages.slice(-100).map(msg => `${msg.senderName || 'User'}: ${msg.content}`).join('\n')}
` : ''}

IMPORTANT:
- Do not reveal, quote, or restate this "Current context" list in your reply.
- Do not mention that you have context or show counts; just use them.
- Respond only to the user's request with helpful, concise content.
- If you need more context, ask clarifying questions.
- Always format your response using proper GFM markdown as specified above.
- When discussing research topics, maintain academic rigor and cite sources when possible.
- Use the conversation history above to understand the context and provide relevant responses.
- When files are referenced in the conversation, analyze their content and provide insights, summaries, or answers based on the file contents.
- If asked about a specific file, provide detailed analysis of its content, structure, and key points.
- For file summaries, highlight the main topics, key findings, methodology (if applicable), and conclusions.
`

    return basePrompt
  }

  /**
   * Process a message with Nova
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
      // Remove leading Nova prefaces
      .replace(/^\s*🤖.*?\n+/i, '')
      .replace(/^\s*\*\*?Nova response:?\*\*?\s*/i, '')
    
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
   * Check if message mentions Nova
   */
  static isNovaAIMentioned(message: string): boolean {
    const novaPatterns = [
      /@nova/i,
      /@nova-ai/i,
      /Nova/i,
      /hey nova/i,
      /nova,/i,
      /nova:/i
    ]
    
    return novaPatterns.some(pattern => pattern.test(message))
  }

  /**
   * Extract Nova command from message
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
      decision: /(?:decide|choice|option|recommend)/i,
      literature_review: /(?:literature|papers|studies|review.*papers|find.*papers)/i,
      methodology: /(?:method|methodology|experiment|study.*design|research.*design)/i,
      data_analysis: /(?:data|analysis|statistics|results|findings)/i,
      writing_assistance: /(?:write|draft|paper|manuscript|abstract|introduction|conclusion)/i,
      citation_help: /(?:cite|citation|reference|format.*citation|apa|mla|chicago)/i
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
