import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Gemini API key is not configured')
    }

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

    const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topK: 40,
          topP: 0.8,
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gemini API Error:', errorData)
      throw new Error(errorData.error?.message || 'Failed to generate response')
    }

    const data = await response.json()
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API')
    }

    const result = data.candidates[0].content.parts[0].text

    // Clean and format the response
    const cleanedResponse = result
      .trim()
      .replace(/^(AI Assistant:|Assistant:|Bot:)/i, '')
      .trim()

    return NextResponse.json({ response: cleanedResponse })
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process chat message' },
      { status: 500 }
    )
  }
} 