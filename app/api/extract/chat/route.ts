import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'

// Server-side Nova AI functionality using hardcoded Groq API (same as topics report)
async function callNovaAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY
  const dataExtractionModel = process.env.DATA_EXTRACTION_MODEL || 'groq/compound-mini'

  if (!groqApiKey) {
    throw new Error('Groq API key not configured. Please set GROQ_API_KEY environment variable.')
  }

  try {
    console.log('[Extract Chat] Making request to Groq API with model:', dataExtractionModel)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: dataExtractionModel,
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Groq API error:', response.status, errorData)
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const aiContent = data.choices?.[0]?.message?.content || 'No response generated'
    console.log('[Extract Chat] Success! Generated', aiContent.length, 'characters')
    return aiContent
  } catch (error) {
    console.error('Nova AI error:', error)
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user (optional - extract chat works for all users)
    let userId = 'anonymous'
    try {
      const auth = await requireAuth(request)
      if (auth.success) {
        userId = auth.userId || 'authenticated'
      }
    } catch (e) {
      // If auth fails, continue as anonymous user
      console.log('[Extract Chat] Proceeding without authentication')
    }

    const { message, context } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 })
    }

    // Check if Groq API key is configured
    const groqApiKey = process.env.GROQ_API_KEY
    console.log('[Extract Chat] Groq API Key configured:', !!groqApiKey)
    if (!groqApiKey) {
      console.error('[Extract Chat] No Groq API key found')
      return NextResponse.json({ success: false, error: 'Nova AI not configured. Please set GROQ_API_KEY environment variable.' }, { status: 500 })
    }

    const systemPrompt = [
      'You are Nova, a specialized research collaboration assistant for academic teams and research hubs.',
      'You are helping with document extraction, data analysis, and Q&A tasks.',
      '',
      '**Your Capabilities:**',
      '- Answer questions strictly using the provided document context',
      '- Extract and analyze data from tables, equations, and structured content',
      '- Provide summaries, key findings, and insights from research papers',
      '- Explain complex mathematical concepts and statistical results',
      '- Identify methodologies, limitations, and contributions',
      '',
      '**Rules:**',
      '- If the answer is not in the context, clearly state you do not know',
      '- Be concise, factual, and avoid speculation',
      '- Use markdown formatting: lists, tables, bold, code blocks when helpful',
      '- Preserve equations, units, and citations exactly as written',
      '- Do not fabricate references, data, or findings',
      '- Maintain a professional, scholarly tone appropriate for academic discourse',
      '',
      '**Response Format:**',
      '- For summaries: Provide structured overview with key points',
      '- For data questions: Present findings clearly with supporting context',
      '- For methodologies: Explain approaches and techniques used',
      '- For math/tables: Break down complex information step-by-step',
    ].join('\n')

    const safeContext = (context || '').slice(0, 8000)
    const userPrompt = [
      safeContext ? `Document Context (truncated):\n${safeContext}` : 'Document Context: (none provided)',
      '',
      `User Question: ${message.trim()}`,
    ].join('\n')

    try {
      const content = await callNovaAI(systemPrompt, userPrompt)
      return NextResponse.json({ success: true, response: content })
    } catch (error: any) {
      console.error('[Extract Chat] Nova AI failed:', error)
      return NextResponse.json({ success: false, error: error.message || 'AI generation failed' }, { status: 502 })
    }

  } catch (error: any) {
    const msg = error?.message || 'Extract chat failed'
    console.error('[Extract Chat] Error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: msg.toLowerCase().includes('auth') ? 401 : 500 })
  }
}
