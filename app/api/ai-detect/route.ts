import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text provided" }, { status: 400 })
    }

    // Simulate AI detection logic
    // In a real application, this would call an external AI detection API
    const aiProbability = Math.random() * 100 // Random probability
    const isAI = aiProbability > 50 // Simple threshold

    let message = ""
    if (isAI) {
      message = `This text is likely AI-generated with a probability of ${aiProbability.toFixed(2)}%.`
    } else {
      message = `This text appears human-written with a probability of ${(100 - aiProbability).toFixed(2)}%.`
    }

    return NextResponse.json({
      is_ai: isAI,
      ai_probability: Number.parseFloat(aiProbability.toFixed(2)),
      message,
    })
  } catch (error) {
    console.error("AI detection API error:", error)
    return NextResponse.json({ error: "Failed to process AI detection" }, { status: 500 })
  }
}
