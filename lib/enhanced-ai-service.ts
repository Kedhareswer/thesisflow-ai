import { AIProviderService, type AIProvider, type AIResponse } from "./ai-providers"
import { AIProviderDetector } from "./ai-provider-detector"

export interface ResearchContext {
  topic: string
  description: string
  existingWork?: string
  researchGap?: string
  targetAudience?: string
  methodology?: string
}

export interface ResearchSuggestion {
  title: string
  description: string
  methodology: string
  potentialImpact: string
  keyChallenges: string[]
  nextSteps: string[]
  feasibilityScore: number
  noveltyScore: number
}

export interface SummaryOptions {
  length: "short" | "medium" | "long"
  style: "academic" | "casual" | "technical"
  includeKeywords: boolean
  includeCitations: boolean
  includeMethodology: boolean
}

export class EnhancedAIService {
  static async getResearchSuggestions(
    context: ResearchContext,
    provider?: AIProvider,
  ): Promise<ResearchSuggestion[]> {
    // Use best available provider if none specified
    if (!provider) {
      provider = AIProviderDetector.getBestProvider()
      if (!provider) {
        throw new Error("No AI providers are configured. Please add at least one API key to your environment variables.")
      }
    }
    const prompt = `As an expert research advisor, analyze this research context and provide 3 innovative research suggestions:

Research Topic: ${context.topic}
Description: ${context.description}
${context.existingWork ? `Existing Work: ${context.existingWork}` : ""}
${context.researchGap ? `Research Gap: ${context.researchGap}` : ""}
${context.targetAudience ? `Target Audience: ${context.targetAudience}` : ""}
${context.methodology ? `Preferred Methodology: ${context.methodology}` : ""}

For each suggestion, provide:
1. Clear, compelling title
2. Detailed description (2-3 sentences)
3. Specific methodology approach
4. Potential impact and significance
5. Key challenges to address
6. Concrete next steps
7. Feasibility score (1-10)
8. Novelty score (1-10)

Respond with ONLY a valid JSON array of 3 objects with these exact fields:
{
  "title": string,
  "description": string,
  "methodology": string,
  "potentialImpact": string,
  "keyChallenges": string[],
  "nextSteps": string[],
  "feasibilityScore": number,
  "noveltyScore": number
}`

    try {
      const response = await AIProviderService.generateResponse(prompt, provider)
      const cleanedText = response.content
        .replace(/```json\n?|\n?```/g, "")
        .replace(/^[\s\S]*?\[/, "[")
        .replace(/\][\s\S]*$/, "]")
        .trim()

      const parsed = JSON.parse(cleanedText)
      if (!Array.isArray(parsed) || parsed.length !== 3) {
        throw new Error("Invalid response format")
      }
      return parsed
    } catch (error) {
      console.error("Error getting research suggestions:", error)
      throw new Error("Failed to generate research suggestions")
    }
  }

  static async summarizeText(text: string, options: SummaryOptions, provider?: AIProvider): Promise<string> {
    // Use best available provider if none specified
    if (!provider) {
      provider = AIProviderDetector.getBestProvider()
      if (!provider) {
        throw new Error("No AI providers are configured. Please add at least one API key to your environment variables.")
      }
    }
    const lengthMap = {
      short: "1-2 paragraphs",
      medium: "3-4 paragraphs",
      long: "5-6 paragraphs",
    }

    const styleMap = {
      academic: "formal academic tone with precise terminology",
      casual: "conversational and accessible language",
      technical: "technical precision with domain-specific terms",
    }

    const prompt = `Summarize the following text in ${lengthMap[options.length]} using ${styleMap[options.style]}.

${options.includeKeywords ? "Include key terms and concepts." : ""}
${options.includeCitations ? "Preserve important citations and references." : ""}
${options.includeMethodology ? "Highlight methodology and approach." : ""}

Text to summarize:
${text}

Summary:`

    const response = await AIProviderService.generateResponse(prompt, provider)
    return response.content
  }

  static async generateResearchIdeas(
    topic: string,
    count = 5,
    context?: string,
    provider?: AIProvider,
  ): Promise<string[]> {
    // Use best available provider if none specified
    if (!provider) {
      provider = AIProviderDetector.getBestProvider()
      if (!provider) {
        throw new Error("No AI providers are configured. Please add at least one API key to your environment variables.")
      }
    }
    const prompt = `Generate ${count} innovative research ideas for the topic: "${topic}"
${context ? `Context: ${context}` : ""}

Each idea should be:
- Novel and original
- Feasible with current technology
- Potentially impactful
- Clearly articulated

Format as a numbered list with brief descriptions.`

    const response = await AIProviderService.generateResponse(prompt, provider)

    // Parse the response into individual ideas
    const ideas = response.content
      .split(/\d+\./)
      .slice(1)
      .map((idea) => idea.trim())
      .filter((idea) => idea.length > 0)

    return ideas.slice(0, count)
  }

  static async analyzeResearchGaps(
    topic: string,
    existingLiterature: string,
    provider?: AIProvider,
  ): Promise<{
    gaps: string[]
    opportunities: string[]
    recommendations: string[]
  }> {
    const prompt = `Analyze the research landscape for "${topic}" and identify gaps and opportunities.

Existing Literature Summary:
${existingLiterature}

Provide:
1. Research gaps (what's missing or understudied)
2. Emerging opportunities (new directions or applications)
3. Specific recommendations for future research

Format as JSON with arrays for "gaps", "opportunities", and "recommendations".`

    // Use best available provider if none specified
    if (!provider) {
      provider = AIProviderDetector.getBestProvider()
      if (!provider) {
        throw new Error("No AI providers are configured. Please add at least one API key to your environment variables.")
      }
    }

    const response = await AIProviderService.generateResponse(prompt, provider)

    try {
      const cleanedText = response.content.replace(/```json\n?|\n?```/g, "").trim()

      return JSON.parse(cleanedText)
    } catch (error) {
      throw new Error("Failed to parse research gap analysis")
    }
  }

  static async generateMethodologyAdvice(
    researchQuestion: string,
    constraints: string[],
    provider?: AIProvider,
  ): Promise<{
    recommendedApproach: string
    alternatives: string[]
    considerations: string[]
    timeline: string
  }> {
    const prompt = `Provide methodology advice for this research question: "${researchQuestion}"

Constraints: ${constraints.join(", ")}

Recommend:
1. Primary methodological approach with justification
2. Alternative approaches to consider
3. Key methodological considerations and potential pitfalls
4. Realistic timeline estimate

Format as JSON with fields: "recommendedApproach", "alternatives", "considerations", "timeline".`

    // Use best available provider if none specified
    if (!provider) {
      provider = AIProviderDetector.getBestProvider()
      if (!provider) {
        throw new Error("No AI providers are configured. Please add at least one API key to your environment variables.")
      }
    }

    const response = await AIProviderService.generateResponse(prompt, provider)

    try {
      const cleanedText = response.content.replace(/```json\n?|\n?```/g, "").trim()

      return JSON.parse(cleanedText)
    } catch (error) {
      throw new Error("Failed to parse methodology advice")
    }
  }

  static async compareProviderResponses(
    prompt: string,
    providers?: AIProvider[],
  ): Promise<Record<AIProvider, AIResponse>> {
    // Use all available providers if none specified
    if (!providers) {
      providers = AIProviderDetector.getFallbackProviders()
      if (providers.length === 0) {
        throw new Error("No AI providers are configured. Please add at least one API key to your environment variables.")
      }
    }
    const results: Record<string, AIResponse> = {}

    await Promise.allSettled(
      providers.map(async (provider) => {
        try {
          const response = await AIProviderService.generateResponse(prompt, provider)
          results[provider] = response
        } catch (error) {
          console.warn(`Provider ${provider} failed:`, error)
        }
      }),
    )

    return results as Record<AIProvider, AIResponse>
  }
}
