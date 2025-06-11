import { NextResponse } from "next/server"

type Provider = {
  name: string
  envKey: string
  apiUrl: (model: string) => string
  headers: (apiKey: string) => Record<string, string>
  body: (prompt: string, model: string) => any
  extractContent: (data: any) => string
  defaultModel: string
}

const providers: Provider[] = [
  // OpenAI provider
  {
    name: "openai",
    envKey: "OPENAI_API_KEY",
    apiUrl: () => "https://api.openai.com/v1/chat/completions",
    headers: (apiKey) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    body: (prompt, model) => ({
      model: model || "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || "No content generated.",
    defaultModel: "gpt-3.5-turbo",
  },
  // Gemini provider
  {
    name: "gemini",
    envKey: "GEMINI_API_KEY",
    apiUrl: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    headers: () => ({
      "Content-Type": "application/json",
    }),
    body: (prompt) => ({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topK: 40,
        topP: 0.8,
      },
    }),
    extractContent: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text || "No content generated.",
    defaultModel: "gemini-2.0-flash",
  },
  // Groq provider
  {
    name: "groq",
    envKey: "GROQ_API_KEY",
    apiUrl: () => "https://api.groq.com/openai/v1/chat/completions",
    headers: (apiKey) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    body: (prompt, model) => ({
      model: model || "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || "No content generated.",
    defaultModel: "llama3-8b-8192",
  },
  // Add more providers as needed
]

export async function POST(request: Request) {
  try {
    const { prompt, provider: requestedProvider, model: requestedModel } = await request.json()

    // Debug: Log all environment variables related to API keys
    console.log("Environment variables check:")
    console.log("OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY)
    console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY)
    console.log("GROQ_API_KEY present:", !!process.env.GROQ_API_KEY)

    // Hardcoded GROQ API key from .env file
    const groqApiKey = "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"
    console.log("Using hardcoded GROQ API key")
    
    // Use GROQ provider directly
    const selectedProvider = providers.find(p => p.name === 'groq')
    if (!selectedProvider) {
      return NextResponse.json({ error: "GROQ provider not found in configuration" }, { status: 500 })
    }
    
    const model = requestedModel || selectedProvider.defaultModel
    console.log(`Using AI provider: groq with model: ${model}`)
    
    // Override the apiUrl and headers functions to use our hardcoded key
    const apiUrl = selectedProvider.apiUrl(model)
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqApiKey}`
    }

    const response = await fetch(
      apiUrl,
      {
        method: "POST",
        headers: headers,
        body: JSON.stringify(selectedProvider.body(prompt, model)),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`${selectedProvider.name} API error:`, errorData)
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`)
    }

    const data = await response.json()
    const content = selectedProvider.extractContent(data)

    return NextResponse.json({
      content,
      model,
      provider: selectedProvider.name,
      usage: data.usage || data.usageMetadata || {},
    })
  } catch (error) {
    console.error("Error in AI generate API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate content" },
      { status: 500 },
    )
  }
}
