/**
 * Extract Data v2 - Performance Utilities
 * Phase 4: Safe Unicode handling, throttling, memory optimization
 */

// Safe Unicode text processing
export class SafeTextProcessor {
  private static readonly MAX_STRING_LENGTH = 1000000; // 1MB of text
  private static readonly SAFE_UNICODE_REGEX = /[\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\u2000-\u206F\u2070-\u209F\u20A0-\u20CF\u2100-\u214F\u2190-\u21FF\u2200-\u22FF]/g;

  /**
   * Safely truncate text to prevent memory issues
   */
  static truncateText(text: string, maxLength: number = this.MAX_STRING_LENGTH): string {
    if (!text || typeof text !== 'string') return '';
    
    if (text.length <= maxLength) return text;
    
    // Find a safe truncation point (word boundary)
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    const lastNewline = truncated.lastIndexOf('\n');
    
    const cutPoint = Math.max(lastSpace, lastNewline);
    return cutPoint > maxLength * 0.8 
      ? truncated.slice(0, cutPoint) + '...'
      : truncated + '...';
  }

  /**
   * Clean text of problematic Unicode characters
   */
  static cleanUnicode(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    return text
      // Remove null bytes and control characters
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      // Normalize Unicode
      .normalize('NFKC')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract safe preview text from document content
   */
  static extractPreview(text: string, maxLength: number = 2000): string {
    const cleaned = this.cleanUnicode(text);
    const truncated = this.truncateText(cleaned, maxLength);
    
    // Ensure we don't cut off in the middle of a sentence
    const sentences = truncated.split(/[.!?]+/);
    if (sentences.length > 1) {
      // Remove the last potentially incomplete sentence
      sentences.pop();
      return sentences.join('. ') + '.';
    }
    
    return truncated;
  }

  /**
   * Count words safely
   */
  static countWords(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    
    const cleaned = this.cleanUnicode(text);
    const words = cleaned.match(/\b\w+\b/g);
    return words ? words.length : 0;
  }

  /**
   * Estimate reading time in minutes
   */
  static estimateReadingTime(text: string, wordsPerMinute: number = 200): number {
    const wordCount = this.countWords(text);
    return Math.ceil(wordCount / wordsPerMinute);
  }
}

// Throttling and debouncing utilities
export class ThrottleUtils {
  private static throttleMap = new Map<string, { lastCall: number; timeout?: NodeJS.Timeout }>();
  private static debounceMap = new Map<string, NodeJS.Timeout>();

  /**
   * Throttle function calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    key?: string
  ): (...args: Parameters<T>) => void {
    const throttleKey = key || func.toString();
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      const throttleData = this.throttleMap.get(throttleKey);
      
      if (!throttleData || now - throttleData.lastCall >= delay) {
        this.throttleMap.set(throttleKey, { lastCall: now });
        func(...args);
      }
    };
  }

  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    key?: string
  ): (...args: Parameters<T>) => void {
    const debounceKey = key || func.toString();
    
    return (...args: Parameters<T>) => {
      const existingTimeout = this.debounceMap.get(debounceKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const timeout = setTimeout(() => {
        this.debounceMap.delete(debounceKey);
        func(...args);
      }, delay);
      
      this.debounceMap.set(debounceKey, timeout);
    };
  }

  /**
   * Clear all throttles and debounces
   */
  static clearAll(): void {
    this.throttleMap.clear();
    this.debounceMap.forEach(timeout => clearTimeout(timeout));
    this.debounceMap.clear();
  }
}

// Memory management utilities
export class MemoryUtils {
  /**
   * Check if we're approaching memory limits
   */
  static checkMemoryPressure(): { isHigh: boolean; usedJSHeapSize?: number; totalJSHeapSize?: number } {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const totalMB = memory.totalJSHeapSize / 1024 / 1024;
      
      return {
        isHigh: usedMB > totalMB * 0.8, // 80% threshold
        usedJSHeapSize: usedMB,
        totalJSHeapSize: totalMB,
      };
    }
    
    return { isHigh: false };
  }

  /**
   * Chunk large arrays for processing
   */
  static chunkArray<T>(array: T[], chunkSize: number = 100): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Process large datasets in chunks with yield points
   */
  static async processInChunks<T, R>(
    items: T[],
    processor: (item: T, index: number) => R | Promise<R>,
    chunkSize: number = 100,
    yieldEvery: number = 5
  ): Promise<R[]> {
    const results: R[] = [];
    const chunks = this.chunkArray(items, chunkSize);
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      
      for (let itemIndex = 0; itemIndex < chunk.length; itemIndex++) {
        const globalIndex = chunkIndex * chunkSize + itemIndex;
        const result = await processor(chunk[itemIndex], globalIndex);
        results.push(result);
      }
      
      // Yield control every few chunks to prevent blocking
      if (chunkIndex % yieldEvery === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return results;
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static marks = new Map<string, number>();
  private static measures = new Map<string, number>();

  /**
   * Start timing an operation
   */
  static startTiming(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * End timing and get duration
   */
  static endTiming(name: string): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`No start time found for: ${name}`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.measures.set(name, duration);
    this.marks.delete(name);
    
    return duration;
  }

  /**
   * Get all measurements
   */
  static getMeasurements(): Record<string, number> {
    return Object.fromEntries(this.measures);
  }

  /**
   * Clear all measurements
   */
  static clear(): void {
    this.marks.clear();
    this.measures.clear();
  }

  /**
   * Log performance summary
   */
  static logSummary(): void {
    const measurements = this.getMeasurements();
    const entries = Object.entries(measurements);
    
    if (entries.length === 0) {
      console.log('No performance measurements recorded');
      return;
    }
    
    console.group('Performance Summary');
    entries
      .sort(([, a], [, b]) => b - a) // Sort by duration desc
      .forEach(([name, duration]) => {
        console.log(`${name}: ${duration.toFixed(2)}ms`);
      });
    console.groupEnd();
  }
}

// File size utilities
export class FileSizeUtils {
  /**
   * Format bytes as human readable string
   */
  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Check if file size is within limits
   */
  static isWithinLimit(bytes: number, limitMB: number): boolean {
    return bytes <= limitMB * 1024 * 1024;
  }

  /**
   * Get file size category
   */
  static getSizeCategory(bytes: number): 'small' | 'medium' | 'large' | 'xlarge' {
    const mb = bytes / 1024 / 1024;
    
    if (mb < 1) return 'small';
    if (mb < 5) return 'medium';
    if (mb < 10) return 'large';
    return 'xlarge';
  }
}

// All utilities are already exported above
