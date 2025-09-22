import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { OpenRouterClient } from '@/lib/services/openrouter.service'

export async function POST(request: NextRequest) {
  try {
    // Require auth (cookie, header, or query per requireAuth helper)
    const user = await requireAuth(request, 'extract-chat')

    const body = await request.json().catch(() => ({} as any))
    const message: string = (body?.message || '').toString()
    const context: string = (body?.context || '').toString()

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 })
    }

    const system = {
      role: 'system' as const,
      content: [
        'You are a helpful research assistant for document extraction and Q&A.',
        'Answer strictly using the provided document context. If the answer is not in the context, say you do not know.',
        'Be concise, factual, and avoid speculation. Use markdown lists or tables when helpful.',
        'Preserve equations, units, and citations as-is if present. Do not fabricate references.',
      ].join('\n'),
    }

    const safeContext = (context || '').slice(0, 8000)
    const userMsg = {
      role: 'user' as const,
      content: [
        safeContext ? `Document Context (truncated):\n${safeContext}` : 'Document Context: (none provided) ',
        '',
        `User Question: ${message.trim()}`,
      ].join('\n'),
    }

    const client = new OpenRouterClient()

    // Model fallback order (same spirit as Planner usage)
    const modelsToTry = [
      'z-ai/glm-4.5-air:free',
      'agentica-org/deepcoder-14b-preview:free',
      'nousresearch/deephermes-3-llama-3-8b-preview:free',
      'nvidia/nemotron-nano-9b-v2:free',
      'deepseek/deepseek-chat-v3.1:free',
      'openai/gpt-oss-120b:free',
    ]

    let content = ''
    let lastErr: any
    for (const m of modelsToTry) {
      try {
        content = await client.chatCompletion(m, [system, userMsg])
        if (content) break
      } catch (err) {
        lastErr = err
        continue
      }
    }

    if (!content) {
      return NextResponse.json({ success: false, error: lastErr?.message || 'OpenRouter returned no content' }, { status: 502 })
    }

    return NextResponse.json({ success: true, response: content })
  } catch (error: any) {
    const msg = error?.message || 'Extract chat failed'
    return NextResponse.json({ success: false, error: msg }, { status: msg.toLowerCase().includes('auth') ? 401 : 500 })
  }
}
