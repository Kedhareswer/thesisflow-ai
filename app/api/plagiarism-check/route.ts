import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text provided" }, { status: 400 })
    }

    // Simulate plagiarism check logic
    // In a real application, this would call an external plagiarism API
    const plagiarismPercentage = Math.random() * 30 // Simulate 0-30% plagiarism
    const sources = []
    let message = ""

    if (plagiarismPercentage > 15) {
      sources.push(
        { url: "https://example.com/source1", match: "This is a simulated matching phrase." },
        { url: "https://anothersite.org/article", match: "Another example of matched content." },
      )
      message = `Potential plagiarism detected: ${plagiarismPercentage.toFixed(2)}% match found.`
    } else {
      message = `No significant plagiarism detected. Plagiarism score: ${plagiarismPercentage.toFixed(2)}%.`
    }

    return NextResponse.json({
      plagiarism_percentage: Number.parseFloat(plagiarismPercentage.toFixed(2)),
      sources,
      message,
    })
  } catch (error) {
    console.error("Plagiarism check API error:", error)
    return NextResponse.json({ error: "Failed to perform plagiarism check" }, { status: 500 })
  }
}
