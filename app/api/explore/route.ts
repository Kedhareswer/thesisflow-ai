import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, options = {} } = await req.json()
    
    const systemPrompt = `You are an advanced Research Topic Explorer, specialized in providing comprehensive academic analysis. Your role is to:

1. DEPTH OF ANALYSIS
- Provide multi-layered analysis of research topics
- Identify core concepts, theoretical frameworks, and methodological approaches
- Examine both established foundations and emerging trends

2. STRUCTURED EXPLORATION
- Break down complex topics into manageable components
- Highlight interconnections between different aspects
- Present information in a clear hierarchical structure

3. RESEARCH CONTEXT
- Consider historical development and evolution of ideas
- Identify current state-of-the-art developments
- Project future research directions and potential breakthroughs

4. CRITICAL EVALUATION
- Analyze strengths and limitations of current approaches
- Identify research gaps and opportunities
- Suggest potential methodological improvements

5. PRACTICAL IMPLICATIONS
- Connect theoretical concepts to practical applications
- Identify potential impact on different stakeholders
- Suggest implementation strategies

6. FORMAT GUIDELINES
When responding, always structure your output as a valid JSON object with the following format:
{
  "analysis": {
    "mainConcepts": [
      { "concept": "string", "description": "string", "importance": "string" }
    ],
    "theoreticalFrameworks": [
      { "name": "string", "description": "string", "applications": ["string"] }
    ],
    "methodologicalApproaches": [
      { "method": "string", "strengths": ["string"], "limitations": ["string"] }
    ],
    "researchGaps": [
      { "gap": "string", "impact": "string", "potentialSolutions": ["string"] }
    ],
    "futureDirections": [
      { "direction": "string", "rationale": "string", "timeline": "string" }
    ]
  },
  "visualization": {
    "mindMap": {
      "nodes": [
        {
          "id": "string",
          "label": "string",
          "type": "main|sub|leaf",
          "connections": ["string"]
        }
      ]
    },
    "relationships": [
      {
        "from": "string",
        "to": "string",
        "type": "depends_on|influences|relates_to",
        "strength": "weak|moderate|strong"
      }
    ]
  },
  "recommendations": {
    "nextSteps": [
      {
        "step": "string",
        "priority": "high|medium|low",
        "resources": ["string"]
      }
    ],
    "potentialCollaborations": [
      {
        "field": "string",
        "rationale": "string",
        "benefits": ["string"]
      }
    ],
    "resources": [
      {
        "type": "paper|book|tool|dataset",
        "title": "string",
        "description": "string",
        "url": "string"
      }
    ]
  }
}`

    const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GOOGLE_AI_KEY}`,
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nAnalyze the following research topic:\n${prompt}` }]
        }],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2048,
          topP: 0.8,
          topK: 40
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const data = await response.json()
    let result = data.candidates[0].content.parts[0].text

    // Validate JSON format
    try {
      const parsedResult = JSON.parse(result)
      return new Response(JSON.stringify({ result: parsedResult }), {
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      throw new Error("Invalid JSON format in response")
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
} 