import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function POST(request: NextRequest) {
  try {
    const { prompt, options } = await request.json()

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Gemini API key is not configured')
    }

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    console.log('Sending request to Gemini API with prompt:', prompt)

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
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 2048,
          topK: options?.topK || 40,
          topP: options?.topP || 0.8,
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gemini API Error:', errorData)
      throw new Error(errorData.error?.message || 'Failed to generate content')
    }

    const data = await response.json()
    console.log('Received response from Gemini API:', data)
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API')
    }

    const result = data.candidates[0].content.parts[0].text

    // Clean and format the response
    const cleanedResponse = result
      .trim()
      .replace(/^```markdown|```$/g, '')
      .trim()

    console.log('Cleaned response:', cleanedResponse)

    return NextResponse.json({ result: cleanedResponse })
  } catch (error) {
    console.error('Error in explore API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process exploration request' },
      { status: 500 }
    )
  }
} 