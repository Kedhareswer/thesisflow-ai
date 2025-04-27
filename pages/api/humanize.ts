// API route for humanizing AI-generated text using Gemini API
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { text, englishVariant, tone, pointOfView, tense, sentenceType } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text' })
  }

  // Compose options for prompt
  let options = [];
  if (englishVariant) options.push(`in ${englishVariant} English`);
  if (tone) options.push(`with a ${tone} tone`);
  if (pointOfView) options.push(`in the ${pointOfView} person`);
  if (tense) options.push(`in the ${tense} tense`);
  if (sentenceType) options.push(`using ${sentenceType} sentences`);
  const optionsStr = options.length ? ' Please rewrite it ' + options.join(', ') + '.' : '';

  // Call Gemini API (or similar) for humanization
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

  // Flexible system prompt
  const prompt = `You are an expert writing assistant. Rewrite the following text so it is indistinguishable from human writing, avoiding any AI-detection artifacts and making it natural, engaging, and contextually appropriate.${optionsStr} Respond ONLY with the improved text, no explanations.\nText: "${text}"`;

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
    const humanized = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    res.status(200).json({ humanized })
  } catch (err) {
    console.error('Humanizer Error:', err);
    res.status(500).json({ error: 'Failed to humanize text', details: (err as Error).message, stack: (err as Error).stack || null })
  }
}
