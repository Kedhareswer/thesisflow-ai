import Cite from 'citation-js'

export interface CSLItem {
  id: string
  type: string
  title: string
  author?: Array<{ family: string; given: string }>
  issued?: { 'date-parts': [[number, number?, number?]] }
  'container-title'?: string
  volume?: string
  issue?: string
  page?: string
  DOI?: string
  URL?: string
  publisher?: string
  'publisher-place'?: string
}

export class CSLEngine {
  private static instance: CSLEngine
  private cite: typeof Cite

  constructor() {
    this.cite = Cite
  }

  static getInstance(): CSLEngine {
    if (!CSLEngine.instance) {
      CSLEngine.instance = new CSLEngine()
    }
    return CSLEngine.instance
  }

  // Convert paper object to CSL JSON format
  paperToCSL(paper: any): CSLItem {
    const authors = Array.isArray(paper.authors) 
      ? paper.authors.map((a: any) => {
          if (typeof a === 'string') {
            const parts = a.split(' ')
            return { family: parts.pop() || '', given: parts.join(' ') }
          }
          return { family: a?.name?.split(' ').pop() || '', given: a?.name?.split(' ').slice(0, -1).join(' ') || '' }
        })
      : []

    const year = paper.year || paper.publication_year
    const issued = year ? { 'date-parts': [[parseInt(year)]] as [[number, number?, number?]] } : undefined

    return {
      id: paper.id || `paper-${Math.random().toString(36).substring(2)}`,
      type: paper.type || 'article-journal',
      title: paper.title || 'Untitled',
      author: authors,
      issued,
      'container-title': paper.journal?.title || paper.journal || paper.venue,
      volume: paper.volume,
      issue: paper.issue,
      page: paper.pages,
      DOI: paper.doi,
      URL: paper.url,
    }
  }

  // Format citations using CSL styles
  formatCitations(papers: any[], style = 'ieee'): string {
    try {
      const cslItems = papers.map(p => this.paperToCSL(p))
      const cite = new this.cite(cslItems)
      
      // Map our template names to CSL style names
      const styleMap: Record<string, string> = {
        'ieee': 'ieee',
        'acm': 'acm-sig-proceedings',
        'springer': 'springer-lecture-notes-in-computer-science',
        'elsevier': 'elsevier-harvard',
        'apa': 'apa',
        'mla': 'modern-language-association',
        'chicago': 'chicago-author-date',
        'harvard': 'harvard-cite-them-right',
        'general': 'apa'
      }

      const cslStyle = styleMap[style] || 'apa'
      return cite.format('bibliography', { format: 'text', style: cslStyle })
    } catch (error) {
      console.warn('CSL formatting failed, falling back to manual formatting:', error)
      return this.fallbackFormat(papers, style)
    }
  }

  // Fallback manual formatting
  private fallbackFormat(papers: any[], style: string): string {
    return papers.map((paper, i) => {
      const authors = Array.isArray(paper.authors)
        ? paper.authors.map((a: any) => typeof a === 'string' ? a : a?.name || '').filter(Boolean).join(', ')
        : ''
      const title = paper.title || 'Untitled'
      const journal = paper.journal?.title || paper.journal || paper.venue || ''
      const year = paper.year || paper.publication_year || ''
      const doi = paper.doi ? ` DOI: ${paper.doi}` : ''
      const url = paper.url ? ` URL: ${paper.url}` : ''

      if (['ieee', 'acm', 'springer', 'elsevier'].includes(style)) {
        return `[${i + 1}] ${authors}, "${title}," ${journal ? `${journal}, ` : ''}${year}.${doi}`
      } else {
        // Author-year styles
        return `${authors} (${year}). ${title}. ${journal ? `${journal}.` : ''}${doi || url}`
      }
    }).join('\n')
  }

  // Generate LaTeX bibliography block
  generateBibliography(papers: any[], style = 'ieee'): string {
    const items = papers.map((paper, i) => {
      const n = i + 1
      const authors = Array.isArray(paper.authors)
        ? paper.authors.map((a: any) => typeof a === 'string' ? a : a?.name || '').filter(Boolean).join(', ')
        : ''
      const title = paper.title || 'Untitled'
      const journal = paper.journal?.title || paper.journal || paper.venue || ''
      const year = paper.year || paper.publication_year || ''
      const doi = paper.doi ? ` doi: ${paper.doi}.` : ''
      const url = paper.url ? ` URL: ${paper.url}.` : ''

      if (['ieee', 'acm', 'springer', 'elsevier'].includes(style)) {
        return `\\bibitem{ref${n}} ${authors}, "${title}," ${journal ? `\\textit{${journal}}, ` : ''}${year}.${doi}`
      } else {
        return `\\bibitem{ref${n}} ${authors} (${year}). ${title}.${journal ? ` ${journal}.` : ''}${doi || url}`
      }
    }).join('\n')

    return `\\section*{References}\n\\begin{thebibliography}{99}\n${items}\n\\end{thebibliography}`
  }
}

export const cslEngine = CSLEngine.getInstance()
