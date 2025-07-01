"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Users, 
  Share2, 
  BookmarkPlus, 
  MessageSquare, 
  Eye, 
  Star,
  Lock,
  Globe,
  UserPlus,
  Send
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { ResearchPaper } from "@/lib/types/common"

interface Collection {
  id: string
  name: string
  description: string
  papers: ResearchPaper[]
  owner: string
  collaborators: string[]
  visibility: 'private' | 'shared' | 'public'
  created_at: Date
  updated_at: Date
}

interface CollaborationPanelProps {
  papers: ResearchPaper[]
  className?: string
}

export function CollaborationPanel({ papers, className }: CollaborationPanelProps) {
  const { toast } = useToast()
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedPapers, setSelectedPapers] = useState<Set<string>>(new Set())
  const [newCollectionName, setNewCollectionName] = useState("")
  const [newCollectionDescription, setNewCollectionDescription] = useState("")
  const [collaboratorEmail, setCollaboratorEmail] = useState("")
  const [shareNote, setShareNote] = useState("")

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) {
      toast({
        title: "Collection Name Required",
        description: "Please enter a name for your collection.",
        variant: "destructive",
      })
      return
    }

    const papersToAdd = papers.filter(p => selectedPapers.has(p.id))
    
    if (papersToAdd.length === 0) {
      toast({
        title: "No Papers Selected",
        description: "Please select papers to add to the collection.",
        variant: "destructive",
      })
      return
    }

    const newCollection: Collection = {
      id: Date.now().toString(),
      name: newCollectionName,
      description: newCollectionDescription,
      papers: papersToAdd,
      owner: 'current-user', // This would come from auth context
      collaborators: [],
      visibility: 'private',
      created_at: new Date(),
      updated_at: new Date()
    }

    setCollections(prev => [...prev, newCollection])
    setSelectedPapers(new Set())
    setNewCollectionName("")
    setNewCollectionDescription("")

    toast({
      title: "Collection Created",
      description: `Created collection "${newCollectionName}" with ${papersToAdd.length} papers.`,
    })
  }

  const handleAddCollaborator = (collectionId: string) => {
    if (!collaboratorEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a collaborator's email.",
        variant: "destructive",
      })
      return
    }

    setCollections(prev => prev.map(collection => 
      collection.id === collectionId 
        ? { ...collection, collaborators: [...collection.collaborators, collaboratorEmail] }
        : collection
    ))

    setCollaboratorEmail("")

    toast({
      title: "Collaborator Added",
      description: `Invited ${collaboratorEmail} to collaborate on the collection.`,
    })
  }

  const handleShareCollection = (collection: Collection) => {
    const shareUrl = `${window.location.origin}/collection/${collection.id}`
    navigator.clipboard.writeText(shareUrl)

    toast({
      title: "Link Copied",
      description: "Collection link has been copied to clipboard.",
    })
  }

  const handleChangeVisibility = (collectionId: string, visibility: 'private' | 'shared' | 'public') => {
    setCollections(prev => prev.map(collection =>
      collection.id === collectionId
        ? { ...collection, visibility, updated_at: new Date() }
        : collection
    ))

    toast({
      title: "Visibility Updated",
      description: `Collection visibility changed to ${visibility}.`,
    })
  }

  const getVisibilityIcon = (visibility: Collection['visibility']) => {
    switch (visibility) {
      case 'private':
        return <Lock className="h-3 w-3" />
      case 'shared':
        return <Users className="h-3 w-3" />
      case 'public':
        return <Globe className="h-3 w-3" />
    }
  }

  const getVisibilityColor = (visibility: Collection['visibility']) => {
    switch (visibility) {
      case 'private':
        return 'text-gray-600'
      case 'shared':
        return 'text-blue-600'
      case 'public':
        return 'text-green-600'
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Research Collaboration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paper Selection */}
          <div className="space-y-3">
            <h3 className="font-medium">Select Papers for Collection</h3>
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {papers.map(paper => (
                <div key={paper.id} className="flex items-center space-x-2 p-2 border rounded">
                  <input
                    type="checkbox"
                    checked={selectedPapers.has(paper.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedPapers)
                      if (e.target.checked) {
                        newSelected.add(paper.id)
                      } else {
                        newSelected.delete(paper.id)
                      }
                      setSelectedPapers(newSelected)
                    }}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{paper.title}</p>
                    <p className="text-xs text-gray-500">
                      {paper.authors.slice(0, 2).join(", ")}
                      {paper.authors.length > 2 ? " et al." : ""} • {paper.year}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              {selectedPapers.size} paper{selectedPapers.size !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Create Collection */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-medium">Create New Collection</h3>
            <Input
              placeholder="Collection name..."
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
            />
            <Textarea
              placeholder="Collection description (optional)..."
              value={newCollectionDescription}
              onChange={(e) => setNewCollectionDescription(e.target.value)}
              className="min-h-[60px]"
            />
            <Button 
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim() || selectedPapers.size === 0}
              className="w-full"
            >
              <BookmarkPlus className="h-4 w-4 mr-2" />
              Create Collection
            </Button>
          </div>

          {/* Existing Collections */}
          {collections.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-medium">My Collections ({collections.length})</h3>
              <div className="space-y-3">
                {collections.map(collection => (
                  <Card key={collection.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{collection.name}</h4>
                          {collection.description && (
                            <p className="text-sm text-gray-600 mt-1">{collection.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${getVisibilityColor(collection.visibility)}`}>
                            {getVisibilityIcon(collection.visibility)}
                            {collection.visibility}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <span>{collection.papers.length} papers</span>
                        <span>•</span>
                        <span>{collection.collaborators.length} collaborators</span>
                        <span>•</span>
                        <span>Updated {collection.updated_at.toLocaleDateString()}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleShareCollection(collection)}>
                          <Share2 className="h-3 w-3 mr-1" />
                          Share
                        </Button>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <UserPlus className="h-3 w-3 mr-1" />
                              Add Collaborator
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Collaborator</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <Input
                                placeholder="Collaborator email..."
                                value={collaboratorEmail}
                                onChange={(e) => setCollaboratorEmail(e.target.value)}
                              />
                              <Textarea
                                placeholder="Add a note (optional)..."
                                value={shareNote}
                                onChange={(e) => setShareNote(e.target.value)}
                                className="min-h-[60px]"
                              />
                              <Button 
                                onClick={() => handleAddCollaborator(collection.id)}
                                className="w-full"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Send Invitation
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Select 
                          value={collection.visibility}
                          onValueChange={(value: any) => handleChangeVisibility(collection.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="private">
                              <div className="flex items-center gap-2">
                                <Lock className="h-3 w-3" />
                                Private
                              </div>
                            </SelectItem>
                            <SelectItem value="shared">
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                Shared
                              </div>
                            </SelectItem>
                            <SelectItem value="public">
                              <div className="flex items-center gap-2">
                                <Globe className="h-3 w-3" />
                                Public
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Collaborators */}
                      {collection.collaborators.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500 mb-2">Collaborators:</p>
                          <div className="flex flex-wrap gap-1">
                            {collection.collaborators.map((email, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {email}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
