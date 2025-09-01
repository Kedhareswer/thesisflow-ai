/**
 * Image Extractor with OCR using Tesseract.js
 */

import { BaseExtractor, ExtractedContent, ExtractionOptions } from './base-extractor';
import Tesseract, { Worker as TesseractWorker } from 'tesseract.js';
import sharp from 'sharp';

export class ImageExtractor extends BaseExtractor {
  constructor(options: ExtractionOptions = {}) {
    super(options);
  }

  async extract(buffer: Buffer, filename?: string): Promise<ExtractedContent> {
    try {
      this.reportProgress(0, 100, 'Loading image', 'Processing image file...');

      const result: ExtractedContent = {
        text: '',
        metadata: {},
        images: []
      };

      // Get image metadata using sharp
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      this.reportProgress(20, 100, 'Analyzing image', 'Extracting image properties...');

      // Store image metadata
      if (this.options.extractMetadata) {
        result.metadata = {
          title: filename?.replace(/\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i, ''),
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          space: metadata.space,
          channels: metadata.channels,
          depth: metadata.depth,
          density: metadata.density,
          hasAlpha: metadata.hasAlpha,
          isProgressive: metadata.isProgressive,
          extractedAt: new Date()
        };
      }

      // Store image data if requested
      if (this.options.extractImages) {
        const base64 = buffer.toString('base64');
        const mimeType = this.getMimeType(metadata.format || 'jpeg');
        result.images = [{
          data: `data:${mimeType};base64,${base64}`,
          mimeType,
          alt: filename
        }];
      }

      // Perform OCR if enabled and text extraction is requested
      if (this.options.extractText && this.options.ocrEnabled) {
        this.reportProgress(40, 100, 'Performing OCR', 'Extracting text from image...');
        
        try {
          // Optimize image for OCR if needed
          let ocrBuffer = buffer;
          
          // Convert to grayscale and enhance contrast for better OCR
          if (metadata.channels && metadata.channels > 1) {
            ocrBuffer = await sharp(buffer)
              .grayscale()
              .normalize()
              .toBuffer();
          }

          // Perform OCR using Tesseract.js
          const worker = await Tesseract.createWorker();

          await (worker as any).loadLanguage('eng');
          await (worker as any).initialize('eng');
          
          const { data } = await worker.recognize(buffer);
          
          result.text = this.cleanText(data.text);
          
          // Add OCR confidence to metadata
          if (result.metadata) {
            result.metadata.ocrConfidence = data.confidence;
            result.metadata.wordCount = this.getWordCount(result.text);
          }

          await worker.terminate();
          
          this.reportProgress(90, 100, 'OCR Complete', `Extracted ${result.text.length} characters`);
        } catch (ocrError) {
          console.error('OCR error:', ocrError);
          // OCR failed, but we can still return image metadata
          if (result.metadata) {
            result.metadata.ocrError = ocrError instanceof Error ? ocrError.message : 'OCR failed';
          }
        }
      } else if (this.options.extractText && !this.options.ocrEnabled) {
        // Text extraction requested but OCR not enabled
        result.text = '';
        if (result.metadata) {
          result.metadata.ocrEnabled = false;
          result.metadata.note = 'Enable OCR to extract text from images';
        }
      }

      this.reportProgress(100, 100, 'Complete', 'Image extraction finished');
      return result;

    } catch (error) {
      console.error('Image extraction error:', error);
      throw new Error(`Failed to extract image content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get MIME type from image format
   */
  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      tiff: 'image/tiff',
      bmp: 'image/bmp',
      svg: 'image/svg+xml'
    };
    
    return mimeTypes[format.toLowerCase()] || 'image/jpeg';
  }

  getSupportedExtensions(): string[] {
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp'];
  }
}
