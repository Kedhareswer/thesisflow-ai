import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage } from '@/lib/ai-providers'
import { withTokenValidation, TokenMiddleware } from '@/lib/middleware/token-middleware'
import { tokenService } from '@/lib/services/token.service'
import { enumerateSources, tryModels, withTimeout, type Paper } from '@/lib/utils/sources'

export const POST = withTokenValidation(
  'topics_report',
  async (userId: string, request: NextRequest): Promise<NextResponse> => {
    try {
      const { query, papers, quality } = await request.json()
      if (!query || !Array.isArray(papers) || papers.length === 0) {
        return NextResponse.json({ success: false, error: 'query and papers are required' }, { status: 400 })
      }

      const limited: Paper[] = papers.slice(0, Math.min(20, Math.max(8, papers.length)))
      const sourcesText = enumerateSources(limited)

      const models = [
        'z-ai/glm-4.5-air:free',
        'agentica-org/deepcoder-14b-preview:free',
        'nousresearch/deephermes-3-llama-3-8b-preview:free',
        'nvidia/nemotron-nano-9b-v2:free',
        'deepseek/deepseek-chat-v3.1:free',
        'openai/gpt-oss-120b:free',
      ]

      // Match middleware dynamic cost context so refunds are accurate
      const ctx = { ...TokenMiddleware.parseRequestContext(request), origin: 'topics', feature: 'report' }
      const tokensNeeded = await tokenService.getFeatureCost('topics_report', ctx)

      // Align with client 4-minute budget and mirror streaming route stage limits
      const totalBudgetMs = 240_000
      const curationBudgetMs = 60_000
      const analysisBudgetMs = 90_000
      const synthesisBudgetMs = 90_000

      // Agent 1: Curator
      const curatorSystem: ChatMessage = { role: 'system', content: 'You are a meticulous research curator. You only trust reputable, peer‑reviewed or authoritative sources.' }
      const curatorUser: ChatMessage = { role: 'user', content: `Topic: ${query}\n\nBelow is a numbered list of candidate sources (already vetted to be safe).\nMark each as HIGH, MEDIUM, or LOW trust and list 1‑line rationale.\nReturn strictly in markdown table with columns: ID | Trust | Rationale.\n\nSources:\n${sourcesText}` }
      const curation = await withTimeout(tryModels(models, [curatorSystem, curatorUser], request.signal), curationBudgetMs, 'Curation')

      // Agent 2: Analyzer
      const analyzerSystem: ChatMessage = { role: 'system', content: 'You are a precise literature analyst. Summarize without hallucinations.' }
      const analyzerUser: ChatMessage = { role: 'user', content: `For the topic "${query}", write 2‑3 bullet summaries for EACH numbered source below.\nUse inline citations like [1], [2] to refer to the same numbering.\nReturn as markdown with '## Per‑source Summaries' and subsections like '### [n] Title'.\n\nSources:\n${sourcesText}` }
      const perSource = await withTimeout(tryModels(models, [analyzerSystem, analyzerUser], request.signal), analysisBudgetMs, 'Analysis')

      // Agent 3: Synthesizer
      const words = (quality === 'Enhanced') ? '1500-2200' : '1000-1500'
      const synthSystem: ChatMessage = { role: 'system', content: 'You are a senior research writer. Produce structured, citation‑grounded reviews.' }
      const synthUser: ChatMessage = { role: 'user', content: `Write a scholarly review on: "${query}". Use ONLY the numbered sources below. Cite inline with [n]. Length ${words} words.\nStructure with clear headings (Title, Abstract, Background, Methods, Findings, Visual Summaries, Limitations, References).\nInclude these visual summaries as Markdown:\n1) Evidence Summary Table (ID | Study/Source | Year | Method | Sample/Scope | Key Finding | Citation).\n2) Key Metrics Table (Metric | Value/Range | Population/Scope | Citation).\n3) Regional Comparison Table (Region | Trend/Direction | Notable Study [n]).\n4) Timeline Table (Period | Milestones | Citations).\n5) ASCII Bar Chart in a \`\`\`text codeblock showing top 5 trends with percentages.\n6) ASCII Line Chart (annual trend) in a \`\`\`text codeblock.\nIf data insufficient, write 'Data not available'.\nAfter body, include a "References" section listing the same numbered items.\n\nSources:\n${sourcesText}` }
      const body = await withTimeout(tryModels(models, [synthSystem, synthUser], request.signal), synthesisBudgetMs, 'Synthesis')

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

      return NextResponse.json({ success: true, content: finalDoc })
    } catch (error: any) {
      // Refund tokens on failure since handler already returned 200 to middleware
      try {
        const ctx = { ...TokenMiddleware.parseRequestContext(request), origin: 'topics', feature: 'report' }
        const tokensNeeded = await tokenService.getFeatureCost('topics_report', ctx)
        await tokenService.refundTokens(userId, 'topics_report', tokensNeeded, { ...ctx, refund_reason: 'handler_error' })
      } catch { /* ignore */ }
      return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 })
    }
  },
  {
    context: { origin: 'topics', feature: 'report' },
  }
)
