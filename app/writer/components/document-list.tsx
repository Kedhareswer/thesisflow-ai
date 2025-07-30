"use client"

import { useEffect } from "react"
import { useSafeState, useSafeCallback } from "@/app/writer/hooks/use-safe-state"
import { useToast } from "@/hooks/use-toast"
import DocumentService, { type Document } from "@/lib/services/document.service"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface DocumentListProps {
  onDocumentSelect: (document: Document) => void
  currentDocumentId: string | null
  className?: string
}

export function DocumentList({ onDocumentSelect, currentDocumentId, className }: DocumentListProps) {
  const [documents, setDocuments] = useSafeState<Document[]>([])
  const [isLoading, setIsLoading] = useSafeState(true)
  const [isCreating, setIsCreating] = useSafeState(false)
  const [newDocumentTitle, setNewDocumentTitle] = useSafeState("")
  const { toast } = useToast()
  const documentService = DocumentService.getInstance()

  const fetchDocuments = useSafeCallback(async () => {
    setIsLoading(true)
    try {
      const fetchedDocs = await documentService.getDocumentsByType("paper")
      setDocuments(fetchedDocs)
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({
        title: "Error",
        description: "Failed to load documents.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  })

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleCreateDocument = useSafeCallback(async () => {
    if (!newDocumentTitle.trim()) {
      toast({
        title: "Error",
        description: "Document title cannot be empty.",
        variant: "destructive",
      })
      return
    }
    setIsCreating(true)
    try {
      const newDoc = await documentService.createDocument({
        title: newDocumentTitle,
        content: "",
        document_type: "paper",
      })
      setDocuments((prev) => [newDoc, ...prev])
      onDocumentSelect(newDoc)
      setNewDocumentTitle("")
      toast({
        title: "Success",
        description: `Document "${newDoc.title}" created.`,
      })
    } catch (error) {
      console.error("Error creating document:", error)
      toast({
        title: "Error",
        description: "Failed to create document.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  })

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center space-x-2">
        <Input
          placeholder="New document title..."
          value={newDocumentTitle}
          onChange={(e) => setNewDocumentTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCreateDocument()
            }
          }}
          className="flex-1 h-8 text-sm bg-gray-100 border-gray-200 focus:bg-white"
          disabled={isCreating}
        />
        <Button
          size="sm"
          onClick={handleCreateDocument}
          disabled={isCreating || !newDocumentTitle.trim()}
          className="h-8 px-3 text-xs bg-gray-900 text-white hover:bg-gray-800"
        >
          {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-sm text-gray-500">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-4 text-sm text-gray-500">No documents yet. Create one!</div>
      ) : (
        <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
          {documents.map((doc) => (
            <Button
              key={doc.id}
              variant="ghost"
              className={cn(
                "w-full justify-start text-sm h-9 px-3",
                currentDocumentId === doc.id && "bg-gray-100 text-gray-900 font-medium",
              )}
              onClick={() => onDocumentSelect(doc)}
            >
              <FileText className="h-4 w-4 mr-2 text-gray-500" />
              <span className="truncate">{doc.title}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
