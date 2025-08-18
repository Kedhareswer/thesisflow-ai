"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Upload, FileText, X } from "lucide-react"
import { FileProcessor, type FileProcessingResult } from "@/lib/file-processors"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { ErrorHandler } from "@/lib/utils/error-handler"

interface FileUploaderProps {
  onFileProcessed: (content: string, metadata: FileProcessingResult["metadata"]) => void
  onError: (error: string) => void
  className?: string
}

export function FileUploader({ onFileProcessed, onError, className }: FileUploaderProps) {
  const [processing, setProcessing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const { toast } = useToast()

  const handleFileUpload = async (file: File) => {
    if (!file) {
      onError("No file selected")
      return
    }

    // File size validation (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      const sizeError = ErrorHandler.processError(
        "File size exceeds 10MB limit",
        {
          operation: 'file-upload-validation',
          fileType: file.type,
          contentLength: file.size
        }
      )
      onError(sizeError.message || "File size exceeds 10MB limit")
      toast({
        title: sizeError.title,
        description: sizeError.message,
        variant: "destructive",
      })
      return
    }

    // File type validation
    const supportedTypes = FileProcessor.getSupportedTypes()
    if (!supportedTypes.includes(file.type)) {
      const typeError = ErrorHandler.processError(
        `Unsupported file type: ${file.type}`,
        {
          operation: 'file-upload-validation',
          fileType: file.type
        }
      )
      onError(typeError.message || `Unsupported file type: ${file.type}`)
      toast({
        title: typeError.title,
        description: typeError.message,
        variant: "destructive",
      })
      return
    }

    setProcessing(true)
    setUploadedFile(file)
    // Don't clear errors here - let the parent component handle it

    try {
      const result = await FileProcessor.processFile(file)

      if (!result.content.trim()) {
        const emptyContentError = ErrorHandler.processError(
          "No readable content found in file",
          {
            operation: 'file-processing-content',
            fileType: file.type,
            contentLength: result.content?.length || 0
          }
        )
        throw new Error(emptyContentError.message)
      }

      onFileProcessed(result.content, result.metadata)

      toast({
        title: "File processed successfully",
        description: `${file.name} (${result.metadata.wordCount} words)`,
      })
    } catch (error) {
      const processedError = ErrorHandler.processError(error, {
        operation: 'file-processing',
        fileType: file.type
      })
      
      // Pass the error message, ensuring it's never empty
      const errorMessage = processedError.message || "Failed to process file"
      onError(errorMessage)

      toast({
        title: processedError.title || "File Processing Failed",
        description: errorMessage,
        variant: "destructive",
      })

      setUploadedFile(null)
    } finally {
      setProcessing(false)
    }
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      handleFileUpload(selectedFile)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    onError("")

    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  const getSupportedFormats = () => {
    return FileProcessor.getSupportedTypes().map((type) => {
      const description = FileProcessor.getTypeDescription(type)
      return { type, description }
    })
  }

  return (
    <div className={className}>
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          dragActive ? "border-black bg-gray-100" : "border-gray-300 bg-gray-50/50 hover:bg-gray-50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="p-4 bg-white rounded-full w-fit mx-auto mb-6 border border-gray-200 shadow-sm">
          <Upload className="h-8 w-8 text-gray-600" />
        </div>
        <p className="text-base text-gray-700 mb-6 font-medium">
          {dragActive ? "Drop your file here" : "Upload a document to summarize"}
        </p>

        <Input
          type="file"
          accept={FileProcessor.getSupportedTypes().join(",")}
          onChange={handleInputChange}
          disabled={processing}
          className="max-w-sm mx-auto border-gray-300 focus:border-black focus:ring-1 focus:ring-black h-12"
        />

        <p className="text-sm text-gray-500 mt-4">Or drag and drop your file here</p>

        <div className="mt-8">
          <p className="text-sm text-gray-500 mb-4 font-medium">Supported formats:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {getSupportedFormats().map(({ type, description }) => (
              <span
                key={type}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-700 font-medium shadow-sm"
              >
                <FileText className="h-4 w-4 mr-2 text-gray-500" />
                {description}
              </span>
            ))}
          </div>
        </div>
      </div>

      {uploadedFile && (
        <div
          className={`p-6 bg-white border border-gray-200 rounded-xl mt-6 shadow-sm ${processing ? "opacity-50" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-base font-medium text-gray-900">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {FileProcessor.getTypeDescription(uploadedFile.type)} • {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {processing ? (
                <div className="flex items-center text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-black mr-3"></div>
                  Processing...
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={removeFile} className="text-gray-500 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
