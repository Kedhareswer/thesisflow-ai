import { NextResponse } from "next/server"
import { FileProcessor } from "@/lib/file-processors"
import { ErrorHandler } from '@/lib/utils/error-handler'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

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
    const supportedTypes = FileProcessor.getSupportedTypes()
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
      // Use the existing FileProcessor class for proper file processing
      const result = await FileProcessor.processFile(file)

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
          wordCount: result.metadata.wordCount,
          pages: result.metadata.pages,
          processingMethod: "FileProcessor"
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
