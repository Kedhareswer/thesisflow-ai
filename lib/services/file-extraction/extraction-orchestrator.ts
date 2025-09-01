/**
 * Main extraction orchestrator - coordinates all file format extractors
 */

import { BaseExtractor, ExtractedContent, ExtractionOptions, ProgressCallback } from './base-extractor';
import { PDFExtractor } from './pdf-extractor';
import { DocxExtractor } from './docx-extractor';
import { CsvExtractor } from './csv-extractor';
import { ImageExtractor } from './image-extractor';
import { PptxExtractor } from './pptx-extractor';

export interface FileExtractionJob {
  id: string;
  filename: string;
  buffer: Buffer;
  mimeType?: string;
  options?: ExtractionOptions;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: {
    current: number;
    total: number;
    phase: string;
    message?: string;
  };
  result?: ExtractedContent;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export class ExtractionOrchestrator {
  private extractors: Map<string, BaseExtractor>;
  private jobs: Map<string, FileExtractionJob>;

  constructor() {
    this.extractors = new Map();
    this.jobs = new Map();
    this.initializeExtractors();
  }

  /**
   * Initialize all available extractors
   */
  private initializeExtractors(): void {
    const extractors = [
      new PDFExtractor(),
      new DocxExtractor(),
      new CsvExtractor(),
      new ImageExtractor(),
      new PptxExtractor()
    ];

    extractors.forEach(extractor => {
      extractor.getSupportedExtensions().forEach(ext => {
        this.extractors.set(ext.toLowerCase(), extractor);
      });
    });
  }

  /**
   * Get all supported file extensions
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.extractors.keys());
  }

  /**
   * Check if a file type is supported
   */
  isSupported(filename: string): boolean {
    const ext = this.getFileExtension(filename);
    return this.extractors.has(ext);
  }

  /**
   * Get appropriate extractor for a file
   */
  private getExtractor(filename: string): BaseExtractor | null {
    const ext = this.getFileExtension(filename);
    return this.extractors.get(ext) || null;
  }

  /**
   * Extract file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Create a new extraction job
   */
  createJob(filename: string, buffer: Buffer, options: ExtractionOptions = {}): string {
    const jobId = this.generateJobId();
    
    const job: FileExtractionJob = {
      id: jobId,
      filename,
      buffer,
      options,
      status: 'pending',
      startedAt: new Date()
    };

    this.jobs.set(jobId, job);
    return jobId;
  }

  /**
   * Get job status and result
   */
  getJob(jobId: string): FileExtractionJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): FileExtractionJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Execute extraction job
   */
  async executeJob(
    jobId: string, 
    progressCallback?: ProgressCallback
  ): Promise<ExtractedContent> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'processing') {
      throw new Error(`Job ${jobId} is already being processed`);
    }

    if (job.status === 'completed') {
      return job.result!;
    }

    try {
      // Update job status
      job.status = 'processing';
      job.startedAt = new Date();

      // Create progress callback wrapper
      const wrappedProgressCallback: ProgressCallback = (progress) => {
        job.progress = progress;
        this.jobs.set(jobId, job);
        if (progressCallback) {
          progressCallback(progress);
        }
      };

      // Get appropriate extractor
      const extractor = this.getExtractor(job.filename);
      if (!extractor) {
        throw new Error(`No extractor available for file type: ${this.getFileExtension(job.filename)}`);
      }

      // Configure extractor with options and progress callback
      const extractorInstance = this.createExtractorInstance(extractor, job.options || {});
      extractorInstance.setProgressCallback(wrappedProgressCallback);

      // Execute extraction
      const result = await extractorInstance.extract(job.buffer, job.filename);

      // Update job with result
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      job.progress = { current: 100, total: 100, phase: 'completed', message: 'Extraction completed successfully' };

      this.jobs.set(jobId, job);
      return result;

    } catch (error) {
      // Update job with error
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      job.progress = { 
        current: 0, 
        total: 100, 
        phase: 'failed', 
        message: job.error 
      };

      this.jobs.set(jobId, job);
      throw error;
    }
  }

  /**
   * Quick extraction without job tracking
   */
  async extractFile(
    filename: string, 
    buffer: Buffer, 
    options: ExtractionOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<ExtractedContent> {
    const jobId = this.createJob(filename, buffer, options);
    return this.executeJob(jobId, progressCallback);
  }

  /**
   * Batch extraction for multiple files
   */
  async extractMultipleFiles(
    files: Array<{ filename: string; buffer: Buffer; options?: ExtractionOptions }>,
    progressCallback?: (overallProgress: number, currentFile: string) => void
  ): Promise<Array<{ filename: string; result?: ExtractedContent; error?: string }>> {
    const results: Array<{ filename: string; result?: ExtractedContent; error?: string }> = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        if (progressCallback) {
          progressCallback(Math.round((i / files.length) * 100), file.filename);
        }

        const result = await this.extractFile(
          file.filename, 
          file.buffer, 
          file.options || {}
        );
        
        results.push({ filename: file.filename, result });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ filename: file.filename, error: errorMessage });
      }
    }

    if (progressCallback) {
      progressCallback(100, 'Batch extraction completed');
    }

    return results;
  }

  /**
   * Create a new instance of extractor with specific options
   */
  private createExtractorInstance(baseExtractor: BaseExtractor, options: ExtractionOptions): BaseExtractor {
    const extractor = Object.create(Object.getPrototypeOf(baseExtractor));
    extractor.constructor.call(extractor, options);
    return extractor;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up completed jobs (optional memory management)
   */
  cleanupJobs(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt < cutoffTime) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Get extraction statistics
   */
  getStatistics(): {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    processingJobs: number;
    pendingJobs: number;
    supportedExtensions: string[];
  } {
    const jobs = Array.from(this.jobs.values());
    
    return {
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      processingJobs: jobs.filter(j => j.status === 'processing').length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      supportedExtensions: this.getSupportedExtensions()
    };
  }
}
