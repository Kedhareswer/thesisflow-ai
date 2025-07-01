"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  FileText, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Bookmark, 
  MessageSquare, 
  Highlighter,
  Eye,
  EyeOff,
  Share2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { ResearchPaper, PaperAnnotation } from "@/lib/types/common"

interface PDFViewerProps {
  paper: ResearchPaper
  className?: string
}

export function PDFViewer({ paper, className }: PDFViewerProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [annotations, setAnnotations] = useState<PaperAnnotation[]>([])
  const [newAnnotation, setNewAnnotation] = useState("")
  const [annotationType, setAnnotationType] = useState<'note' | 'highlight' | 'bookmark'>('note')
  const [selectedText, setSelectedText] = useState("")
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Determine the best PDF URL
  const getPDFUrl = () => {
    if (paper.pdf_url) return paper.pdf_url
    if (paper.doi) return `https://sci-hub.se/${paper.doi}`
    if (paper.url && paper.url.includes('arxiv')) {
      const arxivId = paper.url.split('/').pop()
      return `https://arxiv.org/pdf/${arxivId}.pdf`
    }
    return paper.url
  }

  const pdfUrl = getPDFUrl()
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = `${paper.title.substring(0, 50)}.pdf`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Download Started",
        description: "PDF download has been initiated.",
      })
    }
  }

  const handleAddAnnotation = () => {
    if (!newAnnotation.trim()) return

    const annotation: PaperAnnotation = {
      id: Date.now().toString(),
      paper_id: paper.id,
      user_id: 'current-user', // This would come from auth context
      type: annotationType,
      content: newAnnotation,
      position: selectedText ? { start: 0, end: selectedText.length } : undefined,
      created_at: new Date(),
      updated_at: new Date()
    }

    setAnnotations(prev => [...prev, annotation])
    setNewAnnotation("")
    setSelectedText("")
    
    toast({
      title: "Annotation Added",
      description: `${annotationType.charAt(0).toUpperCase() + annotationType.slice(1)} added successfully.`,
    })
  }

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/paper/${paper.id}`
    navigator.clipboard.writeText(shareUrl)
    
    toast({
      title: "Link Copied",
      description: "Paper link has been copied to clipboard.",
    })
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim())
    }
  }

  useEffect(() => {
    const handleSelectionChange = () => {
      handleTextSelection()
    }
    
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  if (!pdfUrl) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4" />
            <p>PDF not available for this paper</p>
            <Button variant="outline" className="mt-4" asChild>
              <a href={paper.url} target="_blank" rel="noopener noreferrer">
                View on Publisher Site
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              PDF Viewer
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {zoom}%
              </Badge>
              {paper.open_access?.is_oa && (
                <Badge variant="outline" className="text-xs text-green-600">
                  Open Access
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 border-b pb-4">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAnnotations(!showAnnotations)}
            >
              {showAnnotations ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              Annotations
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>

          {/* PDF Viewer */}
          <div className="relative h-[600px] border rounded-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading PDF...</p>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={viewerUrl}
              className={`w-full h-full transform transition-transform`}
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center'
              }}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                toast({
                  title: "PDF Load Error",
                  description: "Unable to load PDF. Try downloading instead.",
                  variant: "destructive",
                })
              }}
            />
          </div>

          {/* Annotation Panel */}
          {showAnnotations && (
            <Card className="bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Annotations ({annotations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add New Annotation */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Select value={annotationType} onValueChange={(value: any) => setAnnotationType(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="note">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-3 w-3" />
                            Note
                          </div>
                        </SelectItem>
                        <SelectItem value="highlight">
                          <div className="flex items-center gap-2">
                            <Highlighter className="h-3 w-3" />
                            Highlight
                          </div>
                        </SelectItem>
                        <SelectItem value="bookmark">
                          <div className="flex items-center gap-2">
                            <Bookmark className="h-3 w-3" />
                            Bookmark
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder={selectedText ? `Add ${annotationType} for: "${selectedText.substring(0, 50)}..."` : `Add a ${annotationType}...`}
                      value={newAnnotation}
                      onChange={(e) => setNewAnnotation(e.target.value)}
                      className="flex-1 min-h-[60px]"
                    />
                    <Button onClick={handleAddAnnotation} disabled={!newAnnotation.trim()}>
                      Add
                    </Button>
                  </div>
                  {selectedText && (
                    <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                      Selected text: "{selectedText.substring(0, 100)}..."
                    </div>
                  )}
                </div>

                {/* Existing Annotations */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {annotations.map((annotation) => (
                    <div key={annotation.id} className="bg-white p-3 rounded border">
                      <div className="flex items-center gap-2 mb-2">
                        {annotation.type === 'note' && <MessageSquare className="h-3 w-3 text-blue-500" />}
                        {annotation.type === 'highlight' && <Highlighter className="h-3 w-3 text-yellow-500" />}
                        {annotation.type === 'bookmark' && <Bookmark className="h-3 w-3 text-red-500" />}
                        <Badge variant="outline" className="text-xs capitalize">
                          {annotation.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {annotation.created_at.toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{annotation.content}</p>
                    </div>
                  ))}
                  {annotations.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No annotations yet. Add your first annotation above.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 