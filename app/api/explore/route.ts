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

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
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

      clearTimeout(timeoutId)
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
      clearTimeout(timeoutId)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out after 30 seconds')
        }
        throw error
      }
      throw new Error('An unexpected error occurred')
    }
  } catch (error: unknown) {
    console.error('Error in explore API:', error)
    let errorMessage = 'Failed to process exploration request'
    
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = String(error.message)
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}