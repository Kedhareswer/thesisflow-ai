"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"

export default function TestDocuments() {
  const { user, session } = useSupabaseAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("Test Document")
  const [content, setContent] = useState("This is a test document content.")
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])

  const testCreateDocument = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test document creation",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title,
          content,
          document_type: "paper",
          is_public: false,
        }),
      })

      const data = await response.json()
      console.log("Create Document Response:", data)

      if (response.ok) {
        toast({
          title: "Document Created Successfully",
          description: `Document "${data.document.title}" created with ID: ${data.document.id}`,
        })
        // Refresh documents list
        await testGetDocuments()
      } else {
        toast({
          title: "Document Creation Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Create document error:", error)
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testGetDocuments = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test document retrieval",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/documents", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()
      console.log("Get Documents Response:", data)

      if (response.ok) {
        setDocuments(data.documents || [])
        toast({
          title: "Documents Retrieved Successfully",
          description: `Found ${data.documents?.length || 0} documents`,
        })
      } else {
        toast({
          title: "Get Documents Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Get documents error:", error)
      toast({
        title: "Get Documents Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testUpdateDocument = async (documentId: string) => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test document updates",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: `${title} (Updated)`,
          content: `${content} (Updated at ${new Date().toLocaleTimeString()})`,
        }),
      })

      const data = await response.json()
      console.log("Update Document Response:", data)

      if (response.ok) {
        toast({
          title: "Document Updated Successfully",
          description: `Document "${data.document.title}" updated`,
        })
        // Refresh documents list
        await testGetDocuments()
      } else {
        toast({
          title: "Document Update Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Update document error:", error)
      toast({
        title: "Update Document Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testDeleteDocument = async (documentId: string) => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test document deletion",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Are you sure you want to delete this document?")) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()
      console.log("Delete Document Response:", data)

      if (response.ok) {
        toast({
          title: "Document Deleted Successfully",
          description: "Document has been deleted",
        })
        // Refresh documents list
        await testGetDocuments()
      } else {
        toast({
          title: "Document Deletion Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete document error:", error)
      toast({
        title: "Delete Document Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Document Saving Test</CardTitle>
          <CardDescription>
            Test the document saving functionality to ensure it's working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>User ID: {user?.id || "Not logged in"}</Label>
            <Label>Session: {session ? "Active" : "No session"}</Label>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title"
              />
            </div>

            <div>
              <Label htmlFor="content">Document Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter document content"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Button
                onClick={testCreateDocument}
                disabled={loading || !session}
                className="w-full"
              >
                {loading ? "Creating..." : "Test Create Document"}
              </Button>

              <Button
                onClick={testGetDocuments}
                disabled={loading || !session}
                variant="outline"
                className="w-full"
              >
                {loading ? "Loading..." : "Test Get Documents"}
              </Button>
            </div>
          </div>

          {documents.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-4">Your Documents:</h3>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-medium">{doc.title}</h4>
                      <p className="text-sm text-gray-600">
                        Type: {doc.document_type} | Created: {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testUpdateDocument(doc.id)}
                        disabled={loading}
                      >
                        Update
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => testDeleteDocument(doc.id)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <p className="text-sm text-gray-600">
              Check the browser console for detailed response data
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 