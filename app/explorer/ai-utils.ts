// Utility functions to detect AI-generated content and humanize text

export async function detectAI(text: string): Promise<{ aiScore: number; verdict: string }> {
  const response = await fetch('/api/ai-detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!response.ok) throw new Error('Failed to detect AI content');
  return response.json();
}

export interface HumanizeOptions {
  englishVariant?: string;
  tone?: string;
  pointOfView?: string;
  tense?: string;
  sentenceType?: string;
}

export async function humanizeText(
  text: string,
  options: HumanizeOptions = {}
): Promise<{ humanized: string }> {
  const response = await fetch('/api/humanize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, ...options })
  });
  if (!response.ok) throw new Error('Failed to humanize text');
  return response.json();
}
