export interface ModelPreset {
  provider: string
  model: string
  defaultTemperature: number
  systemPromptAddon?: string
}

export const MODEL_PRESETS: ModelPreset[] = [
  // OpenAI
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    defaultTemperature: 0.5,
    systemPromptAddon: 'Provide clear, helpful, and well-structured research assistance with concise explanations.'
  },
  {
    provider: 'openai',
    model: 'gpt-4o',
    defaultTemperature: 0.4,
    systemPromptAddon: 'Use up-to-date knowledge and cite relevant sources concisely when helpful.'
  },
  {
    provider: 'openai',
    model: 'o3-mini',
    defaultTemperature: 0.2,
    systemPromptAddon: 'Use deliberate reasoning chains internally and return only the final answer.'
  },
  {
    provider: 'openai',
    model: 'o3',
    defaultTemperature: 0.1,
    systemPromptAddon: 'Apply advanced reasoning for complex problems. Think step-by-step before responding.'
  },

  // Anthropic
  {
    provider: 'anthropic',
    model: 'claude-3.5-haiku',
    defaultTemperature: 0.5,
    systemPromptAddon: 'Be fast and precise. Prefer concise, accurate academic writing.'
  },
  {
    provider: 'anthropic',
    model: 'claude-3.5-sonnet',
    defaultTemperature: 0.3,
    systemPromptAddon: 'Demonstrate strong reasoning and careful analysis while remaining concise.'
  },
  {
    provider: 'anthropic',
    model: 'claude-3.7-sonnet',
    defaultTemperature: 0.2,
    systemPromptAddon: 'Use extended thinking when needed for complex problems. Balance depth with clarity.'
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    defaultTemperature: 0.3,
    systemPromptAddon: 'Apply high-performance reasoning with exceptional context understanding.'
  },
  {
    provider: 'anthropic',
    model: 'claude-opus-4.1',
    defaultTemperature: 0.2,
    systemPromptAddon: 'Use the most capable reasoning for complex, nuanced problems requiring deep analysis.'
  },

  // Google Gemini
  {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    defaultTemperature: 0.6,
    systemPromptAddon: 'Provide well-rounded capabilities with thinking features for enhanced quality.'
  },
  {
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    defaultTemperature: 0.7,
    systemPromptAddon: 'Optimize for cost-efficiency while maintaining high throughput and accuracy.'
  },
  {
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    defaultTemperature: 0.4,
    systemPromptAddon: 'Apply state-of-the-art thinking for complex reasoning in code, math, and STEM.'
  },
  {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    defaultTemperature: 0.6,
    systemPromptAddon: 'Leverage next-gen features with superior speed and native tool use.'
  },
  {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    defaultTemperature: 0.7,
    systemPromptAddon: 'Respond quickly with clear, structured explanations for diverse tasks.'
  },
  {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    defaultTemperature: 0.5,
    systemPromptAddon: 'Process large amounts of data with optimized reasoning for wide-range tasks.'
  },

  // Groq
  {
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    defaultTemperature: 0.6,
    systemPromptAddon: 'Be concise and direct. Optimize for speed without sacrificing accuracy.'
  },
  {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    defaultTemperature: 0.4,
    systemPromptAddon: 'Provide thorough, well-reasoned responses with citations when relevant.'
  },
  {
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    defaultTemperature: 0.3,
    systemPromptAddon: 'Use extended 128K context for comprehensive analysis and synthesis. Excellent for long documents.'
  },
  {
    provider: 'groq',
    model: 'llama-4-maverick-17bx128moe',
    defaultTemperature: 0.3,
    systemPromptAddon: 'Apply large-scale MoE architecture for complex multi-source analysis with 128K context.'
  },
  {
    provider: 'groq',
    model: 'qwen3-32b',
    defaultTemperature: 0.4,
    systemPromptAddon: 'Use thinking mode for complex reasoning and non-thinking mode for efficient dialogue. Excellent agent capabilities.'
  },
  {
    provider: 'groq',
    model: 'gpt-oss-20b',
    defaultTemperature: 0.3,
    systemPromptAddon: 'Apply reasoning capabilities with built-in browser search and code execution support.'
  },
  {
    provider: 'groq',
    model: 'gpt-oss-120b',
    defaultTemperature: 0.3,
    systemPromptAddon: 'Use frontier-level reasoning comparable to o3-mini. Ideal for complex synthesis and report generation.'
  },

  // Mistral
  {
    provider: 'mistral',
    model: 'mistral-small-2407',
    defaultTemperature: 0.7,
    systemPromptAddon: 'Be pragmatic and concise with strong emphasis on clarity.'
  },
  {
    provider: 'mistral',
    model: 'mistral-medium-2508',
    defaultTemperature: 0.5,
    systemPromptAddon: 'Balance performance and efficiency with clear, structured responses.'
  },
  {
    provider: 'mistral',
    model: 'mistral-large-2411',
    defaultTemperature: 0.4,
    systemPromptAddon: 'Apply flagship-level reasoning with comprehensive analysis and insights.'
  },
  {
    provider: 'mistral',
    model: 'codestral-2508',
    defaultTemperature: 0.3,
    systemPromptAddon: 'Specialize in code analysis, generation, and debugging with technical precision.'
  },

  // AIML API (meta provider)
  {
    provider: 'aiml',
    model: 'gpt-4o-mini',
    defaultTemperature: 0.5,
    systemPromptAddon: 'Balanced creativity and accuracy for research workflows.'
  },
  {
    provider: 'aiml',
    model: 'gpt-4o',
    defaultTemperature: 0.4,
    systemPromptAddon: 'Apply OpenAI flagship capabilities with multimodal understanding.'
  },
  {
    provider: 'aiml',
    model: 'o3-mini',
    defaultTemperature: 0.2,
    systemPromptAddon: 'Use reasoning model capabilities for complex problem-solving.'
  },
  {
    provider: 'aiml',
    model: 'deepseek-chat',
    defaultTemperature: 0.4,
    systemPromptAddon: 'Apply DeepSeek V3 advanced language understanding and generation.'
  },
  {
    provider: 'aiml',
    model: 'deepseek/deepseek-r1',
    defaultTemperature: 0.2,
    systemPromptAddon: 'Use strong internal reasoning chains for mathematical and logical problems.'
  },
  {
    provider: 'aiml',
    model: 'anthropic/claude-opus-4.1',
    defaultTemperature: 0.2,
    systemPromptAddon: 'Apply Claude 4.1 Opus most capable reasoning via AIML API.'
  },
  {
    provider: 'aiml',
    model: 'gemini-2.5-pro',
    defaultTemperature: 0.4,
    systemPromptAddon: 'Use Gemini 2.5 Pro thinking capabilities via AIML API for complex analysis.'
  },
]

export function getPreset(provider: string, model: string) {
  return MODEL_PRESETS.find(p => p.provider === provider && p.model === model)
}
