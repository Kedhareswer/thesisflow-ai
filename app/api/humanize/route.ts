import { type NextRequest, NextResponse } from "next/server"

/**
 * API route for humanizing text
 * POST /api/humanize
 * Body: { text: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text } = body

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Simulate humanization logic
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate network delay

    // Simple mock humanization: add some common phrases, vary sentence structure
    let humanizedText = text
    humanizedText = humanizedText.replace(/In conclusion,/, "To sum up,")
    humanizedText = humanizedText.replace(/Furthermore,/, "What's more,")
    humanizedText = humanizedText.replace(/However,/, "But,")
    humanizedText = humanizedText.replace(/Therefore,/, "So,")
    humanizedText = humanizedText.replace(/It is important to note that/, "Keep in mind that")
    humanizedText = humanizedText.replace(/This study demonstrates/, "We found that")
    humanizedText = humanizedText.replace(/The implications are significant/, "This means a lot")

    // Add some conversational filler
    const fillers = ["You know,", "I think,", "Actually,", "It's interesting to note that,"]
    const sentences = humanizedText.split(/(?<=[.!?])\s+/)
    const humanizedSentences = sentences.map((s, i) => {
      if (i % 3 === 0 && i > 0) {
        return fillers[Math.floor(Math.random() * fillers.length)] + " " + s.charAt(0).toLowerCase() + s.slice(1)
      }
      return s
    })
    humanizedText = humanizedSentences.join(" ")

    return NextResponse.json({
      original_text: text,
      humanized_text: humanizedText,
      message: "Text humanized successfully.",
    })
  } catch (error) {
    console.error("Error in humanize API:", error)
    return NextResponse.json({ error: "Failed to humanize text" }, { status: 500 })
  }
}
