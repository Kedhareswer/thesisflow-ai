"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, CheckCircle2, Clock, Target, TrendingUp, Plus, Filter, BarChart3 } from "lucide-react"
import { ProjectCalendar } from "./components/project-calendar"
import projectService, { Project, Task, Subtask, TaskComment } from "@/lib/services/project.service"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useForm } from "react-hook-form"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { supabase } from "@/integrations/supabase/client"
import { Avatar } from "@/components/ui/avatar"

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
  // Task form logic (similar pattern)
  const taskForm = useForm({ defaultValues: { title: "", description: "", due_date: "", priority: "medium", status: "todo", assignee_id: "" } })
  const openCreateTask = (project: Project) => {
    setEditingTask({ project } as any)
    taskForm.reset({ title: "", description: "", due_date: "", priority: "medium", status: "todo" })
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
    })
    setShowTaskModal(true)
  }
  const handleTaskSubmit = async (values: { title: string; description: string; due_date: string; priority: string; status: string; assignee_id: string }) => {
    let result
    const priority = values.priority as "low" | "medium" | "high"
    const status = values.status as "todo" | "in-progress" | "completed"
    if (editingTask && (editingTask as Task).id) {
      result = await projectService.updateTask((editingTask as Task).id, { ...values, priority, status })
    } else {
      result = await projectService.createTask({ ...values, project_id: (editingTask as any).project.id, priority, status })
    }
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: editingTask && (editingTask as Task).id ? "Task updated" : "Task created" })
      setShowTaskModal(false)
      fetchData()
      if (values.assignee_id && values.assignee_id !== userId) {
        await projectService.assignTaskAndNotify(result.task?.id || '', values.assignee_id, userDisplayName)
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
            {projects.map((project) => (
              <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{project.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>

                <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
                  <span>Due: {project.end_date}</span>
                  <span>
                    {tasks.filter((t) => t.project_id === project.id && t.status === "completed").length}/{tasks.filter((t) => t.project_id === project.id).length} tasks completed
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" onClick={() => openEditProject(project)}>Edit</Button>
                  <Button variant="outline" onClick={() => handleDeleteProject(project)}>Delete</Button>
                </div>
              </div>
            ))}
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
            {tasks.map((task) => (
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
                  <Button variant="outline" onClick={() => openEditTask(task)}>Edit</Button>
                  <Button variant="outline" onClick={() => handleDeleteTask(task)}>Delete</Button>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Research Planner</h1>
        <p className="text-gray-600">Organize your research projects, track progress, and manage deadlines</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-96">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
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

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>Detailed insights and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Analytics dashboard coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Edit your existing task details." : "Add a new task to your project."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Task Details Section */}
            <div className="bg-gray-50 rounded p-4 space-y-3">
              <Form {...taskForm}>
                <form onSubmit={taskForm.handleSubmit(handleTaskSubmit)} className="space-y-3">
                  <FormField
                    control={taskForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-3">
                    <FormField
                      control={taskForm.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input type="date" {...field} />
                              {field.value && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  new Date(field.value) < new Date() ? 'bg-red-100 text-red-700' :
                                  (new Date(field.value) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')
                                }`}>
                                  {new Date(field.value) < new Date() ? 'Overdue' :
                                    (new Date(field.value) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) ? 'Due Soon' : 'On Track')}
                                </span>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={taskForm.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Priority</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full border rounded px-2 py-1">
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={taskForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Status</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full border rounded px-2 py-1">
                              <option value="todo">To Do</option>
                              <option value="in-progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={taskForm.control}
                      name="assignee_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign To</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full border rounded px-2 py-1">
                              <option value="">Unassigned</option>
                              {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.email}</option>)}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </div>
            <hr />
            {/* Subtasks Section */}
            <div className="bg-white rounded p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Subtasks</h4>
                {subtasks.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span>Progress:</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.round((subtasks.filter(s => s.is_completed).length / subtasks.length) * 100)}%` }}
                      />
                    </div>
                    <span>{subtasks.filter(s => s.is_completed).length}/{subtasks.length}</span>
                  </div>
                )}
              </div>
              {subtasksLoading ? <div>Loading subtasks...</div> : null}
              {subtasksError ? <div className="text-red-500">{subtasksError}</div> : null}
              <ul className="mb-2">
                {subtasks.map((subtask) => (
                  <li key={subtask.id} className="flex items-center gap-2 mb-1">
                    <input type="checkbox" checked={subtask.is_completed} onChange={() => handleToggleSubtask(subtask)} />
                    <span className={subtask.is_completed ? "line-through text-gray-400" : ""}>{subtask.title}</span>
                    <button className="text-xs text-red-500 ml-2" onClick={() => handleDeleteSubtask(subtask)}>Delete</button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input
                  className="border rounded px-2 py-1 text-sm flex-1"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add subtask..."
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                />
                <button className="text-xs px-2 py-1 bg-blue-500 text-white rounded" onClick={handleAddSubtask}>Add</button>
              </div>
            </div>
            <hr />
            {/* Comments Section */}
            <div className="bg-white rounded p-4 shadow-sm">
              <h4 className="font-semibold mb-2">Comments</h4>
              {commentsLoading ? <div>Loading comments...</div> : null}
              {commentsError ? <div className="text-red-500">{commentsError}</div> : null}
              <ul className="mb-2 max-h-40 overflow-y-auto">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex items-start gap-2 mb-2">
                    {/* Optionally show avatar/name if available */}
                    <span className="flex-1 bg-gray-100 rounded px-2 py-1">{comment.content}</span>
                    <button className="text-xs text-red-500 ml-2" onClick={() => handleDeleteComment(comment)}>Delete</button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input
                  className="border rounded px-2 py-1 text-sm flex-1"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add comment..."
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }}
                />
                <button className="text-xs px-2 py-1 bg-blue-500 text-white rounded" onClick={handleAddComment}>Add</button>
              </div>
            </div>
            <hr />
            {/* Actions */}
            <div className="flex justify-between items-center mt-4">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <div className="flex gap-2">
                {editingTask && <Button variant="destructive" onClick={() => handleDeleteTask(editingTask)}>Delete Task</Button>}
                <Button type="submit">
                  {editingTask ? "Update Task" : "Create Task"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                // Mark notification as read (update in DB and UI)
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
