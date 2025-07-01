import mammoth from 'mammoth'

export interface FileProcessingResult {
  content: string
  metadata: {
    type: string
    size: number
    pages?: number
    wordCount: number
  }
}

export class FileProcessor {
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
          break
        
        case 'application/pdf':
          content = await this.processPDFFile(file)
          break
        
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          content = await this.processWordFile(file)
          break
        
        default:
          // Try to read as text for other formats
          content = await file.text()
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

  private static async processPDFFile(file: File): Promise<string> {
    // For now, return a helpful message - PDF processing requires additional setup
    return `PDF processing requires additional setup. Please convert to text or use the URL fetch feature for online PDFs. File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
  }

  private static async processWordFile(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      
      // Handle any processing warnings (messages property may not exist in all versions)
      if ('messages' in result && Array.isArray(result.messages) && result.messages.length > 0) {
        console.warn('Word file processing warnings:', result.messages)
      }
      
      return result.value
    } catch (error) {
      throw new Error(`Failed to process Word document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  static getSupportedTypes(): string[] {
    return [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  }

  static getTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'text/plain': 'Text File',
      'application/pdf': 'PDF Document (basic support)',
      'application/msword': 'Word Document (legacy)',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document'
    }
    return descriptions[type] || 'Unknown Format'
  }
}
