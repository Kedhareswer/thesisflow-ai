// literature-ai.ts
// Uses OpenAlex to fetch real papers, then summarizes and beautifies with AI

import { fetchOpenAlexWorks, OpenAlexWork } from './openalex';

export async function getLiteratureReviewPapers(query: string, count = 6): Promise<OpenAlexWork[]> {
  // Fetch real papers from OpenAlex
  const papers: OpenAlexWork[] = await fetchOpenAlexWorks(query, count);
  return papers;
}
