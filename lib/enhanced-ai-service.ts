/**
 * Simplified AI Service - Uses server-side API keys only
 * No user API key management - all keys are configured via environment variables
 */

export interface GenerateTextOptions {
  prompt: string
  maxTokens?: number
  temperature?: number
  userId?: string // Only used for logging/tracking, not for API key lookup
}

export interface GenerateTextResult {
  success: boolean
  content?: string
  error?: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

class EnhancedAIService {
  /**
   * Generate text using server-side configured API key
   * Only uses GROQ_API_KEY from environment variables
   */
  async generateText(options: GenerateTextOptions): Promise<GenerateTextResult> {
    try {
      console.log("Enhanced AI Service: Starting text generation with server API key...")

      const apiKey = process.env.GROQ_API_KEY

      if (!apiKey) {
        return {
          success: false,
          error: "AI service not configured. Please contact administrator."
        }
      }

      const result = await this.callGroqAPI(
        apiKey,
        options.prompt,
        "llama-3.3-70b-versatile",
        options.maxTokens || 1000,
        options.temperature || 0.7
      )

      return result
    } catch (error) {
      console.error("Enhanced AI Service: Error in generateText:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  private async callGroqAPI(
    apiKey: string,
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<GenerateTextResult> {
    console.log("Enhanced AI Service: Calling API with model:", model)

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    })

    console.log("Enhanced AI Service: API response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Enhanced AI Service: API error data:", errorData)
      throw new Error(`API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""

    if (!content) {
      console.error("Enhanced AI Service: API returned no content!")
      throw new Error("API returned no content")
    }

    return {
      success: true,
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
    }
  }

  /**
   * Summarize content - simple wrapper around generateText
   */
  async summarizeContent(
    content: string,
    options: {
      style?: "academic" | "executive" | "bullet-points" | "detailed"
      length?: "brief" | "medium" | "comprehensive"
    } = {}
  ): Promise<{
    summary: string
    keyPoints: string[]
    readingTime: number
  }> {
    const { style = "academic", length = "medium" } = options

    // Chunk large content to avoid overwhelming the API
    const maxContentLength = 3000
    let processedContent = content

    if (content.length > maxContentLength) {
      const beginningChunk = content.substring(0, maxContentLength / 2)
      const endChunk = content.substring(content.length - maxContentLength / 2)
      processedContent = beginningChunk + "\n\n[... content truncated ...]\n\n" + endChunk
    }

    const prompt = `Summarize in ${style} style (${length} detail):

${processedContent}

Output:
SUMMARY: [clear, concise summary]
KEY_POINTS: [point1]|[point2]|[point3]|[point4]|[point5]
READING_TIME: [reading minutes]`

    const result = await this.generateText({
      prompt,
      maxTokens: length === "comprehensive" ? 1000 : length === "medium" ? 600 : 300,
      temperature: 0.3,
    })

    if (!result.success || !result.content) {
      throw new Error(result.error || "Failed to summarize content")
    }

    return this.parseSummaryResult(result.content, content)
  }

  private parseSummaryResult(
    content: string,
    originalContent: string
  ): {
    summary: string
    keyPoints: string[]
    readingTime: number
  } {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line)

    let summary = ""
    let keyPoints: string[] = []
    let readingTime = 0

    for (const line of lines) {
      if (line.startsWith("SUMMARY:")) {
        summary = line.replace("SUMMARY:", "").trim()
      } else if (line.startsWith("KEY_POINTS:")) {
        const pointsStr = line.replace("KEY_POINTS:", "").trim()
        keyPoints = pointsStr
          .split("|")
          .map((p) => p.trim())
          .filter((p) => p)
      } else if (line.startsWith("READING_TIME:")) {
        const timeStr = line.replace("READING_TIME:", "").trim()
        readingTime = Number.parseInt(timeStr) || Math.ceil(originalContent.split(/\s+/).length / 200)
      }
    }

    // Fallbacks
    if (!summary) {
      summary = content.split("\n").find((line) => line.length > 50) || content.substring(0, 200)
    }
    if (keyPoints.length === 0) {
      keyPoints = ["Content analyzed", "Key insights extracted", "Summary generated"]
    }
    if (!readingTime) {
      readingTime = Math.ceil(originalContent.split(/\s+/).length / 200)
    }

    return {
      summary,
      keyPoints,
      readingTime,
    }
  }
}

export const enhancedAIService = new EnhancedAIService()
