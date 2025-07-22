import { NextRequest, NextResponse } from "next/server"

/**
 * API route for checking text using LanguageTool
 * This proxies requests to the LanguageTool public API
 * 
 * POST /api/language-check
 * Body: { text: string, language?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, language = "en-US" } = body

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      )
    }

    // Call LanguageTool public API
    // See https://dev.languagetool.org/public-http-api for documentation
    const response = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        text: text,
        language: language,
        enabledOnly: "false",
      }).toString(),
    })

    if (!response.ok) {
      throw new Error(`LanguageTool API error: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error calling LanguageTool API:", error)
    return NextResponse.json(
      { error: "Failed to check text" },
      { status: 500 }
    )
  }
}
