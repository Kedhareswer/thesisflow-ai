"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, CheckCircle2, Clock, Target, TrendingUp, Plus, Filter, BarChart3, User, AlertCircle, Calendar as CalendarIcon, Flag, MessageSquare, GanttChart as GanttChartIcon } from "lucide-react"
import { ProjectCalendar } from "./components/project-calendar"
import { GanttChart } from "./components/gantt-chart"
import { SmartUpgradeBanner, ProjectLimitBanner } from "@/components/ui/smart-upgrade-banner"
import projectService, { Project, Task, Subtask, TaskComment } from "@/lib/services/project.service"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useForm } from "react-hook-form"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { supabase } from "@/integrations/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

export default function PlannerPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { toast } = useToast()
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [subscribedProjects, setSubscribedProjects] = useState<(() => void)[]>([])
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [subtasksLoading, setSubtasksLoading] = useState(false)
  const [subtasksError, setSubtasksError] = useState("")
  const [newSubtask, setNewSubtask] = useState("")
  const [comments, setComments] = useState<TaskComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState("")
  const [newComment, setNewComment] = useState("")
  const [users, setUsers] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const { user } = useSupabaseAuth()

  const userId = user?.id || ""
  const userDisplayName = user?.user_metadata?.display_name || user?.email || "Unknown User"

  async function getAllUsers() {
    const { data, error } = await supabase.from('user_profiles').select('id, display_name, email')
    return data || []
  }
  async function getNotificationsForUser(userId: string) {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    return data || []
  }

  const fetchData = async () => {
    setLoading(true)
    setError("")
    const { projects: fetchedProjects, error: projectError } = await projectService.getProjects()
    if (projectError) {
      setError(projectError)
      setLoading(false)
      return
    }
    setProjects(fetchedProjects)
    // Fetch all tasks for all projects
    let allTasks: Task[] = []
    for (const project of fetchedProjects) {
      const { tasks: projectTasks } = await projectService.getProjectTasks(project.id)
      allTasks = allTasks.concat(projectTasks)
    }
    setTasks(allTasks)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Subscribe to real-time updates for all projects
    const unsubscribers = projects.map((project) =>
      projectService.subscribeToProject(project.id, () => fetchData())
    )
    setSubscribedProjects(unsubscribers)
    return () => {
      unsubscribers.forEach((unsub) => unsub && unsub())
    }
  }, [projects.length])

  useEffect(() => {
    // Fetch all users/team members for assignment dropdown
    getAllUsers().then(setUsers)
    getNotificationsForUser(userId || '').then(setNotifications)
  }, [userId])

  // Fetch subtasks and comments when editingTask changes
  useEffect(() => {
    if (editingTask && (editingTask as Task).id) {
      setSubtasksLoading(true)
      setSubtasksError("")
      projectService.getSubtasks((editingTask as Task).id).then(({ subtasks, error }) => {
        setSubtasks(subtasks)
        setSubtasksError(error || "")
        setSubtasksLoading(false)
      })
      setCommentsLoading(true)
      setCommentsError("")
      projectService.getTaskComments((editingTask as Task).id).then(({ comments, error }) => {
        setComments(comments)
        setCommentsError(error || "")
        setCommentsLoading(false)
      })
    } else {
      setSubtasks([])
      setComments([])
    }
  }, [editingTask])

  // Project form logic
  const projectForm = useForm({ defaultValues: { title: "", description: "", start_date: "", end_date: "" } })
  const openCreateProject = () => {
    setEditingProject(null)
    projectForm.reset({ title: "", description: "", start_date: "", end_date: "" })
    setShowProjectModal(true)
  }
  const openEditProject = (project: Project) => {
    setEditingProject(project)
    projectForm.reset({
      title: project.title,
      description: project.description,
      start_date: project.start_date,
      end_date: project.end_date,
    })
    setShowProjectModal(true)
  }
  const handleProjectSubmit = async (values: { title: string; description: string; start_date: string; end_date: string }) => {
    let result
    if (editingProject) {
      result = await projectService.updateProject(editingProject.id, values)
    } else {
      result = await projectService.createProject({
        ...values,
        progress: 0,
        status: 'planning',
      })
    }
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: editingProject ? "Project updated" : "Project created" })
      setShowProjectModal(false)
      fetchData()
    }
  }
  const handleDeleteProject = async (project: Project) => {
    if (!window.confirm("Delete this project?")) return
    const result = await projectService.deleteProject(project.id)
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Project deleted" })
      fetchData()
    }
  }
  // Task form logic
  const taskForm = useForm({ defaultValues: { title: "", description: "", due_date: "", priority: "medium", status: "todo", assignee_id: "unassigned" } })
  const openCreateTask = (project: Project) => {
    setEditingTask({ project } as any)
    taskForm.reset({ title: "", description: "", due_date: "", priority: "medium", status: "todo", assignee_id: "unassigned" })
    setShowTaskModal(true)
  }
  const openEditTask = (task: Task) => {
    setEditingTask(task)
    taskForm.reset({
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
      assignee_id: task.assignee_id || "unassigned", // Convert empty string to "unassigned" for form
    })
    setShowTaskModal(true)
  }
  const handleTaskSubmit = async (values: { title: string; description: string; due_date: string; priority: string; status: string; assignee_id: string }) => {
    let result
    const priority = values.priority as "low" | "medium" | "high"
    const status = values.status as "todo" | "in-progress" | "completed"
    // Convert "unassigned" to empty string for database
    const assignee_id = values.assignee_id === "unassigned" ? "" : values.assignee_id
    
    if (editingTask && (editingTask as Task).id) {
      result = await projectService.updateTask((editingTask as Task).id, { ...values, priority, status, assignee_id })
    } else {
      result = await projectService.createTask({ ...values, project_id: (editingTask as any).project.id, priority, status, assignee_id })
    }
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: editingTask && (editingTask as Task).id ? "Task updated" : "Task created" })
      setShowTaskModal(false)
      fetchData()
      if (assignee_id && assignee_id !== userId) {
        await projectService.assignTaskAndNotify(result.task?.id || '', assignee_id, userDisplayName)
      }
    }
  }
  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm("Delete this task?")) return
    const result = await projectService.deleteTask(task.id)
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Task deleted" })
      fetchData()
    }
  }

  const handleAddSubtask = async () => {
    if (!editingTask || !newSubtask.trim()) return
    setSubtasksLoading(true)
    const { subtask, error } = await projectService.createSubtask((editingTask as Task).id, newSubtask)
    if (!error && subtask) setSubtasks((prev) => [...prev, subtask])
    setNewSubtask("")
    setSubtasksLoading(false)
  }
  const handleToggleSubtask = async (subtask: Subtask) => {
    const { subtask: updated, error } = await projectService.updateSubtask(subtask.id, { is_completed: !subtask.is_completed })
    if (!error && updated) setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? updated : s)))
  }
  const handleDeleteSubtask = async (subtask: Subtask) => {
    const { success } = await projectService.deleteSubtask(subtask.id)
    if (success) setSubtasks((prev) => prev.filter((s) => s.id !== subtask.id))
  }
  const handleAddComment = async () => {
    if (!editingTask || !newComment.trim()) return
    setCommentsLoading(true)
    const { comment, error } = await projectService.createTaskComment((editingTask as Task).id, newComment)
    if (!error && comment) setComments((prev) => [...prev, comment])
    setNewComment("")
    setCommentsLoading(false)
  }
  const handleDeleteComment = async (comment: TaskComment) => {
    const { success } = await projectService.deleteTaskComment(comment.id)
    if (success) setComments((prev) => prev.filter((c) => c.id !== comment.id))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "review":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                <p className="text-sm text-gray-600">Active Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {tasks.filter((t) => t.status === "completed").length}
                </p>
                <p className="text-sm text-gray-600">Completed Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {tasks.filter((t) => t.status === "todo").length}
                </p>
                <p className="text-sm text-gray-600">Pending Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)}%
                </p>
                <p className="text-sm text-gray-600">Avg Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Projects Overview</CardTitle>
              <CardDescription>Track progress and status of all your research projects</CardDescription>
            </div>
            <Button onClick={openCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.map((project) => {
              const projectTasks = tasks.filter((t) => t.project_id === project.id)
              const completedTasks = projectTasks.filter((t) => t.status === "completed")
              const dueSoonTasks = projectTasks.filter((t) => 
                t.due_date && new Date(t.due_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && t.status !== "completed"
              )

              return (
                <Card key={project.id} className="hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">{project.title}</h3>
                          <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                          {dueSoonTasks.length > 0 && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {dueSoonTasks.length} due soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                        
                        {/* Progress Section */}
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Progress</span>
                            <span className="text-gray-600">{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>

                        {/* Project Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span>{completedTasks.length}/{projectTasks.length} tasks completed</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarIcon className="h-4 w-4 text-blue-600" />
                            <span>Due: {project.end_date || 'No deadline'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="mb-4" />

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditProject(project)}>
                          Edit Project
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteProject(project)}>
                          Delete
                        </Button>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => openCreateTask(project)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>

                    {/* Recent Tasks Preview */}
                    {projectTasks.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Tasks</h4>
                        <div className="space-y-2">
                          {projectTasks.slice(0, 3).map((task) => (
                            <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  task.status === "completed"
                                    ? "bg-green-500"
                                    : task.status === "in-progress"
                                      ? "bg-yellow-500"
                                      : "bg-gray-400"
                                }`}
                              />
                              <span className="text-sm flex-1 truncate">{task.title}</span>
                              <Badge className={getPriorityColor(task.priority)} variant="outline">
                                {task.priority}
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => openEditTask(task)}>
                                Edit
                              </Button>
                            </div>
                          ))}
                          {projectTasks.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{projectTasks.length - 3} more tasks
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Latest task updates and upcoming deadlines</CardDescription>
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks.slice(0, 10).map((task) => (
              <div key={task.id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{task.title}</h4>
                  <p className="text-sm text-gray-600">{task.project_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  <span className="text-sm text-gray-500">{task.due_date}</span>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      task.status === "completed"
                        ? "bg-green-500"
                        : task.status === "in-progress"
                          ? "bg-yellow-500"
                          : "bg-gray-300"
                    }`}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditTask(task)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteTask(task)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (loading) return <div className="flex justify-center items-center h-96"><span>Loading...</span></div>
  if (error) return <div className="flex justify-center items-center h-96 text-red-500">{error}</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Upgrade Banner for Free Users */}
      <div className="mb-6">
        <ProjectLimitBanner currentUsage={projects.length} />
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Research Planner</h1>
        <p className="text-gray-600">Organize your research projects, track progress, and manage deadlines</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="gantt" className="flex items-center gap-2">
            <GanttChartIcon className="h-4 w-4" />
            Gantt Chart
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <ProjectCalendar
            projects={projects}
            tasks={tasks}
            onEditTask={openEditTask}
            onDeleteTask={handleDeleteTask}
            onCreateTask={openCreateTask}
          />
        </TabsContent>

        <TabsContent value="gantt" className="space-y-6">
          <GanttChart
            projects={projects}
            tasks={tasks}
            onEditTask={openEditTask}
            onDeleteTask={handleDeleteTask}
            onCreateTask={openCreateTask}
            onEditProject={openEditProject}
            onDeleteProject={handleDeleteProject}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6">
            {/* Analytics Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
                <p className="text-gray-600">Comprehensive insights into your research productivity and project performance</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Last 30 Days
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                      <p className="text-sm text-gray-600">Active Projects</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">+12% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-green-100 p-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {tasks.filter((t) => t.status === "completed").length}
                      </p>
                      <p className="text-sm text-gray-600">Completed Tasks</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">+8% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-orange-100 p-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {tasks.filter((t) => t.status === "todo").length}
                      </p>
                      <p className="text-sm text-gray-600">Pending Tasks</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-orange-600">+5% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-purple-100 p-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / Math.max(projects.length, 1))}%
                      </p>
                      <p className="text-sm text-gray-600">Avg Progress</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-purple-600">+15% from last month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Analytics */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Task Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Task Status Distribution
                  </CardTitle>
                  <CardDescription>Breakdown of tasks by their current status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { status: "completed", count: tasks.filter(t => t.status === "completed").length, color: "bg-green-500" },
                      { status: "in-progress", count: tasks.filter(t => t.status === "in-progress").length, color: "bg-yellow-500" },
                      { status: "todo", count: tasks.filter(t => t.status === "todo").length, color: "bg-gray-500" }
                    ].map((item) => {
                      const total = tasks.length || 1;
                      const percentage = Math.round((item.count / total) * 100);
                      return (
                        <div key={item.status} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="capitalize font-medium">{item.status.replace('-', ' ')}</span>
                            <span className="text-gray-600">{item.count} tasks ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${item.color}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Project Progress Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Project Progress Overview
                  </CardTitle>
                  <CardDescription>Progress tracking across all active projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects.slice(0, 5).map((project) => (
                      <div key={project.id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate">{project.title}</span>
                          <span className="text-gray-600">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-300 bg-blue-500"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No projects to display</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analytics */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Task Priority Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5" />
                    Task Priority Analysis
                  </CardTitle>
                  <CardDescription>Tasks categorized by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { priority: "high", count: tasks.filter(t => t.priority === "high").length, color: "bg-red-500" },
                      { priority: "medium", count: tasks.filter(t => t.priority === "medium").length, color: "bg-yellow-500" },
                      { priority: "low", count: tasks.filter(t => t.priority === "low").length, color: "bg-green-500" }
                    ].map((item) => (
                      <div key={item.priority} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span className="text-sm capitalize">{item.priority}</span>
                        </div>
                        <span className="text-sm font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest updates and changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-gray-500">
                            {task.status} • {task.priority} priority
                          </p>
                        </div>
                      </div>
                    ))}
                    {tasks.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No recent activity</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Performance Insights
                  </CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Completion Rate</span>
                      <span className="text-sm font-medium">
                        {tasks.length > 0 
                          ? Math.round((tasks.filter(t => t.status === "completed").length / tasks.length) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg Task Duration</span>
                      <span className="text-sm font-medium">3.2 days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Productivity Score</span>
                      <span className="text-sm font-medium">85/100</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Advanced Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Advanced Analytics
                </CardTitle>
                <CardDescription>Detailed performance metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Time-based Analytics */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Time-based Analytics</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm">Tasks Created This Week</span>
                        <span className="text-sm font-medium">{tasks.filter(t => {
                          const taskDate = new Date(t.created_at);
                          const weekAgo = new Date();
                          weekAgo.setDate(weekAgo.getDate() - 7);
                          return taskDate > weekAgo;
                        }).length}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm">Tasks Completed This Week</span>
                        <span className="text-sm font-medium">{tasks.filter(t => {
                          const taskDate = new Date(t.updated_at);
                          const weekAgo = new Date();
                          weekAgo.setDate(weekAgo.getDate() - 7);
                          return taskDate > weekAgo && t.status === "completed";
                        }).length}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm">Average Project Duration</span>
                        <span className="text-sm font-medium">14.5 days</span>
                      </div>
                    </div>
                  </div>

                  {/* Efficiency Metrics */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Efficiency Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm">Task Completion Rate</span>
                        <span className="text-sm font-medium">
                          {tasks.length > 0 
                            ? Math.round((tasks.filter(t => t.status === "completed").length / tasks.length) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm">On-time Delivery</span>
                        <span className="text-sm font-medium">92%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm">Team Productivity</span>
                        <span className="text-sm font-medium">87/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Project Creation Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
            <DialogDescription>
              {editingProject ? "Edit your existing project details." : "Add a new project to your research plan."}
            </DialogDescription>
          </DialogHeader>
          <Form {...projectForm}>
            <form onSubmit={projectForm.handleSubmit(handleProjectSubmit)} className="space-y-4">
              <FormField
                control={projectForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">
                  {editingProject ? "Update Project" : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Enhanced Task Creation/Edit Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTask && (editingTask as Task).id ? (
                <>
                  <Target className="h-5 w-5" />
                  Edit Task
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Create New Task
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingTask && (editingTask as Task).id 
                ? "Edit your existing task details and manage subtasks." 
                : `Add a new task to ${(editingTask as any)?.project?.title || 'your project'}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Main Task Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Task Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...taskForm}>
                  <form onSubmit={taskForm.handleSubmit(handleTaskSubmit)} className="space-y-4">
                    <FormField
                      control={taskForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Task Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter task title..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={taskForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the task..." 
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={taskForm.control}
                        name="due_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              Due Date
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={taskForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Flag className="h-4 w-4" />
                              Priority
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="high">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    High Priority
                                  </div>
                                </SelectItem>
                                <SelectItem value="medium">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    Medium Priority
                                  </div>
                                </SelectItem>
                                <SelectItem value="low">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    Low Priority
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={taskForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="todo">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                    To Do
                                  </div>
                                </SelectItem>
                                <SelectItem value="in-progress">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    In Progress
                                  </div>
                                </SelectItem>
                                <SelectItem value="completed">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    Completed
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={taskForm.control}
                        name="assignee_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Assign To
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select assignee" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="unassigned">
                                  <span className="text-gray-500">Unassigned</span>
                                </SelectItem>
                                {users.map(u => (
                                  <SelectItem key={u.id} value={u.id}>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5">
                                        <AvatarFallback className="text-xs">
                                          {(u.display_name || u.email || 'U').slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      {u.display_name || u.email}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit">
                        {editingTask && (editingTask as Task).id ? "Update Task" : "Create Task"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Subtasks and Comments - Only for existing tasks */}
            {editingTask && (editingTask as Task).id && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subtasks Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Subtasks ({subtasks.filter(s => s.is_completed).length}/{subtasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {subtasks.length > 0 && (
                      <Progress 
                        value={Math.round((subtasks.filter(s => s.is_completed).length / subtasks.length) * 100)} 
                        className="h-2"
                      />
                    )}
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-2 p-2 border rounded">
                          <input 
                            type="checkbox" 
                            checked={subtask.is_completed} 
                            onChange={() => handleToggleSubtask(subtask)}
                            className="rounded"
                          />
                          <span className={`flex-1 text-sm ${subtask.is_completed ? "line-through text-gray-400" : ""}`}>
                            {subtask.title}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteSubtask(subtask)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Add subtask..."
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => { 
                          if (e.key === 'Enter') { 
                            e.preventDefault(); 
                            handleAddSubtask(); 
                          } 
                        }}
                        className="text-sm"
                      />
                      <Button onClick={handleAddSubtask} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Comments Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comments ({comments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-2 p-2 bg-gray-50 rounded">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {(userDisplayName || 'U').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm">{comment.content}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteComment(comment)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Add comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => { 
                          if (e.key === 'Enter') { 
                            e.preventDefault(); 
                            handleAddComment(); 
                          } 
                        }}
                        className="text-sm"
                      />
                      <Button onClick={handleAddComment} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Delete Button for existing tasks */}
            {editingTask && (editingTask as Task).id && (
              <div className="flex justify-center pt-4 border-t">
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    handleDeleteTask(editingTask as Task);
                    setShowTaskModal(false);
                  }}
                >
                  Delete Task
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Assignment Notifications */}
      {notifications.filter(n => n.type === 'task_assignment' && !n.is_read).map(n => (
        <Card key={n.id} className="mb-4 border-blue-300 bg-blue-50">
          <div className="flex items-center gap-3 p-3">
            <Avatar className="h-8 w-8">
              {n.data?.avatar_url ? (
                <img src={n.data.avatar_url} alt="avatar" className="h-8 w-8 rounded-full" />
              ) : (
                <span className="font-bold text-lg">{(n.data?.assignee_name || userDisplayName).slice(0,2).toUpperCase()}</span>
              )}
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold">{n.title}</div>
              <div className="text-sm text-gray-700">{n.message}</div>
              <div className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={async () => {
                await projectService.acceptAssignedTask(n.data.task_id, userId)
                await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
                setNotifications((prev) => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
              }}>Accept & Add</Button>
              <Button size="sm" variant="outline" onClick={async () => {
                await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
                setNotifications((prev) => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
              }}>Dismiss</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
