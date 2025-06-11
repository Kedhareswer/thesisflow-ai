import { NextResponse } from "next/server"
import axios from "axios"
import * as cheerio from "cheerio"

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Fetch the content from the URL
    const response = await axios.get(url)
    const html = response.data

    // Use cheerio to parse the HTML and extract text content
    const $ = cheerio.load(html)
    
    // Remove script, style elements and comments
    $("script, style, comment").remove()
    
    // Extract title
    const title = $("title").text().trim() || "Untitled Document"
    
    // Extract main content - focus on article, main, or body content
    // This is a simple extraction and might need refinement for specific sites
    let content = ""
    
    // Try to find the main content container
    const mainSelectors = [
      "article", "main", ".article", ".content", ".post", 
      "[role='main']", "#content", ".paper", ".research-paper"
    ]
    
    let mainContent = ""
    for (const selector of mainSelectors) {
      const element = $(selector)
      if (element.length > 0) {
        mainContent = element.text().trim()
        break
      }
    }
    
    // If no main content found, use body text
    if (!mainContent) {
      mainContent = $("body").text().trim()
    }
    
    // Clean up the text
    content = mainContent
      .replace(/\s+/g, " ")  // Replace multiple whitespace with single space
      .replace(/\n+/g, "\n") // Replace multiple newlines with single newline
      .trim()
    
    return NextResponse.json({ 
      title, 
      content,
      url
    })
  } catch (error) {
    console.error("Error fetching URL:", error)
    return NextResponse.json(
      { error: "Failed to fetch or process URL content" }, 
      { status: 500 }
    )
  }
}
