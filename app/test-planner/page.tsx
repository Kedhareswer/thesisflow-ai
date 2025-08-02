"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"

export default function TestPlanner() {
  const { user, session } = useSupabaseAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("Test Project")
  const [description, setDescription] = useState("This is a test project for the planner.")
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<any[]>([])

  const testCreateProject = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test project creation",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title,
          description,
          status: "planning",
          progress: 0,
        }),
      })

      const data = await response.json()
      console.log("Create Project Response:", data)

      if (response.ok) {
        toast({
          title: "Project Created Successfully",
          description: `Project "${data.project.title}" created with ID: ${data.project.id}`,
        })
        // Refresh projects list
        await testGetProjects()
      } else {
        toast({
          title: "Project Creation Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Create project error:", error)
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testGetProjects = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test project retrieval",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/projects", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()
      console.log("Get Projects Response:", data)

      if (response.ok) {
        setProjects(data.projects || [])
        toast({
          title: "Projects Retrieved Successfully",
          description: `Found ${data.projects?.length || 0} projects`,
        })
      } else {
        toast({
          title: "Get Projects Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Get projects error:", error)
      toast({
        title: "Get Projects Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testUpdateProject = async (projectId: string) => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test project updates",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: `${title} (Updated)`,
          description: `${description} (Updated at ${new Date().toLocaleTimeString()})`,
          progress: 50,
        }),
      })

      const data = await response.json()
      console.log("Update Project Response:", data)

      if (response.ok) {
        toast({
          title: "Project Updated Successfully",
          description: `Project "${data.project.title}" updated`,
        })
        // Refresh projects list
        await testGetProjects()
      } else {
        toast({
          title: "Project Update Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Update project error:", error)
      toast({
        title: "Update Project Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testDeleteProject = async (projectId: string) => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test project deletion",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Are you sure you want to delete this project?")) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()
      console.log("Delete Project Response:", data)

      if (response.ok) {
        toast({
          title: "Project Deleted Successfully",
          description: "Project has been deleted",
        })
        // Refresh projects list
        await testGetProjects()
      } else {
        toast({
          title: "Project Deletion Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete project error:", error)
      toast({
        title: "Delete Project Error",
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
          <CardTitle>Planner Test</CardTitle>
          <CardDescription>
            Test the planner functionality to ensure projects are working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>User ID: {user?.id || "Not logged in"}</Label>
            <Label>Session: {session ? "Active" : "No session"}</Label>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter project title"
              />
            </div>

            <div>
              <Label htmlFor="description">Project Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter project description"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Button
                onClick={testCreateProject}
                disabled={loading || !session}
                className="w-full"
              >
                {loading ? "Creating..." : "Test Create Project"}
              </Button>

              <Button
                onClick={testGetProjects}
                disabled={loading || !session}
                variant="outline"
                className="w-full"
              >
                {loading ? "Loading..." : "Test Get Projects"}
              </Button>
            </div>
          </div>

          {projects.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-4">Your Projects:</h3>
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-3 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-medium">{project.title}</h4>
                      <p className="text-sm text-gray-600">
                        Status: {project.status} | Progress: {project.progress}% | Created: {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testUpdateProject(project.id)}
                        disabled={loading}
                      >
                        Update
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => testDeleteProject(project.id)}
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