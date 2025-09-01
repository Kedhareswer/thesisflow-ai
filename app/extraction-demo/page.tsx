"use client"

import React, { useState, useCallback } from 'react'
import { Upload, FileText, Download, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

interface ExtractedResult {
  text: string;
  metadata: {
    filename?: string;
    fileSize?: number;
    pageCount?: number;
    wordCount?: number;
    extractedAt: string;
  };
  tables?: Array<{
    headers: string[];
    rows: string[][];
  }>;
}

export default function ExtractionDemo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedResult, setExtractedResult] = useState<ExtractedResult | null>(null)
  const [extractionType, setExtractionType] = useState('summary')
  const [supportedExtensions, setSupportedExtensions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const { toast } = useToast()

  // Load supported extensions on mount
  React.useEffect(() => {
    fetchSupportedExtensions()
  }, [])

  const fetchSupportedExtensions = async () => {
    try {
      const response = await fetch('/api/extract-simple')
      const data = await response.json()
      if (data.success && data.supportedExtensions) {
        setSupportedExtensions(data.supportedExtensions)
      }
    } catch (error) {
      console.error('Failed to fetch supported extensions:', error)
    }
  }

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension && supportedExtensions.includes(extension)) {
        setSelectedFile(file)
        setError(null)
      } else {
        toast({
          title: "Unsupported File Type",
          description: `Please upload one of these supported file types: ${supportedExtensions.join(', ')}.`,
          variant: "destructive"
        })
      }
    }
  }, [supportedExtensions, toast])

  const handleExtraction = async () => {
    if (!selectedFile) return

    setIsExtracting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('extractionType', extractionType)

      const response = await fetch('/api/extract-simple', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Extraction failed')
      }

      if (data.success) {
        setExtractedResult({
          text: data.result.text || data.result.summary || '',
          metadata: data.metadata,
          tables: data.result.tables
        })

        toast({
          title: "Extraction Complete",
          description: `Successfully extracted data from ${selectedFile.name}`
        })
      } else {
        throw new Error(data.error || 'Unknown error occurred')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)

      toast({
        title: "Extraction Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsExtracting(false)
    }
  }

  const downloadResult = () => {
    if (!extractedResult) return

    const content = JSON.stringify(extractedResult, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `extracted-${selectedFile?.name || 'data'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const resetDemo = () => {
    setSelectedFile(null)
    setExtractedResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Multi-Format Document Extraction Demo
          </h1>
          <p className="text-gray-600">
            Extract text and data from PDF, Word, CSV, and text files
          </p>
        </div>

        <div className="grid gap-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Document
              </CardTitle>
              <CardDescription>
                Supported formats: {supportedExtensions.length > 0 ? supportedExtensions.join(', ') : 'Loading...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="flex-1"
                    accept=".pdf,.docx,.doc,.csv,.txt"
                  />
                  <Select value={extractionType} onValueChange={setExtractionType}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Summary</SelectItem>
                      <SelectItem value="tables">Tables</SelectItem>
                      <SelectItem value="entities">Entities</SelectItem>
                      <SelectItem value="structured">Structured</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <Badge variant="secondary">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetDemo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Button
                  onClick={handleExtraction}
                  disabled={!selectedFile || isExtracting}
                  className="w-full"
                >
                  {isExtracting ? 'Extracting...' : 'Extract Content'}
                </Button>

                {isExtracting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing document...</span>
                      <span>Please wait</span>
                    </div>
                    <Progress value={undefined} className="w-full" />
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-sm font-medium text-red-800">Extraction Error</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {extractedResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Extraction Results
                  </CardTitle>
                  <Button variant="outline" onClick={downloadResult}>
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Metadata */}
                  <div>
                    <h3 className="font-medium mb-2">Document Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-xs text-gray-500">File Size</span>
                        <p className="text-sm font-medium">
                          {extractedResult.metadata.fileSize ? 
                            (extractedResult.metadata.fileSize / 1024).toFixed(1) + ' KB' : 
                            'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Word Count</span>
                        <p className="text-sm font-medium">{extractedResult.metadata.wordCount || 0}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Pages</span>
                        <p className="text-sm font-medium">{extractedResult.metadata.pageCount || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Extracted</span>
                        <p className="text-sm font-medium">
                          {new Date(extractedResult.metadata.extractedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Extracted Text */}
                  <div>
                    <h3 className="font-medium mb-2">Extracted Content</h3>
                    <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap text-gray-800">
                        {extractedResult.text}
                      </pre>
                    </div>
                  </div>

                  {/* Tables */}
                  {extractedResult.tables && extractedResult.tables.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Tables Found</h3>
                      {extractedResult.tables.map((table, index) => (
                        <div key={index} className="mb-4 overflow-x-auto">
                          <table className="min-w-full bg-white border rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                {table.headers.map((header, i) => (
                                  <th key={i} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.slice(0, 5).map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  {row.map((cell, j) => (
                                    <td key={j} className="px-4 py-2 text-sm text-gray-900">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {table.rows.length > 5 && (
                            <p className="text-xs text-gray-500 mt-2">
                              Showing 5 of {table.rows.length} rows
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
