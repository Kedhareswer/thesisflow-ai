import { NextResponse } from "next/server"
import { ErrorHandler } from '@/lib/utils/error-handler'

// Dynamically import cheerio to handle potential build issues
const getCheerio = async () => {
  try {
    const cheerio = await import('cheerio')
    return cheerio
  } catch (error) {
    throw new Error('Cheerio library not available. Using fallback text extraction.')
  }
}

// Enhanced URL validation patterns
const BLOCKED_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'linkedin.com', 'tiktok.com', 'snapchat.com'
]

const DYNAMIC_CONTENT_INDICATORS = [
  'javascript:', 'data:', 'blob:', '#', 'angular', 'react', 'vue'
]

// Common paywall/subscription indicators
const PAYWALL_INDICATORS = [
  'paywall', 'subscription', 'premium', 'subscriber', 'login-required',
  'register', 'sign-up', 'member-only', 'access-denied'
]

interface ContentExtractionResult {
  content: string
  title?: string
  description?: string
  author?: string
  publishedDate?: string
  wordCount: number
}

export async function POST(request: Request) {
  let url: string | undefined
  try {
    const requestBody = await request.json()
    url = requestBody.url

    if (!url) {
      const validationError = ErrorHandler.processError(
        "URL is required and cannot be empty",
        {
          operation: 'url-extraction-validation'
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      const validationError = ErrorHandler.processError(
        "Invalid URL format",
        {
          operation: 'url-extraction-validation',
          url
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }

    // Security check - only allow http/https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      const validationError = ErrorHandler.processError(
        "Unsupported URL protocol - only HTTP and HTTPS are supported",
        {
          operation: 'url-extraction-validation',
          url
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }

    // Check for blocked domains (social media, etc.)
    const hostname = parsedUrl.hostname.toLowerCase()
    const isBlockedDomain = BLOCKED_DOMAINS.some(domain =>
      hostname.includes(domain) || hostname.endsWith(domain)
    )

    if (isBlockedDomain) {
      const blockedError = ErrorHandler.processError(
        `Content extraction from ${hostname} is not supported due to access restrictions`,
        {
          operation: 'url-extraction-validation',
          url
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(blockedError),
        { status: 400 }
      )
    }

    // Check for dynamic content indicators
    const hasDynamicContent = DYNAMIC_CONTENT_INDICATORS.some(indicator =>
      parsedUrl.href.toLowerCase().includes(indicator)
    )

    if (hasDynamicContent) {
      const dynamicError = ErrorHandler.processError(
        "This URL appears to contain dynamic content that may not extract properly",
        {
          operation: 'url-extraction-validation',
          url
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(dynamicError),
        { status: 400 }
      )
    }

    // Enhanced fetch with multiple retry strategies
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // Increased to 20 seconds

    let response: Response
    let lastError: unknown

    // Try multiple user agents for better compatibility
    const userAgents = [
      "Mozilla/5.0 (compatible; ResearchHub/1.0; Content Extractor)",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]

    for (let attempt = 0; attempt < userAgents.length; attempt++) {
      try {
        response = await fetch(url, {
          headers: {
            "User-Agent": userAgents[attempt],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Cache-Control": "no-cache"
          },
          signal: controller.signal,
          redirect: 'follow',
          referrerPolicy: 'no-referrer-when-downgrade'
        })

        // If we get a successful response, break out of the retry loop
        if (response.ok) {
          break
        }

        // Store the response for potential error handling
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)

        // If it's the last attempt or a non-retryable error, don't continue
        if (attempt === userAgents.length - 1 || response.status < 500) {
          break
        }

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        lastError = error

        // If it's the last attempt, we'll handle the error below
        if (attempt === userAgents.length - 1) {
          break
        }

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    clearTimeout(timeoutId)

    // Handle fetch errors
    if (!response! || lastError) {
      const networkError = ErrorHandler.processError(lastError || 'Failed to fetch URL', {
        operation: 'url-extraction-fetch',
        url
      })

      let statusCode = 500
      if (lastError instanceof Error && lastError.name === 'AbortError') {
        statusCode = 408
      }

      return NextResponse.json(
        ErrorHandler.formatErrorResponse(networkError),
        { status: statusCode }
      )
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      // Enhanced error handling for specific HTTP status codes
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let specificGuidance = false

      switch (response.status) {
        case 403:
          errorMessage = "Access forbidden - the website blocks automated content extraction"
          specificGuidance = true
          break
        case 404:
          errorMessage = "Page not found - the URL may be incorrect or the content has been moved"
          specificGuidance = true
          break
        case 429:
          errorMessage = "Too many requests - the website is rate limiting our access"
          specificGuidance = true
          break
        case 503:
          errorMessage = "Service unavailable - the website is temporarily down"
          specificGuidance = true
          break
        case 401:
          errorMessage = "Authentication required - the content may be behind a login"
          specificGuidance = true
          break
      }

      const httpError = ErrorHandler.processError(errorMessage, {
        operation: 'url-extraction-fetch',
        url
      })

      return NextResponse.json(
        ErrorHandler.formatErrorResponse(httpError),
        { status: response.status }
      )
    }

    // Enhanced content type checking
    const contentType = response.headers.get('content-type') || ''
    const contentLength = response.headers.get('content-length')

    // Check for redirects to login pages or paywalls
    const finalUrl = response.url
    if (finalUrl !== url && (
      finalUrl.includes('login') ||
      finalUrl.includes('signin') ||
      finalUrl.includes('auth') ||
      finalUrl.includes('paywall')
    )) {
      const redirectError = ErrorHandler.processError(
        "URL redirected to a login or paywall page",
        {
          operation: 'url-extraction-validation',
          url
        }
      )

      return NextResponse.json(
        ErrorHandler.formatErrorResponse(redirectError),
        { status: 400 }
      )
    }

    if (!contentType.includes('text/html') &&
      !contentType.includes('application/xml') &&
      !contentType.includes('application/xhtml')) {
      const contentTypeError = ErrorHandler.processError(
        `Unsupported content type: ${contentType}. Only HTML and XML content can be extracted.`,
        {
          operation: 'url-extraction-validation',
          url
        }
      )

      return NextResponse.json(
        ErrorHandler.formatErrorResponse(contentTypeError),
        { status: 400 }
      )
    }

    // Check content length
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      const sizeError = ErrorHandler.processError(
        "Content is too large to process (over 10MB)",
        {
          operation: 'url-extraction-validation',
          url,
          contentLength: parseInt(contentLength)
        }
      )

      return NextResponse.json(
        ErrorHandler.formatErrorResponse(sizeError),
        { status: 400 }
      )
    }

    const html = await response.text()

    // Check for paywall indicators in the HTML
    const htmlLower = html.toLowerCase()
    const hasPaywallIndicators = PAYWALL_INDICATORS.some(indicator =>
      htmlLower.includes(indicator)
    )

    if (hasPaywallIndicators) {
      const paywallError = ErrorHandler.processError(
        "This content appears to be behind a paywall or requires subscription",
        {
          operation: 'url-extraction-content',
          url
        }
      )

      return NextResponse.json(
        ErrorHandler.formatErrorResponse(paywallError),
        { status: 400 }
      )
    }

    // Enhanced content extraction using Cheerio
    const extractionResult = await extractContentWithCheerio(html, url)

    if (!extractionResult.content || extractionResult.content.length < 50) {
      const extractionError = ErrorHandler.processError(
        "Could not extract meaningful content from URL. The page may contain mostly dynamic content or be empty.",
        {
          operation: 'url-extraction-content',
          url,
          contentLength: extractionResult.content?.length || 0
        }
      )

      return NextResponse.json(
        ErrorHandler.formatErrorResponse(extractionError),
        { status: 400 }
      )
    }

    // Check content quality
    const qualityScore = assessContentQuality(extractionResult.content)
    if (qualityScore < 0.3) {
      const qualityError = ErrorHandler.processError(
        "Extracted content appears to be low quality or mostly navigation/boilerplate text",
        {
          operation: 'url-extraction-content',
          url,
          contentLength: extractionResult.content.length
        }
      )

      return NextResponse.json(
        ErrorHandler.formatErrorResponse(qualityError),
        { status: 400 }
      )
    }

    return NextResponse.json({
      content: extractionResult.content,
      title: extractionResult.title,
      description: extractionResult.description,
      author: extractionResult.author,
      publishedDate: extractionResult.publishedDate,
      url: url,
      finalUrl: response.url, // Include final URL after redirects
      wordCount: extractionResult.wordCount,
      length: extractionResult.content.length,
      contentType: contentType,
      qualityScore: qualityScore,
      extractionSuccess: true,
      // Additional metadata for better user experience
      metadata: {
        hasTitle: !!extractionResult.title,
        hasAuthor: !!extractionResult.author,
        hasDate: !!extractionResult.publishedDate,
        hasDescription: !!extractionResult.description,
        isHighQuality: qualityScore > 0.7,
        estimatedReadingTime: Math.ceil(extractionResult.wordCount / 200) // Assuming 200 WPM
      }
    })
  } catch (error) {
    console.error("Error fetching URL:", error)

    const genericError = ErrorHandler.processError(error, {
      operation: 'url-extraction',
      url: url || 'unknown'
    })

    return NextResponse.json(
      ErrorHandler.formatErrorResponse(genericError),
      { status: 500 }
    )
  }
}

async function extractContentWithCheerio(html: string, url: string): Promise<ContentExtractionResult> {
  try {
    const cheerio = await getCheerio()
    const $ = cheerio.load(html)

    // Enhanced removal of unwanted elements
    $(
      'script, style, noscript, iframe, embed, object, ' +
      'nav, header, footer, aside, ' +
      '.navigation, .nav, .menu, .sidebar, .header, .footer, ' +
      '.ads, .advertisement, .ad, .banner, ' +
      '.social-share, .social-sharing, .share-buttons, ' +
      '.comments, .comment, .related-posts, .related, ' +
      '.popup, .modal, .overlay, .cookie-notice, ' +
      '.newsletter, .subscription, .signup, ' +
      '.breadcrumb, .breadcrumbs, .tags, .tag-list, ' +
      '[class*="ad-"], [class*="ads-"], [id*="ad-"], [id*="ads-"]'
    ).remove()

    // Extract enhanced metadata
    const title = extractBestTitle($)
    const description = extractBestDescription($)
    const author = extractBestAuthor($)
    const publishedDate = extractBestDate($)

    // Enhanced content extraction with multiple strategies
    let content = ''
    let extractionMethod = 'unknown'

    // Strategy 1: JSON-LD structured data
    const jsonLdContent = extractFromJsonLd($)
    if (jsonLdContent && jsonLdContent.length > 200) {
      content = jsonLdContent
      extractionMethod = 'json-ld'
    }

    // Strategy 2: Schema.org microdata
    if (!content || content.length < 200) {
      const schemaContent = extractFromSchema($)
      if (schemaContent && schemaContent.length > 200) {
        content = schemaContent
        extractionMethod = 'schema'
      }
    }

    // Strategy 3: Common article containers (enhanced)
    if (!content || content.length < 200) {
      const articleSelectors = [
        'article[role="main"]',
        'main article',
        '[role="main"] article',
        'article',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.content-body',
        '.article-body',
        '.story-body',
        '.post-body',
        '.main-content',
        'main',
        '[role="main"]',
        '.content',
        '#content',
        '#main-content',
        '.page-content'
      ]

      for (const selector of articleSelectors) {
        const element = $(selector).first()
        if (element.length > 0) {
          // Remove nested unwanted elements
          element.find('nav, aside, .sidebar, .related, .comments').remove()
          const extractedText = element.text().trim()
          if (extractedText.length > content.length && extractedText.length > 200) {
            content = extractedText
            extractionMethod = `article-${selector}`
            break
          }
        }
      }
    }

    // Strategy 4: Enhanced paragraph extraction
    if (!content || content.length < 200) {
      const paragraphs = $('p')
        .map((_: any, el: any) => {
          const $el = $(el)
          // Skip paragraphs that are likely navigation or boilerplate
          if ($el.closest('nav, header, footer, aside, .sidebar, .menu').length > 0) {
            return null
          }
          const text = $el.text().trim()
          return text.length > 30 ? text : null
        })
        .get()
        .filter((p: string | null) => p !== null)

      if (paragraphs.length > 0) {
        content = paragraphs.join('\n\n')
        extractionMethod = 'paragraphs'
      }
    }

    // Strategy 5: Readability-style extraction
    if (!content || content.length < 200) {
      content = extractWithReadabilityHeuristics($)
      extractionMethod = 'readability'
    }

    // Strategy 6: Fallback to body content with aggressive cleaning
    if (!content || content.length < 200) {
      $('nav, header, footer, aside').remove()
      content = $('body').text()
      extractionMethod = 'body-fallback'
    }

    // Enhanced content cleaning
    content = cleanExtractedContent(content)

    // Limit content length with smart truncation
    if (content.length > 100000) {
      content = smartTruncate(content, 100000)
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
    console.warn('Cheerio extraction failed, falling back to basic HTML parsing:', error)
    return extractTextFromHTML(html)
  }
}

// Helper functions for enhanced content extraction

function extractBestTitle($: any): string {
  const titleSources = [
    () => $('meta[property="og:title"]').attr('content'),
    () => $('meta[name="twitter:title"]').attr('content'),
    () => $('meta[property="article:title"]').attr('content'),
    () => $('h1').first().text(),
    () => $('title').text(),
    () => $('.article-title, .post-title, .entry-title').first().text()
  ]

  for (const source of titleSources) {
    const title = source()?.trim()
    if (title && title.length > 0 && title.length < 200) {
      return title
    }
  }
  return ''
}

function extractBestDescription($: any): string {
  const descSources = [
    () => $('meta[name="description"]').attr('content'),
    () => $('meta[property="og:description"]').attr('content'),
    () => $('meta[name="twitter:description"]').attr('content'),
    () => $('meta[property="article:description"]').attr('content')
  ]

  for (const source of descSources) {
    const desc = source()?.trim()
    if (desc && desc.length > 0) {
      return desc
    }
  }
  return ''
}

function extractBestAuthor($: any): string {
  const authorSources = [
    () => $('meta[name="author"]').attr('content'),
    () => $('meta[property="article:author"]').attr('content'),
    () => $('meta[name="twitter:creator"]').attr('content'),
    () => $('.author, .byline, .by-author').first().text(),
    () => $('[rel="author"]').first().text()
  ]

  for (const source of authorSources) {
    const author = source()?.trim()
    if (author && author.length > 0 && author.length < 100) {
      return author
    }
  }
  return ''
}

function extractBestDate($: any): string {
  const dateSources = [
    () => $('meta[property="article:published_time"]').attr('content'),
    () => $('meta[name="publish_date"]').attr('content'),
    () => $('meta[name="date"]').attr('content'),
    () => $('time[datetime]').attr('datetime'),
    () => $('time').attr('datetime'),
    () => $('.date, .published, .publish-date').first().text()
  ]

  for (const source of dateSources) {
    const date = source()?.trim()
    if (date && date.length > 0) {
      return date
    }
  }
  return ''
}

function extractFromJsonLd($: any): string {
  try {
    const scripts = $('script[type="application/ld+json"]')
    for (let i = 0; i < scripts.length; i++) {
      const scriptContent = $(scripts[i]).html()
      if (scriptContent) {
        const jsonData = JSON.parse(scriptContent)
        const content = extractContentFromJsonLd(jsonData)
        if (content) return content
      }
    }
  } catch (error) {
    console.warn('Failed to extract JSON-LD content:', error)
  }
  return ''
}

function extractContentFromJsonLd(data: any): string {
  if (Array.isArray(data)) {
    for (const item of data) {
      const content = extractContentFromJsonLd(item)
      if (content) return content
    }
  }

  if (data && typeof data === 'object') {
    // Look for article content
    if (data['@type'] === 'Article' || data['@type'] === 'NewsArticle' || data['@type'] === 'BlogPosting') {
      return data.articleBody || data.text || data.description || ''
    }

    // Recursively search nested objects
    for (const key in data) {
      if (typeof data[key] === 'object') {
        const content = extractContentFromJsonLd(data[key])
        if (content) return content
      }
    }
  }

  return ''
}

function extractFromSchema($: any): string {
  try {
    const schemaElements = $('[itemtype*="Article"], [itemtype*="BlogPosting"], [itemtype*="NewsArticle"]')
    for (let i = 0; i < schemaElements.length; i++) {
      const element = $(schemaElements[i])
      const articleBody = element.find('[itemprop="articleBody"]').text().trim()
      if (articleBody && articleBody.length > 200) {
        return articleBody
      }
    }
  } catch (error) {
    console.warn('Failed to extract schema.org content:', error)
  }
  return ''
}

function extractWithReadabilityHeuristics($: any): string {
  // Score elements based on readability heuristics
  const candidates: Array<{ element: any, score: number }> = []

  $('div, article, section, main').each((_: any, el: any) => {
    const $el = $(el)
    let score = 0

    // Positive scoring
    const text = $el.text().trim()
    const textLength = text.length
    const paragraphCount = $el.find('p').length
    const linkDensity = $el.find('a').length / Math.max(textLength / 100, 1)

    score += Math.min(textLength / 100, 50) // Length bonus (capped)
    score += paragraphCount * 5 // Paragraph bonus
    score -= linkDensity * 10 // Link density penalty

    // Class/ID bonuses
    const classAndId = ($el.attr('class') || '') + ' ' + ($el.attr('id') || '')
    if (/article|content|post|story|main/i.test(classAndId)) score += 25
    if (/sidebar|nav|menu|footer|header/i.test(classAndId)) score -= 25

    if (score > 0 && textLength > 200) {
      candidates.push({ element: $el, score })
    }
  })

  // Return content from highest scoring element
  candidates.sort((a, b) => b.score - a.score)
  return candidates.length > 0 ? candidates[0].element.text().trim() : ''
}

function cleanExtractedContent(content: string): string {
  return content
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Clean up multiple newlines but preserve paragraph breaks
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Remove common boilerplate patterns
    .replace(/^(Home|Menu|Navigation|Skip to content|Cookie notice).*$/gim, '')
    // Remove social sharing text
    .replace(/^(Share|Tweet|Like|Follow).*$/gim, '')
    // Remove copyright notices
    .replace(/©.*?\d{4}.*$/gim, '')
    // Clean up remaining whitespace
    .trim()
}

function smartTruncate(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content

  // Try to truncate at a sentence boundary
  const truncated = content.substring(0, maxLength)
  const lastSentence = truncated.lastIndexOf('.')
  const lastParagraph = truncated.lastIndexOf('\n\n')

  let cutPoint = maxLength
  if (lastSentence > maxLength * 0.8) {
    cutPoint = lastSentence + 1
  } else if (lastParagraph > maxLength * 0.7) {
    cutPoint = lastParagraph
  }

  return content.substring(0, cutPoint) + '\n\n[Content truncated due to length...]'
}

function assessContentQuality(content: string): number {
  if (!content || content.length < 50) return 0

  let score = 0.5 // Base score

  // Length scoring (optimal around 1000-5000 chars)
  const length = content.length
  if (length > 200) score += 0.1
  if (length > 500) score += 0.1
  if (length > 1000) score += 0.1
  if (length > 10000) score -= 0.1 // Too long penalty

  // Sentence structure
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const avgSentenceLength = content.length / sentences.length
  if (avgSentenceLength > 20 && avgSentenceLength < 200) score += 0.1

  // Paragraph structure
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50)
  if (paragraphs.length > 1) score += 0.1

  // Word diversity
  const words = content.toLowerCase().match(/\b\w+\b/g) || []
  const uniqueWords = new Set(words)
  const diversity = uniqueWords.size / words.length
  if (diversity > 0.3) score += 0.1

  // Common boilerplate penalties
  const boilerplatePatterns = [
    /cookie/i, /privacy policy/i, /terms of service/i,
    /subscribe/i, /newsletter/i, /follow us/i,
    /share this/i, /related articles/i
  ]

  const boilerplateCount = boilerplatePatterns.reduce((count, pattern) => {
    return count + (pattern.test(content) ? 1 : 0)
  }, 0)

  score -= boilerplateCount * 0.05

  return Math.max(0, Math.min(1, score))
}

function extractTextFromHTML(html: string): ContentExtractionResult {
  // Enhanced fallback text extraction
  let text = html
    // Remove script and style elements
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Remove HTML tags
    .replace(/<[^>]*>/g, " ")
    // Decode HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&([a-zA-Z]+);/g, " ") // Remove other entities
    // Clean up whitespace
    .replace(/\s+/g, " ")
    .trim()

  // Smart truncation for fallback
  if (text.length > 100000) {
    text = smartTruncate(text, 100000)
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
