"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"

export default function TestTasks() {
  const { user, session } = useSupabaseAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("Test Task")
  const [description, setDescription] = useState("This is a test task for the planner.")
  const [projectId, setProjectId] = useState("")
  const [priority, setPriority] = useState("medium")
  const [status, setStatus] = useState("todo")
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])

  const fetchProjects = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to fetch projects",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/projects", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()
      if (response.ok) {
        setProjects(data.projects || [])
        if (data.projects?.length > 0 && !projectId) {
          setProjectId(data.projects[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  const testCreateTask = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test task creation",
        variant: "destructive",
      })
      return
    }

    if (!projectId) {
      toast({
        title: "Project required",
        description: "Please select a project first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title,
          description,
          project_id: projectId,
          priority,
          status,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        }),
      })

      const data = await response.json()
      console.log("Create Task Response:", data)

      if (response.ok) {
        toast({
          title: "Task Created Successfully",
          description: `Task "${data.task.title}" created with ID: ${data.task.id}`,
        })
        // Refresh tasks list
        await testGetTasks()
      } else {
        toast({
          title: "Task Creation Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Create task error:", error)
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testGetTasks = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test task retrieval",
        variant: "destructive",
      })
      return
    }

    if (!projectId) {
      toast({
        title: "Project required",
        description: "Please select a project first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/tasks?project_id=${projectId}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()
      console.log("Get Tasks Response:", data)

      if (response.ok) {
        setTasks(data.tasks || [])
        toast({
          title: "Tasks Retrieved Successfully",
          description: `Found ${data.tasks?.length || 0} tasks`,
        })
      } else {
        toast({
          title: "Get Tasks Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Get tasks error:", error)
      toast({
        title: "Get Tasks Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testUpdateTask = async (taskId: string) => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test task updates",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: `${title} (Updated)`,
          description: `${description} (Updated at ${new Date().toLocaleTimeString()})`,
          status: "in-progress",
        }),
      })

      const data = await response.json()
      console.log("Update Task Response:", data)

      if (response.ok) {
        toast({
          title: "Task Updated Successfully",
          description: `Task "${data.task.title}" updated`,
        })
        // Refresh tasks list
        await testGetTasks()
      } else {
        toast({
          title: "Task Update Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Update task error:", error)
      toast({
        title: "Update Task Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testDeleteTask = async (taskId: string) => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test task deletion",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Are you sure you want to delete this task?")) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()
      console.log("Delete Task Response:", data)

      if (response.ok) {
        toast({
          title: "Task Deleted Successfully",
          description: "Task has been deleted",
        })
        // Refresh tasks list
        await testGetTasks()
      } else {
        toast({
          title: "Task Deletion Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete task error:", error)
      toast({
        title: "Delete Task Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch projects on component mount
  React.useEffect(() => {
    fetchProjects()
  }, [session])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Task Management Test</CardTitle>
          <CardDescription>
            Test the task management functionality to ensure tasks are working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>User ID: {user?.id || "Not logged in"}</Label>
            <Label>Session: {session ? "Active" : "No session"}</Label>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="project">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
              />
            </div>

            <div>
              <Label htmlFor="description">Task Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={testCreateTask}
                disabled={loading || !session || !projectId}
                className="w-full"
              >
                {loading ? "Creating..." : "Test Create Task"}
              </Button>

              <Button
                onClick={testGetTasks}
                disabled={loading || !session || !projectId}
                variant="outline"
                className="w-full"
              >
                {loading ? "Loading..." : "Test Get Tasks"}
              </Button>
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-4">Tasks for Selected Project:</h3>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-gray-600">
                        Priority: {task.priority} | Status: {task.status} | Created: {new Date(task.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testUpdateTask(task.id)}
                        disabled={loading}
                      >
                        Update
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => testDeleteTask(task.id)}
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