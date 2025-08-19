import { NextResponse } from "next/server"
import { InferenceClient } from "@huggingface/inference"

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text provided" }, { status: 400 })
    }

    // Perform AI content detection using Hugging Face Inference API
    const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY)
    const inferenceResult = await hf.textClassification({
      model: "roberta-base-openai-detector",
      inputs: text,
    })

    // Expected format: [{ label: "GPT-2", score: 0.87 }, ...]
    const top = inferenceResult?.[0]
    const is_ai = top?.label.toLowerCase().includes("gpt")
    const ai_probability = top ? Number.parseFloat((top.score * 100).toFixed(2)) : 0

    const message = is_ai
      ? `AI content detected with ${ai_probability}% probability.`
      : `Human-written content detected with ${100 - ai_probability}% probability.`

    return NextResponse.json({ is_ai, ai_probability, message })
  } catch (error) {
    console.error("Error in AI detect API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
