import { NextResponse } from "next/server"

// Dynamically import cheerio to handle potential build issues
const getCheerio = async () => {
  try {
    const cheerio = await import('cheerio')
    return cheerio
  } catch (error) {
    throw new Error('Cheerio library not available. Using fallback text extraction.')
  }
}

interface ContentExtractionResult {
  content: string
  title?: string
  description?: string
  author?: string
  publishedDate?: string
  wordCount: number
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ 
        error: "URL is required",
        action: "Please provide a valid URL to extract content from"
      }, { status: 400 })
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ 
        error: "Invalid URL format",
        action: "Please check the URL format. Make sure it includes http:// or https://"
      }, { status: 400 })
    }

    // Security check - only allow http/https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ 
        error: "Unsupported URL protocol",
        action: "Only HTTP and HTTPS URLs are supported for security reasons"
      }, { status: 400 })
    }

    // Fetch content from URL with timeout and proper headers
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // Increased to 15 seconds

    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ResearchHub/1.0; Content Extractor)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: controller.signal,
      })
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json({ 
          error: "Request timeout",
          action: "The website took too long to respond. Try again or check if the URL is accessible."
        }, { status: 408 })
      }
      return NextResponse.json({ 
        error: "Failed to fetch URL",
        action: "Please check if the URL is accessible and try again. Some websites may block automated requests.",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      const statusMessages: { [key: number]: { error: string; action: string } } = {
        404: { 
          error: "Page not found", 
          action: "Please check if the URL is correct and the page exists" 
        },
        403: { 
          error: "Access forbidden", 
          action: "This website doesn't allow automated access. Try copying the content manually." 
        },
        401: { 
          error: "Authentication required", 
          action: "This page requires login. Please access it directly and copy the content." 
        },
        500: { 
          error: "Server error", 
          action: "The website is experiencing issues. Please try again later." 
        }
      }
      
      const statusInfo = statusMessages[response.status] || {
        error: `HTTP ${response.status}: ${response.statusText}`,
        action: "Please check the URL and try again"
      }
      
      return NextResponse.json(statusInfo, { status: response.status })
    }

    // Check content type
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xml')) {
      return NextResponse.json({ 
        error: "Unsupported content type",
        action: `This URL contains ${contentType} which cannot be processed. Please provide a web page URL.`
      }, { status: 400 })
    }

    const html = await response.text()

    // Enhanced content extraction using Cheerio
    const extractionResult = await extractContentWithCheerio(html, url)

    if (!extractionResult.content || extractionResult.content.length < 100) {
      return NextResponse.json({ 
        error: "Could not extract meaningful content from URL",
        action: "The page may be dynamically generated or protected. Try copying the content manually or check if the page loads properly in a browser."
      }, { status: 400 })
    }

    return NextResponse.json({
      content: extractionResult.content,
      title: extractionResult.title,
      description: extractionResult.description,
      author: extractionResult.author,
      publishedDate: extractionResult.publishedDate,
      url: url,
      wordCount: extractionResult.wordCount,
      length: extractionResult.content.length,
    })
  } catch (error) {
    console.error("Error fetching URL:", error)
    return NextResponse.json({
      error: "Failed to fetch URL content",
      action: "An unexpected error occurred. Please try again or contact support if the issue persists.",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

async function extractContentWithCheerio(html: string, url: string): Promise<ContentExtractionResult> {
  try {
    const cheerio = await getCheerio()
    const $ = cheerio.load(html)
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .navigation, .nav, .menu, .sidebar, .ads, .advertisement, .social-share, .comments, .related-posts').remove()
    
    // Extract metadata
    const title = $('title').text() || 
                  $('h1').first().text() || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="title"]').attr('content') || ''
    
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || ''
    
    const author = $('meta[name="author"]').attr('content') || 
                  $('meta[property="article:author"]').attr('content') ||
                  $('.author').first().text() || ''
    
    const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
                         $('meta[name="publish_date"]').attr('content') ||
                         $('time[datetime]').attr('datetime') || ''

    // Try different content extraction strategies
    let content = ''
    
    // Strategy 1: Look for common article containers
    const articleSelectors = [
      'article',
      '.article-content',
      '.post-content', 
      '.entry-content',
      '.content',
      '.article-body',
      '.story-body',
      '.post-body',
      'main',
      '[role="main"]'
    ]
    
    for (const selector of articleSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        content = element.text().trim()
        if (content.length > 200) break
      }
    }
    
    // Strategy 2: If no good content found, try paragraph extraction
    if (content.length < 200) {
      const paragraphs = $('p').map((_: any, el: any) => $(el).text().trim()).get()
      content = paragraphs.filter((p: string) => p.length > 50).join('\n\n')
    }
    
    // Strategy 3: Fallback to body content with better cleaning
    if (content.length < 200) {
      content = $('body').text()
    }
    
    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n')  // Clean up multiple newlines
      .trim()
    
    // Limit content length (increased from 10KB to 50KB)
    if (content.length > 50000) {
      content = content.substring(0, 50000) + '\n\n[Content truncated due to length...]'
    }
    
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
    
    return {
      content,
      title: title.trim(),
      description: description.trim(),
      author: author.trim(),
      publishedDate: publishedDate.trim(),
      wordCount
    }
  } catch (error) {
    // Fallback to basic text extraction if cheerio fails
    return extractTextFromHTML(html)
  }
}

function extractTextFromHTML(html: string): ContentExtractionResult {
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
  if (text.length > 50000) {
    text = text.substring(0, 50000) + '\n\n[Content truncated due to length...]'
  }

  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length

  return {
    content: text,
    wordCount,
    title: '',
    description: '',
    author: '',
    publishedDate: ''
  }
}
