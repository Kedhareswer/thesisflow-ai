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

export interface GenerateTextStreamOptions {
  prompt: string
  maxTokens?: number
  temperature?: number
  userId?: string
  onToken?: (token: string) => void
  onProgress?: (progress: { message?: string; percentage?: number }) => void
  onError?: (error: string) => void
  abortSignal?: AbortSignal
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
   * Generate text with streaming support
   * Simulates streaming by chunking the response
   */
  async generateTextStream(options: GenerateTextStreamOptions): Promise<void> {
    try {
      console.log("Enhanced AI Service: Starting streaming text generation...")

      // Send initial progress
      options.onProgress?.({ message: "Initializing AI model...", percentage: 10 })

      const result = await this.generateText({
        prompt: options.prompt,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        userId: options.userId
      })

      if (!result.success || !result.content) {
        options.onError?.(result.error || "Failed to generate content")
        return
      }

      // Simulate streaming by chunking the content
      const content = result.content
      const words = content.split(/(\s+)/)
      const chunkSize = 3 // Stream 3 words at a time for smoother effect

      options.onProgress?.({ message: "Generating response...", percentage: 30 })

      for (let i = 0; i < words.length; i += chunkSize) {
        // Check abort signal
        if (options.abortSignal?.aborted) {
          console.log("Enhanced AI Service: Stream aborted by client")
          return
        }

        const chunk = words.slice(i, i + chunkSize).join('')
        options.onToken?.(chunk)

        // Send progress updates
        const percentage = 30 + Math.floor((i / words.length) * 60)
        if (i % 10 === 0) {
          options.onProgress?.({ percentage })
        }

        // Small delay to simulate streaming (20ms for fast response)
        await new Promise(resolve => setTimeout(resolve, 20))
      }

      options.onProgress?.({ message: "Complete", percentage: 100 })
      console.log("Enhanced AI Service: Streaming completed successfully")

    } catch (error) {
      console.error("Enhanced AI Service: Streaming error:", error)
      const errorMessage = error instanceof Error ? error.message : "Streaming failed"
      options.onError?.(errorMessage)
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

  /**
   * Generate research ideas for a given topic
   */
  async generateResearchIdeas(
    topic: string,
    context = "",
    count = 5
  ): Promise<{
    ideas: Array<{
      title: string
      description: string
      research_question: string
      methodology: string
      impact: string
      challenges: string
    }>
    context: string
    references: string[]
  }> {
    const prompt = `Generate ${count} innovative research ideas for the topic: "${topic}"${
      context ? `\n\nContext: ${context}` : ""
    }

For each idea, provide:
1. Title (concise, descriptive)
2. Description (2-3 sentences)
3. Research Question (specific, answerable)
4. Methodology (brief approach)
5. Impact (potential contributions)
6. Challenges (anticipated obstacles)

Format as JSON:
{
  "ideas": [
    {
      "title": "...",
      "description": "...",
      "research_question": "...",
      "methodology": "...",
      "impact": "...",
      "challenges": "..."
    }
  ],
  "context": "Brief analysis of the research landscape",
  "references": ["Suggested reference area 1", "Suggested reference area 2"]
}`

    const result = await this.generateText({
      prompt,
      maxTokens: Math.min(2000, 300 * count),
      temperature: 0.8,
    })

    if (!result.success || !result.content) {
      throw new Error(result.error || "Failed to generate research ideas")
    }

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(result.content)
      return parsed
    } catch (error) {
      // Fallback: parse text format
      console.warn("Failed to parse JSON, using fallback parser")
      return this.parseIdeasFallback(result.content, topic, count)
    }
  }

  private parseIdeasFallback(
    content: string,
    topic: string,
    count: number
  ): {
    ideas: Array<{
      title: string
      description: string
      research_question: string
      methodology: string
      impact: string
      challenges: string
    }>
    context: string
    references: string[]
  } {
    // Simple fallback parser
    const ideas = []
    const lines = content.split("\n").filter(line => line.trim())

    for (let i = 0; i < Math.min(count, 5); i++) {
      ideas.push({
        title: `Research Idea ${i + 1} for ${topic}`,
        description: lines[i * 2] || `Explore innovative approaches to ${topic}`,
        research_question: `How can we advance understanding of ${topic}?`,
        methodology: "Mixed methods approach with literature review and empirical analysis",
        impact: "Potential to contribute to academic knowledge and practical applications",
        challenges: "Data availability and methodological constraints"
      })
    }

    return {
      ideas,
      context: `Research in ${topic} is an active field with many opportunities for contribution.`,
      references: ["Academic databases", "Domain experts", "Recent publications"]
    }
  }
}

export const enhancedAIService = new EnhancedAIService()
