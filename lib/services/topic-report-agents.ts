import { OpenRouterClient } from './openrouter.service'
import type { Paper } from '@/hooks/use-literature-search'

export interface StreamCallbacks {
  onToken: (t: string) => void
  onProgress?: (msg: string) => void
  onError?: (err: string) => void
}

export interface GenerateReportOptions extends StreamCallbacks {
  query: string
  papers: Paper[]
  quality: 'Standard' | 'Enhanced'
  signal?: AbortSignal
}

function chunkString(str: string, size = 20): string[] {
  const out: string[] = []
  for (let i = 0; i < str.length; i += size) out.push(str.slice(i, i + size))
  return out
}

function enumerateSources(papers: Paper[]): { lines: string, count: number } {
  const lines = papers.map((p, i) => {
    const authors = (p.authors || []).join(', ')
    const year = p.year || 'n.d.'
    const journal = p.journal || ''
    const doi = p.doi || ''
    const locator = doi ? `doi:${doi}` : (p.url || '')
    return `${i + 1}. ${authors ? authors + '. ' : ''}${year}. ${p.title}${journal ? `. ${journal}` : ''}${locator ? `. ${locator}` : ''}`
  }).join('\n')
  return { lines, count: papers.length }
}

async function tryModels(models: string[], messages: { role: 'system'|'user'|'assistant', content: string }[], signal?: AbortSignal): Promise<string> {
  const client = new OpenRouterClient()
  let lastErr: any
  for (const model of models) {
    try {
      const content = await client.chatCompletion(model, messages as any, signal)
      if (content) return content
    } catch (err) {
      lastErr = err
      continue
    }
  }
  throw new Error(lastErr?.message || 'All OpenRouter models failed')
}

// Agent 1: Curator - selects trusted sources (we already have them from the search; this agent just ranks and labels)
async function curatorAgent(query: string, sourcesText: string, signal?: AbortSignal): Promise<string> {
  const system = {
    role: 'system' as const,
    content: 'You are a meticulous research curator. You only trust reputable, peer‑reviewed or authoritative sources.'
  }
  const user = {
    role: 'user' as const,
    content: `Topic: ${query}\n\nBelow is a numbered list of candidate sources (already vetted to be safe).\nMark each as HIGH, MEDIUM, or LOW trust and list 1‑line rationale.\nReturn strictly in markdown table with columns: ID | Trust | Rationale.\n\nSources:\n${sourcesText}`
  }
  const models = [
    'z-ai/glm-4.5-air:free',
    'deepseek/deepseek-chat-v3.1:free',
    'nvidia/nemotron-nano-9b-v2:free',
  ]
  return tryModels(models, [system, user], signal)
}

// Agent 2: Analyzer - summarize each source succinctly with inline [n] citation
async function analyzerAgent(query: string, sourcesText: string, limit = 15, signal?: AbortSignal): Promise<string> {
  const system = { role: 'system' as const, content: 'You are a precise literature analyst. Summarize without hallucinations.' }
  const user = {
    role: 'user' as const,
    content: `For the topic "${query}", write 2‑3 bullet summaries for EACH numbered source below.\nUse inline citations like [1], [2] to refer to the same numbering.\nReturn as markdown with \'## Per‑source Summaries\' and subsections like \'### [n] Title\'.\n\nSources:\n${sourcesText}`
  }
  const models = [
    'agentica-org/deepcoder-14b-preview:free',
    'nousresearch/deephermes-3-llama-3-8b-preview:free',
    'z-ai/glm-4.5-air:free',
  ]
  return tryModels(models, [system, user], signal)
}

// Agent 3: Synthesizer - produce beautiful structured review with tables & ASCII charts
async function synthesizerAgent(query: string, sourcesText: string, quality: 'Standard'|'Enhanced', signal?: AbortSignal): Promise<string> {
  const words = quality === 'Enhanced' ? '1500-2200' : '1000-1500'
  const system = { role: 'system' as const, content: 'You are a senior research writer. Produce structured, citation‑grounded reviews.' }
  const user = {
    role: 'user' as const,
    content: `Write a scholarly review on: "${query}". Use ONLY the numbered sources below. Cite inline with [n]. Length ${words} words.\nStructure with clear headings (Title, Abstract, Background, Methods, Findings, Visual Summaries, Limitations, References).\nInclude these visual summaries as Markdown:\n1) Evidence Summary Table (ID | Study/Source | Year | Method | Sample/Scope | Key Finding | Citation).\n2) Key Metrics Table (Metric | Value/Range | Population/Scope | Citation).\n3) Regional Comparison Table (Region | Trend/Direction | Notable Study [n]).\n4) Timeline Table (Period | Milestones | Citations).\n5) ASCII Bar Chart in a \`\`\`text codeblock showing top 5 trends with percentages.\n6) ASCII Line Chart (annual trend) in a \`\`\`text codeblock.\nIf data insufficient, write \'Data not available\'.\nAfter body, include a \"References\" section listing the same numbered items.\n\nSources:\n${sourcesText}`
  }
  const models = [
    'openai/gpt-oss-120b:free',
    'z-ai/glm-4.5-air:free',
    'deepseek/deepseek-chat-v3.1:free',
  ]
  return tryModels(models, [system, user], signal)
}

export async function streamTopicReportWithAgents(opts: GenerateReportOptions): Promise<void> {
  const { query, papers, quality, onToken, onProgress, onError, signal } = opts
  try {
    const top = papers.slice(0, Math.min(20, Math.max(8, papers.length)))
    const { lines: sourcesText } = enumerateSources(top)

    onProgress?.('Curating trusted sources…')
    const curation = await curatorAgent(query, sourcesText, signal)

    onProgress?.('Analyzing each source…')
    const perSource = await analyzerAgent(query, sourcesText, 15, signal)

    onProgress?.('Synthesizing final report…')
    const body = await synthesizerAgent(query, sourcesText, quality, signal)

    const finalDoc = [
      `# ${query} — Evidence‑Grounded Review`,
      '',
      '## Source Curation',
      curation.trim(),
      '',
      perSource.trim(),
      '',
      body.trim(),
    ].join('\n')

    // Simulated streaming: emit gradually for better UX
    const chunks = chunkString(finalDoc, 24)
    for (const ch of chunks) {
      if (signal?.aborted) break
      onToken(ch)
      await new Promise(r => setTimeout(r, 12))
    }
  } catch (e: any) {
    onError?.(e?.message || String(e))
  }
}
