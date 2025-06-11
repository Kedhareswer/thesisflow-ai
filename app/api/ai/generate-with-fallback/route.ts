import { NextResponse } from "next/server"
import type { AIProvider } from "@/lib/ai-providers"

export async function POST(request: Request) {
  try {
    const { prompt, preferredProviders } = await request.json()

    // Try each provider in sequence
    for (const provider of preferredProviders) {
      try {
        const result = await generateWithProvider(prompt, provider)
        return NextResponse.json(result)
      } catch (error) {
        console.warn(`Provider ${provider} failed, trying next...`)
        continue
      }
    }

    return NextResponse.json({ error: "All AI providers failed" }, { status: 500 })
  } catch (error) {
    console.error("Error in AI generate-with-fallback API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate content" },
      { status: 500 },
    )
  }
}

async function generateWithProvider(prompt: string, provider: AIProvider, model?: string) {
  switch (provider) {
    case "gemini":
      return await generateWithGemini(prompt, model)
    case "openai":
      return await generateWithOpenAI(prompt, model)
    case "groq":
      return await generateWithGroq(prompt, model)
    case "aiml":
      return await generateWithAIML(prompt, model)
    case "deepinfra":
      return await generateWithDeepInfra(prompt, model)
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

async function generateWithGemini(prompt: string, model = "gemini-2.0-flash") {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("Gemini API key not configured")

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topK: 40,
          topP: 0.8,
        },
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  return {
    content: data.candidates[0].content.parts[0].text,
    provider: "gemini",
    model,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
  }
}

async function generateWithOpenAI(prompt: string, model = "gpt-3.5-turbo") {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OpenAI API key not configured")

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0].message.content,
    provider: "openai",
    model,
    usage: data.usage,
  }
}

async function generateWithGroq(prompt: string, model = "llama-3.1-70b-versatile") {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("Groq API key not configured")

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0].message.content,
    provider: "groq",
    model,
    usage: data.usage,
  }
}

async function generateWithAIML(prompt: string, model = "gpt-4o") {
  const apiKey = process.env.AIML_API_KEY
  if (!apiKey) throw new Error("AIML API key not configured")

  const response = await fetch("https://api.aimlapi.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`AIML API error: ${response.status}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0].message.content,
    provider: "aiml",
    model,
    usage: data.usage,
  }
}

async function generateWithDeepInfra(prompt: string, model = "meta-llama/Meta-Llama-3.1-70B-Instruct") {
  const apiKey = process.env.DEEPINFRA_API_KEY
  if (!apiKey) throw new Error("DeepInfra API key not configured")

  const response = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`DeepInfra API error: ${response.status}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0].message.content,
    provider: "deepinfra",
    model,
    usage: data.usage,
  }
}
