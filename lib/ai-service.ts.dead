import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

export interface AIResponse {
  content: string
  provider: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export class AIService {
  static async generateText(
    prompt: string,
    options?: {
      model?: string
      maxTokens?: number
      temperature?: number
    },
  ): Promise<AIResponse> {
    try {
      const model = genAI.getGenerativeModel({ model: options?.model || "gemini-pro" })

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      return {
        content: text,
        provider: "google",
        model: options?.model || "gemini-pro",
      }
    } catch (error) {
      console.error("AI Service Error:", error)
      throw new Error("Failed to generate AI response")
    }
  }

  static async summarizeText(
    text: string,
    options?: {
      length?: "short" | "medium" | "long"
      style?: "academic" | "casual" | "technical"
    },
  ): Promise<AIResponse> {
    const lengthMap = {
      short: "2-3 sentences",
      medium: "1-2 paragraphs",
      long: "3-4 paragraphs",
    }

    const prompt = `Summarize the following text in ${lengthMap[options?.length || "medium"]} with a ${options?.style || "academic"} style:

${text}`

    return this.generateText(prompt)
  }

  static async generateIdeas(topic: string, count = 5): Promise<AIResponse> {
    const prompt = `Generate ${count} innovative research ideas related to "${topic}". For each idea, provide:
1. A clear title
2. A brief description (2-3 sentences)
3. Potential impact or significance

Format as a numbered list.`

    return this.generateText(prompt)
  }

  static async analyzeResearchGaps(field: string, currentResearch: string): Promise<AIResponse> {
    const prompt = `Analyze the research gaps in the field of "${field}" based on the following current research overview:

${currentResearch}

Identify:
1. Underexplored areas
2. Methodological gaps
3. Emerging opportunities
4. Interdisciplinary connections

Provide specific, actionable research directions.`

    return this.generateText(prompt)
  }
}
