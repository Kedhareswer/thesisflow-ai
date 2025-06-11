import { api } from "@/lib/utils/api"
import type { ResearchPaper, ResearchIdea, Summary } from "@/lib/types/common"

interface AIGenerationResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
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
      const content = response.data && typeof response.data === 'object' && 'content' in response.data
        ? response.data.content
        : response.data

      return {
        ...response,
        data: content
      }
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
      const content = response.data && typeof response.data === "object" && "content" in response.data
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
