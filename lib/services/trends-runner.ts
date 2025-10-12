import { LiteratureSearchService } from '@/lib/services/literature-search.service'
import { enhancedAIService } from '@/lib/enhanced-ai-service'
import { enumerateSources, withTimeout, type Paper as SourcePaper } from '@/lib/utils/sources'
import { embedText, kmeans, topTokens, densityClusters } from '@/lib/utils/simple-embed-cluster'
import { getEmitter, emitEvent } from '@/lib/services/trends-events'
import { appendJobItem, getTrendsJob, updateTrendsJob } from '@/lib/services/trends-job.store'

function now() { return Date.now() }

function parseYear(y?: string | number): number {
  if (typeof y === 'number') return y
  const yy = parseInt((y || '').toString().slice(0,4))
  return isNaN(yy) ? 0 : yy
}

function computeMetrics(query: string, items: Array<{ title?: string; url?: string }>) {
  const sources = items.length
  const domains = new Set<string>()
  for (const it of items) {
    try {
      if (it.url) domains.add(new URL(it.url).hostname.replace(/^www\./, ''))
    } catch {}
  }
  const diversity = sources > 0 ? Math.min(1, domains.size / Math.max(5, Math.floor(sources / 2))) : 0
  const tokens = (query || '').toLowerCase().split(/\s+/).filter(t => t.length > 2)
  const relevance = (() => {
    if (tokens.length === 0 || sources === 0) return 0.6
    const per = items.map((r) => {
      const t = (r.title || '').toLowerCase()
      const m = tokens.reduce((acc, tok) => acc + (t.includes(tok) ? 1 : 0), 0)
      return Math.min(1, m / Math.min(5, tokens.length))
    })
    const avg = per.reduce((a, b) => a + b, 0) / per.length
    return 0.6 + 0.4 * avg
  })()
  const coverage = Math.min(1, sources / 20)
  return { relevance, diversity, coverage, sources }
}

export async function runTrendsJob(jobId: string) {
  const job = getTrendsJob(jobId)
  if (!job) return

  updateTrendsJob(jobId, { status: 'running', stage: 'init', startedAt: now(), progress: 1 })
  emitEvent(jobId, 'init', { jobId, ts: now(), query: job.query })

  const emitter = getEmitter(jobId)
  const lit = new LiteratureSearchService()

  try {
    // 1) Discovery
    updateTrendsJob(jobId, { stage: 'discovery', progress: 5 })
    emitEvent(jobId, 'progress', { stage: 'discovery', message: 'Collecting latest sources…' })

    // Aggregate papers within 90s window, prefer recent years
    const limit = job.quality === 'Enhanced' ? 30 : 20
    const agg = await lit.aggregatePapers(job.query, limit, 90_000)
    let items = (agg.papers || []).map(p => ({
      title: p.title,
      url: p.url,
      source: p.source,
      abstract: p.abstract,
      year: p.year
    }))

    // Timeframe filter (months → years approximation)
    const currentYear = new Date().getFullYear()
    const maxAgeYears = Math.max(1, Math.ceil(job.timeframeMonths / 12))
    items = items.filter(it => {
      const y = parseYear(it.year as any)
      return y === 0 || (currentYear - y) <= maxAgeYears
    })

    items.forEach((it) => {
      appendJobItem(jobId, it)
      emitEvent(jobId, 'item', { item: it })
    })

    // 2) Metrics
    updateTrendsJob(jobId, { stage: 'metrics', progress: 25 })
    const metrics = computeMetrics(job.query, items)
    updateTrendsJob(jobId, { metrics })
    emitEvent(jobId, 'metrics', metrics)

    // 3) Clustering
    updateTrendsJob(jobId, { stage: 'clustering', progress: 40 })
    let clusters: Array<{ id: string; label: string; size: number; indices: number[]; score?: number }> = []
    try {
      const vectors = items.map((it) => embedText(it.title, it.abstract || ''))
      const n = vectors.length
      if (n >= 6) {
        const k = Math.max(2, Math.min(8, Math.round(Math.sqrt(n / 2)) || 2))
        const { labels } = kmeans(vectors, k)
        const groups: number[][] = Array.from({ length: k }, () => [])
        for (let i = 0; i < labels.length; i++) groups[labels[i]].push(i)
        clusters = groups
          .filter((g) => g.length >= 2)
          .map((idxs, i) => {
            const texts = idxs.map((ix) => items[ix].title)
            const tokens = topTokens(texts, 3)
            const label = tokens.length ? tokens.join(', ') : `Cluster ${i + 1}`
            return { id: `c${i}`, label, size: idxs.length, indices: idxs }
          })
        if (clusters.length < 2) {
          const comps = densityClusters(vectors, 0.84, 2)
          clusters = comps.map((idxs, i) => {
            const texts = idxs.map((ix) => items[ix].title)
            const tokens = topTokens(texts, 3)
            const label = tokens.length ? tokens.join(', ') : `Group ${i + 1}`
            return { id: `d${i}`, label, size: idxs.length, indices: idxs }
          })
        }
      }
    } catch {}
    if (clusters.length) {
      // Compute simple trend score (recency + size)
      const currentYear = new Date().getFullYear()
      clusters = clusters.map((c) => {
        const years = c.indices.map(ix => parseYear(items[ix].year as any)).filter(Boolean)
        const rec = years.length ? years.reduce((a,b)=>a+b,0)/years.length : currentYear
        const recency = 1 - Math.min(1, (currentYear - rec) / 5)
        const sizeFactor = Math.min(1, c.size / 10)
        const score = 0.6 * recency + 0.4 * sizeFactor
        return { ...c, score }
      })
      updateTrendsJob(jobId, { clusters })
      emitEvent(jobId, 'clusters', { clusters })
    }

    // 4) Timeline
    updateTrendsJob(jobId, { stage: 'timeline', progress: 55 })
    const byYear = new Map<number, number>()
    for (const it of items) {
      const y = parseYear(it.year as any)
      if (!y) continue
      byYear.set(y, (byYear.get(y) || 0) + 1)
    }
    const years = Array.from(byYear.keys()).sort((a,b)=>a-b)
    const timeline = years.map(y => ({ period: y.toString(), count: byYear.get(y)! }))
    updateTrendsJob(jobId, { timeline })
    emitEvent(jobId, 'timeline', { timeline })

    // 5) Report synthesis
    updateTrendsJob(jobId, { stage: 'synthesis', progress: 65 })
    emitEvent(jobId, 'progress', { stage: 'synthesis', message: 'Generating report…' })

    const limited: SourcePaper[] = items.slice(0, Math.min(20, Math.max(8, items.length))).map((it, i) => ({
      id: `${i+1}`,
      title: it.title,
      authors: [],
      abstract: it.abstract || '',
      year: (it.year || '').toString(),
      journal: '',
      url: it.url,
      citations: 0,
      source: it.source
    }))
    const sourcesText = enumerateSources(limited)

    const words = job.quality === 'Enhanced' ? '1500-2200' : '1000-1500'
    const prompt = `You are a senior research writer.
Write a trends-focused scholarly report on: "${job.query}" using ONLY the numbered sources below. Cite inline with [n]. Length ${words} words.
Must include clear headings and ASCII visuals:
- Title, Abstract, Background, Recent Trends, Key Findings, Visual Summaries, Limitations, References
- Evidence Summary Table (ID | Study/Source | Year | Method | Scope | Key Finding | Citation)
- Timeline Table (Year | Count | Highlights)
- ASCII Bar Chart of top 5 trends in a \`\`\`text codeblock
- ASCII Line Chart (annual trend) in a \`\`\`text codeblock
If data insufficient, write 'Data not available'. After body include a numbered References section matching sources.

Sources:\n${sourcesText}`

    const result = await withTimeout(
      enhancedAIService.generateText({ prompt, maxTokens: job.quality === 'Enhanced' ? 3200 : 2600, temperature: 0.25, userId: job.userId }),
      180_000,
      'Report'
    )

    let markdown = result.success ? (result.content || '') : ''
    if (!markdown) {
      // Fallback: construct a deterministic report from collected data
      const lines: string[] = []
      lines.push(`# ${job.query} — Trends Report (Fallback)`) 
      lines.push('')
      lines.push('## Executive Summary')
      lines.push(`- Coverage: ${(metrics.coverage*100).toFixed(0)}%`)
      lines.push(`- Diversity: ${(metrics.diversity*100).toFixed(0)}%`)
      lines.push(`- Relevance: ${(metrics.relevance*100).toFixed(0)}%`)
      lines.push(`- Sources: ${items.length}`)
      lines.push('')
      if (clusters.length) {
        lines.push('## Top Trends')
        const top = [...clusters].sort((a,b)=> (b.score||0)-(a.score||0)).slice(0,6)
        for (const c of top) {
          lines.push(`- ${c.label} (size ${c.size}, score ${(c.score||0).toFixed(2)})`)
        }
        lines.push('')
      }
      if (timeline.length) {
        lines.push('## Timeline (Yearly)')
        lines.push('Year | Count')
        lines.push('--- | ---')
        for (const t of timeline) lines.push(`${t.period} | ${t.count}`)
        // ASCII line
        const max = Math.max(...timeline.map(t=>t.count)) || 1
        lines.push('')
        lines.push('```text')
        for (const t of timeline) {
          const bars = Math.max(1, Math.round((t.count/max)*40))
          lines.push(`${t.period} | ${'▇'.repeat(bars)} ${t.count}`)
        }
        lines.push('```')
        lines.push('')
      }
      lines.push('## Evidence Summary (Top 15)')
      lines.push('ID | Title | Year | Source | Link')
      lines.push('--- | --- | --- | --- | ---')
      items.slice(0,15).forEach((it, i)=>{
        lines.push(`${i+1} | ${it.title?.replace(/\|/g,'-')} | ${it.year||''} | ${it.source} | ${it.url}`)
      })
      lines.push('')
      lines.push('## References')
      items.slice(0,20).forEach((it, i)=>{
        lines.push(`[${i+1}] ${it.title} (${it.year||''}). ${it.url}`)
      })
      markdown = lines.join('\n')
    }

    updateTrendsJob(jobId, { stage: 'render', progress: 90, report: { markdown, html: markdown, wordCount: markdown.split(/\s+/).length } })
    emitEvent(jobId, 'report', { markdown })

    // Done
    updateTrendsJob(jobId, { status: 'completed', stage: 'done', finishedAt: now(), progress: 100 })
    emitEvent(jobId, 'done', { processingTime: now() - (job.startedAt || now()) })
  } catch (e: any) {
    updateTrendsJob(jobId, { status: 'failed', error: e?.message || 'Job failed', finishedAt: now() })
    emitEvent(jobId, 'error', { error: e?.message || 'Job failed' })
  }
}
