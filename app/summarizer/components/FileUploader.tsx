"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { FileProcessor, FileProcessingResult } from "@/lib/file-processors"
import { useToast } from "@/hooks/use-toast"

interface FileUploaderProps {
  onFileProcessed: (content: string, metadata: FileProcessingResult['metadata']) => void
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
      const error = `Unsupported file type: ${selectedFile.type}. Supported types: ${supportedTypes.map(type => FileProcessor.getTypeDescription(type)).join(', ')}`
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
    return FileProcessor.getSupportedTypes().map(type => {
      const description = FileProcessor.getTypeDescription(type)
      const extension = type.split('/')[1] || type
      return { type, description, extension }
    })
  }

  return (
    <div className={className}>
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-4">
          Upload a document to summarize
        </p>
        
        <Input
          type="file"
          accept={FileProcessor.getSupportedTypes().join(',')}
          onChange={handleFileUpload}
          disabled={processing}
          className="max-w-xs mx-auto"
        />
        
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Supported formats:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {getSupportedFormats().map(({ type, description, extension }) => (
              <span 
                key={type} 
                className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                {description}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {uploadedFile && (
        <div className={`p-3 bg-muted rounded-lg mt-4 ${processing ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {FileProcessor.getTypeDescription(uploadedFile.type)} • {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            {processing && (
              <div className="flex items-center text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Processing...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 