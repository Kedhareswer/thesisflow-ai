"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Plus, Clock, CheckCircle, AlertCircle, Target, Loader2 } from "lucide-react"
import { useSocket } from "@/components/socket-provider"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { projectService, type Project, type Task } from "@/lib/services/project.service"

export default function ProjectPlanner() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [tasks, setTasks] = useState<Record<string, Task[]>>({})
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
  })
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium" as Task["priority"],
    estimated_hours: 0,
  })
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const { socket } = useSocket()
  const { toast } = useToast()
  const { user } = useSupabaseAuth()

  // Load projects from database
  useEffect(() => {
    if (user) {
      loadProjects()
    }
  }, [user])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!selectedProject) return

    const unsubscribe = projectService.subscribeToProject(selectedProject, (payload) => {
      console.log('Real-time update:', payload)
      // Refresh data when changes occur
      loadProjects()
      loadProjectTasks(selectedProject)
    })

    return unsubscribe
  }, [selectedProject])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const { projects: userProjects, error } = await projectService.getProjects()
      
      if (error) {
        toast({
          title: "Error loading projects",
          description: error,
          variant: "destructive",
        })
        return
      }

      setProjects(userProjects)
      
      // Load tasks for each project
      const tasksData: Record<string, Task[]> = {}
      for (const project of userProjects) {
        const { tasks: projectTasks } = await projectService.getProjectTasks(project.id)
        tasksData[project.id] = projectTasks
      }
      setTasks(tasksData)
      
    } catch (error) {
      console.error('Error loading projects:', error)
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadProjectTasks = async (projectId: string) => {
    const { tasks: projectTasks } = await projectService.getProjectTasks(projectId)
    setTasks(prev => ({ ...prev, [projectId]: projectTasks }))
  }

  const createProject = async () => {
    if (!newProject.title.trim()) return

    setCreating(true)
    try {
      const { project, error } = await projectService.createProject({
        title: newProject.title,
        description: newProject.description,
        start_date: newProject.start_date,
        end_date: newProject.end_date,
        status: "planning",
        progress: 0,
      })

      if (error) {
        toast({
          title: "Error creating project",
          description: error,
          variant: "destructive",
        })
        return
      }

      if (project) {
        setProjects(prev => [project, ...prev])
        setTasks(prev => ({ ...prev, [project.id]: [] }))
        setNewProject({ title: "", description: "", start_date: "", end_date: "" })

        if (socket) {
          socket.emit("project_created", {
            title: project.title,
            start_date: project.start_date,
          })
        }

        toast({
          title: "Project created",
          description: `"${project.title}" has been added to your projects`,
        })
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const addTask = async (projectId: string) => {
    if (!newTask.title.trim()) return

    try {
      const { task, error } = await projectService.createTask({
        project_id: projectId,
        title: newTask.title,
        description: newTask.description,
        due_date: newTask.due_date,
        priority: newTask.priority,
        status: "todo",
        estimated_hours: newTask.estimated_hours || undefined,
      })

      if (error) {
        toast({
          title: "Error creating task",
          description: error,
          variant: "destructive",
        })
        return
      }

      if (task) {
        // Update local state
        setTasks(prev => ({
          ...prev,
          [projectId]: [...(prev[projectId] || []), task]
        }))

        // Update project progress in local state
        const projectTasks = [...(tasks[projectId] || []), task]
        const completedTasks = projectTasks.filter(t => t.status === "completed").length
        const progress = Math.round((completedTasks / projectTasks.length) * 100)
        
        setProjects(prev => prev.map(p => 
          p.id === projectId ? { ...p, progress } : p
        ))

        setNewTask({ title: "", description: "", due_date: "", priority: "medium", estimated_hours: 0 })

        toast({
          title: "Task added",
          description: `"${task.title}" has been added to the project`,
        })
      }
    } catch (error) {
      console.error('Error creating task:', error)
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      })
    }
  }

  const updateTaskStatus = async (projectId: string, taskId: string, status: Task["status"]) => {
    try {
      const { task, error } = await projectService.updateTask(taskId, { status })

      if (error) {
        toast({
          title: "Error updating task",
          description: error,
          variant: "destructive",
        })
        return
      }

      if (task) {
        // Update local state
        setTasks(prev => ({
          ...prev,
          [projectId]: prev[projectId]?.map(t => t.id === taskId ? task : t) || []
        }))

        // Update project progress
        const projectTasks = tasks[projectId]?.map(t => t.id === taskId ? { ...t, status } : t) || []
        const completedTasks = projectTasks.filter(t => t.status === "completed").length
        const progress = Math.round((completedTasks / projectTasks.length) * 100)
        
        setProjects(prev => prev.map(p => 
          p.id === projectId ? { ...p, progress } : p
        ))

        toast({
          title: "Task updated",
          description: `"${task.title}" marked as ${status.replace("-", " ")}`,
        })
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      })
    }
  }

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "border-black text-black"
      case "medium":
        return "border-gray-500 text-gray-700"
      case "low":
        return "border-gray-300 text-gray-600"
    }
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-black" />
      case "in-progress":
        return <Clock className="h-4 w-4 text-gray-600" />
      case "todo":
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getProjectStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "planning":
        return "border-gray-300 text-gray-700"
      case "active":
        return "border-black text-black"
      case "completed":
        return "border-gray-600 text-gray-600"
      case "on-hold":
        return "border-gray-400 text-gray-600"
    }
  }

  const selectedProjectData = projects.find((p) => p.id === selectedProject)
  const selectedProjectTasks = selectedProject ? tasks[selectedProject] || [] : []

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600" />
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    )
  }

  // Show auth required state
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-medium mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to access your projects.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-8 py-12 max-w-7xl">
        <Tabs defaultValue="projects" className="space-y-10">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 max-w-lg mx-auto">
            <TabsTrigger
              value="projects"
              className="data-[state=active]:bg-white data-[state=active]:text-black font-medium"
            >
              Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="data-[state=active]:bg-white data-[state=active]:text-black font-medium"
            >
              All Tasks
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="data-[state=active]:bg-white data-[state=active]:text-black font-medium"
            >
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-10">
            {/* Create New Project */}
            <div className="border border-gray-200">
              <div className="p-8 border-b border-gray-200">
                <h3 className="text-xl font-medium text-black flex items-center gap-3">
                  <div className="w-1 h-6 bg-black"></div>
                  Create New Project
                </h3>
                <p className="text-gray-600 text-sm mt-2 font-light">
                  Start a new research project with clear objectives and timelines
                </p>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-title" className="text-sm font-medium text-black uppercase tracking-wide">
                      Project Title
                    </Label>
                    <Input
                      id="project-title"
                      placeholder="Enter your research project title"
                      value={newProject.title}
                      onChange={(e) => setNewProject((prev) => ({ ...prev, title: e.target.value }))}
                      className="border-gray-300 focus:border-black focus:ring-black font-light"
                      disabled={creating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-start" className="text-sm font-medium text-black uppercase tracking-wide">
                      Start Date
                    </Label>
                    <Input
                      id="project-start"
                      type="date"
                      value={newProject.start_date}
                      onChange={(e) => setNewProject((prev) => ({ ...prev, start_date: e.target.value }))}
                      className="border-gray-300 focus:border-black focus:ring-black font-light"
                      disabled={creating}
                    />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="project-description"
                      className="text-sm font-medium text-black uppercase tracking-wide"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="project-description"
                      placeholder="Describe your research project objectives and methodology"
                      value={newProject.description}
                      onChange={(e) => setNewProject((prev) => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="resize-none border-gray-300 focus:border-black focus:ring-black font-light"
                      disabled={creating}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-end" className="text-sm font-medium text-black uppercase tracking-wide">
                        End Date
                      </Label>
                      <Input
                        id="project-end"
                        type="date"
                        value={newProject.end_date}
                        onChange={(e) => setNewProject((prev) => ({ ...prev, end_date: e.target.value }))}
                        className="border-gray-300 focus:border-black focus:ring-black font-light"
                        disabled={creating}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={createProject}
                  disabled={!newProject.title.trim() || creating}
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-4"
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {creating ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </div>

            {/* Projects Overview */}
            {projects.length > 0 && (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-black"></div>
                    <h3 className="font-medium text-black">Overview</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Projects</span>
                      <span className="font-medium text-black">{projects.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active</span>
                      <span className="font-medium text-black">
                        {projects.filter((p) => p.status === "active").length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completed</span>
                      <span className="font-medium text-black">
                        {projects.filter((p) => p.status === "completed").length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-gray-400"></div>
                    <h3 className="font-medium text-black">Progress</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg. Completion</span>
                      <span className="font-medium text-black">
                        {projects.length > 0
                          ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Tasks</span>
                      <span className="font-medium text-black">
                        {Object.values(tasks).reduce((acc, projectTasks) => acc + projectTasks.length, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completed Tasks</span>
                      <span className="font-medium text-black">
                        {Object.values(tasks).reduce((acc, projectTasks) => 
                          acc + projectTasks.filter(t => t.status === "completed").length, 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-gray-600"></div>
                    <h3 className="font-medium text-black">Activity</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Recent Projects</span>
                      <span className="font-medium text-black">
                        {projects.filter(p => {
                          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                          return new Date(p.created_at) > weekAgo
                        }).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">In Progress</span>
                      <span className="font-medium text-black">
                        {Object.values(tasks).reduce((acc, projectTasks) => 
                          acc + projectTasks.filter(t => t.status === "in-progress").length, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Overdue Tasks</span>
                      <span className="font-medium text-black">
                        {Object.values(tasks).reduce((acc, projectTasks) => 
                          acc + projectTasks.filter(t => 
                            t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
                          ).length, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Projects List */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const projectTasks = tasks[project.id] || []
                return (
                  <div
                    key={project.id}
                    className="border border-gray-200 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-black group-hover:text-gray-600 transition-colors mb-2">
                            {project.title}
                          </h4>
                          <p className="text-gray-600 text-sm line-clamp-2 font-light">{project.description}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs ${getProjectStatusColor(project.status)} ml-2`}>
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      {(project.start_date || project.end_date) && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {project.start_date || "No start"} → {project.end_date || "No end"}
                          </span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium text-black">
                            {projectTasks.filter((t) => t.status === "completed").length}/{projectTasks.length} tasks
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 h-2">
                          <div
                            className="bg-black h-2 transition-all duration-300"
                            style={{
                              width: `${project.progress}%`,
                            }}
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-black">{project.progress}%</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full group-hover:bg-gray-50 transition-colors border-gray-300"
                        onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
                      >
                        {selectedProject === project.id ? "Hide Tasks" : "Manage Tasks"}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {projects.length === 0 && (
              <div className="border border-gray-200">
                <div className="text-center py-20 px-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 mb-8">
                    <Target className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-medium text-black mb-2">No projects yet</h3>
                  <p className="text-gray-600 mb-6 font-light">
                    Create your first research project to get started with planning
                  </p>
                  <Button
                    onClick={() => document.getElementById("project-title")?.focus()}
                    className="bg-black hover:bg-gray-800 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Project
                  </Button>
                </div>
              </div>
            )}

            {/* Task Management for Selected Project */}
            {selectedProject && selectedProjectData && (
              <div className="border border-gray-200">
                <div className="p-8 border-b border-gray-200">
                  <h3 className="text-xl font-medium text-black">Tasks for "{selectedProjectData.title}"</h3>
                  <p className="text-gray-600 text-sm mt-2 font-light">
                    Manage and track individual tasks within your project
                  </p>
                </div>
                <div className="p-8 space-y-8">
                  {/* Add New Task */}
                  <div className="border border-gray-200 p-6 space-y-4">
                    <h4 className="font-medium text-black flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add New Task
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        placeholder="Task title"
                        value={newTask.title}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                        className="border-gray-300 focus:border-black focus:ring-black font-light"
                      />
                      <Input
                        type="date"
                        value={newTask.due_date}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, due_date: e.target.value }))}
                        className="border-gray-300 focus:border-black focus:ring-black font-light"
                      />
                    </div>
                    <Textarea
                      placeholder="Task description and requirements"
                      value={newTask.description}
                      onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="resize-none border-gray-300 focus:border-black focus:ring-black font-light"
                    />
                    <div className="flex gap-4">
                      <select
                        value={newTask.priority}
                        onChange={(e) =>
                          setNewTask((prev) => ({ ...prev, priority: e.target.value as Task["priority"] }))
                        }
                        className="px-3 py-2 border border-gray-300 focus:border-black focus:ring-black font-light"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                      <Input
                        type="number"
                        placeholder="Est. hours"
                        value={newTask.estimated_hours || ""}
                        onChange={(e) =>
                          setNewTask((prev) => ({ ...prev, estimated_hours: Number.parseInt(e.target.value) || 0 }))
                        }
                        className="w-32 border-gray-300 focus:border-black focus:ring-black font-light"
                      />
                      <Button
                        onClick={() => addTask(selectedProject)}
                        disabled={!newTask.title.trim()}
                        className="bg-black hover:bg-gray-800 text-white"
                      >
                        Add Task
                      </Button>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-3">
                    {selectedProjectTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {getStatusIcon(task.status)}
                          <div className="flex-1">
                            <p className="font-medium text-black">{task.title}</p>
                            <p className="text-sm text-gray-600 mt-1 font-light">{task.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Due: {task.due_date}
                                </span>
                              )}
                              {task.estimated_hours && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.estimated_hours}h
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </Badge>
                          <select
                            value={task.status}
                            onChange={(e) =>
                              updateTaskStatus(selectedProject, task.id, e.target.value as Task["status"])
                            }
                            className="px-3 py-1 border border-gray-300 text-sm focus:border-black focus:ring-black font-light"
                          >
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    {selectedProjectTasks.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium mb-2">No tasks yet</p>
                        <p className="text-sm font-light">Add your first task above to get started</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-8">
            <div className="border border-gray-200">
              <div className="p-8 border-b border-gray-200">
                <h3 className="text-xl font-medium text-black">All Tasks Overview</h3>
                <p className="text-gray-600 text-sm mt-2 font-light">
                  Comprehensive view of all tasks across your projects
                </p>
              </div>
              <div className="p-8">
                <div className="space-y-4">
                  {Object.entries(tasks)
                    .flatMap(([projectId, projectTasks]) => {
                      const project = projects.find(p => p.id === projectId)
                      return projectTasks.map(task => ({
                        ...task,
                        projectTitle: project?.title || 'Unknown Project',
                        projectId
                      }))
                    })
                    .map((task) => (
                      <div
                        key={`${task.projectId}-${task.id}`}
                        className="flex items-center justify-between p-4 border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {getStatusIcon(task.status)}
                          <div className="flex-1">
                            <p className="font-medium text-black">{task.title}</p>
                            <p className="text-sm text-gray-600 font-light">Project: {task.projectTitle}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {task.due_date}
                                </span>
                              )}
                              {task.estimated_hours && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.estimated_hours}h
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {task.status.replace("-", " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  {Object.values(tasks).every(projectTasks => projectTasks.length === 0) && (
                    <div className="text-center py-20 text-gray-500">
                      <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-xl font-medium mb-2">No tasks yet</h3>
                      <p className="text-gray-600 mb-6 font-light">Create a project and add tasks to get started</p>
                      <Button
                        onClick={() => document.getElementById("project-title")?.focus()}
                        variant="outline"
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Project
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-8">
            <div className="border border-gray-200">
              <div className="p-8 border-b border-gray-200">
                <h3 className="text-xl font-medium text-black flex items-center gap-3">
                  <div className="w-1 h-6 bg-black"></div>
                  Project Timeline
                </h3>
                <p className="text-gray-600 text-sm mt-2 font-light">
                  Timeline view of your projects and important deadlines
                </p>
              </div>
              <div className="p-8">
                <div className="space-y-8">
                  {projects.map((project) => {
                    const projectTasks = tasks[project.id] || []
                    return (
                      <div key={project.id} className="border border-gray-200 p-6">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h4 className="font-medium text-black text-lg">{project.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {project.start_date || "No start"} → {project.end_date || "No end"}
                              </span>
                              <Badge variant="outline" className={`text-xs ${getProjectStatusColor(project.status)}`}>
                                {project.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-light text-black">{project.progress}%</div>
                            <div className="text-sm text-gray-600">Complete</div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h5 className="font-medium text-black">Upcoming Deadlines</h5>
                          {projectTasks
                            .filter((task) => task.due_date)
                            .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
                            .slice(0, 5)
                            .map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center justify-between text-sm border border-gray-200 p-3"
                              >
                                <span className="flex items-center gap-3">
                                  {getStatusIcon(task.status)}
                                  <span className="font-medium text-black">{task.title}</span>
                                </span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </Badge>
                                  <span className="text-gray-600">{task.due_date}</span>
                                </div>
                              </div>
                            ))}
                          {projectTasks.filter((task) => task.due_date).length === 0 && (
                            <p className="text-sm text-gray-500 italic font-light">No scheduled deadlines</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {projects.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                      <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-xl font-medium mb-2">No projects to display</h3>
                      <p className="text-gray-600 mb-6 font-light">
                        Create your first project to see the calendar view
                      </p>
                      <Button
                        onClick={() => document.getElementById("project-title")?.focus()}
                        variant="outline"
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Get Started
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
