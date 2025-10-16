import { enhancedAIService } from '@/lib/enhanced-ai-service'
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

async function tryNova(prompt: string, userId?: string, signal?: AbortSignal): Promise<string> {
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

// Agent 1: Curator - selects trusted sources (we already have them from the search; this agent just ranks and labels)
async function curatorAgent(query: string, sourcesText: string, userId?: string, signal?: AbortSignal): Promise<string> {
  const prompt = `You are a meticulous research curator. You only trust reputable, peer‑reviewed or authoritative sources.

Topic: ${query}

Below is a numbered list of candidate sources (already vetted to be safe).
Mark each as HIGH, MEDIUM, or LOW trust and list 1‑line rationale.
Return strictly in markdown table with columns: ID | Trust | Rationale.

Sources:
${sourcesText}`

  return tryNova(prompt, userId, signal)
}

// Agent 2: Analyzer - summarize each source succinctly with inline [n] citation
async function analyzerAgent(query: string, sourcesText: string, userId?: string, limit = 15, signal?: AbortSignal): Promise<string> {
  const prompt = `You are a precise literature analyst. Summarize without hallucinations.

For the topic "${query}", write 2‑3 bullet summaries for EACH numbered source below.
Use inline citations like [1], [2] to refer to the same numbering.
Return as markdown with '## Per‑source Summaries' and subsections like '### [n] Title'.

Sources:
${sourcesText}`

  return tryNova(prompt, userId, signal)
}

// Agent 3: Synthesizer - produce beautiful structured review with tables & ASCII charts
async function synthesizerAgent(query: string, sourcesText: string, quality: 'Standard'|'Enhanced', userId?: string, signal?: AbortSignal): Promise<string> {
  const words = quality === 'Enhanced' ? '1500-2200' : '1000-1500'
  const prompt = `You are a senior research writer. Produce structured, citation‑grounded reviews.

Write a scholarly review on: "${query}". Use ONLY the numbered sources below. Cite inline with [n]. Length ${words} words.
Structure with clear headings (Title, Abstract, Background, Methods, Findings, Visual Summaries, Limitations, References).
Include these visual summaries as Markdown:
1) Evidence Summary Table (ID | Study/Source | Year | Method | Sample/Scope | Key Finding | Citation).
2) Key Metrics Table (Metric | Value/Range | Population/Scope | Citation).
3) Regional Comparison Table (Region | Trend/Direction | Notable Study [n]).
4) Timeline Table (Period | Milestones | Citations).
5) ASCII Bar Chart in a \`\`\`text codeblock showing top 5 trends with percentages.
6) ASCII Line Chart (annual trend) in a \`\`\`text codeblock.
If data insufficient, write 'Data not available'.
After body, include a "References" section listing the same numbered items.

Sources:
${sourcesText}`

  // Use GPT-OSS 120B for advanced synthesis with reasoning capabilities
  try {
    const result = await enhancedAIService.generateText({
      prompt,
      provider: "groq",
      model: "gpt-oss-120b", // Updated: GPT-OSS 120B for frontier-level reasoning and comprehensive report generation
      maxTokens: quality === 'Enhanced' ? 3000 : 2500,
      temperature: 0.3,
      userId
    })

    if (result.success && result.content) {
      return result.content
    }
    throw new Error(result.error || 'Nova synthesis failed')
  } catch (err: any) {
    throw new Error(err?.message || 'Nova synthesis request failed')
  }
}

export async function streamTopicReportWithAgents(opts: GenerateReportOptions & { userId?: string }): Promise<void> {
  const { query, papers, quality, onToken, onProgress, onError, signal, userId } = opts
  try {
    const top = papers.slice(0, Math.min(20, Math.max(8, papers.length)))
    const { lines: sourcesText } = enumerateSources(top)

    onProgress?.('Curating trusted sources…')
    const curation = await curatorAgent(query, sourcesText, userId, signal)

    onProgress?.('Analyzing each source…')
    const perSource = await analyzerAgent(query, sourcesText, userId, 15, signal)

    onProgress?.('Synthesizing final report…')
    const body = await synthesizerAgent(query, sourcesText, quality, userId, signal)

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
