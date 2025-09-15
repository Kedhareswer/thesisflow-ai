export interface ExtractionOptions {
  type: 'text' | 'tables' | 'metadata' | 'summary' | 'all';
  format?: 'json' | 'csv' | 'text' | 'markdown';
  extractImages?: boolean;
  extractTables?: boolean;
}

export interface ExtractedData {
  text?: string;
  tables?: Array<{
    id: string;
    headers: string[];
    rows: string[][];
  }>;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creationDate?: string;
    pageCount?: number;
    wordCount?: number;
    fileSize?: number;
    mimeType?: string;
  };
  summary?: string;
  keyPoints?: string[];
  entities?: Array<{
    type: 'person' | 'organization' | 'location' | 'date' | 'email' | 'url' | 'number';
    value: string;
    count: number;
  }>;
  statistics?: {
    totalWords: number;
    totalSentences: number;
    totalParagraphs: number;
    avgWordsPerSentence: number;
    readingTime: number; // in minutes
  };
}

export class DataExtractionService {
  private readonly HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

  async extractFromText(
    text: string,
    options: ExtractionOptions
  ): Promise<ExtractedData> {
    const result: ExtractedData = {};

    // Always include text if requested
    if (options.type === 'text' || options.type === 'all') {
      result.text = text;
    }

    // Extract metadata and statistics
    if (options.type === 'metadata' || options.type === 'all') {
      result.metadata = this.extractMetadataFromText(text);
      result.statistics = this.calculateStatistics(text);
    }

    // Extract tables if present
    if (options.extractTables || options.type === 'tables' || options.type === 'all') {
      result.tables = this.extractTablesFromText(text);
    }

    // Generate summary using AI
    if (options.type === 'summary' || options.type === 'all') {
      result.summary = await this.generateSummary(text);
      result.keyPoints = await this.extractKeyPoints(text);
    }

    // Extract entities
    if (options.type === 'all') {
      result.entities = this.extractEntities(text);
    }

    return result;
  }

  private extractMetadataFromText(text: string): ExtractedData['metadata'] {
    const lines = text.split('\n').slice(0, 50); // Check first 50 lines for metadata
    const metadata: ExtractedData['metadata'] = {
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length
    };

    // Try to extract title (usually first non-empty line or largest text)
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && trimmed.length < 200) {
        metadata.title = trimmed;
        break;
      }
    }

    // Extract keywords (most frequent meaningful words)
    metadata.keywords = this.extractKeywords(text);

    return metadata;
  }

  private calculateStatistics(text: string): ExtractedData['statistics'] {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.match(/[.!?]+/g) || [];
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    const totalWords = words.length;
    const totalSentences = sentences.length;
    const totalParagraphs = paragraphs.length;
    const avgWordsPerSentence = totalSentences > 0 ? Math.round(totalWords / totalSentences) : 0;
    const readingTime = Math.ceil(totalWords / 200); // Average reading speed: 200 words/min

    return {
      totalWords,
      totalSentences,
      totalParagraphs,
      avgWordsPerSentence,
      readingTime
    };
  }

  private extractTablesFromText(text: string): ExtractedData['tables'] {
    const tables: ExtractedData['tables'] = [];
    const lines = text.split('\n');
    let currentTable: string[][] = [];
    let tableId = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line contains table-like structure (tabs or pipes)
      if (line.includes('\t') || line.includes('|')) {
        const delimiter = line.includes('|') ? '|' : '\t';
        const cells = line.split(delimiter).map(cell => cell.trim()).filter(cell => cell.length > 0);
        
        if (cells.length > 1) {
          currentTable.push(cells);
        }
      } else if (currentTable.length > 1) {
        // End of table detected
        tables.push({
          id: `table-${tableId++}`,
          headers: currentTable[0],
          rows: currentTable.slice(1)
        });
        currentTable = [];
      }
    }

    // Add last table if exists
    if (currentTable.length > 1) {
      tables.push({
        id: `table-${tableId}`,
        headers: currentTable[0],
        rows: currentTable.slice(1)
      });
    }

    return tables;
  }

  private async generateSummary(text: string): Promise<string> {
    if (!this.HUGGINGFACE_API_KEY) {
      // Fallback to simple extraction
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
      return sentences.slice(0, 3).join(' ').trim();
    }

    try {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: text.substring(0, 1024), // Limit input
            parameters: {
              max_length: 150,
              min_length: 30
            }
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        return (Array.isArray(result) && result.length > 0) ? result[0]?.summary_text || this.fallbackSummary(text) : this.fallbackSummary(text);
      }
    } catch (error) {
      console.error('Summary generation failed:', error);
    }

    return this.fallbackSummary(text);
  }

  private fallbackSummary(text: string): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, 3).join(' ').trim();
  }

  private async extractKeyPoints(text: string): Promise<string[]> {
    const keyPoints: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for bullet points, numbered lists, or key phrases
      if (
        /^[\d•\-\*]\s+/.test(trimmed) ||
        /^(key|important|note|summary|conclusion):/i.test(trimmed) ||
        (trimmed.length > 20 && trimmed.length < 200 && /\b(important|key|significant|critical|essential)\b/i.test(trimmed))
      ) {
        const point = trimmed.replace(/^[\d•\-\*\.]+\s+/, '').replace(/^[^:]+:\s*/i, '');
        if (point.length > 10) {
          keyPoints.push(point);
        }
      }
    }

    // Limit to top 10 key points
    return keyPoints.slice(0, 10);
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'been', 
      'were', 'are', 'was', 'will', 'would', 'could', 'should', 'more', 
      'most', 'some', 'such', 'only', 'also', 'than', 'then', 'when', 
      'where', 'which', 'while', 'what', 'there', 'their', 'these', 'those'
    ]);
    
    const wordFreq = new Map<string, number>();
    
    words.forEach(word => {
      if (!stopWords.has(word) && word.length > 3) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }

  private extractEntities(text: string): ExtractedData['entities'] {
    const entities: ExtractedData['entities'] = [];
    const entityMap = new Map<string, { type: 'person' | 'organization' | 'location' | 'date' | 'email' | 'url' | 'number', count: number }>();

    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    emails.forEach(email => {
      const key = email.toLowerCase();
      if (!entityMap.has(key)) {
        entityMap.set(key, { type: 'email', count: 0 });
      }
      entityMap.get(key)!.count++;
    });

    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    urls.forEach(url => {
      const key = url.toLowerCase();
      if (!entityMap.has(key)) {
        entityMap.set(key, { type: 'url', count: 0 });
      }
      entityMap.get(key)!.count++;
    });

    // Extract dates
    const dateRegex = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/gi;
    const dates = text.match(dateRegex) || [];
    dates.forEach(date => {
      const key = date.toLowerCase();
      if (!entityMap.has(key)) {
        entityMap.set(key, { type: 'date', count: 0 });
      }
      entityMap.get(key)!.count++;
    });

    // Extract numbers (monetary, percentages, etc.)
    const numberRegex = /\b(\$[\d,]+\.?\d*|\d+%|\d{1,3}(,\d{3})+(\.\d+)?)\b/g;
    const numbers = text.match(numberRegex) || [];
    numbers.forEach(num => {
      const key = num;
      if (!entityMap.has(key)) {
        entityMap.set(key, { type: 'number', count: 0 });
      }
      entityMap.get(key)!.count++;
    });

    // Convert map to array
    entityMap.forEach((data, value) => {
      entities.push({
        type: data.type,
        value,
        count: data.count
      });
    });

    // Sort by count and limit
    return entities.sort((a, b) => b.count - a.count).slice(0, 20);
  }

  formatOutput(data: ExtractedData, format: ExtractionOptions['format'] = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        if (data.tables && data.tables.length > 0) {
          return data.tables.map(table => {
            const csv = [table.headers.join(',')];
            table.rows.forEach(row => {
              csv.push(row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','));
            });
            return csv.join('\n');
          }).join('\n\n');
        }
        return '';
      
      case 'markdown':
        let markdown = '';
        
        if (data.metadata?.title) {
          markdown += `# ${data.metadata.title}\n\n`;
        }
        
        if (data.summary) {
          markdown += `## Summary\n\n${data.summary}\n\n`;
        }
        
        if (data.keyPoints && data.keyPoints.length > 0) {
          markdown += `## Key Points\n\n`;
          data.keyPoints.forEach(point => {
            markdown += `- ${point}\n`;
          });
          markdown += '\n';
        }
        
        if (data.statistics) {
          markdown += `## Statistics\n\n`;
          markdown += `- **Total Words**: ${data.statistics.totalWords}\n`;
          markdown += `- **Total Sentences**: ${data.statistics.totalSentences}\n`;
          markdown += `- **Reading Time**: ${data.statistics.readingTime} minutes\n\n`;
        }
        
        if (data.tables && data.tables.length > 0) {
          markdown += `## Tables\n\n`;
          data.tables.forEach((table, index) => {
            markdown += `### Table ${index + 1}\n\n`;
            markdown += `| ${table.headers.join(' | ')} |\n`;
            markdown += `| ${table.headers.map(() => '---').join(' | ')} |\n`;
            table.rows.forEach(row => {
              markdown += `| ${row.join(' | ')} |\n`;
            });
            markdown += '\n';
          });
        }
        
        if (data.entities && data.entities.length > 0) {
          markdown += `## Extracted Entities\n\n`;
          const groupedEntities = data.entities.reduce((acc, entity) => {
            if (!acc[entity.type]) acc[entity.type] = [];
            acc[entity.type].push(`${entity.value} (${entity.count})`);
            return acc;
          }, {} as Record<string, string[]>);
          
          Object.entries(groupedEntities).forEach(([type, values]) => {
            markdown += `**${type.charAt(0).toUpperCase() + type.slice(1)}**: ${values.join(', ')}\n\n`;
          });
        }
        
        return markdown;
      
      case 'text':
      default:
        return data.text || '';
    }
  }
}
