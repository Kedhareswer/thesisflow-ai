import type { ResearchPaper, ExportFormat } from '@/lib/types/common'

/**
 * Service for exporting research papers in various citation formats
 */
export class CitationExportService {
  
  /**
   * Export papers in the specified format
   */
  static async exportPapers(papers: ResearchPaper[], format: ExportFormat['format']): Promise<string> {
    switch (format) {
      case 'bibtex':
        return this.exportBibTeX(papers)
      case 'apa':
        return this.exportAPA(papers)
      case 'mla':
        return this.exportMLA(papers)
      case 'chicago':
        return this.exportChicago(papers)
      case 'harvard':
        return this.exportHarvard(papers)
      case 'json':
        return this.exportJSON(papers)
      case 'csv':
        return this.exportCSV(papers)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Export as BibTeX format
   */
  private static exportBibTeX(papers: ResearchPaper[]): string {
    return papers.map(paper => {
      const authors = paper.authors.join(' and ')
      const year = paper.year
      const title = paper.title.replace(/[{}]/g, '') // Remove BibTeX special characters
      const journal = paper.journal || paper.venue || ''
      const doi = paper.doi
      const url = paper.url
      
      const entryKey = this.generateBibTeXKey(paper)
      const entryType = this.determineBibTeXType(paper)
      
      let bibtex = `@${entryType}{${entryKey},\n`
      bibtex += `  title={${title}},\n`
      bibtex += `  author={${authors}},\n`
      if (year) bibtex += `  year={${year}},\n`
      if (journal) bibtex += `  journal={${journal}},\n`
      if (doi) bibtex += `  doi={${doi}},\n`
      if (url) bibtex += `  url={${url}},\n`
      if (paper.abstract) bibtex += `  abstract={${paper.abstract.replace(/[{}]/g, '')}},\n`
      bibtex += '}\n'
      
      return bibtex
    }).join('\n')
  }

  /**
   * Export as APA format
   */
  private static exportAPA(papers: ResearchPaper[]): string {
    return papers.map(paper => {
      const authors = this.formatAuthorsAPA(paper.authors)
      const year = paper.year ? `(${paper.year})` : ''
      const title = paper.title
      const journal = paper.journal || paper.venue
      const doi = paper.doi ? `https://doi.org/${paper.doi}` : paper.url
      
      let citation = `${authors} ${year}. ${title}.`
      if (journal) citation += ` *${journal}*.`
      if (doi) citation += ` ${doi}`
      
      return citation
    }).join('\n\n')
  }

  /**
   * Export as MLA format
   */
  private static exportMLA(papers: ResearchPaper[]): string {
    return papers.map(paper => {
      const authors = this.formatAuthorsMLA(paper.authors)
      const title = `"${paper.title}"`
      const journal = paper.journal || paper.venue
      const year = paper.year
      const url = paper.doi ? `https://doi.org/${paper.doi}` : paper.url
      
      let citation = `${authors}. ${title}`
      if (journal) citation += ` *${journal}*,`
      if (year) citation += ` ${year}.`
      if (url) citation += ` Web. ${new Date().toLocaleDateString()}.`
      
      return citation
    }).join('\n\n')
  }

  /**
   * Export as Chicago format
   */
  private static exportChicago(papers: ResearchPaper[]): string {
    return papers.map(paper => {
      const authors = this.formatAuthorsChicago(paper.authors)
      const title = `"${paper.title}"`
      const journal = paper.journal || paper.venue
      const year = paper.year
      const doi = paper.doi ? `https://doi.org/${paper.doi}` : paper.url
      
      let citation = `${authors}. ${title}.`
      if (journal) citation += ` *${journal}*`
      if (year) citation += ` (${year})`
      if (doi) citation += `. ${doi}.`
      
      return citation
    }).join('\n\n')
  }

  /**
   * Export as Harvard format
   */
  private static exportHarvard(papers: ResearchPaper[]): string {
    return papers.map(paper => {
      const authors = this.formatAuthorsHarvard(paper.authors)
      const year = paper.year
      const title = paper.title
      const journal = paper.journal || paper.venue
      const doi = paper.doi ? `https://doi.org/${paper.doi}` : paper.url
      
      let citation = `${authors} ${year}, '${title}'`
      if (journal) citation += `, *${journal}*`
      if (doi) citation += `, available at: ${doi}`
      citation += '.'
      
      return citation
    }).join('\n\n')
  }

  /**
   * Export as JSON format
   */
  private static exportJSON(papers: ResearchPaper[]): string {
    return JSON.stringify(papers, null, 2)
  }

  /**
   * Export as CSV format
   */
  private static exportCSV(papers: ResearchPaper[]): string {
    const headers = [
      'Title', 'Authors', 'Year', 'Journal', 'Abstract', 'DOI', 'URL', 
      'Citations', 'Open Access', 'Field of Study'
    ]
    
    const rows = papers.map(paper => [
      this.escapeCsv(paper.title),
      this.escapeCsv(paper.authors.join('; ')),
      paper.year?.toString() || '',
      this.escapeCsv(paper.journal || paper.venue || ''),
      this.escapeCsv(paper.abstract || ''),
      paper.doi || '',
      paper.url || '',
      paper.cited_by_count?.toString() || '',
      paper.open_access?.is_oa ? 'Yes' : 'No',
      this.escapeCsv(paper.field_of_study?.join('; ') || '')
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  /**
   * Helper methods for formatting authors in different styles
   */
  private static formatAuthorsAPA(authors: string[]): string {
    if (authors.length === 0) return ''
    if (authors.length === 1) return authors[0]
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`
    
    const lastAuthor = authors[authors.length - 1]
    const otherAuthors = authors.slice(0, -1).join(', ')
    return `${otherAuthors}, & ${lastAuthor}`
  }

  private static formatAuthorsMLA(authors: string[]): string {
    if (authors.length === 0) return ''
    if (authors.length === 1) return authors[0]
    
    const firstAuthor = authors[0]
    const otherAuthors = authors.slice(1)
    return `${firstAuthor}, et al.`
  }

  private static formatAuthorsChicago(authors: string[]): string {
    if (authors.length === 0) return ''
    if (authors.length === 1) return authors[0]
    if (authors.length === 2) return `${authors[0]} and ${authors[1]}`
    
    const lastAuthor = authors[authors.length - 1]
    const otherAuthors = authors.slice(0, -1).join(', ')
    return `${otherAuthors}, and ${lastAuthor}`
  }

  private static formatAuthorsHarvard(authors: string[]): string {
    if (authors.length === 0) return ''
    if (authors.length === 1) return authors[0]
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`
    
    return `${authors[0]} et al.`
  }

  /**
   * Generate BibTeX entry key
   */
  private static generateBibTeXKey(paper: ResearchPaper): string {
    const firstAuthor = paper.authors[0]?.split(' ').pop() || 'unknown'
    const year = paper.year || new Date().getFullYear()
    const titleWords = paper.title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 2)
      .join('')
    
    return `${firstAuthor.toLowerCase()}${year}${titleWords}`
  }

  /**
   * Determine BibTeX entry type
   */
  private static determineBibTeXType(paper: ResearchPaper): string {
    const venue = paper.venue?.toLowerCase() || ''
    const type = paper.type?.toLowerCase() || ''
    
    if (venue.includes('conference') || venue.includes('proceedings') || type.includes('conference')) {
      return 'inproceedings'
    }
    if (venue.includes('journal') || type.includes('journal')) {
      return 'article'
    }
    if (venue.includes('book') || type.includes('book')) {
      return 'book'
    }
    if (venue.includes('thesis') || type.includes('thesis')) {
      return 'phdthesis'
    }
    
    return 'misc'
  }

  /**
   * Escape CSV values
   */
  private static escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  /**
   * Download exported content as file
   */
  static downloadFile(content: string, filename: string, format: ExportFormat['format']): void {
    const mimeTypes = {
      bibtex: 'application/x-bibtex',
      apa: 'text/plain',
      mla: 'text/plain',
      chicago: 'text/plain',
      harvard: 'text/plain',
      json: 'application/json',
      csv: 'text/csv'
    }
    
    const blob = new Blob([content], { type: mimeTypes[format] })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
} 