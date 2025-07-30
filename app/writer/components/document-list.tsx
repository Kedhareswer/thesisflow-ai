"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, FileText, Folder, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { DocumentService } from "@/lib/services/document.service" // Corrected import to named export
import { useToast } from "@/hooks/use-toast"
import type { Document } from "@/lib/types" // Assuming Document type is here

interface DocumentListProps {
  activeDocumentId?: string
}

export default function DocumentList({ activeDocumentId }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true)
        const fetchedDocs = await DocumentService.getInstance().getDocuments({ document_type: "paper" })
        setDocuments(fetchedDocs)
      } catch (err) {
        console.error("Failed to fetch documents:", err)
        setError("Failed to load documents.")
        toast({
          title: "Error",
          description: "Failed to load documents.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchDocuments()
  }, [toast])

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
    <Link
      key={doc.id}
      href={`/writer?id=${doc.id}`}
      className={cn(
        "flex items-center gap-2 py-1.5 px-3 rounded-md text-sm transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        activeDocumentId === doc.id ? "bg-gray-200 dark:bg-gray-700 font-medium" : "text-gray-700 dark:text-gray-300",
      )}
    >
      <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      <span className="truncate">{doc.title || "Untitled document"}</span>
    </Link>
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Pages</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
            <span className="sr-only">New document</span>
          </Button>
        </div>
        <Input
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      <ScrollArea className="flex-1 p-4">
        {loading ? (
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
