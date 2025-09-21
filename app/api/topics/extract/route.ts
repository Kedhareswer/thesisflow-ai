import { NextRequest, NextResponse } from 'next/server'
import { OpenRouterClient, type ChatMessage } from '@/lib/services/openrouter.service'
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

      const system: ChatMessage = { role: 'system', content: 'You are an expert research analyst. Return only compact JSON arrays when asked.' }
      const user: ChatMessage = {
        role: 'user',
        content: `Extract 10-15 concise research topics/themes from the following titles and abstract snippets.\nReturn ONLY a JSON array of short strings, no prose.\n\nTITLES:\n${titles}\n\nABSTRACT SNIPPETS:\n${abstracts}\n\nExample: ["Topic A", "Topic B", ...]`
      }

      const client = new OpenRouterClient()
      const modelOrder = [
        'z-ai/glm-4.5-air:free',
        'agentica-org/deepcoder-14b-preview:free',
        'nousresearch/deephermes-3-llama-3-8b-preview:free',
        'nvidia/nemotron-nano-9b-v2:free',
        'deepseek/deepseek-chat-v3.1:free',
        'openai/gpt-oss-120b:free',
      ]

      let content: string | null = null
      let lastErr: any
      for (const model of modelOrder) {
        try {
          content = await client.chatCompletion(model, [system, user], request.signal)
          if (content) break
        } catch (e) {
          lastErr = e
          continue
        }
      }
      if (!content) {
        return NextResponse.json({ success: false, error: lastErr?.message || 'All models failed' }, { status: 502 })
      }

      let topics: string[] = []
      try {
        const arr = JSON.parse(content || '[]') as string[]
        if (Array.isArray(arr)) topics = arr.filter(Boolean).map(String)
      } catch {}
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
