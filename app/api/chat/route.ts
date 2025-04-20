import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const prompt = `You are an intelligent and helpful AI research assistant in a team chat environment. Your role is to:

1. Answer questions directly and concisely while being friendly and professional
2. If asked about locations or places, provide accurate geographical and historical information
3. For research-related queries, provide well-structured, academically-sound responses
4. Help with brainstorming and ideation when requested
5. Assist with technical explanations and coding questions
6. If asked about documents or literature, provide analytical insights and summaries
7. When the query is unclear, ask for clarification while maintaining a helpful tone

Current user query: ${message}

Please provide a helpful, relevant, and well-structured response.`

    const result = await model.generateContent(prompt)
    const response = await result.response.text()

    // Clean and format the response
    const cleanedResponse = response
      .trim()
      .replace(/^(AI Assistant:|Assistant:|Bot:)/i, '')
      .trim()

    return NextResponse.json({ response: cleanedResponse })
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
} 