import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text provided" }, { status: 400 })
    }

    // Simulate humanization logic
    // In a real application, this would call an external humanization API
    const humanizedText =
      text
        .replace(/AI-generated/g, "carefully crafted")
        .replace(/utilize/g, "use")
        .replace(/furthermore/g, "also")
        .replace(/however/g, "but")
        .replace(/therefore/g, "so") + "\n\n(Humanized for better flow and natural language.)"

    return NextResponse.json({
      humanized_text: humanizedText,
      message: "Text humanized successfully.",
    })
  } catch (error) {
    console.error("Humanize API error:", error)
    return NextResponse.json({ error: "Failed to humanize text" }, { status: 500 })
  }
}
