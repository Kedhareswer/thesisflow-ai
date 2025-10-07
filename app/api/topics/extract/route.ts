import { NextRequest, NextResponse } from 'next/server'
import { withTokenValidation } from '@/lib/middleware/token-middleware'

// Server-side Nova AI functionality using hardcoded Groq API
async function callNovaAI(systemPrompt: string, userPrompt: string, signal?: AbortSignal): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY
  
  if (!groqApiKey) {
    throw new Error('Groq API key not configured. Please set GROQ_API_KEY environment variable.')
  }
  
  console.log('[Topics Extract] Making request to Groq API...')
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqApiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      temperature: 0.7,
      top_p: 0.9,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    }),
    signal
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Groq API error:', response.status, errorData)
    throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  const aiContent = data.choices?.[0]?.message?.content || 'No response generated'
  console.log('[Topics Extract] Success! Generated', aiContent.length, 'characters')
  return aiContent
}

export const POST = withTokenValidation(
  'topics_extract',
  async (_userId: string, request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json().catch(() => ({} as any))
      const papers: Array<{ title?: string; abstract?: string }> = Array.isArray(body?.papers) ? body.papers : []

      if (!papers.length) {
        return NextResponse.json({ success: false, error: 'papers array required' }, { status: 400 })
      }

      // Check if Groq API key is configured
      const groqApiKey = process.env.GROQ_API_KEY
      console.log('[Topics Extract] Groq API Key configured:', !!groqApiKey)
      if (!groqApiKey) {
        console.error('[Topics Extract] No Groq API key found')
        return NextResponse.json({ success: false, error: 'Nova AI not configured. Please set GROQ_API_KEY environment variable.' }, { status: 500 })
      }

      const titles = papers.slice(0, 30).map(p => `- ${p.title || ''}`).join('\n')
      const abstracts = papers.slice(0, 12).map(p => `- ${(p.abstract || '').slice(0, 300)}`).join('\n')

      const systemPrompt = 'You are Nova, a specialized research collaboration assistant and expert research analyst. Return only compact JSON arrays when asked.'
      const userPrompt = `Extract 10-15 concise research topics/themes from the following titles and abstract snippets.\nReturn ONLY a JSON array of short strings, no prose.\n\nTITLES:\n${titles}\n\nABSTRACT SNIPPETS:\n${abstracts}\n\nExample: ["Topic A", "Topic B", ...]`

      try {
        const content = await callNovaAI(systemPrompt, userPrompt, request.signal)
        if (!content) {
          return NextResponse.json({ success: false, error: 'Nova AI returned no content' }, { status: 502 })
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
        console.error('[Topics Extract] Nova AI failed:', error)
        return NextResponse.json({ success: false, error: error.message || 'AI generation failed' }, { status: 502 })
      }

    } catch (error: any) {
      return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 })
    }
  },
  {
    context: { origin: 'topics', feature: 'extract' },
  }
)
