// API route for detecting AI-generated content using Gemini API
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { text } = req.body
  if (!text) {
    return res.status(400).json({ error: 'Missing text' })
  }

  // Call Gemini API (or similar) for AI detection
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey

  // Advanced prompt for multi-dimensional AI detection
  const prompt = `IMPORTANT: Respond ONLY with a single line of valid JSON in this format (no code block, no explanation):\n{\"aiScore\": <confidence score 0-100>, \"verdict\": \"Likely AI-generated\" | \"Likely Human-written\" | \"Uncertain\"}\n\nYou are an expert AI content detector. Analyze the following text for signs of AI involvement using these criteria:\n1. AI-generated content detection: Look for patterns in sentence structure, tone, and probability distributions (like ZeroGPT, GPTZero).\n2. Plagiarism/deepfake cues: Watch for unnatural phrasing, repetitive or manipulated language, or text that feels algorithmically generated.\n3. Fraud/anomaly signals: Consider if the text exhibits unusual or suspicious patterns, especially in financial, transactional, or technical contexts.\n4. Cybersecurity threat signals: Detect language that hints at cyber threats or abnormal technical activity.\n5. Fake review/spam patterns: Identify sentiment manipulation, excessive repetition, or spam-like qualities.\n\nBased on your analysis, respond with the JSON verdict. If you are not sure, set the verdict to \"Uncertain\".\n\nText to analyze:\n\"\"\"${text}\"\"\"`;

  try {
    const geminiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })
    const geminiData = await geminiRes.json()
    // Log the full Gemini response for debugging
    console.log('Gemini API response:', JSON.stringify(geminiData, null, 2));
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    // Try parsing as JSON, removing Markdown code block if present
    let aiScore = 0;
    let verdict = 'Unknown';
    let jsonText = raw.trim();
    // Remove code block markers if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json/, '').replace(/```$/,'').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```/, '').replace(/```$/,'').trim();
    }
    try {
      const parsed = JSON.parse(jsonText);
      aiScore = parsed.aiScore ?? 0;
      verdict = parsed.verdict ?? 'Unknown';
    } catch {
      // Fallback to regex parsing
      const scoreMatch = /AI Score:\s*(\d+)/i.exec(raw)
      const verdictMatch = /Verdict:\s*([\w\s-]+)/i.exec(raw)
      aiScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0
      verdict = verdictMatch ? verdictMatch[1].trim() : 'Unknown'
    }
    res.status(200).json({ aiScore, verdict })
  } catch (err) {
    console.error('AI Detection Error:', err);
    res.status(500).json({ error: 'Failed to detect AI content', details: (err as Error).message, stack: (err as Error).stack || null })
  }
}
