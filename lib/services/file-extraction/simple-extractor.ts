/**
 * Simplified multi-format file extractor
 * Works with existing data-extraction.service.ts
 */

export interface SimpleExtractedContent {
  text: string;
  metadata: {
    filename?: string;
    fileSize?: number;
    pageCount?: number;
    wordCount?: number;
    extractedAt: string;
  };
  tables?: Array<{
    headers: string[];
    rows: string[][];
  }>;
}

export class SimpleExtractor {
  /**
   * Extract content from various file types
   */
  async extract(file: File): Promise<SimpleExtractedContent> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return this.extractPDF(file);
      case 'docx':
      case 'doc':
        return this.extractWord(file);
      case 'csv':
        return this.extractCSV(file);
      case 'txt':
        return this.extractText(file);
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  /**
   * Extract text from PDF using pdf-parse
   */
  private async extractPDF(file: File): Promise<SimpleExtractedContent> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Dynamic import of internal implementation to avoid root index debug code
      const pdfModule = await import('pdf-parse/lib/pdf-parse');
      const pdf = (pdfModule as any).default ?? (pdfModule as any);
      const data = await pdf(buffer);
      
      return {
        text: this.cleanText(data.text),
        metadata: {
          filename: file.name,
          fileSize: file.size,
          pageCount: data.numpages,
          wordCount: this.getWordCount(data.text),
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract PDF content');
    }
  }

  /**
   * Extract text from Word document using mammoth
   */
  private async extractWord(file: File): Promise<SimpleExtractedContent> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Dynamic import to avoid build issues
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: buffer });
      
      return {
        text: this.cleanText(result.value),
        metadata: {
          filename: file.name,
          fileSize: file.size,
          wordCount: this.getWordCount(result.value),
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Word extraction error:', error);
      throw new Error('Failed to extract Word document content');
    }
  }

  /**
   * Extract text from CSV using Papa Parse
   */
  private async extractCSV(file: File): Promise<SimpleExtractedContent> {
    try {
      const text = await file.text();
      
      // Dynamic import to avoid build issues
      const Papa = await import('papaparse');
      const result = Papa.default.parse(text, { header: true, skipEmptyLines: true });
      
      const csvText = result.data.map((row: any) => 
        Object.values(row).join(' ')
      ).join('\n');
      
      const tables = [{
        headers: result.meta.fields || [],
        rows: result.data.map((row: any) => 
          (result.meta.fields || []).map(field => String(row[field] || ''))
        )
      }];
      
      return {
        text: this.cleanText(csvText),
        metadata: {
          filename: file.name,
          fileSize: file.size,
          wordCount: this.getWordCount(csvText),
          extractedAt: new Date().toISOString()
        },
        tables
      };
    } catch (error) {
      console.error('CSV extraction error:', error);
      throw new Error('Failed to extract CSV content');
    }
  }

  /**
   * Extract plain text
   */
  private async extractText(file: File): Promise<SimpleExtractedContent> {
    try {
      const text = await file.text();
      
      return {
        text: this.cleanText(text),
        metadata: {
          filename: file.name,
          fileSize: file.size,
          wordCount: this.getWordCount(text),
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Text extraction error:', error);
      throw new Error('Failed to extract text content');
    }
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\t/g, '  ')
      .trim();
  }

  /**
   * Get word count
   */
  private getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return ['pdf', 'docx', 'doc', 'csv', 'txt'];
  }
}
