/**
 * DOCX/Word Extractor using mammoth.js library
 */

import { BaseExtractor, ExtractedContent, ExtractionOptions } from './base-extractor';
const mammoth = require('mammoth');

export class DocxExtractor extends BaseExtractor {
  constructor(options: ExtractionOptions = {}) {
    super(options);
  }

  async extract(buffer: Buffer, filename?: string): Promise<ExtractedContent> {
    try {
      this.reportProgress(0, 100, 'Parsing DOCX', 'Loading Word document...');

      const result: ExtractedContent = {
        text: '',
        metadata: {},
        tables: [],
        images: []
      };

      // Extract HTML and raw text based on options
      if (this.options.extractText || this.options.extractTables) {
        this.reportProgress(20, 100, 'Converting document', 'Processing document content...');

        // Convert to HTML for structured content (tables, lists, etc.)
        const htmlResult = await mammoth.convertToHtml(
          { buffer: buffer },
          {
            styleMap: [
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh",
              "table => table",
              "tr => tr",
              "td => td",
              "th => th"
            ]
          }
        );

        // Also get raw text for cleaner text extraction
        const textResult = await mammoth.extractRawText({ buffer: buffer });
        
        this.reportProgress(50, 100, 'Extracting content', 'Processing text and tables...');

        // Use raw text for main text content
        if (this.options.extractText) {
          result.text = this.cleanText(textResult.value);
        }

        // Extract tables from HTML
        if (this.options.extractTables) {
          const tables = this.extractTablesFromHtml(htmlResult.value);
          if (tables.length > 0) {
            result.tables = tables;
          }
          this.reportProgress(70, 100, 'Extracting tables', `Found ${tables.length} tables`);
        }

        // Collect any messages/warnings if they exist
        if (htmlResult.messages && htmlResult.messages.length > 0) {
          console.warn('Mammoth HTML conversion messages:', htmlResult.messages);
        }
        if (textResult.messages && textResult.messages.length > 0) {
          console.warn('Mammoth text conversion messages:', textResult.messages);
        }
      }

      // Extract metadata
      if (this.options.extractMetadata) {
        this.reportProgress(80, 100, 'Extracting metadata', 'Processing document properties...');
        
        // Basic metadata from content analysis
        result.metadata = {
          title: this.extractTitleFromContent(result.text) || filename?.replace(/\.docx?$/i, ''),
          wordCount: this.getWordCount(result.text),
          // Note: mammoth doesn't provide direct access to document properties
          // For full metadata extraction, we'd need to parse the DOCX XML structure
          extractedAt: new Date()
        };
      }

      this.reportProgress(100, 100, 'Complete', 'DOCX extraction finished');
      return result;

    } catch (error) {
      console.error('DOCX extraction error:', error);
      throw new Error(`Failed to extract DOCX content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract tables from HTML content
   */
  private extractTablesFromHtml(html: string): Array<{ headers: string[]; rows: string[][]; caption?: string }> {
    const tables: Array<{ headers: string[]; rows: string[][]; caption?: string }> = [];
    
    // Simple regex-based table extraction
    const tableRegex = /<table[^>]*>.*?<\/table>/gi;
    const rowRegex = /<tr[^>]*>.*?<\/tr>/gi;
    const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gi;
    
    let tableMatch;
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[0];
      const extractedTable: { headers: string[]; rows: string[][] } = {
        headers: [],
        rows: []
      };
      
      let rowMatch;
      let isFirstRow = true;
      
      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const rowHtml = rowMatch[1];
        const cells: string[] = [];
        
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          // Remove HTML tags from cell content
          const cellText = cellMatch[1].replace(/<[^>]*>/g, '').trim();
          cells.push(cellText);
        }
        
        if (cells.length > 0) {
          // Check if this row contains headers (th tags or first row)
          const hasThTags = rowHtml.includes('<th');
          
          if (hasThTags || (isFirstRow && extractedTable.headers.length === 0)) {
            extractedTable.headers = cells;
          } else {
            extractedTable.rows.push(cells);
          }
          
          isFirstRow = false;
        }
      }
      
      if (extractedTable.headers.length > 0 || extractedTable.rows.length > 0) {
        tables.push(extractedTable);
      }
    }
    
    return tables;
  }

  /**
   * Try to extract title from document content
   */
  private extractTitleFromContent(text: string): string | undefined {
    if (!text) return undefined;
    
    // Look for the first non-empty line as potential title
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length > 0) {
      const firstLine = lines[0];
      // If the first line is reasonably short, consider it as title
      if (firstLine.length < 200) {
        return firstLine;
      }
    }
    
    return undefined;
  }

  getSupportedExtensions(): string[] {
    return ['docx', 'doc'];
  }
}
