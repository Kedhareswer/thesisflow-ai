/**
 * Base extractor interface for all file format extractors
 */

export interface ExtractedContent {
  text: string;
  tables?: Array<{
    headers: string[];
    rows: string[][];
    caption?: string;
  }>;
  metadata?: {
    title?: string;
    author?: string;
    created?: Date;
    modified?: Date;
    pageCount?: number;
    wordCount?: number;
    [key: string]: any;
  };
  images?: Array<{
    data: string; // base64 or URL
    alt?: string;
    caption?: string;
    mimeType?: string;
  }>;
  rawContent?: any; // Format-specific raw data
}

export interface ExtractionOptions {
  extractText?: boolean;
  extractTables?: boolean;
  extractImages?: boolean;
  extractMetadata?: boolean;
  ocrEnabled?: boolean;
  maxPages?: number;
  language?: string;
}

export interface ExtractionProgress {
  current: number;
  total: number;
  phase: string;
  message?: string;
}

export type ProgressCallback = (progress: ExtractionProgress) => void;

export abstract class BaseExtractor {
  protected options: ExtractionOptions;
  protected progressCallback?: ProgressCallback;

  constructor(options: ExtractionOptions = {}) {
    this.options = {
      extractText: true,
      extractTables: true,
      extractImages: false,
      extractMetadata: true,
      ocrEnabled: false,
      ...options
    };
  }

  /**
   * Set progress callback for real-time updates
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Report progress to callback if set
   */
  protected reportProgress(current: number, total: number, phase: string, message?: string): void {
    if (this.progressCallback) {
      this.progressCallback({ current, total, phase, message });
    }
  }

  /**
   * Extract content from buffer
   */
  abstract extract(buffer: Buffer, filename?: string): Promise<ExtractedContent>;

  /**
   * Get supported file extensions
   */
  abstract getSupportedExtensions(): string[];

  /**
   * Validate if file is supported
   */
  canExtract(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return this.getSupportedExtensions().includes(ext || '');
  }

  /**
   * Clean and normalize extracted text
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\t/g, '  ')
      .trim();
  }

  /**
   * Extract word count from text
   */
  protected getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
