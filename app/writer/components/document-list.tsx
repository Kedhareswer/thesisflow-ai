"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { FileText, Folder, ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import DocumentService, { Document } from "@/lib/services/document.service"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface DocumentListProps {
  activeDocumentId?: string
}

export default function DocumentList({ activeDocumentId }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const { toast } = useToast()

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)
      } catch (err) {
        console.error("Auth check failed:", err)
        setIsAuthenticated(false)
      }
    }
    
    checkAuth()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user)
    })
    
    return () => subscription.unsubscribe()
  }, [])

  const fetchDocuments = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const fetchedDocs = await DocumentService.getInstance().getDocuments({ document_type: "paper" })
      setDocuments(fetchedDocs)
      setError(null)
    } catch (err) {
      console.error("Failed to fetch documents:", err)
      setError("Failed to load documents.")
      // Show toast without making it a dependency
      toast({
        title: "Error",
        description: "Failed to load documents.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated]) // Remove toast dependency

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleDeleteDocument = async (docId: string, docTitle: string) => {
    if (!isAuthenticated) return
    
    try {
      setDeletingDocId(docId)
      await DocumentService.getInstance().deleteDocument(docId)
      
      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== docId))
      
      toast({
        title: "Document deleted",
        description: `"${docTitle}" has been deleted.`,
      })
    } catch (err) {
      console.error("Failed to delete document:", err)
      toast({
        title: "Delete failed",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingDocId(null)
    }
  }

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  const filteredDocuments = documents.filter((doc) => doc.title.toLowerCase().includes(searchTerm.toLowerCase()))

  const documentsByFolder: { [key: string]: Document[] } = {
    root: [], // For documents without a parent folder
  }

  filteredDocuments.forEach((doc) => {
    // Assuming a simple project_id for grouping. In a real app, this would be more robust.
    if (doc.project_id) {
      if (!documentsByFolder[doc.project_id]) {
        documentsByFolder[doc.project_id] = []
      }
      documentsByFolder[doc.project_id].push(doc)
    } else {
      documentsByFolder["root"].push(doc)
    }
  })

  const renderDocumentItem = (doc: Document) => (
    <div
      key={doc.id}
      className={cn(
        "flex items-center justify-between py-1.5 px-3 rounded-md text-sm transition-colors group",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        activeDocumentId === doc.id ? "bg-gray-200 dark:bg-gray-700 font-medium" : "text-gray-700 dark:text-gray-300",
      )}
    >
      <Link
        href={`/writer?id=${doc.id}`}
        className="flex items-center gap-2 flex-1 min-w-0"
      >
        <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <span className="truncate">{doc.title || "Untitled document"}</span>
      </Link>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDeleteDocument(doc.id, doc.title || "Untitled document")}
        disabled={deletingDocId === doc.id}
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
      >
        <Trash2 className="h-3 w-3" />
        <span className="sr-only">Delete {doc.title || "Untitled document"}</span>
      </Button>
    </div>
  )

  const renderFolder = (folderId: string, folderName: string) => {
    const isExpanded = expandedFolders.has(folderId)
    const folderDocs = documentsByFolder[folderId] || []

    return (
      <div key={folderId} className="ml-2">
        <button
          onClick={() => handleToggleFolder(folderId)}
          className="flex items-center gap-2 py-1.5 px-3 rounded-md text-sm w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
          <Folder className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="truncate font-medium">{folderName}</span>
        </button>
        {isExpanded && (
          <div className="pl-4 border-l border-gray-200 dark:border-gray-700">
            {folderDocs.map(renderDocumentItem)}
            {/* Render subfolders recursively if needed */}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Saved</h2>
        </div>
        <Input
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      <ScrollArea className="flex-1 p-4">
        {!isAuthenticated ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Please log in to view your documents
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm text-center">{error}</div>
        ) : (
          <div className="space-y-1">
            {/* Render root documents */}
            {documentsByFolder["root"].map(renderDocumentItem)}
            {/* Render folders (if any) - assuming folders are also documents with a type 'folder' or similar */}
            {/* For this example, we'll just list some dummy folders or group by a simple project_id */}
            {Object.keys(documentsByFolder)
              .filter((key) => key !== "root" && documentsByFolder[key].length > 0)
              .map((folderId) => renderFolder(folderId, `Project ${folderId.substring(0, 4)}`))}{" "}
            {/* Dummy folder name */}
            {documents.length === 0 && !searchTerm && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No documents yet. Click '+' to create one!
              </p>
            )}
            {documents.length > 0 && filteredDocuments.length === 0 && searchTerm && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No documents found for "{searchTerm}".
              </p>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <Button
          variant="ghost"
          className="w-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Load more
        </Button>
      </div>
    </div>
  )
}
