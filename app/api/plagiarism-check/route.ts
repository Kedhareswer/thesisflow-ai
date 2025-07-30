import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text provided" }, { status: 400 })
    }

    // Simulate plagiarism check logic
    const plagiarism_percentage = Number.parseFloat((Math.random() * 30).toFixed(2)) // 0-30% for simulation
    const detected = plagiarism_percentage > 10 // Consider >10% as detected

    let message = ""
    const sources: { url: string; match: string }[] = []

    if (detected) {
      message = `Plagiarism detected: ${plagiarism_percentage}% match found.`
      // Simulate some sources
      if (plagiarism_percentage > 15) {
        sources.push({
          url: "https://example.com/source1",
          match: "This is a simulated matching phrase from an external source.",
        })
      }
      if (plagiarism_percentage > 25) {
        sources.push({
          url: "https://example.org/source2",
          match: "Another example of a phrase that might be flagged.",
        })
      }
    } else {
      message = `No significant plagiarism detected. (${plagiarism_percentage}% match)`
    }

    return NextResponse.json({ plagiarism_percentage, detected, message, sources })
  } catch (error) {
    console.error("Error in plagiarism check API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
