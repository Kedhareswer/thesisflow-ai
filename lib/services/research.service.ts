import { api } from "@/lib/utils/api"
import type { ResearchPaper, ResearchIdea, Summary } from "@/lib/types/common"

export class ResearchService {
  static async exploreTopics(topic: string, depth = 3) {
    try {
      return await api.post("/api/ai/generate", {
        prompt: `Provide a comprehensive research overview of "${topic}". Include:
1. Key concepts and definitions
2. Major research areas and subfields
3. Current challenges and limitations
4. Recent developments and trends
5. Leading researchers and institutions
6. Future research directions

Depth level: ${depth}/5`,
      })
    } catch (error) {
      console.error("Error exploring topics:", error)
      throw error
    }
  }

  static async searchPapers(query: string, type = "keyword") {
    try {
      return await api.get<ResearchPaper[]>(`/api/search/papers?query=${encodeURIComponent(query)}&type=${type}`)
    } catch (error) {
      console.error("Error searching papers:", error)
      throw error
    }
  }

  static async generateIdeas(topic: string, context?: string, count = 5) {
    try {
      return await api.post<ResearchIdea[]>("/api/ai/generate", {
        prompt: `Generate ${count} research ideas about "${topic}". ${context ? `Context: ${context}` : ""}
For each idea, include:
1. Research question
2. Methodology
3. Potential impact
4. Key challenges`,
      })
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
      return await api.post("/api/ai-detect", { text })
    } catch (error) {
      console.error("Error detecting AI:", error)
      throw error
    }
  }

  static async humanizeText(text: string) {
    try {
      return await api.post("/api/humanize", { text })
    } catch (error) {
      console.error("Error humanizing text:", error)
      throw error
    }
  }
}

// Explicit named export
