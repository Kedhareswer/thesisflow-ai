"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Clock, User, RotateCcw, Trash2, Eye, FileText, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  title: string
  content: string
  created_at: string
  created_by: string
  user_name?: string
  user_avatar?: string
  changes_summary?: string
  word_count?: number
}

interface VersionHistoryProps {
  documentId?: string
  currentVersion: number
  onRestore: (version: DocumentVersion) => void
  onCompare?: (versionA: DocumentVersion, versionB: DocumentVersion) => void
  className?: string
}

export function VersionHistory({ documentId, currentVersion, onRestore, onCompare, className }: VersionHistoryProps) {
  const { toast } = useToast()
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareVersions, setCompareVersions] = useState<string[]>([])

  // Mock data for demonstration - replace with actual API call
  useEffect(() => {
    const loadVersions = async () => {
      setLoading(true)
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500))

        const mockVersions: DocumentVersion[] = [
          {
            id: "v5",
            document_id: documentId || "",
            version_number: 5,
            title: "Research Paper Draft v5",
            content: "Latest content...",
            created_at: new Date().toISOString(),
            created_by: "current-user",
            user_name: "You",
            changes_summary: "Added conclusion section",
            word_count: 3240,
          },
          {
            id: "v4",
            document_id: documentId || "",
            version_number: 4,
            title: "Research Paper Draft v4",
            content: "Previous content...",
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            created_by: "user-2",
            user_name: "John Doe",
            changes_summary: "Updated methodology section",
            word_count: 2980,
          },
          {
            id: "v3",
            document_id: documentId || "",
            version_number: 3,
            title: "Research Paper Draft v3",
            content: "Older content...",
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            created_by: "current-user",
            user_name: "You",
            changes_summary: "Added references and citations",
            word_count: 2650,
          },
          {
            id: "v2",
            document_id: documentId || "",
            version_number: 2,
            title: "Research Paper Draft v2",
            content: "Earlier content...",
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            created_by: "user-2",
            user_name: "John Doe",
            changes_summary: "Revised introduction",
            word_count: 2100,
          },
          {
            id: "v1",
            document_id: documentId || "",
            version_number: 1,
            title: "Research Paper Draft v1",
            content: "Initial content...",
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
            created_by: "current-user",
            user_name: "You",
            changes_summary: "Initial draft",
            word_count: 1500,
          },
        ]

        setVersions(mockVersions)
      } catch (error) {
        console.error("Failed to load versions:", error)
        toast({
          title: "Error",
          description: "Failed to load version history",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (documentId) {
      loadVersions()
    } else {
      setLoading(false)
    }
  }, [documentId, toast])

  const handleRestore = (version: DocumentVersion) => {
    if (version.version_number === currentVersion) {
      toast({
        title: "Already Current",
        description: "This is the current version",
      })
      return
    }

    onRestore(version)
    toast({
      title: "Version Restored",
      description: `Restored to version ${version.version_number}`,
    })
  }

  const handleToggleCompare = (versionId: string) => {
    if (!compareMode) {
      setCompareMode(true)
      setCompareVersions([versionId])
    } else {
      if (compareVersions.includes(versionId)) {
        const updated = compareVersions.filter((id) => id !== versionId)
        setCompareVersions(updated)
        if (updated.length === 0) {
          setCompareMode(false)
        }
      } else if (compareVersions.length < 2) {
        setCompareVersions([...compareVersions, versionId])
      }
    }
  }

  const handleCompare = () => {
    if (compareVersions.length === 2 && onCompare) {
      const versionA = versions.find((v) => v.id === compareVersions[0])
      const versionB = versions.find((v) => v.id === compareVersions[1])
      if (versionA && versionB) {
        onCompare(versionA, versionB)
        setCompareMode(false)
        setCompareVersions([])
      }
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!documentId || versions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No version history available</p>
            <p className="text-xs mt-2">Versions are created automatically when you save changes</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Version History</CardTitle>
          {compareMode && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCompare}
              disabled={compareVersions.length !== 2}
              className="text-xs"
            >
              Compare ({compareVersions.length}/2)
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="p-4 space-y-2">
            {versions.map((version, index) => {
              const isSelected = selectedVersion === version.id
              const isCurrentVersion = version.version_number === currentVersion
              const isCompareSelected = compareVersions.includes(version.id)

              return (
                <div
                  key={version.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : isCompareSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedVersion(version.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900">Version {version.version_number}</h4>
                        {isCurrentVersion && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{version.changes_summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{version.user_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}</span>
                    </div>
                    {version.word_count && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{version.word_count} words</span>
                      </div>
                    )}
                  </div>

                  <Separator className="my-2" />

                  <div className="flex items-center gap-2">
                    {!isCurrentVersion && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRestore(version)
                        }}
                        className="text-xs h-7"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleCompare(version.id)
                      }}
                      className={`text-xs h-7 ${isCompareSelected ? "bg-blue-100" : ""}`}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {compareMode ? (isCompareSelected ? "Selected" : "Select") : "Compare"}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
