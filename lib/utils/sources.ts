/**
 * Shared utilities for handling paper sources and citations
 */

import { OpenRouterClient } from '@/lib/services/openrouter.service'
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
 * Tries multiple OpenRouter models in sequence until one succeeds
 * @param models Array of model names to try
 * @param messages Chat messages to send to the model
 * @param signal Optional abort signal for cancellation
 * @returns Content from the first successful model
 */
export async function tryModels(models: string[], messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const client = new OpenRouterClient()
  let lastErr: any
  for (const model of models) {
    try {
      const content = await client.chatCompletion(model, messages, signal)
      if (content) return content
    } catch (e) {
      lastErr = e
      continue
    }
  }
  throw new Error(lastErr?.message || 'All OpenRouter models failed')
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
