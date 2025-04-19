"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus, Calendar, CheckCircle2, Circle, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "done"
  dueDate: string
  priority: "low" | "medium" | "high"
}

interface Project {
  id: string
  title: string
  description: string
  tasks: Task[]
}

export default function ProjectPlanner() {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "1",
      title: "Research Paper",
      description: "AI applications in education",
      tasks: [
        {
          id: "101",
          title: "Literature review",
          description: "Review existing papers on AI in education",
          status: "in-progress",
          dueDate: "2023-06-15",
          priority: "high",
        },
        {
          id: "102",
          title: "Draft introduction",
          description: "Write the introduction section",
          status: "todo",
          dueDate: "2023-06-20",
          priority: "medium",
        },
      ],
    },
  ])

  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
  })

  const [newTask, setNewTask] = useState<{
    projectId: string
    title: string
    description: string
    dueDate: string
    priority: "low" | "medium" | "high"
  }>({
    projectId: "",
    title: "",
    description: "",
    dueDate: "",
    priority: "medium",
  })

  const [expandedProject, setExpandedProject] = useState<string | null>("1")

  const addProject = () => {
    if (!newProject.title.trim()) return

    const project: Project = {
      id: Date.now().toString(),
      title: newProject.title,
      description: newProject.description,
      tasks: [],
    }

    setProjects([...projects, project])
    setNewProject({ title: "", description: "" })
    setExpandedProject(project.id)
  }

  const addTask = () => {
    if (!newTask.title.trim() || !newTask.projectId) return

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      status: "todo",
      dueDate: newTask.dueDate,
      priority: newTask.priority,
    }

    setProjects(
      projects.map((project) =>
        project.id === newTask.projectId ? { ...project, tasks: [...project.tasks, task] } : project,
      ),
    )

    setNewTask({
      projectId: newTask.projectId,
      title: "",
      description: "",
      dueDate: "",
      priority: "medium",
    })
  }

  const updateTaskStatus = (projectId: string, taskId: string, status: Task["status"]) => {
    setProjects(
      projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
            }
          : project,
      ),
    )
  }

  const deleteTask = (projectId: string, taskId: string) => {
    setProjects(
      projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.filter((task) => task.id !== taskId),
            }
          : project,
      ),
    )
  }

  const deleteProject = (projectId: string) => {
    setProjects(projects.filter((project) => project.id !== projectId))
    if (expandedProject === projectId) {
      setExpandedProject(null)
    }
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return <Circle className="h-5 w-5 text-gray-400" />
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-500" />
      case "done":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
    }
  }

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "low":
        return "text-green-500"
      case "medium":
        return "text-yellow-500"
      case "high":
        return "text-red-500"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectTitle">Project Title</Label>
              <Input
                id="projectTitle"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                placeholder="Enter project title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription">Description</Label>
              <Textarea
                id="projectDescription"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Brief description of the project"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={addProject} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </CardFooter>
      </Card>

      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskProject">Project</Label>
                <Select
                  value={newTask.projectId}
                  onValueChange={(value) => setNewTask({ ...newTask, projectId: value })}
                >
                  <SelectTrigger id="taskProject">
                    <SelectValue placeholder="Select project" />
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

              <div className="space-y-2">
                <Label htmlFor="taskTitle">Task Title</Label>
                <Input
                  id="taskTitle"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taskDescription">Description</Label>
                <Textarea
                  id="taskDescription"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task details"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taskDueDate">Due Date</Label>
                  <div className="flex">
                    <Calendar className="mr-2 h-4 w-4 mt-3" />
                    <Input
                      id="taskDueDate"
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taskPriority">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger id="taskPriority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={addTask} className="w-full" disabled={!newTask.projectId || !newTask.title.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="space-y-4">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>{project.title}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                  >
                    {expandedProject === project.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteProject(project.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </CardHeader>

            {expandedProject === project.id && (
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">To Do</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {project.tasks
                          .filter((task) => task.status === "todo")
                          .map((task) => (
                            <div key={task.id} className="p-2 border rounded-md bg-gray-50">
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                  <button
                                    onClick={() => updateTaskStatus(project.id, task.id, "in-progress")}
                                    className="mt-1"
                                  >
                                    {getStatusIcon(task.status)}
                                  </button>
                                  <div>
                                    <h4 className="font-medium">{task.title}</h4>
                                    <p className="text-xs text-muted-foreground">{task.description}</p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => deleteTask(project.id, task.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex justify-between mt-2 text-xs">
                                <span className="flex items-center">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  {task.dueDate || "No date"}
                                </span>
                                <span className={`font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                          ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">In Progress</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {project.tasks
                          .filter((task) => task.status === "in-progress")
                          .map((task) => (
                            <div key={task.id} className="p-2 border rounded-md bg-blue-50">
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                  <button
                                    onClick={() => updateTaskStatus(project.id, task.id, "done")}
                                    className="mt-1"
                                  >
                                    {getStatusIcon(task.status)}
                                  </button>
                                  <div>
                                    <h4 className="font-medium">{task.title}</h4>
                                    <p className="text-xs text-muted-foreground">{task.description}</p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => deleteTask(project.id, task.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex justify-between mt-2 text-xs">
                                <span className="flex items-center">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  {task.dueDate || "No date"}
                                </span>
                                <span className={`font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                          ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Done</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {project.tasks
                          .filter((task) => task.status === "done")
                          .map((task) => (
                            <div key={task.id} className="p-2 border rounded-md bg-green-50">
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                  <button
                                    onClick={() => updateTaskStatus(project.id, task.id, "todo")}
                                    className="mt-1"
                                  >
                                    {getStatusIcon(task.status)}
                                  </button>
                                  <div>
                                    <h4 className="font-medium line-through">{task.title}</h4>
                                    <p className="text-xs text-muted-foreground">{task.description}</p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => deleteTask(project.id, task.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex justify-between mt-2 text-xs">
                                <span className="flex items-center">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  {task.dueDate || "No date"}
                                </span>
                                <span className={`font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
