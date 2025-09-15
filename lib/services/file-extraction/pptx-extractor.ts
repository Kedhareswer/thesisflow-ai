/**
 * PowerPoint Extractor using node-pptx library
 */

import { BaseExtractor, ExtractedContent, ExtractionOptions } from './base-extractor';
import AdmZip from 'adm-zip';
import xml2js from 'xml2js';

export class PptxExtractor extends BaseExtractor {
  constructor(options: ExtractionOptions = {}) {
    super(options);
  }

  async extract(buffer: Buffer, filename?: string): Promise<ExtractedContent> {
    try {
      this.reportProgress(0, 100, 'Parsing PPTX', 'Loading PowerPoint presentation...');

      const result: ExtractedContent = {
        text: '',
        metadata: {},
        tables: []
      };

      // PPTX files are ZIP archives containing XML files
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      this.reportProgress(20, 100, 'Analyzing presentation', 'Reading slide content...');

      // Extract text from slides
      const slideTexts: string[] = [];
      const slideTables: Array<{ headers: string[]; rows: string[][] }> = [];
      let slideCount = 0;

      // Parse core properties for metadata
      const corePropsEntry = zip.getEntry('docProps/core.xml');
      if (corePropsEntry && this.options.extractMetadata) {
        const coreXml = zip.readAsText(corePropsEntry);
        const coreProps = await this.parseXml(coreXml);
        
        if (coreProps['cp:coreProperties']) {
          const props = coreProps['cp:coreProperties'];
          result.metadata = {
            title: this.extractXmlText(props['dc:title']) || filename?.replace(/\.pptx?$/i, ''),
            author: this.extractXmlText(props['dc:creator']),
            subject: this.extractXmlText(props['dc:subject']),
            keywords: this.extractXmlText(props['cp:keywords']),
            created: props['dcterms:created']?.[0]?._ ? new Date(props['dcterms:created'][0]._) : undefined,
            modified: props['dcterms:modified']?.[0]?._ ? new Date(props['dcterms:modified'][0]._) : undefined,
            lastModifiedBy: this.extractXmlText(props['cp:lastModifiedBy'])
          };
        }
      }

      // Extract app properties for slide count
      const appPropsEntry = zip.getEntry('docProps/app.xml');
      if (appPropsEntry) {
        const appXml = zip.readAsText(appPropsEntry);
        const appProps = await this.parseXml(appXml);
        
        if (appProps['Properties']) {
          slideCount = parseInt(this.extractXmlText(appProps['Properties']['Slides']) || '0');
          if (result.metadata) {
            result.metadata.slideCount = slideCount;
            result.metadata.application = this.extractXmlText(appProps['Properties']['Application']);
          }
        }
      }

      this.reportProgress(40, 100, 'Extracting content', `Processing ${slideCount} slides...`);

      // Process each slide
      for (let i = 1; i <= slideCount || i <= 100; i++) {
        const slideEntry = zip.getEntry(`ppt/slides/slide${i}.xml`);
        if (!slideEntry) {
          if (i > slideCount) break;
          continue;
        }

        const slideXml = zip.readAsText(slideEntry);
        const slideData = await this.parseXml(slideXml);
        
        // Extract text from slide
        if (this.options.extractText) {
          const slideText = this.extractTextFromSlide(slideData);
          if (slideText) {
            slideTexts.push(`Slide ${i}:\n${slideText}`);
          }
        }

        // Extract tables from slide
        if (this.options.extractTables) {
          const tables = this.extractTablesFromSlide(slideData);
          slideTables.push(...tables);
        }

        const progress = 40 + Math.round((i / slideCount) * 40);
        this.reportProgress(progress, 100, 'Extracting slides', `Processed slide ${i}/${slideCount}`);
      }

      // Extract notes if present
      const notesTexts: string[] = [];
      for (let i = 1; i <= slideCount || i <= 100; i++) {
        const notesEntry = zip.getEntry(`ppt/notesSlides/notesSlide${i}.xml`);
        if (!notesEntry) continue;

        const notesXml = zip.readAsText(notesEntry);
        const notesData = await this.parseXml(notesXml);
        const notesText = this.extractTextFromSlide(notesData);
        
        if (notesText) {
          notesTexts.push(`Slide ${i} Notes:\n${notesText}`);
        }
      }

      // Combine all text
      if (this.options.extractText) {
        const allText = [...slideTexts, ...notesTexts].join('\n\n');
        result.text = this.cleanText(allText);
      }

      // Add tables to result
      if (this.options.extractTables && slideTables.length > 0) {
        result.tables = slideTables;
      }

      // Add word count to metadata
      if (result.metadata) {
        result.metadata.wordCount = this.getWordCount(result.text);
        result.metadata.tableCount = slideTables.length;
        result.metadata.extractedAt = new Date();
      }

      this.reportProgress(100, 100, 'Complete', 'PowerPoint extraction finished');
      return result;

    } catch (error) {
      console.error('PPTX extraction error:', error);
      throw new Error(`Failed to extract PowerPoint content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse XML string to object
   */
  private async parseXml(xml: string): Promise<any> {
    const parser = new xml2js.Parser({ 
      explicitArray: true,
      preserveChildrenOrder: true,
      explicitCharkey: true
    });
    return parser.parseStringPromise(xml);
  }

  /**
   * Extract text from XML element
   */
  private extractXmlText(element: any): string | undefined {
    if (!element) return undefined;
    if (typeof element === 'string') return element;
    if (Array.isArray(element) && element.length > 0) {
      return this.extractXmlText(element[0]);
    }
    if (element._ !== undefined) return element._;
    if (element['#text']) return element['#text'];
    return undefined;
  }

  /**
   * Extract text content from slide XML
   */
  private extractTextFromSlide(slideData: any): string {
    const texts: string[] = [];
    
    // Recursively extract text from the slide structure
    const extractFromNode = (node: any): void => {
      if (!node) return;
      
      // Look for text runs
      if (node['a:t']) {
        if (Array.isArray(node['a:t'])) {
          node['a:t'].forEach((t: any) => {
            const text = this.extractXmlText(t);
            if (text) texts.push(text);
          });
        } else {
          const text = this.extractXmlText(node['a:t']);
          if (text) texts.push(text);
        }
      }
      
      // Recursively process all properties
      Object.keys(node).forEach(key => {
        if (key !== 'a:t' && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach((item: any) => extractFromNode(item));
          } else {
            extractFromNode(node[key]);
          }
        }
      });
    };
    
    extractFromNode(slideData);
    return texts.join(' ');
  }

  /**
   * Extract tables from slide XML
   */
  private extractTablesFromSlide(slideData: any): Array<{ headers: string[]; rows: string[][] }> {
    const tables: Array<{ headers: string[]; rows: string[][] }> = [];
    
    // Recursively find table elements
    const findTables = (node: any): void => {
      if (!node) return;
      
      // Look for table elements (a:tbl)
      if (node['a:tbl']) {
        const tblArray = Array.isArray(node['a:tbl']) ? node['a:tbl'] : [node['a:tbl']];
        
        tblArray.forEach((tbl: any) => {
          const extractedTable = this.extractTableData(tbl);
          if (extractedTable) {
            tables.push(extractedTable);
          }
        });
      }
      
      // Recursively process all properties
      Object.keys(node).forEach(key => {
        if (key !== 'a:tbl' && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach((item: any) => findTables(item));
          } else {
            findTables(node[key]);
          }
        }
      });
    };
    
    findTables(slideData);
    return tables;
  }

  /**
   * Extract data from a table element
   */
  private extractTableData(tbl: any): { headers: string[]; rows: string[][] } | null {
    try {
      const rows: string[][] = [];
      let headers: string[] = [];
      
      // Get table rows (a:tr)
      const trArray = tbl['a:tr'] || [];
      const tableRows = Array.isArray(trArray) ? trArray : [trArray];
      
      tableRows.forEach((tr: any, rowIndex: number) => {
        const row: string[] = [];
        
        // Get table cells (a:tc)
        const tcArray = tr['a:tc'] || [];
        const cells = Array.isArray(tcArray) ? tcArray : [tcArray];
        
        cells.forEach((tc: any) => {
          // Extract text from cell
          const cellText = this.extractTextFromSlide(tc);
          row.push(cellText);
        });
        
        if (row.length > 0) {
          if (rowIndex === 0 && headers.length === 0) {
            headers = row;
          } else {
            rows.push(row);
          }
        }
      });
      
      if (headers.length > 0 || rows.length > 0) {
        return { headers, rows };
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting table data:', error);
      return null;
    }
  }

  getSupportedExtensions(): string[] {
    return ['pptx', 'ppt'];
  }
}
