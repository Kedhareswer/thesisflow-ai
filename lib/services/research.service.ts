import { API_BASE_URL } from "@/lib/utils/api"

export class ResearchService {
  static async detectAI(text: string): Promise<{ is_ai: boolean; ai_probability: number; message: string }> {
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

  static async humanizeText(text: string): Promise<{
    humanized_text: string
    original_text?: string
    changes_made?: string[]
    readability_score?: number
    naturalness_score?: number
    timestamp?: string
  }> {
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

  static async checkPlagiarism(text: string): Promise<{
    plagiarism_percentage: number
    detected: boolean
    message: string
    sources: { url: string; match: string }[]
  }> {
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
