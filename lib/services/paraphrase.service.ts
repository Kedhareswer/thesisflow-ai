import { enhancedAIService } from "@/lib/enhanced-ai-service"
import type { AIProvider } from "@/lib/ai-providers"

export type ParaphraseTone =
  | "academic"
  | "fluent"
  | "formal"
  | "creative"
  | "casual"
  | "technical"
  | "simple"

export type VariationLevel = "low" | "medium" | "high"

export interface ParaphraseOptions {
  text: string
  tone: ParaphraseTone
  variation: VariationLevel
  preserveLength?: boolean
  provider?: AIProvider
  model?: string
  userId?: string
}

function clampTokensFromWords(words: number) {
  // Approximate tokens from words, then clamp
  const approxTokens = Math.ceil(words * 1.4)
  return Math.max(64, Math.min(2000, approxTokens))
}

function toneGuidelines(tone: ParaphraseTone): string {
  switch (tone) {
    case "academic":
      return "Use precise, objective, and formal scholarly language. Avoid colloquialisms."
    case "fluent":
      return "Write in smooth, natural, and easy-to-read prose with strong cohesion."
    case "formal":
      return "Maintain a professional, courteous, and structured tone."
    case "creative":
      return "Use vivid language, varied sentence structures, and engaging phrasing while preserving meaning."
    case "casual":
      return "Use friendly, approachable language with simple phrasing."
    case "technical":
      return "Use domain-appropriate terminology and precise definitions. Avoid ambiguity."
    case "simple":
      return "Use clear, concise sentences with plain language suitable for a general audience."
  }
}

function variationInstructions(level: VariationLevel): { instruction: string; temperature: number } {
  switch (level) {
    case "low":
      return { instruction: "Lightly rephrase with minimal changes to structure and wording.", temperature: 0.2 }
    case "medium":
      return { instruction: "Moderately rephrase with alternate wording and some structure changes.", temperature: 0.5 }
    case "high":
      return { instruction: "Substantially rephrase with fresh wording and varied structures while preserving meaning.", temperature: 0.8 }
  }
}

export function buildParaphrasePrompt(opts: ParaphraseOptions): { prompt: string; temperature: number; maxTokens: number } {
  const words = opts.text.trim().split(/\s+/).filter(Boolean).length
  const { instruction, temperature } = variationInstructions(opts.variation)
  const guidelines = toneGuidelines(opts.tone)

  const lengthRule = opts.preserveLength
    ? "Keep overall length within ±10% of the original."
    : "You may change length slightly if it improves clarity."

  const system = [
    "You are a professional paraphrasing assistant.",
    "Your output must:",
    "- Preserve the original meaning and factual accuracy",
    "- Avoid plagiarism by using novel phrasing",
    "- Maintain logical flow, coherence, and formatting",
    "- Keep citations, equations, inline code, and units intact",
    "- Do not invent references or facts",
    lengthRule,
    `Style guidelines: ${guidelines}`,
    `Rewrite intensity: ${instruction}`,
  ].join("\n")

  const user = [
    "Paraphrase the following text. Return only the rewritten text without preamble:",
    "\n---BEGIN TEXT---\n",
    opts.text.trim(),
    "\n---END TEXT---",
  ].join("\n")

  const compositePrompt = `${system}\n\n${user}`
  const maxTokens = clampTokensFromWords(words)
  return { prompt: compositePrompt, temperature, maxTokens }
}

export async function paraphrase(options: ParaphraseOptions): Promise<{ output: string }> {
  if (!options.text || options.text.trim().length === 0) {
    throw new Error("Text is required")
  }

  // Default to Llama 3.1 8B for fast, cost-effective paraphrasing
  const defaultModel = options.model || "llama-3.1-8b-instant"

  // For very long texts, paraphrase per paragraph to keep structure
  const normalized = options.text.replace(/\r\n/g, "\n")
  const paragraphs = normalized.split(/\n{2,}/)

  // If it's short enough, do one shot
  if (normalized.length < 3500 && paragraphs.length <= 3) {
    const { prompt, temperature, maxTokens } = buildParaphrasePrompt(options)
    const res = await enhancedAIService.generateText({
      prompt,
      temperature,
      maxTokens,
      provider: options.provider,
      model: defaultModel,
      userId: options.userId,
    })
    if (!res.success) throw new Error(res.error || "Paraphrase failed")
    return { output: (res.content || "").trim() }
  }

  // Chunk by paragraphs for reliability
  const outputs: string[] = []
  for (const para of paragraphs) {
    const local = { ...options, text: para }
    const { prompt, temperature, maxTokens } = buildParaphrasePrompt(local)
    const res = await enhancedAIService.generateText({
      prompt,
      temperature,
      maxTokens,
      provider: options.provider,
      model: defaultModel,
      userId: options.userId,
    })
    if (!res.success) throw new Error(res.error || "Paraphrase failed")
    outputs.push((res.content || "").trim())
    // small delay to avoid provider rate limits
    await new Promise((r) => setTimeout(r, 300))
  }
  return { output: outputs.join("\n\n") }
}
