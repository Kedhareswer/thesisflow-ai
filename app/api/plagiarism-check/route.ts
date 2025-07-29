import { type NextRequest, NextResponse } from "next/server"

/**
 * API route for plagiarism checking
 * POST /api/plagiarism-check
 * Body: { text: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text } = body

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Simulate plagiarism checking logic
    await new Promise((resolve) => setTimeout(resolve, 2500)) // Simulate network delay

    let plagiarismPercentage = 0
    const sources = []

    // Simple mock logic:
    // If text contains specific keywords, simulate plagiarism
    if (text.toLowerCase().includes("lorem ipsum")) {
      plagiarismPercentage = 75
      sources.push({
        url: "https://www.lipsum.com/",
        match: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      })
    }
    if (text.toLowerCase().includes("to be or not to be")) {
      plagiarismPercentage = Math.max(plagiarismPercentage, 90)
      sources.push({
        url: "https://en.wikipedia.org/wiki/To_be,_or_not_to_be",
        match: "To be, or not to be: that is the question.",
      })
    }
    if (text.toLowerCase().includes("all animals are equal")) {
      plagiarismPercentage = Math.max(plagiarismPercentage, 85)
      sources.push({
        url: "https://en.wikipedia.org/wiki/Animal_Farm",
        match: "All animals are equal, but some animals are more equal than others.",
      })
    }

    // Add some random variation if no specific matches
    if (sources.length === 0) {
      plagiarismPercentage = Math.floor(Math.random() * 15) // 0-14% for original text
    } else {
      // If there are sources, ensure percentage is high enough
      plagiarismPercentage = Math.max(plagiarismPercentage, 50 + Math.floor(Math.random() * 20)) // 50-70%
    }

    return NextResponse.json({
      plagiarism_percentage: plagiarismPercentage,
      sources: sources,
      message: sources.length > 0 ? "Potential plagiarism detected." : "No significant plagiarism detected.",
    })
  } catch (error) {
    console.error("Error in plagiarism check API:", error)
    return NextResponse.json({ error: "Failed to perform plagiarism check" }, { status: 500 })
  }
}
