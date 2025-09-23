import intentsData from '@/data/support/intents.json'

export interface Intent {
  name: string
  keywords: string[]
  confidence: number
  priority: number
}

export interface QuickReply {
  text: string
  intent?: string
  action?: 'external_link' | 'form' | 'custom'
  url?: string
  data?: any
}

export interface SupportResponse {
  id: string
  text: string
  quickReplies?: QuickReply[]
  followUp?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  intent?: string
  confidence?: number
}

export interface ConversationState {
  messages: Message[]
  activeIntent?: string
  flowState?: any
  userId?: string
  sessionId: string
}

export class SupportEngine {
  private intents: Intent[]
  private synonyms: Record<string, string[]>
  private responseCache: Map<string, SupportResponse[]> = new Map()

  constructor() {
    this.intents = intentsData.intents
    this.synonyms = intentsData.synonyms
  }

  /**
   * Analyze user input and determine intent
   */
  analyzeIntent(input: string): { intent: string; confidence: number } {
    const normalizedInput = this.normalizeText(input)
    const words = normalizedInput.split(/\s+/)
    
    let bestMatch = { intent: 'unknown', confidence: 0 }

    for (const intent of this.intents) {
      let score = 0
      let matchCount = 0

      // Check direct keyword matches
      for (const keyword of intent.keywords) {
        if (normalizedInput.includes(keyword.toLowerCase())) {
          score += 1
          matchCount++
        }
      }

      // Check synonym matches
      for (const [canonical, synonymList] of Object.entries(this.synonyms)) {
        for (const synonym of synonymList) {
          if (normalizedInput.includes(synonym.toLowerCase())) {
            // Find if canonical form matches any intent keywords
            for (const intentKeyword of intent.keywords) {
              if (intentKeyword.toLowerCase() === canonical.toLowerCase()) {
                score += 0.8
                matchCount++
              }
            }
          }
        }
      }

      // Calculate confidence based on matches and intent priority
      const confidence = matchCount > 0 
        ? (score / intent.keywords.length) * intent.confidence * (1 / intent.priority)
        : 0

      if (confidence > bestMatch.confidence) {
        bestMatch = { intent: intent.name, confidence }
      }
    }

    // Fallback to greeting for very short inputs
    if (bestMatch.confidence < 0.3 && words.length <= 2) {
      return { intent: 'greeting', confidence: 0.5 }
    }

    return bestMatch
  }

  /**
   * Generate response based on intent and conversation state
   */
  async generateResponse(
    intent: string, 
    input: string, 
    conversationState: ConversationState
  ): Promise<SupportResponse> {
    try {
      // Load response templates for this intent
      const responses = await this.loadResponseTemplates(intent)
      
      if (!responses || responses.length === 0) {
        return this.getFallbackResponse(intent)
      }

      // Select appropriate response based on context
      const response = this.selectResponse(responses, conversationState)
      
      // Process any dynamic content
      return this.processResponseTemplate(response, conversationState)
    } catch (error) {
      console.error('Error generating response:', error)
      return this.getFallbackResponse(intent)
    }
  }

  /**
   * Load response templates for an intent
   */
  private async loadResponseTemplates(intent: string): Promise<SupportResponse[]> {
    if (this.responseCache.has(intent)) {
      return this.responseCache.get(intent)!
    }

    try {
      const module = await import(`@/data/support/responses/${intent}.json`)
      const responses = module.default?.responses || module.responses || []
      this.responseCache.set(intent, responses)
      return responses
    } catch (error) {
      console.warn(`No response template found for intent: ${intent}`)
      return []
    }
  }

  /**
   * Select the most appropriate response from available templates
   */
  private selectResponse(
    responses: SupportResponse[], 
    conversationState: ConversationState
  ): SupportResponse {
    // For now, use simple logic - can be enhanced with more sophisticated selection
    const isReturnUser = conversationState.messages.length > 2
    
    // Look for return_user variant if available
    if (isReturnUser) {
      const returnUserResponse = responses.find(r => r.id.includes('return'))
      if (returnUserResponse) return returnUserResponse
    }

    // Default to first response
    return responses[0]
  }

  /**
   * Process response template with dynamic content
   */
  private processResponseTemplate(
    response: SupportResponse, 
    conversationState: ConversationState
  ): SupportResponse {
    let processedText = response.text

    // Replace common placeholders
    processedText = processedText.replace(/\{user\}/g, conversationState.userId || 'there')
    processedText = processedText.replace(/\{time\}/g, this.getTimeOfDay())

    // Add dynamic changelog content if needed
    if (response.id.includes('changelog') || response.id.includes('updates')) {
      processedText = this.injectChangelogContent(processedText)
    }

    return {
      ...response,
      text: processedText
    }
  }

  /**
   * Get fallback response for unknown or failed intents
   */
  private getFallbackResponse(intent: string): SupportResponse {
    return {
      id: 'fallback',
      text: "I'm not sure I understand that question. Let me help you find what you're looking for:",
      quickReplies: [
        { text: "Pricing & Plans", intent: "pricing" },
        { text: "Feature Overview", intent: "about" },
        { text: "Token Usage", intent: "tokens" },
        { text: "Contact Support", intent: "contact" }
      ]
    }
  }

  /**
   * Normalize text for better matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Get time-based greeting
   */
  private getTimeOfDay(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    return 'evening'
  }

  /**
   * Inject latest changelog content
   */
  private injectChangelogContent(text: string): string {
    // This would read from changelog.json in a real implementation
    // For now, return the text as-is
    return text
  }

  /**
   * Generate contextual quick replies
   */
  generateQuickReplies(intent: string, conversationState: ConversationState): QuickReply[] {
    const baseReplies: QuickReply[] = [
      { text: "Pricing", intent: "pricing" },
      { text: "Features", intent: "about" },
      { text: "Token Usage", intent: "tokens" },
      { text: "What's New?", intent: "changelog" }
    ]

    // Customize based on current intent
    switch (intent) {
      case 'pricing':
        return [
          { text: "Token Details", intent: "tokens" },
          { text: "Upgrade to Pro", action: "external_link", url: "/pricing" },
          { text: "Free Features", intent: "features_free" }
        ]
      case 'tokens':
        return [
          { text: "Check Usage", action: "external_link", url: "/plan" },
          { text: "Upgrade Plan", action: "external_link", url: "/pricing" },
          { text: "Feature Help", intent: "navigation" }
        ]
      case 'about':
        return [
          { text: "Try Explorer", action: "external_link", url: "/explorer" },
          { text: "See Planner", action: "external_link", url: "/planner" },
          { text: "Pricing", intent: "pricing" }
        ]
      default:
        return baseReplies
    }
  }
}

// Singleton instance
export const supportEngine = new SupportEngine()
