import mammoth from 'mammoth'
import Tesseract from 'tesseract.js'

// Dynamically import pdf-parse to handle potential build issues
const getPdfParse = async () => {
  try {
    const pdfParse = await import('pdf-parse')
    return pdfParse.default || pdfParse
  } catch (error) {
    throw new Error('PDF parsing library not available. Please install pdf-parse dependency.')
  }
}

export interface FileProcessingResult {
  content: string
  metadata: {
    type: string
    size: number
    pages?: number
    wordCount: number
    processingMethod?: 'text' | 'ocr' | 'mixed'
    ocrConfidence?: number
    hasImages?: boolean
  }
}

interface OCRResult {
  text: string
  confidence: number
  hasText: boolean
}

export class FileProcessorWithOCR {
  private static readonly MIN_TEXT_LENGTH = 50 // Minimum text length to consider extraction successful
  private static readonly OCR_CONFIDENCE_THRESHOLD = 60 // Minimum OCR confidence percentage

  static async processFile(file: File): Promise<FileProcessingResult> {
    let content = ''
    let metadata: FileProcessingResult['metadata'] = {
      type: file.type,
      size: file.size,
      wordCount: 0
    }

    try {
      switch (file.type) {
        case 'text/plain':
          content = await this.processTextFile(file)
          metadata.processingMethod = 'text'
          break
        
        case 'application/pdf':
          const pdfResult = await this.processPDFFileWithOCR(file)
          content = pdfResult.content
          metadata.pages = pdfResult.pages
          metadata.processingMethod = pdfResult.processingMethod
          metadata.ocrConfidence = pdfResult.ocrConfidence
          metadata.hasImages = pdfResult.hasImages
          break
        
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          content = await this.processWordFile(file)
          metadata.processingMethod = 'text'
          break
        
        case 'image/png':
        case 'image/jpeg':
        case 'image/jpg':
        case 'image/gif':
        case 'image/bmp':
        case 'image/webp':
        case 'image/tiff':
          const ocrResult = await this.processImageWithOCR(file)
          content = ocrResult.text
          metadata.processingMethod = 'ocr'
          metadata.ocrConfidence = ocrResult.confidence
          break
        
        default:
          // Try to read as text for other formats
          content = await file.text()
          metadata.processingMethod = 'text'
      }

      metadata.wordCount = this.getWordCount(content)
      
      return { content, metadata }
    } catch (error) {
      throw new Error(`Failed to process ${file.type}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async processTextFile(file: File): Promise<string> {
    return await file.text()
  }

  private static async processPDFFileWithOCR(file: File): Promise<{
    content: string
    pages: number | undefined
    processingMethod: 'text' | 'ocr' | 'mixed'
    ocrConfidence?: number
    hasImages: boolean
  }> {
    // If running in the browser, use the server endpoint
    if (typeof window !== 'undefined') {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('enableOCR', 'true') // Enable OCR processing

        const response = await fetch('/api/extract-file', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          
          if (errorData.userMessage) {
            let errorMessage = errorData.userMessage
            if (errorData.actions && errorData.actions.length > 0) {
              errorMessage += " Suggested actions: " + errorData.actions.join(", ")
            }
            throw new Error(errorMessage)
          }
          
          throw new Error(`Server extraction failed (${response.status})`)
        }

        const data = await response.json()
        
        return {
          content: data.text as string,
          pages: data.metadata?.pages || undefined,
          processingMethod: data.metadata?.processingMethod || 'text',
          ocrConfidence: data.metadata?.ocrConfidence,
          hasImages: data.metadata?.hasImages || false
        }
      } catch (error) {
        throw new Error(`Failed to extract PDF in browser: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Server-side extraction with OCR fallback
    try {
      const pdfParse = await getPdfParse()
      const arrayBuffer = await file.arrayBuffer()
      const data = await pdfParse(Buffer.from(arrayBuffer))

      let extractedText = data.text
      let processingMethod: 'text' | 'ocr' | 'mixed' = 'text'
      let ocrConfidence: number | undefined
      
      // Check if the PDF has sufficient text content
      const hasMinimalText = extractedText.trim().length >= this.MIN_TEXT_LENGTH
      
      // If PDF has images but minimal text, try OCR
      if (!hasMinimalText && data.numpages > 0) {
        console.log('PDF has minimal text, attempting OCR extraction...')
        
        try {
          // Convert PDF pages to images and run OCR
          // Note: This requires additional libraries like pdf2pic in production
          // For now, we'll return the minimal text with a warning
          processingMethod = 'ocr'
          ocrConfidence = 0
          
          // In a production environment, you would:
          // 1. Convert PDF pages to images using pdf2pic or similar
          // 2. Run OCR on each image
          // 3. Combine the OCR results
          
          if (extractedText.trim().length === 0) {
            extractedText = '[This appears to be a scanned PDF. OCR processing is required for full text extraction.]'
          }
        } catch (ocrError) {
          console.error('OCR extraction failed:', ocrError)
        }
      }

      return {
        content: extractedText,
        pages: data.numpages,
        processingMethod,
        ocrConfidence,
        hasImages: !hasMinimalText
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('PDF parsing library not available')) {
        throw error
      }
      throw new Error(
        `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the PDF is not password protected.`,
      )
    }
  }

  private static async processWordFile(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      
      if ('messages' in result && Array.isArray(result.messages) && result.messages.length > 0) {
        console.warn('Word file processing warnings:', result.messages)
      }
      
      return result.value
    } catch (error) {
      throw new Error(`Failed to process Word document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async processImageWithOCR(file: File): Promise<OCRResult> {
    try {
      console.log(`Processing image with OCR: ${file.name}`)
      
      // Convert file to data URL for Tesseract
      const dataUrl = await this.fileToDataURL(file)
      
      // Perform OCR using Tesseract.js
      const result = await Tesseract.recognize(
        dataUrl,
        'eng', // Language
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
            }
          }
        }
      )
      
      const text = result.data.text
      const confidence = result.data.confidence
      
      // Check if OCR was successful
      if (text.trim().length < 10 || confidence < this.OCR_CONFIDENCE_THRESHOLD) {
        console.warn(`Low OCR confidence (${confidence}%) or minimal text extracted`)
        return {
          text: text || '[Unable to extract text from image. The image may not contain readable text.]',
          confidence,
          hasText: false
        }
      }
      
      return {
        text,
        confidence,
        hasText: true
      }
    } catch (error) {
      console.error('OCR processing failed:', error)
      throw new Error(`Failed to process image with OCR: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private static getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  static getSupportedTypes(): string[] {
    return [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/bmp',
      'image/webp',
      'image/tiff'
    ]
  }

  static getTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'text/plain': 'Text File',
      'application/pdf': 'PDF Document',
      'application/msword': 'Word Document (legacy)',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
      'image/png': 'PNG Image',
      'image/jpeg': 'JPEG Image',
      'image/jpg': 'JPG Image',
      'image/gif': 'GIF Image',
      'image/bmp': 'BMP Image',
      'image/webp': 'WebP Image',
      'image/tiff': 'TIFF Image'
    }
    return descriptions[type] || 'Unknown Format'
  }

  static isImageFile(type: string): boolean {
    return type.startsWith('image/')
  }
}
