import mammoth from 'mammoth'

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
          const pdfResult = await this.processPDFFile(file)
          content = pdfResult.content
          metadata.pages = pdfResult.pages
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

  private static async processPDFFile(file: File): Promise<{ content: string; pages: number | undefined }> {
    // If running in the browser, we cannot rely on the Node-only pdf-parse package.
    // Instead, send the file to the built-in /api/extract-file endpoint for processing.
    if (typeof window !== 'undefined') {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/extract-file', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          
          // Handle structured error responses from the updated extract-file endpoint
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
          pages: data.metadata?.pages || undefined
        }
      } catch (error) {
        throw new Error(`Failed to extract PDF in browser: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Server-side extraction using pdf-parse (works in Node.js runtime)
    try {
      const pdfParse = await getPdfParse()
      const arrayBuffer = await file.arrayBuffer()
      const data = await pdfParse(Buffer.from(arrayBuffer))

      return {
        content: data.text,
        pages: data.numpages
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('PDF parsing library not available')) {
        throw error
      }
      throw new Error(
        `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the PDF is not password protected and contains readable text.`,
      )
    }
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
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint'
    ]
  }

  static getTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'text/plain': 'Text File',
      'application/pdf': 'PDF Document',
      'application/msword': 'Word Document (legacy)',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation',
      'application/vnd.ms-powerpoint': 'PowerPoint Presentation (legacy)'
    }
    return descriptions[type] || 'Unknown Format'
  }
}
