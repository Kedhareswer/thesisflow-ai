"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Calendar, 
  Clock, 
  User, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Filter,
  Search,
  CalendarDays,
  BarChart3,
  Settings,
  RefreshCw
} from "lucide-react"
import { Project, Task, Subtask, TaskComment } from "@/lib/services/project.service"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useForm } from "react-hook-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/integrations/supabase/client"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface GanttChartProps {
  projects: Project[]
  tasks: Task[]
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  onCreateTask: (project: Project) => void
  onEditProject: (project: Project) => void
  onDeleteProject: (project: Project) => void
}

interface GanttItem {
  id: string
  title: string
  type: 'project' | 'task' | 'subtask'
  startDate: Date
  endDate: Date
  progress: number
  status: string
  priority: string
  assignee?: string
  assigneeId?: string
  parentId?: string
  projectId: string
  comments: TaskComment[]
  subtasks: Subtask[]
  isExpanded?: boolean
  level: number
  description?: string
  estimatedHours?: number
}

interface TimelineConfig {
  startDate: Date
  endDate: Date
  zoomLevel: 'day' | 'week' | 'month'
  showWeekends: boolean
}

export function GanttChart({
  projects,
  tasks,
  onEditTask,
  onDeleteTask,
  onCreateTask,
  onEditProject,
  onDeleteProject
}: GanttChartProps) {
  const [ganttItems, setGanttItems] = useState<GanttItem[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [timelineConfig, setTimelineConfig] = useState<TimelineConfig>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    zoomLevel: 'week',
    showWeekends: true
  })
  const [showCompleted, setShowCompleted] = useState(true)
  const [showComments, setShowComments] = useState(true)
  const [loading, setLoading] = useState(true)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [comments, setComments] = useState<TaskComment[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  
  const { toast } = useToast()
  const { user } = useSupabaseAuth()

  // Fetch all subtasks and comments with real-time updates
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch all subtasks
        const { data: subtasksData } = await supabase
          .from('subtasks')
          .select('*')
          .order('created_at', { ascending: true })

        // Fetch all task comments
        const { data: commentsData } = await supabase
          .from('task_comments')
          .select('*')
          .order('created_at', { ascending: true })

        // Fetch all users
        const { data: usersData } = await supabase
          .from('user_profiles')
          .select('id, display_name, email')

        setSubtasks(subtasksData || [])
        setComments(commentsData || [])
        setUsers(usersData || [])
      } catch (error) {
        console.error('Error fetching gantt data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Set up real-time subscriptions
    const subtasksChannel = supabase
      .channel('subtasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, () => {
        fetchData()
      })
      .subscribe()

    const commentsChannel = supabase
      .channel('comments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      subtasksChannel.unsubscribe()
      commentsChannel.unsubscribe()
    }
  }, [])

  // Build Gantt items from projects, tasks, and subtasks
  useEffect(() => {
    const items: GanttItem[] = []

    projects.forEach(project => {
      const projectStartDate = project.start_date ? new Date(project.start_date) : new Date()
      const projectEndDate = project.end_date ? new Date(project.end_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      // Add project item
      items.push({
        id: project.id,
        title: project.title,
        type: 'project',
        startDate: projectStartDate,
        endDate: projectEndDate,
        progress: project.progress,
        status: project.status,
        priority: 'medium',
        projectId: project.id,
        comments: [],
        subtasks: [],
        level: 0,
        isExpanded: expandedItems.has(project.id),
        description: project.description
      })

      // Add tasks for this project
      const projectTasks = tasks.filter(task => task.project_id === project.id)
      projectTasks.forEach(task => {
        const taskStartDate = projectStartDate
        const taskEndDate = task.due_date ? new Date(task.due_date) : projectEndDate
        const taskSubtasks = subtasks.filter(subtask => subtask.task_id === task.id)
        const taskComments = comments.filter(comment => comment.task_id === task.id)
        const assignee = users.find(user => user.id === task.assignee_id)

        items.push({
          id: task.id,
          title: task.title,
          type: 'task',
          startDate: taskStartDate,
          endDate: taskEndDate,
          progress: task.status === 'completed' ? 100 : task.status === 'in-progress' ? 50 : 0,
          status: task.status,
          priority: task.priority,
          assignee: assignee?.display_name || assignee?.email,
          assigneeId: task.assignee_id,
          parentId: project.id,
          projectId: project.id,
          comments: taskComments,
          subtasks: taskSubtasks,
          level: 1,
          isExpanded: expandedItems.has(task.id),
          description: task.description,
          estimatedHours: task.estimated_hours
        })

        // Add subtasks if task is expanded
        if (expandedItems.has(task.id)) {
          taskSubtasks.forEach(subtask => {
            items.push({
              id: subtask.id,
              title: subtask.title,
              type: 'subtask',
              startDate: taskStartDate,
              endDate: taskEndDate,
              progress: subtask.is_completed ? 100 : 0,
              status: subtask.is_completed ? 'completed' : 'todo',
              priority: 'medium',
              parentId: task.id,
              projectId: project.id,
              comments: [],
              subtasks: [],
              level: 2
            })
          })
        }
      })
    })

    setGanttItems(items)
  }, [projects, tasks, subtasks, comments, users, expandedItems])

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-yellow-100 text-yellow-800"
      case "active":
        return "bg-blue-100 text-blue-800"
      case "planning":
        return "bg-purple-100 text-purple-800"
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

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Calendar className="h-4 w-4" />
      case 'task':
        return <CheckCircle2 className="h-4 w-4" />
      case 'subtask':
        return <Clock className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const calculateTimelinePosition = (item: GanttItem) => {
    const totalDays = (timelineConfig.endDate.getTime() - timelineConfig.startDate.getTime()) / (1000 * 60 * 60 * 24)
    const itemStart = Math.max(0, (item.startDate.getTime() - timelineConfig.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const itemDuration = (item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60 * 60 * 24)
    
    return {
      left: `${(itemStart / totalDays) * 100}%`,
      width: `${(itemDuration / totalDays) * 100}%`
    }
  }

  const filteredItems = useMemo(() => {
    return ganttItems.filter(item => {
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) return false
      
      // Priority filter
      if (priorityFilter !== "all" && item.priority !== priorityFilter) return false
      
      // Search filter
      if (searchTerm && !item.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
      
      // Completed filter
      if (!showCompleted && item.status === 'completed') return false
      
      return true
    })
  }, [ganttItems, statusFilter, priorityFilter, searchTerm, showCompleted])

  const taskForm = useForm({ 
    defaultValues: { 
      title: "", 
      description: "", 
      due_date: "", 
      priority: "medium", 
      status: "todo", 
      assignee_id: "unassigned",
      estimated_hours: 0
    } 
  })

  const openCreateTask = (project: Project) => {
    setSelectedProject(project)
    taskForm.reset({ 
      title: "", 
      description: "", 
      due_date: "", 
      priority: "medium", 
      status: "todo", 
      assignee_id: "unassigned",
      estimated_hours: 0
    })
    setShowTaskModal(true)
  }

  const handleTaskSubmit = async (values: any) => {
    if (!selectedProject) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          ...values,
          project_id: selectedProject.id,
          priority: values.priority,
          status: values.status,
          assignee_id: values.assignee_id === "unassigned" ? "" : values.assignee_id,
          estimated_hours: parseInt(values.estimated_hours) || 0
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create task")
      }

      toast({ title: "Task created successfully" })
      setShowTaskModal(false)
      // Refresh the data
      window.location.reload()
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to create task", 
        variant: "destructive" 
      })
    }
  }

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId)
  }

  const handleDrop = async (targetItemId: string) => {
    if (!draggedItem || draggedItem === targetItemId) return

    // Here you would implement the logic to move items
    // For now, we'll just show a toast
    toast({ title: "Drag and drop functionality coming soon!" })
    setDraggedItem(null)
  }

  const generateTimelineHeaders = () => {
    const headers = []
    const currentDate = new Date(timelineConfig.startDate)
    
    while (currentDate <= timelineConfig.endDate) {
      headers.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return headers
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading Gantt chart...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Gantt Chart Timeline
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  {showCompleted ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                  {showCompleted ? "Hide Completed" : "Show Completed"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {showComments ? "Hide Comments" : "Show Comments"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timeline Header */}
            <div className="relative mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{timelineConfig.startDate.toLocaleDateString()}</span>
                <span>{timelineConfig.endDate.toLocaleDateString()}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            {/* Gantt Items */}
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const timelinePos = calculateTimelinePosition(item)
                const indent = item.level * 20

                return (
                  <div 
                    key={item.id} 
                    className="relative"
                    draggable={item.type === 'task'}
                    onDragStart={() => handleDragStart(item.id)}
                    onDrop={() => handleDrop(item.id)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <div 
                      className={`flex items-center gap-2 p-3 bg-white border rounded-lg hover:shadow-md transition-shadow ${
                        draggedItem === item.id ? 'opacity-50' : ''
                      }`}
                      style={{ paddingLeft: `${indent + 12}px` }}
                    >
                      {/* Expand/Collapse Button */}
                      {(item.type === 'project' || item.type === 'task') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(item.id)}
                          className="p-1"
                        >
                          {expandedItems.has(item.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}

                      {/* Item Icon */}
                      <div className="text-gray-500">
                        {getItemIcon(item.type)}
                      </div>

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h4 className="font-medium text-gray-900 truncate cursor-help">
                                {item.title}
                              </h4>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="max-w-xs">
                                <p className="font-medium">{item.title}</p>
                                {item.description && (
                                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                )}
                                {item.estimatedHours && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    Estimated: {item.estimatedHours}h
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                          {item.priority && (
                            <Badge className={getPriorityColor(item.priority)} variant="outline">
                              {item.priority}
                            </Badge>
                          )}
                          {item.assignee && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <User className="h-3 w-3" />
                              <span className="truncate">{item.assignee}</span>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{item.progress}%</span>
                          </div>
                          <Progress value={item.progress} className="h-1" />
                        </div>

                        {/* Comments Count */}
                        {showComments && item.comments.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <MessageSquare className="h-3 w-3" />
                            <span>{item.comments.length} comments</span>
                          </div>
                        )}

                        {/* Subtasks Count */}
                        {item.subtasks.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>
                              {item.subtasks.filter(s => s.is_completed).length}/{item.subtasks.length} subtasks
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        {item.type === 'project' && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onCreateTask({ id: item.projectId } as Project)}
                                  className="p-1"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Add Task</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditProject({ id: item.id } as Project)}
                                  className="p-1"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Project</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteProject({ id: item.id } as Project)}
                                  className="p-1 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Project</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {item.type === 'task' && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditTask({ id: item.id } as Task)}
                                  className="p-1"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Task</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteTask({ id: item.id } as Task)}
                                  className="p-1 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Task</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="absolute top-1/2 transform -translate-y-1/2 left-0 right-0 pointer-events-none">
                      <div 
                        className="h-6 bg-blue-500 rounded opacity-20"
                        style={{
                          left: timelinePos.left,
                          width: timelinePos.width,
                          position: 'absolute'
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No items to display in the selected date range</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Creation Modal */}
        <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Task
              </DialogTitle>
            </DialogHeader>
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
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="estimated_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Hours</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={taskForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={taskForm.control}
                  name="assignee_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
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

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Create Task</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
} 