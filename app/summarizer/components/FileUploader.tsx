"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Upload, FileText } from "lucide-react"
import { FileProcessor, type FileProcessingResult } from "@/lib/file-processors"
import { useToast } from "@/hooks/use-toast"

interface FileUploaderProps {
  onFileProcessed: (content: string, metadata: FileProcessingResult["metadata"]) => void
  onError: (error: string) => void
  className?: string
}

export function FileUploader({ onFileProcessed, onError, className }: FileUploaderProps) {
  const [processing, setProcessing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const { toast } = useToast()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    // File size validation (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      const error = "File size must be less than 10MB"
      onError(error)
      toast({
        title: "File too large",
        description: error,
        variant: "destructive",
      })
      return
    }

    // File type validation
    const supportedTypes = FileProcessor.getSupportedTypes()
    if (!supportedTypes.includes(selectedFile.type)) {
      const error = `Unsupported file type: ${selectedFile.type}. Supported types: ${supportedTypes.map((type) => FileProcessor.getTypeDescription(type)).join(", ")}`
      onError(error)
      toast({
        title: "Unsupported file type",
        description: error,
        variant: "destructive",
      })
      return
    }

    setProcessing(true)
    setUploadedFile(selectedFile)
    onError("") // Clear any previous errors

    try {
      const result = await FileProcessor.processFile(selectedFile)

      onFileProcessed(result.content, result.metadata)

      toast({
        title: "File processed successfully",
        description: `${selectedFile.name} (${result.metadata.wordCount} words)`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process file"
      onError(errorMessage)

      toast({
        title: "File processing failed",
        description: errorMessage,
        variant: "destructive",
      })

      setUploadedFile(null)
    } finally {
      setProcessing(false)
    }
  }

  const getSupportedFormats = () => {
    return FileProcessor.getSupportedTypes().map((type) => {
      const description = FileProcessor.getTypeDescription(type)
      const extension = type.split("/")[1] || type
      return { type, description, extension }
    })
  }

  return (
    <div className={className}>
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
        <div className="p-4 bg-white rounded-full w-fit mx-auto mb-6 border border-gray-200 shadow-sm">
          <Upload className="h-8 w-8 text-gray-600" />
        </div>
        <p className="text-base text-gray-700 mb-6 font-medium">Upload a document to summarize</p>

        <Input
          type="file"
          accept={FileProcessor.getSupportedTypes().join(",")}
          onChange={handleFileUpload}
          disabled={processing}
          className="max-w-sm mx-auto border-gray-300 focus:border-black focus:ring-1 focus:ring-black h-12"
        />

        <div className="mt-8">
          <p className="text-sm text-gray-500 mb-4 font-medium">Supported formats:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {getSupportedFormats().map(({ type, description, extension }) => (
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
            <div>
              <p className="text-base font-medium text-gray-900">{uploadedFile.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {FileProcessor.getTypeDescription(uploadedFile.type)} • {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            {processing && (
              <div className="flex items-center text-sm text-gray-600">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-black mr-3"></div>
                Processing...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
