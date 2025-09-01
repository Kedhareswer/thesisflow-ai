import { NextResponse } from "next/server"
import { FileProcessor } from "@/lib/file-processors"
import { FileProcessorWithOCR } from "@/lib/file-processors-with-ocr"
import { ErrorHandler } from '@/lib/utils/error-handler'
import mammoth from 'mammoth'
import { PptxExtractor } from '@/lib/services/file-extraction/pptx-extractor'

// Server-side PDF processing to avoid recursion
const processPDFServerSide = async (file: File) => {
  try {
    const pdfParse = await import('pdf-parse')
    const pdfParseFunc = pdfParse.default || pdfParse
    const arrayBuffer = await file.arrayBuffer()
    const data = await pdfParseFunc(Buffer.from(arrayBuffer))

    return {
      content: data.text,
      pages: data.numpages,
      wordCount: data.text.trim().split(/\s+/).filter((word: string) => word.length > 0).length
    }
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the PDF is not password protected and contains readable text.`)
  }
}

// Server-side PowerPoint processing (PPTX)
const processPptxServerSide = async (file: File) => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const extractor = new PptxExtractor({ extractText: true, extractTables: false, extractMetadata: true })
    const result = await extractor.extract(Buffer.from(arrayBuffer), file.name)
    const content = result.text || ''
    return {
      content,
      wordCount: content.trim().split(/\s+/).filter((w: string) => w.length > 0).length
    }
  } catch (error) {
    throw new Error(`Failed to process PowerPoint presentation: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Server-side Word processing
const processWordServerSide = async (file: File) => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    
    if ('messages' in result && Array.isArray(result.messages) && result.messages.length > 0) {
      console.warn('Word file processing warnings:', result.messages)
    }
    
    const content = result.value
    return {
      content,
      wordCount: content.trim().split(/\s+/).filter((word: string) => word.length > 0).length
    }
  } catch (error) {
    throw new Error(`Failed to process Word document: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Server-side text processing
const processTextServerSide = async (file: File) => {
  const content = await file.text()
  return {
    content,
    wordCount: content.trim().split(/\s+/).filter((word: string) => word.length > 0).length
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const enableOCRRaw = formData.get("enableOCR")
    const enableOCR = enableOCRRaw === 'true' || enableOCRRaw === '1'

    if (!file) {
      const validationError = ErrorHandler.processError(
        "No file provided",
        {
          operation: 'file-processing-validation'
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(validationError),
        { status: 400 }
      )
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      const sizeError = ErrorHandler.processError(
        "File size exceeds 10MB limit",
        {
          operation: 'file-processing-validation',
          fileType: file.type,
          contentLength: file.size
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(sizeError),
        { status: 400 }
      )
    }

    // Check if file type is supported
    const supportedTypes = (enableOCR ? FileProcessorWithOCR : FileProcessor).getSupportedTypes()
    if (!supportedTypes.includes(file.type)) {
      const unsupportedError = ErrorHandler.processError(
        `Unsupported file type: ${file.type}`,
        {
          operation: 'file-processing-validation',
          fileType: file.type
        }
      )
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(unsupportedError),
        { status: 400 }
      )
    }

    try {
      let result: { content: string; wordCount: number; pages?: number }

      // Use OCR processor for enhanced processing if enabled
      if (enableOCR) {
        const processor = FileProcessorWithOCR
        const ocrResult = await processor.processFile(file)
        result = {
          content: ocrResult.content,
          wordCount: ocrResult.metadata.wordCount,
          pages: ocrResult.metadata.pages
        }
      } else {
        // Use direct server-side processing to avoid recursion
        switch (file.type) {
          case 'text/plain':
            result = await processTextServerSide(file)
            break
          
          case 'application/pdf':
            result = await processPDFServerSide(file)
            break
          
          case 'application/msword':
          case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            result = await processWordServerSide(file)
            break
          
          case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            result = await processPptxServerSide(file)
            break
          
          case 'application/vnd.ms-powerpoint':
            // Legacy .ppt not fully supported for text extraction; provide a helpful message so preview shows
            result = {
              content: '[Preview for .ppt (legacy) is limited. Please convert to .pptx for a richer preview.]',
              wordCount: 12
            }
            break
          
          default:
            // Try to read as text for other formats
            result = await processTextServerSide(file)
        }
      }

      // Validate that we extracted meaningful content
      if (!result.content || result.content.trim().length < 10) {
        const emptyContentError = ErrorHandler.processError(
          "No readable content found in file",
          {
            operation: 'file-processing-content',
            fileType: file.type,
            contentLength: result.content?.length || 0
          }
        )
        return NextResponse.json(
          ErrorHandler.formatErrorResponse(emptyContentError),
          { status: 422 }
        )
      }

      return NextResponse.json({
        text: result.content,
        filename: file.name,
        size: file.size,
        type: file.type,
        metadata: {
          wordCount: result.wordCount,
          pages: result.pages,
          processingMethod: enableOCR ? "FileProcessorWithOCR" : "DirectServerProcessing"
        }
      })

    } catch (processingError) {
      console.error("File processing error:", processingError)
      
      const fileProcessingError = ErrorHandler.processError(
        processingError,
        {
          operation: 'file-processing',
          fileType: file.type,
          contentLength: file.size
        }
      )
      
      let statusCode = 500
      if (fileProcessingError.errorType === 'unsupported_format') {
        statusCode = 400
      } else if (fileProcessingError.errorType === 'content_too_large') {
        statusCode = 413
      }
      
      return NextResponse.json(
        ErrorHandler.formatErrorResponse(fileProcessingError),
        { status: statusCode }
      )
    }

  } catch (error) {
    console.error("Error in file upload:", error)
    
    const uploadError = ErrorHandler.processError(error, {
      operation: 'file-upload'
    })
    
    return NextResponse.json(
      ErrorHandler.formatErrorResponse(uploadError),
      { status: 500 }
    )
  }
}
