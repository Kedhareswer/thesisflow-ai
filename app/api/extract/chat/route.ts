import { NextRequest, NextResponse } from 'next/server'
import { enhancedAIService } from '@/lib/enhanced-ai-service'
import { withTokenValidation } from '@/lib/middleware/token-middleware'

export const POST = withTokenValidation(
  'extract_chat',
  async (userId: string, request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json().catch(() => ({} as any))
      const message: string = (body?.message || '').toString()
      const context: string = (body?.context || '').toString()

      if (!message || !message.trim()) {
        return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 })
      }

      const safeContext = (context || '').slice(0, 8000)
      const prompt = `You are a helpful research assistant for document extraction and Q&A.
Answer strictly using the provided document context. If the answer is not in the context, say you do not know.
Be concise, factual, and avoid speculation. Use markdown lists or tables when helpful.
Preserve equations, units, and citations as-is if present. Do not fabricate references.

${safeContext ? `Document Context (truncated):\n${safeContext}` : 'Document Context: (none provided)'}

User Question: ${message.trim()}`

      // Use Nova (Groq) for fast, reliable Q&A
      const result = await enhancedAIService.generateText({
        prompt,
        provider: "groq",
        model: "llama-3.1-8b-instant",
        maxTokens: 1500,
        temperature: 0.2,
        userId
      })

      if (!result.success || !result.content) {
        return NextResponse.json({ success: false, error: result.error || 'Extract chat failed' }, { status: 502 })
      }

      return NextResponse.json({ success: true, response: result.content })
    } catch (error: any) {
      const msg = error?.message || 'Extract chat failed'
      return NextResponse.json({ success: false, error: msg }, { status: msg.toLowerCase().includes('auth') ? 401 : 500 })
    }
  },
  {
    context: { origin: 'extract', feature: 'chat' },
  }
)
