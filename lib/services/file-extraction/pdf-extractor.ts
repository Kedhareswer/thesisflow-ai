/**
 * PDF Extractor using pdf-parse library
 */

import { BaseExtractor, ExtractedContent, ExtractionOptions } from './base-extractor';
import pdf from 'pdf-parse';

export class PDFExtractor extends BaseExtractor {
  constructor(options: ExtractionOptions = {}) {
    super(options);
  }

  async extract(buffer: Buffer, filename?: string): Promise<ExtractedContent> {
    try {
      this.reportProgress(0, 100, 'Parsing PDF', 'Loading PDF document...');

      // Parse PDF with pdf-parse
      const data = await pdf(buffer, {
        max: this.options.maxPages || 0, // 0 means all pages
        version: 'v2.0.550'
      });

      this.reportProgress(30, 100, 'Extracting content', 'Processing pages...');

      const result: ExtractedContent = {
        text: '',
        metadata: {},
        tables: []
      };

      // Extract text
      if (this.options.extractText) {
        result.text = this.cleanText(data.text);
        this.reportProgress(60, 100, 'Extracting text', `Extracted ${result.text.length} characters`);
      }

      // Extract metadata
      if (this.options.extractMetadata) {
        result.metadata = {
          title: data.info?.Title || filename?.replace(/\.pdf$/i, ''),
          author: data.info?.Author,
          created: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
          modified: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
          pageCount: data.numpages,
          wordCount: this.getWordCount(result.text),
          producer: data.info?.Producer,
          creator: data.info?.Creator,
          subject: data.info?.Subject,
          keywords: data.info?.Keywords,
          pdfVersion: data.version
        };
        this.reportProgress(80, 100, 'Extracting metadata', 'Processing document properties...');
      }

      // Extract tables (basic implementation - can be enhanced with more sophisticated table detection)
      if (this.options.extractTables && result.text) {
        const tables = this.extractTablesFromText(result.text);
        if (tables.length > 0) {
          result.tables = tables;
        }
        this.reportProgress(90, 100, 'Extracting tables', `Found ${tables.length} tables`);
      }

      this.reportProgress(100, 100, 'Complete', 'PDF extraction finished');
      return result;

    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Basic table extraction from text using heuristics
   */
  private extractTablesFromText(text: string): Array<{ headers: string[]; rows: string[][]; caption?: string }> {
    const tables: Array<{ headers: string[]; rows: string[][]; caption?: string }> = [];
    const lines = text.split('\n');
    
    let inTable = false;
    let currentTable: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Simple heuristic: lines with multiple consecutive spaces or tabs might be table rows
      const hasMultipleColumns = (line.match(/\s{2,}|\t/g) || []).length >= 2;
      
      if (hasMultipleColumns) {
        if (!inTable) {
          inTable = true;
          currentTable = [];
        }
        currentTable.push(line);
      } else if (inTable && currentTable.length > 1) {
        // Process accumulated table lines
        const processedTable = this.processTableLines(currentTable);
        if (processedTable) {
          tables.push(processedTable);
        }
        inTable = false;
        currentTable = [];
      }
    }
    
    // Process any remaining table
    if (inTable && currentTable.length > 1) {
      const processedTable = this.processTableLines(currentTable);
      if (processedTable) {
        tables.push(processedTable);
      }
    }
    
    return tables;
  }

  /**
   * Process table lines into structured format
   */
  private processTableLines(lines: string[]): { headers: string[]; rows: string[][] } | null {
    if (lines.length < 2) return null;
    
    // Split each line by multiple spaces or tabs
    const splitLine = (line: string) => {
      return line.split(/\s{2,}|\t+/).map(cell => cell.trim()).filter(cell => cell.length > 0);
    };
    
    const headers = splitLine(lines[0]);
    const rows = lines.slice(1).map(line => splitLine(line));
    
    // Filter out rows that don't match the column count (likely not part of the table)
    const validRows = rows.filter(row => row.length === headers.length);
    
    if (validRows.length === 0) return null;
    
    return { headers, rows: validRows };
  }

  getSupportedExtensions(): string[] {
    return ['pdf'];
  }
}
