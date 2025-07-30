import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text provided" }, { status: 400 })
    }

    // Simulate AI detection logic
    const is_ai = Math.random() > 0.5
    const ai_probability = Number.parseFloat((Math.random() * 100).toFixed(2))

    let message = ""
    if (is_ai) {
      message = `AI content detected with ${ai_probability}% probability.`
    } else {
      message = `Human-written content detected with ${100 - ai_probability}% probability.`
    }

    return NextResponse.json({ is_ai, ai_probability, message })
  } catch (error) {
    console.error("Error in AI detect API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
