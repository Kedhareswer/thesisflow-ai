/**
 * CSV Extractor using papaparse library
 */

import { BaseExtractor, ExtractedContent, ExtractionOptions } from './base-extractor';
import Papa from 'papaparse';

export class CsvExtractor extends BaseExtractor {
  constructor(options: ExtractionOptions = {}) {
    super(options);
  }

  async extract(buffer: Buffer, filename?: string): Promise<ExtractedContent> {
    try {
      this.reportProgress(0, 100, 'Parsing CSV', 'Loading CSV file...');

      const text = buffer.toString('utf-8');
      
      this.reportProgress(20, 100, 'Analyzing CSV', 'Parsing CSV structure...');

      // Parse CSV with papaparse
      const parseResult = Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP]
      });

      this.reportProgress(50, 100, 'Processing data', 'Extracting content...');

      const result: ExtractedContent = {
        text: '',
        metadata: {},
        tables: []
      };

      // Handle parsing errors
      if (parseResult.errors.length > 0) {
        console.warn('CSV parsing warnings:', parseResult.errors);
      }

      // Extract data as table
      if (this.options.extractTables && parseResult.data.length > 0) {
        const headers = parseResult.meta.fields || [];
        const rows = parseResult.data.map((row: any) => {
          return headers.map(header => {
            const value = row[header];
            return value !== null && value !== undefined ? String(value) : '';
          });
        });

        result.tables = [{
          headers,
          rows
        }];

        this.reportProgress(70, 100, 'Extracting tables', `Processed ${rows.length} rows`);
      }

      // Extract as text if requested
      if (this.options.extractText) {
        // Convert to readable text format
        if (parseResult.meta.fields && parseResult.data.length > 0) {
          const textLines: string[] = [];
          
          // Add headers
          textLines.push(parseResult.meta.fields.join(', '));
          
          // Add data rows
          parseResult.data.forEach((row: any) => {
            const rowValues = parseResult.meta.fields!.map(field => {
              const value = row[field];
              return value !== null && value !== undefined ? String(value) : '';
            });
            textLines.push(rowValues.join(', '));
          });
          
          result.text = textLines.join('\n');
        } else {
          // Fallback to raw text if parsing failed
          result.text = text;
        }
      }

      // Extract metadata
      if (this.options.extractMetadata) {
        this.reportProgress(80, 100, 'Extracting metadata', 'Processing file properties...');
        
        result.metadata = {
          title: filename?.replace(/\.csv$/i, ''),
          rowCount: parseResult.data.length,
          columnCount: parseResult.meta.fields?.length || 0,
          delimiter: parseResult.meta.delimiter,
          linebreak: parseResult.meta.linebreak,
          aborted: parseResult.meta.aborted,
          truncated: parseResult.meta.truncated,
          wordCount: this.getWordCount(result.text),
          extractedAt: new Date()
        };

        // Add column statistics
        if (parseResult.meta.fields && parseResult.data.length > 0) {
          const columnStats: Record<string, any> = {};
          
          parseResult.meta.fields.forEach(field => {
            const columnValues = parseResult.data.map((row: any) => row[field]);
            const nonNullValues = columnValues.filter(v => v !== null && v !== undefined && v !== '');
            
            columnStats[field] = {
              totalValues: columnValues.length,
              nonNullValues: nonNullValues.length,
              nullValues: columnValues.length - nonNullValues.length,
              uniqueValues: new Set(nonNullValues).size,
              dataTypes: this.detectDataTypes(nonNullValues)
            };
          });
          
          result.metadata.columnStatistics = columnStats;
        }
      }

      this.reportProgress(100, 100, 'Complete', 'CSV extraction finished');
      return result;

    } catch (error) {
      console.error('CSV extraction error:', error);
      throw new Error(`Failed to extract CSV content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect data types in column values
   */
  private detectDataTypes(values: any[]): Record<string, number> {
    const types: Record<string, number> = {
      string: 0,
      number: 0,
      boolean: 0,
      date: 0
    };

    values.forEach(value => {
      if (typeof value === 'number') {
        types.number++;
      } else if (typeof value === 'boolean') {
        types.boolean++;
      } else if (typeof value === 'string') {
        // Check if it's a date
        const dateValue = Date.parse(value);
        if (!isNaN(dateValue) && value.match(/\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/)) {
          types.date++;
        } else {
          types.string++;
        }
      } else {
        types.string++;
      }
    });

    return types;
  }

  getSupportedExtensions(): string[] {
    return ['csv', 'tsv', 'txt'];
  }
}
