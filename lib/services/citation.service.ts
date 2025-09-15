import axios from 'axios';
import { DOMParser as XmldomParser } from 'xmldom';

export interface Citation {
  type: 'article' | 'book' | 'website' | 'conference' | 'thesis' | 'report';
  title: string;
  authors: string[];
  year?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  conference?: string;
  edition?: string;
  editors?: string[];
  chapter?: string;
  institution?: string;
  accessDate?: string;
  isbn?: string;
  issn?: string;
}

export interface FormattedCitation {
  apa: string;
  mla: string;
  chicago: string;
  harvard: string;
  ieee: string;
  vancouver: string;
  bibtex: string;
}

class CitationService {
  private readonly crossrefApi = 'https://api.crossref.org/works';
  private readonly openAlexApi = 'https://api.openalex.org/works';
  private readonly crossrefSearch = 'https://api.crossref.org/works?rows=5&query.bibliographic=';
  
  /**
   * Parse DOI and fetch metadata
   */
  async fetchFromDOI(doi: string): Promise<Citation | null> {
    try {
      // Clean DOI
      const cleanDoi = doi.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, '').replace('doi:', '').trim();
      
      // Try CrossRef first
      const crossrefData = await this.fetchFromCrossRef(cleanDoi);
      if (crossrefData) return crossrefData;
      
      // Fallback to OpenAlex
      const openAlexData = await this.fetchFromOpenAlex(`https://doi.org/${cleanDoi}`);
      if (openAlexData) return openAlexData;
      
      return null;
    } catch (error) {
      console.error('Error fetching DOI metadata:', error);
      return null;
    }

  }

  /**
   * Search CrossRef by title or bibliographic query and return best match
   */
  fetchByTitleOrQuery = async (query: string): Promise<Citation | null> => {
    try {
      const q = encodeURIComponent(query.trim());
      const response = await axios.get(`${this.crossrefSearch}${q}`, { timeout: 8000 });
      const items = response.data?.message?.items || [];
      if (!items.length) return null;
      // Prefer items with DOI and title similarity
      const best = items.find((it: any) => it.DOI && it.title?.[0]) || items[0];
      const data = best;
      return {
        type: this.mapCrossRefType(data.type || 'article'),
        title: data.title?.[0] || '',
        authors: this.parseCrossRefAuthors(data.author),
        year: data['published']?.['date-parts']?.[0]?.[0]?.toString() || data['issued']?.['date-parts']?.[0]?.[0]?.toString(),
        journal: data['container-title']?.[0],
        volume: data.volume,
        issue: data.issue,
        pages: data.page,
        doi: data.DOI,
        url: data.URL,
        publisher: data.publisher,
        issn: data.ISSN?.[0],
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Heuristic extraction from PDF text: DOI first, then title
   */
  async extractFromPdfText(text: string): Promise<Citation | null> {
    try {
      if (!text) return null;
      // 1) DOI detection
      const doiMatch = text.match(/10\.\d{4,9}\/[A-Z0-9._;()/:\-]+/i);
      if (doiMatch) {
        const c = await this.fetchFromDOI(doiMatch[0]);
        if (c) return c;
      }
      // 2) Title heuristic from first ~40 lines
      const firstLines = text.split(/\r?\n/).slice(0, 40).map(l => l.trim()).filter(Boolean);
      const candidates = firstLines
        .filter(l => l.length > 8 && l.length < 200)
        .filter(l => !/abstract|introduction|author|copyright|doi|vol\.|issue|journal|www\.|http|\d{4}/i.test(l))
        .slice(0, 5);
      const guess = candidates.sort((a, b) => b.length - a.length)[0] || firstLines[0];
      if (guess) {
        const c2 = await this.fetchByTitleOrQuery(guess);
        if (c2) return c2;
      }
      return null;
    } catch {
      return null;
    }
  }


  /**
   * Fetch from CrossRef API
   */
  private async fetchFromCrossRef(doi: string): Promise<Citation | null> {
    try {
      const response = await axios.get(`${this.crossrefApi}/${doi}`, {
        timeout: 8000
      });
      
      const data = response.data.message;
      
      return {
        type: this.mapCrossRefType(data.type),
        title: data.title?.[0] || '',
        authors: this.parseCrossRefAuthors(data.author),
        year: data.published?.['date-parts']?.[0]?.[0]?.toString(),
        journal: data['container-title']?.[0],
        volume: data.volume,
        issue: data.issue,
        pages: data.page,
        doi: data.DOI,
        url: data.URL,
        publisher: data.publisher,
        issn: data.ISSN?.[0]
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetch from OpenAlex API
   */
  private async fetchFromOpenAlex(doiUrl: string): Promise<Citation | null> {
    try {
      const response = await axios.get(`${this.openAlexApi}/${doiUrl}`, {
        timeout: 8000
      });
      
      const data = response.data;
      
      return {
        type: data.type || 'article',
        title: data.title || '',
        authors: data.authorships?.map((a: any) => a.author?.display_name).filter(Boolean) || [],
        year: data.publication_year?.toString(),
        journal: data.primary_location?.source?.display_name,
        volume: data.biblio?.volume,
        issue: data.biblio?.issue,
        pages: `${data.biblio?.first_page || ''}-${data.biblio?.last_page || ''}`.replace(/^-|-$/g, ''),
        doi: data.doi?.replace('https://doi.org/', ''),
        url: data.primary_location?.landing_page_url,
        publisher: data.primary_location?.source?.publisher
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse URL and extract metadata
   */
  async fetchFromURL(url: string): Promise<Citation | null> {
    try {
      // Check if it's a DOI URL
      if (url.includes('doi.org') || url.includes('doi:')) {
        const doiMatch = url.match(/10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+/);
        if (doiMatch) {
          return this.fetchFromDOI(doiMatch[0]);
        }
      }

      // Try to extract from arXiv
      if (url.includes('arxiv.org')) {
        return this.fetchFromArxiv(url);
      }

      // Try to extract from PubMed
      if (url.includes('pubmed') || url.includes('ncbi.nlm.nih.gov')) {
        return this.fetchFromPubMed(url);
      }

      // Default to website citation
      return {
        type: 'website',
        title: 'Web Page',
        authors: [],
        url: url,
        accessDate: new Date().toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Error fetching URL metadata:', error);
      return null;
    }
  }

  /**
   * Fetch from arXiv
   */
  private async fetchFromArxiv(url: string): Promise<Citation | null> {
    try {
      const arxivId = url.match(/\d{4}\.\d{4,5}(v\d+)?/)?.[0];
      if (!arxivId) return null;

      const response = await axios.get(`http://export.arxiv.org/api/query?id_list=${arxivId}`, {
        timeout: 8000
      });
      
      const parser = new XmldomParser();
      const doc = parser.parseFromString(response.data, 'text/xml');
      const entry = doc.querySelector('entry');
      
      if (!entry) return null;

      return {
        type: 'article',
        title: entry.querySelector('title')?.textContent || '',
        authors: Array.from(entry.querySelectorAll('author name')).map(n => n.textContent || ''),
        year: entry.querySelector('published')?.textContent?.substring(0, 4),
        url: url,
        journal: 'arXiv preprint'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetch from PubMed
   */
  private async fetchFromPubMed(url: string): Promise<Citation | null> {
    try {
      const pmidMatch = url.match(/(\d{7,8})/);
      if (!pmidMatch) return null;

      const pmid = pmidMatch[1];
      const response = await axios.get(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`,
        { timeout: 8000 }
      );

      const parser = new XmldomParser();
      const doc = parser.parseFromString(response.data, 'text/xml');
      
      const article = doc.querySelector('PubmedArticle');
      if (!article) return null;

      return {
        type: 'article',
        title: article.querySelector('ArticleTitle')?.textContent || '',
        authors: Array.from(article.querySelectorAll('Author')).map(a => {
          const lastName = a.querySelector('LastName')?.textContent || '';
          const foreName = a.querySelector('ForeName')?.textContent || '';
          return `${foreName} ${lastName}`.trim();
        }),
        year: article.querySelector('PubDate Year')?.textContent ?? undefined,
        journal: article.querySelector('Title')?.textContent ?? undefined,
        volume: article.querySelector('Volume')?.textContent ?? undefined,
        issue: article.querySelector('Issue')?.textContent ?? undefined,
        pages: article.querySelector('MedlinePgn')?.textContent ?? undefined,
        doi: article.querySelector('ArticleId[IdType="doi"]')?.textContent ?? undefined,
        url: url
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Format citation in different styles
   */
  formatCitation(citation: Citation): FormattedCitation {
    return {
      apa: this.formatAPA(citation),
      mla: this.formatMLA(citation),
      chicago: this.formatChicago(citation),
      harvard: this.formatHarvard(citation),
      ieee: this.formatIEEE(citation),
      vancouver: this.formatVancouver(citation),
      bibtex: this.formatBibTeX(citation)
    };
  }

  /** Convert to CSL-JSON (common schema for citation tools) */
  toCSLJSON(c: Citation): any {
    const authors = (c.authors || []).map((full) => {
      const parts = full.trim().split(/\s+/);
      const family = parts.pop() || '';
      return { family, given: parts.join(' ') };
    });
    const itemType = c.type === 'article' ? 'article-journal' : c.type;
    const issued = c.year ? { 'date-parts': [[Number(c.year)]] } : undefined;
    const res: any = {
      type: itemType,
      title: c.title,
      author: authors,
      issued,
      DOI: c.doi,
      URL: c.url,
      publisher: c.publisher,
      'container-title': c.journal,
      volume: c.volume,
      issue: c.issue,
      page: c.pages,
      ISBN: c.isbn,
      ISSN: c.issn,
    };
    return res;
  }

  /** Convert to RIS format */
  toRIS(c: Citation): string {
    const ty = c.type === 'article' ? 'JOUR' : c.type === 'book' ? 'BOOK' : 'GEN';
    const lines: string[] = [
      `TY  - ${ty}`,
    ];
    (c.authors || []).forEach(a => lines.push(`AU  - ${a}`));
    if (c.title) lines.push(`TI  - ${c.title}`);
    if (c.journal) lines.push(`JO  - ${c.journal}`);
    if (c.year) lines.push(`PY  - ${c.year}`);
    if (c.volume) lines.push(`VL  - ${c.volume}`);
    if (c.issue) lines.push(`IS  - ${c.issue}`);
    if (c.pages) lines.push(`SP  - ${c.pages}`);
    if (c.publisher) lines.push(`PB  - ${c.publisher}`);
    if (c.doi) lines.push(`DO  - ${c.doi}`);
    if (c.url) lines.push(`UR  - ${c.url}`);
    lines.push('ER  -');
    return lines.join('\n');
  }

  /**
   * Format in APA style
   */
  private formatAPA(c: Citation): string {
    const authorStr = this.formatAuthorsAPA(c.authors);
    const year = c.year ? ` (${c.year})` : '';
    const title = c.type === 'book' ? `*${c.title}*` : c.title;
    
    if (c.type === 'article' && c.journal) {
      const journal = `*${c.journal}*`;
      const volume = c.volume ? `, *${c.volume}*` : '';
      const issue = c.issue ? `(${c.issue})` : '';
      const pages = c.pages ? `, ${c.pages}` : '';
      const doi = c.doi ? `. https://doi.org/${c.doi}` : '';
      return `${authorStr}${year}. ${title}. ${journal}${volume}${issue}${pages}${doi}`;
    }
    
    if (c.type === 'book') {
      const publisher = c.publisher ? `. ${c.publisher}` : '';
      return `${authorStr}${year}. ${title}${publisher}`;
    }
    
    if (c.type === 'website') {
      const accessDate = c.accessDate ? `. Retrieved ${this.formatDate(c.accessDate)}` : '';
      const url = c.url ? `, from ${c.url}` : '';
      return `${authorStr}${year}. ${title}${accessDate}${url}`;
    }
    
    return `${authorStr}${year}. ${title}`;
  }

  /**
   * Format in MLA style
   */
  private formatMLA(c: Citation): string {
    const authorStr = this.formatAuthorsMLA(c.authors);
    const title = c.type === 'book' ? `*${c.title}*` : `"${c.title}"`;
    
    if (c.type === 'article' && c.journal) {
      const journal = `*${c.journal}*`;
      const volume = c.volume ? ` vol. ${c.volume},` : '';
      const issue = c.issue ? ` no. ${c.issue},` : '';
      const year = c.year ? ` ${c.year},` : '';
      const pages = c.pages ? ` pp. ${c.pages}` : '';
      return `${authorStr}. ${title} ${journal},${volume}${issue}${year}${pages}.`;
    }
    
    if (c.type === 'book') {
      const publisher = c.publisher ? `${c.publisher}, ` : '';
      const year = c.year || '';
      return `${authorStr}. ${title} ${publisher}${year}.`;
    }
    
    if (c.type === 'website') {
      const site = c.journal || 'Web';
      const date = c.year || '';
      const accessDate = c.accessDate ? `Accessed ${this.formatDate(c.accessDate)}` : '';
      return `${authorStr}. ${title} *${site}*, ${date}. ${c.url}. ${accessDate}.`;
    }
    
    return `${authorStr}. ${title}`;
  }

  /**
   * Format in Chicago style
   */
  private formatChicago(c: Citation): string {
    const authorStr = this.formatAuthorsChicago(c.authors);
    const title = c.type === 'book' ? `*${c.title}*` : `"${c.title}"`;
    
    if (c.type === 'article' && c.journal) {
      const journal = `*${c.journal}*`;
      const volume = c.volume ? ` ${c.volume}` : '';
      const issue = c.issue ? `, no. ${c.issue}` : '';
      const year = c.year ? ` (${c.year})` : '';
      const pages = c.pages ? `: ${c.pages}` : '';
      return `${authorStr}. ${title} ${journal}${volume}${issue}${year}${pages}.`;
    }
    
    return `${authorStr}. ${title}`;
  }

  /**
   * Format in Harvard style  
   */
  private formatHarvard(c: Citation): string {
    const authorStr = this.formatAuthorsHarvard(c.authors);
    const year = c.year ? ` ${c.year}` : '';
    const title = c.type === 'book' ? `*${c.title}*` : `'${c.title}'`;
    
    if (c.type === 'article' && c.journal) {
      const journal = `*${c.journal}*`;
      const volume = c.volume ? `, vol. ${c.volume}` : '';
      const issue = c.issue ? `, no. ${c.issue}` : '';
      const pages = c.pages ? `, pp. ${c.pages}` : '';
      return `${authorStr}${year}, ${title}, ${journal}${volume}${issue}${pages}.`;
    }
    
    return `${authorStr}${year}, ${title}`;
  }

  /**
   * Format in IEEE style
   */
  private formatIEEE(c: Citation): string {
    const authors = this.formatAuthorsIEEE(c.authors);
    const title = `"${c.title}"`;
    
    if (c.type === 'article' && c.journal) {
      const journal = `*${c.journal}*`;
      const volume = c.volume ? `, vol. ${c.volume}` : '';
      const issue = c.issue ? `, no. ${c.issue}` : '';
      const pages = c.pages ? `, pp. ${c.pages}` : '';
      const year = c.year ? `, ${c.year}` : '';
      return `${authors}, ${title} ${journal}${volume}${issue}${pages}${year}.`;
    }
    
    return `${authors}, ${title}`;
  }

  /**
   * Format in Vancouver style
   */
  private formatVancouver(c: Citation): string {
    const authors = this.formatAuthorsVancouver(c.authors);
    const title = c.title;
    
    if (c.type === 'article' && c.journal) {
      const journal = c.journal;
      const year = c.year ? ` ${c.year}` : '';
      const volume = c.volume ? `;${c.volume}` : '';
      const issue = c.issue ? `(${c.issue})` : '';
      const pages = c.pages ? `:${c.pages}` : '';
      return `${authors}. ${title}. ${journal}${year}${volume}${issue}${pages}.`;
    }
    
    return `${authors}. ${title}`;
  }

  /**
   * Format in BibTeX
   */
  private formatBibTeX(c: Citation): string {
    const type = c.type === 'article' ? '@article' : c.type === 'book' ? '@book' : '@misc';
    const key = this.generateBibTeXKey(c);
    
    const fields: string[] = [];
    if (c.title) fields.push(`  title = {${c.title}}`);
    if (c.authors.length > 0) fields.push(`  author = {${c.authors.join(' and ')}}`);
    if (c.year) fields.push(`  year = {${c.year}}`);
    if (c.journal) fields.push(`  journal = {${c.journal}}`);
    if (c.volume) fields.push(`  volume = {${c.volume}}`);
    if (c.issue) fields.push(`  number = {${c.issue}}`);
    if (c.pages) fields.push(`  pages = {${c.pages}}`);
    if (c.doi) fields.push(`  doi = {${c.doi}}`);
    if (c.url) fields.push(`  url = {${c.url}}`);
    if (c.publisher) fields.push(`  publisher = {${c.publisher}}`);
    
    return `${type}{${key},\n${fields.join(',\n')}\n}`;
  }

  // Helper methods for author formatting
  private formatAuthorsAPA(authors: string[]): string {
    if (authors.length === 0) return 'Unknown';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    if (authors.length <= 20) {
      return authors.slice(0, -1).join(', ') + ', & ' + authors[authors.length - 1];
    }
    return authors.slice(0, 19).join(', ') + ', ... ' + authors[authors.length - 1];
  }

  private formatAuthorsMLA(authors: string[]): string {
    if (authors.length === 0) return 'Unknown';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
    if (authors.length >= 3) return `${authors[0]}, et al`;
    return authors.join(', ');
  }

  private formatAuthorsChicago(authors: string[]): string {
    return this.formatAuthorsAPA(authors);
  }

  private formatAuthorsHarvard(authors: string[]): string {
    if (authors.length === 0) return 'Unknown';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
  }

  private formatAuthorsIEEE(authors: string[]): string {
    if (authors.length === 0) return 'Unknown';
    return authors.map(a => {
      const parts = a.split(' ');
      if (parts.length >= 2) {
        const initials = parts.slice(0, -1).map(p => p[0] + '.').join(' ');
        return `${initials} ${parts[parts.length - 1]}`;
      }
      return a;
    }).join(', ');
  }

  private formatAuthorsVancouver(authors: string[]): string {
    if (authors.length === 0) return 'Unknown';
    if (authors.length <= 6) return authors.join(', ');
    return authors.slice(0, 6).join(', ') + ', et al';
  }

  private generateBibTeXKey(c: Citation): string {
    const author = c.authors[0]?.split(' ').slice(-1)[0] || 'unknown';
    const year = c.year || 'nodate';
    const title = c.title.split(' ')[0]?.toLowerCase() || 'untitled';
    return `${author}${year}${title}`;
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  private mapCrossRefType(type: string): Citation['type'] {
    if (type.includes('book')) return 'book';
    if (type.includes('proceedings')) return 'conference';
    if (type.includes('report')) return 'report';
    if (type.includes('thesis')) return 'thesis';
    return 'article';
  }

  private parseCrossRefAuthors(authors: any[]): string[] {
    if (!authors) return [];
    return authors.map(a => {
      if (a.given && a.family) {
        return `${a.given} ${a.family}`;
      }
      return a.name || '';
    }).filter(Boolean);
  }
}

export const citationService = new CitationService();
