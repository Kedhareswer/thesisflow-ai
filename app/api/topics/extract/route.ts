import { NextRequest, NextResponse } from 'next/server'
import { enhancedAIService } from '@/lib/enhanced-ai-service'
import { withTokenValidation } from '@/lib/middleware/token-middleware'

export const POST = withTokenValidation(
  'topics_extract',
  async (_userId: string, request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json().catch(() => ({} as any))
      const papers: Array<{ title?: string; abstract?: string }> = Array.isArray(body?.papers) ? body.papers : []

      if (!papers.length) {
        return NextResponse.json({ success: false, error: 'papers array required' }, { status: 400 })
      }

      const titles = papers.slice(0, 30).map(p => `- ${p.title || ''}`).join('\n')
      const abstracts = papers.slice(0, 12).map(p => `- ${(p.abstract || '').slice(0, 300)}`).join('\n')

      const prompt = `You are an expert research analyst. Return only compact JSON arrays when asked.

                        Extract 10-15 concise research topics/themes from the following titles and abstract snippets.
                        Return ONLY a JSON array of short strings, no prose.

                        TITLES:
${titles}

ABSTRACT SNIPPETS:
${abstracts}

Example: ["Topic A", "Topic B", ...]`

      // Use automatic provider fallback for reliable topic extraction
      const result = await enhancedAIService.generateText({
        prompt,
        // No provider specified - will use fallback mechanism with all available providers
        maxTokens: 1500,
        temperature: 0.2,
        userId: _userId
      })

      if (!result.success || !result.content) {
        return NextResponse.json({ success: false, error: result.error || 'Topic extraction failed' }, { status: 502 })
      }

      const content = result.content

      let topics: string[] = []
      try {
        const arr = JSON.parse(content || '[]') as string[]
        if (Array.isArray(arr)) topics = arr.filter(Boolean).map(String)
      } catch { }
      if (!topics.length) {
        // fallback: parse lines
        topics = (content || '').split('\n').map(s => s.replace(/^[−–—-•]\s*/, '').trim()).filter(Boolean)
      }
      topics = topics.slice(0, 15)

      return NextResponse.json({ success: true, topics })
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 })
    }
  },
  {
    context: { origin: 'topics', feature: 'extract' },
  }
)
