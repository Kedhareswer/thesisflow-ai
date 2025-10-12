/**
 * Shared utilities for handling paper sources and citations
 */

import { enhancedAIService } from '@/lib/enhanced-ai-service'
import type { ChatMessage } from '@/lib/ai-providers'

export interface Paper {
  id: string
  title: string
  authors: string[]
  abstract: string
  year: string
  journal: string
  url: string
  citations: number
  source: string
  doi?: string
}

/**
 * Enumerates papers into a formatted citation list
 * @param papers Array of paper objects to enumerate
 * @returns Formatted string with numbered citations
 */
export function enumerateSources(papers: Paper[]): string {
  return papers.map((p, idx) => {
    const authors = (p.authors || []).join(', ')
    const year = p.year || 'n.d.'
    const journal = p.journal || ''
    const doi = p.doi || ''
    const locator = doi ? `doi:${doi}` : (p.url || '')
    return `${idx + 1}. ${authors ? authors + '. ' : ''}${year}. ${p.title}${journal ? `. ${journal}` : ''}${locator ? `. ${locator}` : ''}`
  }).join('\n')
}

/**
 * Uses Nova (Groq) for AI text generation with fallback
 * @param prompt Text prompt to send to the model
 * @param userId Optional user ID for tracking
 * @param signal Optional abort signal for cancellation
 * @returns Content from Nova or fallback provider
 */
export async function tryNova(prompt: string, userId?: string, signal?: AbortSignal): Promise<string> {
  try {
    const result = await enhancedAIService.generateText({
      prompt,
      provider: "groq",
      model: "llama-3.1-8b-instant",
      maxTokens: 2000,
      temperature: 0.2,
      userId
    })
    
    if (result.success && result.content) {
      return result.content
    }
    throw new Error(result.error || 'Nova generation failed')
  } catch (err: any) {
    throw new Error(err?.message || 'Nova request failed')
  }
}

/**
 * Wraps a promise with a timeout
 * @param promise Promise to wrap with timeout
 * @param ms Timeout in milliseconds
 * @param label Label for timeout error message
 * @returns Promise that rejects if timeout is reached
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    promise
      .then((val) => { clearTimeout(timer); resolve(val) })
      .catch((err) => { clearTimeout(timer); reject(err) })
  })
}
