import { api } from "@/lib/utils/api"
import type { Summary } from "@/lib/types/common"

interface AIGenerationResponse {
  content: string
  model: string
  provider: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export class ResearchService {
  static async exploreTopics(topic: string, depth = 3) {
    try {
      const response = await api.post<AIGenerationResponse>("/api/ai/generate", {
        prompt: `Provide a comprehensive research overview of "${topic}". Include:
1. Key concepts and definitions
2. Major research areas and subfields
3. Current challenges and limitations
4. Recent developments and trends
5. Leading researchers and institutions
6. Future research directions

Depth level: ${depth}/5`,
      })

      // Extract content from the response
      // If response.data has a content property (new format), use that
      // Otherwise fall back to the entire response.data (old format)
      const content =
        response.data && typeof response.data === "object" && "content" in response.data
          ? response.data.content
          : response.data

      return {
        ...response,
        data: content,
      }
    } catch (error) {
      console.error("Error exploring topics:", error)
      throw error
    }
  }

  static async searchPapers(query: string, type = "keyword") {
    try {
      console.log("[ResearchService] Searching papers for query:", query)

      if (!query || query.trim().length < 3) {
        throw new Error("Please enter a more specific search term (at least 3 characters)")
      }

      // Use the existing OpenAlex integration
      try {
        const { fetchOpenAlexWorks } = await import("@/app/explorer/openalex")
        console.log("[ResearchService] OpenAlex module imported successfully")

        const papers = await fetchOpenAlexWorks(query, 15) // Get 15 papers to ensure we have at least 5 good ones
        console.log("[ResearchService] Raw papers from OpenAlex:", papers.length)

        if (!papers || !Array.isArray(papers)) {
          console.error("[ResearchService] Invalid response format from OpenAlex - not an array:", papers)
          throw new Error("Invalid response from research API")
        }

        // Transform OpenAlex format to match expected UI format
        const transformedPapers = papers
          .filter((paper) => paper.title && paper.title.trim() !== "") // Filter out papers without titles
          .map((paper) => ({
            id: paper.id || `paper-${Math.random().toString(36).substring(2, 9)}`,
            title: paper.title || "Untitled Paper",
            authors: paper.authors || [],
            year: paper.publication_year || new Date().getFullYear(),
            journal: paper.host_venue || "Unknown Source",
            abstract: paper.abstract || "No abstract available",
            url: paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : ""),
            doi: paper.doi || "",
            citations: 0, // OpenAlex doesn't provide citation count in basic API
            pdf_url: paper.doi ? `https://doi.org/${paper.doi}` : paper.url || "",
          }))
          .slice(0, 10) // Limit to top 10 results

        console.log("[ResearchService] Transformed papers:", transformedPapers.length)
        console.log(
          "[ResearchService] First paper sample:",
          transformedPapers.length > 0 ? JSON.stringify(transformedPapers[0]).substring(0, 200) + "..." : "None",
        )

        if (transformedPapers.length === 0) {
          throw new Error("No relevant papers found. Try different search terms.")
        }

        return {
          data: {
            success: true,
            count: transformedPapers.length,
            source: "openalex",
            data: transformedPapers,
          },
        }
      } catch (openAlexError) {
        console.error("[ResearchService] OpenAlex API error:", openAlexError)
        throw new Error(openAlexError instanceof Error ? openAlexError.message : "Failed to search papers.")
      }
    } catch (error) {
      console.error("Error searching papers:", error)
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to search papers. Please try again with different search terms.",
      )
    }
  }

  static async generateIdeas(topic: string, context?: string, count = 5) {
    try {
      const response = await api.post<AIGenerationResponse>("/api/ai/generate", {
        prompt: `You are a research assistant. Generate ${count} innovative research ideas on the topic "${topic}".${context ? ` Context: ${context}` : ""}
For each idea, provide:
1. A concise research question (max 20 words)
2. A brief suggested methodology (1–2 sentences)
3. The potential impact or contribution (1 sentence)
4. Key challenges or limitations (1 sentence)

Return the ideas as a Markdown numbered list, where each idea is formatted as:\n**Research Question:** ...\n**Methodology:** ...\n**Impact:** ...\n**Challenges:** ...\n---`,
      })

      // Extract usable content from new/old formats
      const content =
        response.data && typeof response.data === "object" && "content" in response.data
          ? (response.data as AIGenerationResponse).content
          : (response.data as unknown as string)

      return {
        ...response,
        data: content,
      }
    } catch (error) {
      console.error("Error generating ideas:", error)
      throw error
    }
  }

  static async summarizeText(text: string, type: "comprehensive" | "executive" | "methodology" = "comprehensive") {
    try {
      return await api.post<Summary>("/api/summarize", {
        prompt: `Summarize the following text with a ${type} approach:\n\n${text}`,
        options: { type },
      })
    } catch (error) {
      console.error("Error summarizing text:", error)
      throw error
    }
  }

  static async detectAI(text: string) {
    try {
      const response = await api.post<{ is_ai: boolean; ai_probability: number; message: string }>("/api/ai-detect", {
        text,
      })
      return response.data
    } catch (error) {
      console.error("Error detecting AI:", error)
      throw error
    }
  }

  static async humanizeText(text: string) {
    try {
      const response = await api.post<{ original_text: string; humanized_text: string; message: string }>(
        "/api/humanize",
        { text },
      )
      return response.data
    } catch (error) {
      console.error("Error humanizing text:", error)
      throw error
    }
  }

  static async checkPlagiarism(text: string) {
    try {
      const response = await api.post<{
        plagiarism_percentage: number
        sources: { url: string; match: string }[]
        message: string
      }>("/api/plagiarism-check", { text })
      return response.data
    } catch (error) {
      console.error("Error checking plagiarism:", error)
      throw error
    }
  }
}

// Explicit named export
