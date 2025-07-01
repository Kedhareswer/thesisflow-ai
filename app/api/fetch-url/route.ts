import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Fetch content from URL with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "ResearchHub/1.0 (Content Extractor)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()

    // Basic HTML content extraction
    const textContent = extractTextFromHTML(html)

    if (!textContent || textContent.length < 100) {
      return NextResponse.json({ error: "Could not extract meaningful content from URL" }, { status: 400 })
    }

    return NextResponse.json({
      content: textContent,
      url: url,
      length: textContent.length,
    })
  } catch (error) {
    console.error("Error fetching URL:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch URL content",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

function extractTextFromHTML(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, " ")

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ")
  text = text.replace(/&amp;/g, "&")
  text = text.replace(/&lt;/g, "<")
  text = text.replace(/&gt;/g, ">")
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim()

  // Limit length to prevent huge responses
  return text.length > 10000 ? text.substring(0, 10000) + "..." : text
}
