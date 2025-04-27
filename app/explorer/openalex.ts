// openalex.ts
// Utility to fetch latest literature from OpenAlex API

export interface OpenAlexWork {
  id: string;
  title: string;
  publication_year: number;
  publication_date: string;
  doi: string;
  url: string;
  authors: string[];
  abstract: string;
  host_venue?: string;
}

export async function fetchOpenAlexWorks(query: string, count = 6): Promise<OpenAlexWork[]> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&sort=publication_date:desc&per-page=${count}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch from OpenAlex');
  const data: unknown = await res.json();
  if (!data || typeof data !== 'object' || !('results' in data) || !Array.isArray((data as any).results)) {
    throw new Error('Malformed OpenAlex API response');
  }
  return ((data as any).results).map((item: any) => ({
    id: item.id,
    title: item.title,
    publication_year: item.publication_year,
    publication_date: item.publication_date,
    doi: item.doi,
    url: item.primary_location?.landing_page_url || item.id,
    authors: (item.authorships || []).map((a: any) => a.author.display_name),
    abstract: (item.abstract_inverted_index && typeof item.abstract_inverted_index === 'object' && !Array.isArray(item.abstract_inverted_index))
      ? Object.entries(item.abstract_inverted_index as Record<string, number[]>)
          .sort((a, b) => Number(a[1][0]) - Number(b[1][0]))
          .map(([word]) => word)
          .join(' ')
      : '',
    host_venue: item.host_venue?.display_name,
  }));
}
