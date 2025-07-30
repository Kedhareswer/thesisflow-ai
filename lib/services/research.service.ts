import { API_BASE_URL } from "@/lib/utils/api"

interface AIDetectionResult {
  is_ai: boolean
  ai_probability: number
  message: string
}

interface HumanizeResult {
  humanized_text: string
  message: string
}

interface PlagiarismResult {
  plagiarism_percentage: number
  sources: { url: string; match: string }[]
  message: string
}

export class ResearchService {
  private static instance: ResearchService

  private constructor() {}

  public static getInstance(): ResearchService {
    if (!ResearchService.instance) {
      ResearchService.instance = new ResearchService()
    }
    return ResearchService.instance
  }

  // Existing methods (omitted for brevity)
  // public async searchPapers(query: string): Promise<any> { ... }
  // public async searchWeb(query: string): Promise<any> { ... }
  // public async extractFileContent(file: File): Promise<any> { ... }
  // public async fetchUrlContent(url: string): Promise<any> { ... }
  // public async generateIdeas(prompt: string): Promise<any> { ... }
  // public async summarizeText(text: string, options: any): Promise<any> { ... }

  public async detectAI(text: string): Promise<AIDetectionResult> {
    const response = await fetch(`${API_BASE_URL}/ai-detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to detect AI content")
    }
    return response.json()
  }

  public async humanizeText(text: string): Promise<HumanizeResult> {
    const response = await fetch(`${API_BASE_URL}/humanize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to humanize text")
    }
    return response.json()
  }

  public async checkPlagiarism(text: string): Promise<PlagiarismResult> {
    const response = await fetch(`${API_BASE_URL}/plagiarism-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to check plagiarism")
    }
    return response.json()
  }
}
