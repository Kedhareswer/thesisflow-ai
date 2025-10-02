import intentsData from '@/data/support/intents.json'
import { supportResponsesMap } from '@/lib/services/support-responses'

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
   * Analyze user input and determine intent (enhanced for better automation)
   */
  analyzeIntent(input: string, conversationState?: ConversationState): { intent: string; confidence: number } {
    const normalizedInput = this.normalizeText(input)
    const words = normalizedInput.split(/\s+/)
    
    const hasAnyUserMessage = Array.isArray(conversationState?.messages)
      ? conversationState!.messages.some(m => m.role === 'user')
      : false
    const hasGreetedBefore = Array.isArray(conversationState?.messages)
      ? conversationState!.messages.some(m => m.role === 'assistant' && (m.intent === 'greeting' || /welcome|hello|hi/i.test(m.content)))
      : false
    
    let bestMatch = { intent: 'unknown', confidence: 0 }

    // 1) Strong exact-match heuristic for short inputs (one or two words)
    const shortInput = normalizedInput.length <= 20 && words.length <= 3
    // Fast path: map very common single-word intents directly
    if (shortInput) {
      if (/^features?$/.test(normalizedInput)) {
        return { intent: 'about', confidence: 0.9 }
      }
      if (/^(pricing|price|plans|plan|cost|billing|payment)$/.test(normalizedInput)) {
        return { intent: 'pricing', confidence: 0.95 }
      }
      if (/^(token|tokens|usage|quota|allowance|token usage)$/.test(normalizedInput)) {
        return { intent: 'tokens', confidence: 0.95 }
      }
      if (/^(bug|issue|problem|ticket)$/.test(normalizedInput)) {
        return { intent: 'ticket', confidence: 0.95 }
      }
      if (/^(feedback|suggestion|review|rating)$/.test(normalizedInput)) {
        return { intent: 'feedback', confidence: 0.95 }
      }
    }

    // 2) Enhanced keyword matching with phrase detection and exact token boosts
    for (const intent of this.intents) {
      let score = 0
      let matchCount = 0

      // Check direct keyword matches with phrase priority
      for (const keyword of intent.keywords) {
        const keywordLower = keyword.toLowerCase()
        if (normalizedInput.includes(keywordLower)) {
          // Give higher score for exact phrase matches
          if (keywordLower.includes(' ') && normalizedInput.includes(keywordLower)) {
            score += 2 // Phrase match bonus
          } else {
            score += 1
          }
          matchCount++
          // Additional boost for exact whole-input match
          if (normalizedInput === keywordLower) {
            score += 3
          }
        }
      }

      // Check synonym matches
      for (const [canonical, synonymList] of Object.entries(this.synonyms)) {
        for (const synonym of synonymList) {
          if (normalizedInput.includes(synonym.toLowerCase())) {
            // Find if canonical form matches any intent keywords
            for (const intentKeyword of intent.keywords) {
              if (intentKeyword.toLowerCase() === canonical.toLowerCase()) {
                score += 1.2
                matchCount++
                // Additional boost for exact synonym match
                if (normalizedInput === synonym.toLowerCase()) {
                  score += 2.5
                }
              }
            }
          }
        }
      }

      // 3) Enhanced confidence calculation (less punitive for large keyword lists)
      // Normalize by a soft factor instead of total keywords to avoid under-confidence on short queries
      const softNorm = 3 // ~3 signals to reach high confidence
      const priorityAttenuation = Math.max(0.7, 1 - (intent.priority - 1) * 0.05) // small effect
      const confidence = matchCount > 0
        ? Math.min(1.0, (score / softNorm) * intent.confidence * priorityAttenuation)
        : 0

      if (confidence > bestMatch.confidence) {
        bestMatch = { intent: intent.name, confidence }
      }
    }

    // 4) Better fallback logic with conversation awareness
    if (bestMatch.confidence < 0.15) {
      // If it's clearly a greeting and we haven't greeted yet, allow greeting
      if (/^(hi|hello|hey|start|begin)$/i.test(normalizedInput) && !hasAnyUserMessage && !hasGreetedBefore) {
        return { intent: 'greeting', confidence: 0.9 }
      }
      // Help patterns map to contact intent
      if (/\b(help|assist|support|problem|issue|bug)\b/i.test(normalizedInput)) {
        return { intent: 'contact', confidence: 0.8 }
      }
      // Otherwise, avoid repeating greeting; steer to unknown/navigation for clarification
      return { intent: 'unknown', confidence: 0.4 }
    }

    return bestMatch
  }

  /**
   * Generate response based on intent and conversation state (synchronous for instant responses)
   */
  generateResponse(
    intent: string, 
    input: string, 
    conversationState: ConversationState
  ): SupportResponse {
    try {
      // Load response templates for this intent
      const responses = this.loadResponseTemplates(intent)
      
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
   * Load response templates for an intent (synchronous for instant responses)
   */
  private loadResponseTemplates(intent: string): SupportResponse[] {
    if (this.responseCache.has(intent)) {
      return this.responseCache.get(intent)!
    }

    // Use static map for instant loading
    const entry = (supportResponsesMap as any)[intent]
    if (entry) {
      const responses = entry.responses || entry.default?.responses || []
      this.responseCache.set(intent, responses)
      return responses
    }

    console.warn(`No response template found for intent: ${intent}`)
    return []
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
        { text: "Report Issue", intent: "ticket" },
        { text: "Give Feedback", intent: "feedback" },
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
      .replace(/[\u2019']/g, '')
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
      { text: "What's New?", intent: "changelog" },
      { text: "Report Issue", intent: "ticket" },
      { text: "Give Feedback", intent: "feedback" },
      { text: "Contact Support", intent: "contact" }
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
      case 'contact':
        return [
          { text: "Report an Issue", intent: "ticket" },
          { text: "Give Feedback", intent: "feedback" },
          { text: "Email Support", action: "external_link", url: "mailto:support@thesisflow-ai.com?subject=ThesisFlow-AI%20Support%20Request" },
          { text: "Copy Support Email", action: "custom", data: { type: 'copy', text: 'support@thesisflow-ai.com' } }
        ]
      case 'ticket':
        return [
          { text: "Email with Screenshots", action: "external_link", url: "mailto:support@thesisflow-ai.com?subject=Issue%20Report%20-%20ThesisFlow-AI&body=Hi%20ThesisFlow%20team,%0A%0AIssue%20Description:%0A%0ASteps%20to%20reproduce:%0A1.%20%0A2.%20%0A3.%20%0A%0AExpected%20behavior:%0A%0AActual%20behavior:%0A%0ABrowser/Device:%0A%0AScreenshots:%20(please%20attach)%0A%0AAdditional%20info:%0A%0AThank%20you!" },
          { text: "Copy Support Email", action: "custom", data: { type: 'copy', text: 'support@thesisflow-ai.com' } },
          { text: "Detailed Issue Template", action: "custom", data: { type: 'prefill', text: "[Issue Report]\n🐛 Problem: \n📱 Device/Browser: \n📅 When: \n🔄 Steps to reproduce:\n1. \n2. \n3. \n\n✅ Expected: \n❌ Actual: \n📷 Screenshots: (attach to email)\n💬 Additional details: " } }
        ]
      case 'feedback':
        return [
          { text: "Send Detailed Feedback", action: "external_link", url: "mailto:feedback@thesisflow-ai.com?subject=User%20Feedback%20-%20ThesisFlow-AI&body=Hi%20ThesisFlow%20team,%0A%0AHere's%20my%20feedback:%0A%0AWhat%20I%20like:%0A-%20%0A%0AWhat%20could%20be%20improved:%0A-%20%0A%0AFeature%20requests:%0A-%20%0A%0AAdditional%20comments:%0A%0A%0AThank%20you!" },
          { text: "Copy Feedback Email", action: "custom", data: { type: 'copy', text: 'feedback@thesisflow-ai.com' } },
          { text: "Quick Feedback Template", action: "custom", data: { type: 'prefill', text: "[Feedback]\nWhat I like: \nWhat could be improved: \nFeature request: \nScreenshots: (attach or describe)\nOverall rating: ⭐⭐⭐⭐⭐" } }
        ]
      default:
        return baseReplies
    }
  }
}

// Singleton instance
export const supportEngine = new SupportEngine()
