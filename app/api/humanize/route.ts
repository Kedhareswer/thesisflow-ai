import { NextResponse } from "next/server"

export const runtime = "edge" // Use the edge runtime for humanization

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text provided" }, { status: 400 })
    }

    // Simulate humanization logic
    // A very basic example: replace some common AI-like phrases or simplify complex sentences
    let humanized_text = text
      .replace(/utilize/g, "use")
      .replace(/leverage/g, "use")
      .replace(/paradigm/g, "approach")
      .replace(/synergy/g, "cooperation")
      .replace(/delve into/g, "explore")
      .replace(/furthermore/g, "also")
      .replace(/however/g, "but")
      .replace(/therefore/g, "so")
      .replace(/in order to/g, "to")
      .replace(/It is important to note that/g, "Note that")
      .replace(/This highlights the fact that/g, "This shows that")

    // Add some random human-like imperfections or variations
    const humanTouches = ["You know,", "I think it's fair to say,", "To be honest,", "It's kind of like,", "Basically,"]
    const sentences = humanized_text.split(/(?<=[.!?])\s+/)
    if (sentences.length > 1) {
      const randomIndex = Math.floor(Math.random() * sentences.length)
      sentences[randomIndex] =
        humanTouches[Math.floor(Math.random() * humanTouches.length)] + " " + sentences[randomIndex]
    }
    humanized_text = sentences.join(" ")

    return NextResponse.json({ humanized_text })
  } catch (error) {
    console.error("Error in humanize API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
