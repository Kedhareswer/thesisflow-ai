import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt, options } = await request.json();
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: options?.temperature || 0.7,
            maxOutputTokens: options?.maxTokens || 4096,
            topK: options?.topK || 40,
            topP: options?.topP || 0.8,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!result) {
      throw new Error('No content generated from the API');
    }

    if (prompt.includes('JSON format')) {
      try {
        const cleanedResult = result
          .replace(/```json|```/g, '')
          .trim();
        
        const parsedResult = JSON.parse(cleanedResult);
        return NextResponse.json({ result: JSON.stringify(parsedResult) });
      } catch (parseError) {
        console.error('Error parsing JSON result:', parseError);
        throw new Error('Invalid JSON format in response');
      }
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error in explore route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to explore research topic' },
      { status: 500 }
    );
  }
} 