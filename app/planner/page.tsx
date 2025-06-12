"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Plus, Clock, CheckCircle, AlertCircle, Target } from "lucide-react"
import { useSocket } from "@/components/socket-provider"
import { useToast } from "@/hooks/use-toast"

interface Task {
  id: string
  title: string
  description: string
  dueDate: string
  priority: "low" | "medium" | "high"
  status: "todo" | "in-progress" | "completed"
  assignee?: string
  estimatedHours?: number
}

interface Project {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  status: "planning" | "active" | "completed" | "on-hold"
  tasks: Task[]
  collaborators: string[]
  progress: number
}

export default function ProjectPlanner() {
  const [projects, setProjects] = useState<Project[]>([])
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
  })
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as const,
    estimatedHours: 0,
  })
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const { socket } = useSocket()
  const { toast } = useToast()

  const createProject = () => {
    if (!newProject.title.trim()) return

    const project: Project = {
      id: Date.now().toString(),
      title: newProject.title,
      description: newProject.description,
      startDate: newProject.startDate,
      endDate: newProject.endDate,
      status: "planning",
      tasks: [],
      collaborators: [],
      progress: 0,
    }

    setProjects((prev) => [project, ...prev])
    setNewProject({ title: "", description: "", startDate: "", endDate: "" })

    if (socket) {
      socket.emit("project_created", {
        title: project.title,
        startDate: project.startDate,
      })
    }

    toast({
      title: "Project created",
      description: `"${project.title}" has been added to your projects`,
    })
  }

  const addTask = (projectId: string) => {
    if (!newTask.title.trim()) return

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      dueDate: newTask.dueDate,
      priority: newTask.priority,
      status: "todo",
      estimatedHours: newTask.estimatedHours || undefined,
    }

    setProjects((prev) =>
      prev.map((project) => {
        if (project.id === projectId) {
          const updatedTasks = [...project.tasks, task]
          const completedTasks = updatedTasks.filter((t) => t.status === "completed").length
          const progress = updatedTasks.length > 0 ? (completedTasks / updatedTasks.length) * 100 : 0

          return {
            ...project,
            tasks: updatedTasks,
            progress: Math.round(progress),
          }
        }
        return project
      }),
    )

    setNewTask({ title: "", description: "", dueDate: "", priority: "medium", estimatedHours: 0 })

    toast({
      title: "Task added",
      description: `"${task.title}" has been added to the project`,
    })
  }

  const updateTaskStatus = (projectId: string, taskId: string, status: Task["status"]) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id === projectId) {
          const updatedTasks = project.tasks.map((task) => (task.id === taskId ? { ...task, status } : task))
          const completedTasks = updatedTasks.filter((t) => t.status === "completed").length
          const progress = updatedTasks.length > 0 ? (completedTasks / updatedTasks.length) * 100 : 0

          return {
            ...project,
            tasks: updatedTasks,
            progress: Math.round(progress),
          }
        }
        return project
      }),
    )

    const project = projects.find((p) => p.id === projectId)
    const task = project?.tasks.find((t) => t.id === taskId)

    toast({
      title: "Task updated",
      description: `"${task?.title}" marked as ${status.replace("-", " ")}`,
    })
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-start" className="text-sm font-medium text-black uppercase tracking-wide">
                      Start Date
                    </Label>
                    <Input
                      id="project-start"
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) => setNewProject((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="border-gray-300 focus:border-black focus:ring-black font-light"
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
                        value={newProject.endDate}
                        onChange={(e) => setNewProject((prev) => ({ ...prev, endDate: e.target.value }))}
                        className="border-gray-300 focus:border-black focus:ring-black font-light"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={createProject}
                  disabled={!newProject.title.trim()}
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
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
                        {projects.reduce((acc, p) => acc + p.tasks.length, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completed Tasks</span>
                      <span className="font-medium text-black">
                        {projects.reduce((acc, p) => acc + p.tasks.filter((t) => t.status === "completed").length, 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-gray-600"></div>
                    <h3 className="font-medium text-black">Collaboration</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Team Projects</span>
                      <span className="font-medium text-black">
                        {projects.filter((p) => p.collaborators.length > 0).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Solo Projects</span>
                      <span className="font-medium text-black">
                        {projects.filter((p) => p.collaborators.length === 0).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Collaborators</span>
                      <span className="font-medium text-black">
                        {new Set(projects.flatMap((p) => p.collaborators)).size}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Projects List */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
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
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {project.startDate} → {project.endDate}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium text-black">
                          {project.tasks.filter((t) => t.status === "completed").length}/{project.tasks.length} tasks
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
              ))}
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
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))}
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
                        value={newTask.estimatedHours || ""}
                        onChange={(e) =>
                          setNewTask((prev) => ({ ...prev, estimatedHours: Number.parseInt(e.target.value) || 0 }))
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
                    {selectedProjectData.tasks.map((task) => (
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
                              {task.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Due: {task.dueDate}
                                </span>
                              )}
                              {task.estimatedHours && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.estimatedHours}h
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
                    {selectedProjectData.tasks.length === 0 && (
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
                  {projects
                    .flatMap((project) =>
                      project.tasks.map((task) => ({
                        ...task,
                        projectTitle: project.title,
                        projectId: project.id,
                      })),
                    )
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
                              {task.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {task.dueDate}
                                </span>
                              )}
                              {task.estimatedHours && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.estimatedHours}h
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
                  {projects.flatMap((p) => p.tasks).length === 0 && (
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
                  {projects.map((project) => (
                    <div key={project.id} className="border border-gray-200 p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h4 className="font-medium text-black text-lg">{project.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {project.startDate} → {project.endDate}
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
                        {project.tasks
                          .filter((task) => task.dueDate)
                          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
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
                                <span className="text-gray-600">{task.dueDate}</span>
                              </div>
                            </div>
                          ))}
                        {project.tasks.filter((task) => task.dueDate).length === 0 && (
                          <p className="text-sm text-gray-500 italic font-light">No scheduled deadlines</p>
                        )}
                      </div>
                    </div>
                  ))}
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
