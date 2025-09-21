import type { ResearchPlan, ResearchTask } from "./planning.service"

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions"
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// Fallback order as requested by the user
const OPENROUTER_MODELS = [
  "z-ai/glm-4.5-air:free",
  "agentica-org/deepcoder-14b-preview:free",
  "nousresearch/deephermes-3-llama-3-8b-preview:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "deepseek/deepseek-chat-v3.1:free",
  "openai/gpt-oss-120b:free",
]

function chooseModelOrder(topic: string, description: string): string[] {
  const t = (topic + " " + description).toLowerCase()
  // Heuristics:
  // - Code-heavy or algorithmic: prioritize DeepCoder
  // - Creative tone or style requirements: prioritize Deephermes
  // - Very long/structured outputs: prioritize GPT-OSS-120B
  // - General planning and constraints: GLM first for efficiency
  // - If performance on tiny prompts: Nemotron as backup; Deepseek for balanced reasoning
  let ordered = [...OPENROUTER_MODELS]
  const boost = (model: string) => {
    const idx = ordered.indexOf(model)
    if (idx > 0) {
      ordered.splice(idx, 1)
      ordered.unshift(model)
    }
  }
  if (/code|algorithm|implementation|refactor|api|sdk|typescript|python|golang|rust|java|c\+\+|c#/.test(t)) {
    boost("agentica-org/deepcoder-14b-preview:free")
  }
  if (/creative|tone|style|marketing|copy|narrative|story|voice/.test(t)) {
    boost("nousresearch/deephermes-3-llama-3-8b-preview:free")
  }
  if (/very long|comprehensive|detailed|full report|documentation|specification|architecture|roadmap|requirement/.test(t)) {
    boost("openai/gpt-oss-120b:free")
  }
  // Keep GLM near top for general planning efficiency
  boost("z-ai/glm-4.5-air:free")
  return ordered
}

export class OpenRouterClient {
  constructor(private apiKey: string | undefined = OPENROUTER_API_KEY) {}

  async chatCompletion(model: string, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
    if (!this.apiKey) throw new Error("OpenRouter API key is not configured")

    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        // Optional best practices for OpenRouter
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost",
        "X-Title": process.env.NEXT_PUBLIC_APP_NAME || "AI Project Planner",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        // We avoid vendor-specific response_format for broad model compatibility
        // and instead enforce JSON in the prompt and robustly parse below.
      }),
      signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(text || `OpenRouter request failed with status ${res.status}`)
    }

    const data = await res.json().catch(() => ({})) as any
    const content: string | undefined = data?.choices?.[0]?.message?.content
    if (!content || typeof content !== "string") {
      throw new Error("OpenRouter returned no content")
    }
    return content
  }
}

function extractFirstJson<T = any>(text: string): T {
  // Attempt to extract the first top-level JSON object block
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start >= 0 && end > start) {
    const candidate = text.slice(start, end + 1)
    try {
      return JSON.parse(candidate)
    } catch {}
  }
  // As a fallback, try to parse the whole content
  try { return JSON.parse(text) } catch {}
  throw new Error("Failed to parse JSON from model response")
}

function clampTasks(plan: ResearchPlan, maxTasks: number): ResearchPlan {
  const allowedTaskKeys: (keyof ResearchTask)[] = [
    "id","title","description","type","priority","estimatedTime","dependencies","searchQuery","searchSources","analysisType","outputFormat"
  ]
  const sanitizedTasks = (Array.isArray(plan.tasks) ? plan.tasks : []).slice(0, Math.max(0, maxTasks)).map((t, idx) => {
    const out: any = {}
    for (const k of allowedTaskKeys) {
      if (k in (t as any)) out[k] = (t as any)[k]
    }
    // Ensure minimal fields
    out.id = out.id || `task_${idx + 1}`
    out.title = out.title || `Task ${idx + 1}`
    out.type = out.type || "search"
    out.priority = typeof out.priority === "number" ? out.priority : (idx + 1)
    out.estimatedTime = out.estimatedTime || "3-5 minutes"
    return out as ResearchTask
  })

  return {
    id: plan.id || `plan_${Date.now()}`,
    title: plan.title || "Generated Research Plan",
    description: plan.description || "",
    estimatedTotalTime: plan.estimatedTotalTime || "~15 minutes",
    tasks: sanitizedTasks,
    deliverables: Array.isArray(plan.deliverables) ? plan.deliverables : ["Comprehensive Research Report"],
    methodology: plan.methodology || "Comprehensive research methodology",
  }
}

function validatePlan(plan: ResearchPlan): void {
  if (!plan.title || !plan.description) throw new Error("Plan validation failed: title/description required")
  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) throw new Error("Plan validation failed: no tasks")
}

export interface GeneratePlanParams {
  topic: string
  description: string
  selectedTools?: string[]
  maxTasks?: number
  signal?: AbortSignal
}

export async function generatePlanWithOpenRouter({ topic, description, selectedTools = [], maxTasks = 30, signal }: GeneratePlanParams): Promise<ResearchPlan> {
  const client = new OpenRouterClient()

  const system: ChatMessage = {
    role: "system",
    content: [
      "You are an expert project planning assistant.",
      "Return ONLY valid JSON that conforms to the following TypeScript shape:",
      "{ id: string; title: string; description: string; estimatedTotalTime: string; tasks: { id: string; title: string; description: string; type: 'search'|'analyze'|'synthesize'|'generate'; priority: number; estimatedTime: string; dependencies?: string[]; searchQuery?: string; searchSources?: string[]; analysisType?: string; outputFormat?: string; }[]; deliverables: string[]; methodology: string }",
      "Do not include any markdown fences or explanatory text. JSON only.",
    ].join("\n"),
  }

  const toolsHint = selectedTools.length ? `\nSelected tools: ${selectedTools.join(", ")}` : ""

  const user: ChatMessage = {
    role: "user",
    content: [
      `Topic: ${topic}`,
      `Description: ${description}`,
      toolsHint,
      "Please produce a concise, practical plan with sane defaults:",
      `- Limit tasks to at most ${maxTasks}`,
      "- Provide task dependencies only when necessary",
      "- Use minutes in estimatedTime like '3-5 minutes'",
      "- Focus on clear, actionable steps",
    ].filter(Boolean).join("\n"),
  }

  let lastError: any
  const modelsToTry = chooseModelOrder(topic, description)
  for (const model of modelsToTry) {
    try {
      const content = await client.chatCompletion(model, [system, user], signal)
      const parsed = extractFirstJson<ResearchPlan>(content)
      const clamped = clampTasks(parsed, maxTasks)
      validatePlan(clamped)
      return clamped
    } catch (err: any) {
      // Try next model
      lastError = err
      continue
    }
  }

  throw new Error(`All OpenRouter models failed. Last error: ${lastError?.message || String(lastError)}`)
}
