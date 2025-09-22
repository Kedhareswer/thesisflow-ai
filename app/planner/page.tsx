"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Clock, Target, TrendingUp, TrendingDown, Plus, Filter, BarChart3, User, AlertCircle, Calendar as CalendarIcon, Flag, MessageSquare, Activity } from "lucide-react"
import Sidebar from "../ai-agents/components/Sidebar"
import { FullScreenCalendar } from "@/components/ui/fullscreen-calendar"
import { SmartUpgradeBanner, ProjectLimitBanner } from "@/components/ui/smart-upgrade-banner"
import projectService, { Project, Task, Subtask, TaskComment } from "@/lib/services/project.service"
import { AnalyticsService, AnalyticsData } from "@/lib/services/analytics.service"
import { 
  TaskStatusDistribution, 
  ProjectProgress, 
  TaskPriorityAnalysis, 
  RecentActivity, 
  PerformanceInsights, 
  AdvancedAnalytics 
} from "@/components/planner/analytics-charts"
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
import { parseISO, parse, isValid, format } from "date-fns"
import { usePlanAndExecute } from "@/hooks/use-plan-and-execute"
import { Label } from "@/components/ui/label"
import { useDeepSearch } from "@/hooks/use-deep-search"

export default function PlannerPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  // Auto Planner hooks - declare early to avoid hoisting issues
  const planExec = usePlanAndExecute()
  const deep = useDeepSearch()
  const [planDraft, setPlanDraft] = useState<any | null>(null)
  // Auto features must be declared before effects that reference them
  const [applyCooldown, setApplyCooldown] = useState<number>(0)
  const [autoDeadline, setAutoDeadline] = useState<string>("")
  const [autoMode, setAutoMode] = useState<boolean>(true)
  const [autoApply, setAutoApply] = useState<boolean>(false)
  const calendarData = useMemo(() => {
    return tasks
      .filter((task) => {
        if (!task.due_date) return false
        const date = task.due_date.includes("T")
          ? parseISO(task.due_date)
          : parse(task.due_date, "yyyy-MM-dd", new Date())
        return isValid(date)
      })
      .map((task) => {
        const date = task.due_date!.includes("T")
          ? parseISO(task.due_date!)
          : parse(task.due_date!, "yyyy-MM-dd", new Date())
        const timeStr = task.due_date!.includes("T") ? format(date, "p") : ""
        return {
          day: date,
          events: [
            {
              id: task.id,
              name: task.title,
              time: timeStr,
              datetime: task.due_date!,
            },
          ],
        }
      })
  }, [tasks])

  // Sync planDraft whenever a new plan arrives
  useEffect(() => {
    if (planExec.plan) {
      try { setPlanDraft(JSON.parse(JSON.stringify(planExec.plan))) } catch { setPlanDraft(planExec.plan) }
      // Analytics: Plan generated
      trackAnalytics('plan_generated', { taskCount: planExec.plan?.tasks?.length || 0, planId: planExec.plan?.id })
      // Advance wizard to Edit step
      setWizardStep((s) => (s < 3 ? 3 : s))
      // Auto Mode: immediately generate Gantt and save draft to server
      if (autoMode) {
        try { generateGanttSchedule() } catch {}
        ;(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token
            if (token && planExec.plan) {
              await fetch('/api/planner/drafts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ plan: planExec.plan }),
              })
            }
          } catch {}
        })()
      }
    }
  }, [planExec.plan])

  // Auto-apply when stream is done, if enabled
  useEffect(() => {
    if (!autoMode || !autoApply) return
    if (planExec.lastEvent !== 'done') return
    if (applyCooldown > 0) return
    const plan = planDraft || planExec.plan
    if (!plan) return
    ;(async () => {
      try {
        await applyPlan({ newProjectTitle: plan.title, newProjectDescription: plan.description, deadline: autoDeadline })
      } catch {}
    })()
  }, [planExec.lastEvent, autoMode, autoApply, applyCooldown, planDraft, planExec.plan, autoDeadline])

  // Offline draft persistence (localStorage)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('auto_planner_draft')
      if (saved && !planExec.isStreaming && !planExec.plan && !planDraft) {
        setPlanDraft(JSON.parse(saved))
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    try {
      if (planDraft) localStorage.setItem('auto_planner_draft', JSON.stringify(planDraft))
    } catch {}
  }, [planDraft])

  // Inline editing helpers
  const updateTaskField = (taskId: string, field: string, value: any) => {
    setPlanDraft((prev: any) => {
      if (!prev) return prev
      const tasks = (prev.tasks || []).map((t: any) => (t.id === taskId ? { ...t, [field]: value } : t))
      // Analytics: Task edited
      trackAnalytics('task_edited', { taskId, field, planId: prev.id })
      return { ...prev, tasks }
    })
  }
  const moveTask = (taskId: string, dir: -1 | 1) => {
    setPlanDraft((prev: any) => {
      if (!prev) return prev
      const idx = (prev.tasks || []).findIndex((t: any) => t.id === taskId)
      if (idx < 0) return prev
      const arr = [...prev.tasks]
      const ni = Math.max(0, Math.min(arr.length - 1, idx + dir))
      if (ni === idx) return prev
      const [item] = arr.splice(idx, 1)
      arr.splice(ni, 0, item)
      return { ...prev, tasks: arr }
    })
  }
  const addSubtaskInline = (taskId: string) => {
    setPlanDraft((prev: any) => {
      if (!prev) return prev
      const tasks = (prev.tasks || []).map((t: any) =>
        t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), "New subtask"] } : t,
      )
      return { ...prev, tasks }
    })
  }
  const updateSubtaskInline = (taskId: string, index: number, value: string) => {
    setPlanDraft((prev: any) => {
      if (!prev) return prev
      const tasks = (prev.tasks || []).map((t: any) => {
        if (t.id !== taskId) return t
        const subs = [...(t.subtasks || [])]
        subs[index] = value
        return { ...t, subtasks: subs }
      })
      return { ...prev, tasks }
    })
  }
  const removeSubtaskInline = (taskId: string, index: number) => {
    setPlanDraft((prev: any) => {
      if (!prev) return prev
      const tasks = (prev.tasks || []).map((t: any) => {
        if (t.id !== taskId) return t
        const subs = [...(t.subtasks || [])]
        subs.splice(index, 1)
        return { ...t, subtasks: subs }
      })
      return { ...prev, tasks }
    })
  }

  // Apply plan to backend
  const applyPlan = async (opts?: { dryRun?: boolean; overwriteExisting?: boolean; projectId?: string | null; newProjectTitle?: string; newProjectDescription?: string; deadline?: string }) => {
    if (applyCooldown > 0) {
      toast({ title: 'Rate limited', description: `Please wait ${applyCooldown}s before trying again.`, variant: 'destructive' })
      return
    }
    try {
      const plan = planDraft || planExec.plan
      if (!plan || !Array.isArray(plan.tasks) || plan.tasks.length === 0) {
        toast({ title: "Nothing to apply", description: "Generate or edit a plan first.", variant: "destructive" })
        return
      }
      // Analytics: Apply attempt
      trackAnalytics('plan_apply_attempt', { dryRun: !!opts?.dryRun, taskCount: plan.tasks.length, planId: plan.id })
      
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const body: any = {
        idempotencyKey: plan.id || `auto_${Date.now()}`,
        plan,
        project: opts?.projectId
          ? { id: opts.projectId, deadline: opts?.deadline || (autoDeadline || undefined) }
          : { title: opts?.newProjectTitle || plan.title, description: opts?.newProjectDescription || plan.description, deadline: opts?.deadline || (autoDeadline || undefined) },
        options: { dryRun: !!opts?.dryRun, overwriteExisting: !!opts?.overwriteExisting },
      }
      const res = await fetch('/api/planner/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        const retryAfter = res.headers.get('Retry-After')
        if (res.status === 429 && retryAfter) {
          const cooldownSeconds = parseInt(retryAfter, 10) || 60
          setApplyCooldown(cooldownSeconds)
          toast({ title: 'Rate limited', description: `Try again in ${cooldownSeconds}s`, variant: 'destructive' })
        } else {
          toast({ title: 'Apply failed', description: json?.error || 'Unknown error', variant: 'destructive' })
        }
        // Analytics: Apply failed
        trackAnalytics('plan_apply_failed', { error: json?.error, status: res.status, planId: plan.id })
        return
      }
      toast({ title: opts?.dryRun ? 'Dry run complete' : 'Plan applied', description: `Tasks: ${json?.counts?.tasks ?? 0}, Subtasks: ${json?.counts?.subtasks ?? 0}` })
      // Analytics: Apply success
      trackAnalytics('plan_apply_success', { dryRun: !!opts?.dryRun, tasksCreated: json?.counts?.tasks, subtasksCreated: json?.counts?.subtasks, planId: plan.id })
    } catch (err: any) {
      toast({ title: 'Apply error', description: String(err?.message || err), variant: 'destructive' })
      trackAnalytics('plan_apply_error', { error: String(err?.message || err) })
    }
  }

  // Export helpers
  const exportJSON = () => {
    const plan = planDraft || planExec.plan
    const blob = new Blob([JSON.stringify(plan || {}, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${plan?.title || 'plan'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const exportMarkdown = () => {
    const plan = (planDraft || planExec.plan) as any
    if (!plan) return
    const lines: string[] = []
    lines.push(`# ${plan.title || 'Research Plan'}`)
    if (plan.description) lines.push(`\n${plan.description}\n`)
    lines.push(`- Estimated Total Time: ${plan.estimatedTotalTime || 'n/a'}`)
    lines.push(`\n## Tasks`)
    ;(plan.tasks || []).forEach((t: any, i: number) => {
      lines.push(`\n${i + 1}. **${t.title}** (${t.type || 'task'}) — est: ${t.estimatedTime || 'n/a'}; priority: ${t.priority}`)
      if (t.description) lines.push(`    - ${t.description}`)
      if (Array.isArray(t.subtasks) && t.subtasks.length) {
        t.subtasks.forEach((s: any) => lines.push(`    - [ ] ${typeof s === 'string' ? s : s?.title || ''}`))
      }
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${plan?.title || 'plan'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }
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
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
   // Global navigation sidebar collapse state
   const [collapsed, setCollapsed] = useState(false)
  const { user } = useSupabaseAuth()
  // Auto Planner (Phase 1) state and hook
  const [autoTopic, setAutoTopic] = useState("")
  const [autoUseDeepResearch, setAutoUseDeepResearch] = useState(false)
  const [autoMaxIterations, setAutoMaxIterations] = useState(4)
  const [autoSelectedTools, setAutoSelectedTools] = useState<string>("")
  // Phase 2 additions
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [autoDailyHours, setAutoDailyHours] = useState<number>(2)
  const [autoScheduleData, setAutoScheduleData] = useState<any[]>([])
  const [taskResources, setTaskResources] = useState<Record<string, any[]>>({})
  const [ganttSchedule, setGanttSchedule] = useState<any[]>([])
  const [ganttStartDate, setGanttStartDate] = useState<string>('')
  // Wizard & inputs
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1)
  const [autoDescription, setAutoDescription] = useState<string>("")
  const [autoMaxTasks, setAutoMaxTasks] = useState<number>(20)
  // Controlled state for apply form inputs
  const [newProjectTitle, setNewProjectTitle] = useState<string>("")
  const [newProjectDescription, setNewProjectDescription] = useState<string>("")
  // Server draft sync
  const [serverDraftLoaded, setServerDraftLoaded] = useState(false)
  const saveDraftTimeoutRef = useRef<any>(null)
  // Auto mode options (moved above)

  const reorderTasks = (fromIndex: number, toIndex: number) => {
    setPlanDraft((prev: any) => {
      if (!prev) return prev
      const arr = [...(prev.tasks || [])]
      if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) return prev
      const [item] = arr.splice(fromIndex, 1)
      arr.splice(toIndex, 0, item)
      // Analytics: Task reordered
      trackAnalytics('task_reordered', { fromIndex, toIndex, taskId: item?.id })
      return { ...prev, tasks: arr }
    })
  }

  // Analytics helper
  const trackAnalytics = async (event: string, data: any) => {
    try {
      if (!userId) return
      // Use supabase directly for analytics logging since logActivity is private
      await supabase.from('activity_logs').insert({
        user_id: userId,
        action: event,
        entity_type: 'auto_planner',
        entity_id: data.planId || 'unknown',
        metadata: { ...data, timestamp: new Date().toISOString() }
      })
    } catch (e) {
      console.warn('Analytics tracking failed:', e)
    }
  }

  // 429 cooldown effect
  useEffect(() => {
    if (applyCooldown > 0) {
      const timer = setInterval(() => {
        setApplyCooldown(prev => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [applyCooldown])

  // Cross-device draft: load latest from server on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          setServerDraftLoaded(true)
          return
        }
        const res = await fetch('/api/planner/drafts?latest=1', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const json = await res.json()
          const plan = json?.drafts?.[0]?.plan
          if (plan && !planExec.isStreaming && !planExec.plan && !planDraft) {
            setPlanDraft(plan)
          }
        }
      } catch {}
      finally { setServerDraftLoaded(true) }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cross-device draft: debounce save to server when planDraft changes
  useEffect(() => {
    if (!serverDraftLoaded) return
    if (!planDraft) return
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) return
        if (saveDraftTimeoutRef.current) clearTimeout(saveDraftTimeoutRef.current)
        saveDraftTimeoutRef.current = setTimeout(async () => {
          try {
            await fetch('/api/planner/drafts', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ plan: planDraft }),
            })
          } catch {}
        }, 1000)
      } catch {}
    })()
  }, [planDraft, serverDraftLoaded])

  // Cleanup timeout on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (saveDraftTimeoutRef.current) {
        clearTimeout(saveDraftTimeoutRef.current)
      }
    }
  }, [])

  // Sync controlled form inputs with planDraft changes
  useEffect(() => {
    setNewProjectTitle(planDraft?.title || "")
    setNewProjectDescription(planDraft?.description || "")
  }, [planDraft?.title, planDraft?.description])

  const estimatedMinutesFromString = (s?: string): number => {
    if (!s) return 60
    const m = s.match(/(\d+)(?:-(\d+))?/)
    if (!m) return 60
    const a = parseInt(m[1], 10)
    const b = m[2] ? parseInt(m[2], 10) : a
    return Math.round((a + b) / 2)
  }

  // Gantt timeline helpers
  const generateGanttSchedule = () => {
    const plan = planDraft || planExec.plan
    if (!plan || !Array.isArray(plan.tasks)) return
    
    const startDate = ganttStartDate ? new Date(ganttStartDate) : new Date()
    const schedule = []
    let currentDate = new Date(startDate)
    
    for (const task of plan.tasks) {
      const minutes = estimatedMinutesFromString(task.estimatedTime)
      const days = Math.max(1, Math.ceil(minutes / (autoDailyHours * 60)))
      
      schedule.push({
        taskId: task.id,
        title: task.title,
        startDate: new Date(currentDate),
        endDate: new Date(currentDate.getTime() + (days - 1) * 24 * 60 * 60 * 1000),
        duration: days,
        estimatedMinutes: minutes
      })
      
      currentDate = new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000)
    }
    
    setGanttSchedule(schedule)
    trackAnalytics('gantt_generated', { taskCount: schedule.length, totalDays: schedule.reduce((acc, s) => acc + s.duration, 0) })
  }
  
  const moveTaskInGantt = (taskId: string, newStartDate: Date) => {
    setGanttSchedule(prev => {
      const updated = prev.map(item => {
        if (item.taskId === taskId) {
          const duration = item.duration
          return {
            ...item,
            startDate: new Date(newStartDate),
            endDate: new Date(newStartDate.getTime() + (duration - 1) * 24 * 60 * 60 * 1000)
          }
        }
        return item
      })
      trackAnalytics('gantt_task_moved', { taskId, newStartDate: newStartDate.toISOString() })
      return updated
    })
  }

  const computeSchedule = () => {
    const plan: any = planExec.plan
    if (!plan || !Array.isArray(plan.tasks)) {
      toast({ title: "No plan available", description: "Generate a plan first.", variant: "destructive" })
      return
    }
    const tasksList = plan.tasks as any[]

    let current = new Date()
    const deadlineDate = autoDeadline ? new Date(autoDeadline) : null
    const dailyCap = Math.max(30, Math.min(12 * 60, Math.round((autoDailyHours || 2) * 60)))
    const sessionLen = 90 // minutes per focus session
    let remainingToday = dailyCap
    const calendarBlocks: { day: Date; events: { id: string; name: string; time: string; datetime: string }[] }[] = []

    function pushEvent(date: Date, id: string, name: string, startMin: number, lenMin: number) {
      const startDate = new Date(date)
      startDate.setHours(9, startMin, 0, 0)
      const endDate = new Date(startDate.getTime() + lenMin * 60000)
      const dayKey = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      let dayEntry = calendarBlocks.find((d) => d.day.getTime() === dayKey.getTime())
      if (!dayEntry) {
        dayEntry = { day: dayKey, events: [] }
        calendarBlocks.push(dayEntry)
      }
      const timeStr = format(startDate, "p")
      dayEntry.events.push({ id, name, time: timeStr, datetime: startDate.toISOString() })
    }

    for (const t of tasksList) {
      const minutes = estimatedMinutesFromString(t.estimatedTime)
      let remaining = minutes
      let startMinute = 0
      while (remaining > 0) {
        if (remainingToday <= 0) {
          // next day
          current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1)
          remainingToday = dailyCap
          startMinute = 0
        }
        const block = Math.min(sessionLen, remaining, remainingToday)
        pushEvent(current, t.id, t.title, startMinute, block)
        remaining -= block
        remainingToday -= block
        startMinute += block
      }
    }

    // Simple deadline notice (no hard enforcement)
    if (deadlineDate && calendarBlocks.length) {
      const lastDay = calendarBlocks[calendarBlocks.length - 1].day
      if (lastDay.getTime() > new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate()).getTime()) {
        toast({ title: "Schedule exceeds deadline", description: "Consider increasing daily hours or reducing scope.", variant: "destructive" })
      }
    }

    setAutoScheduleData(calendarBlocks)
    trackAnalytics('schedule_computed', { taskCount: tasksList.length, totalBlocks: calendarBlocks.length, dailyHours: autoDailyHours })
  }

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

  const fetchAnalyticsData = async () => {
    if (!userId) return
    
    setAnalyticsLoading(true)
    try {
      const analyticsService = new AnalyticsService(userId)
      const data = await analyticsService.getAnalyticsData(timeRange)
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchAnalyticsData()
  }, [userId, timeRange])

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
                  {projects.length ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length) : 0}%
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
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v=>!v)} />
      <div className="flex-1 bg-background">
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
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="auto-planner" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Auto Planner
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <FullScreenCalendar data={calendarData} />
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
                <Select value={timeRange} onValueChange={(value: string) => setTimeRange(value as '7d' | '30d' | '90d')}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchAnalyticsData}
                  disabled={analyticsLoading}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {analyticsLoading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="text-gray-600">Loading analytics...</span>
                </div>
              </div>
            ) : analyticsData ? (
              <>
                {/* Key Metrics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="relative overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-blue-100 p-2">
                          <Target className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{analyticsData.activeProjects}</p>
                          <p className="text-sm text-gray-600">Active Projects</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        {analyticsData.projectsTrend >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm ${analyticsData.projectsTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analyticsData.projectsTrend >= 0 ? '+' : ''}{analyticsData.projectsTrend}% from last period
                        </span>
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
                          <p className="text-2xl font-bold text-gray-900">{analyticsData.completedTasks}</p>
                          <p className="text-sm text-gray-600">Completed Tasks</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        {analyticsData.completedTasksTrend >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm ${analyticsData.completedTasksTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analyticsData.completedTasksTrend >= 0 ? '+' : ''}{analyticsData.completedTasksTrend}% from last period
                        </span>
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
                          <p className="text-2xl font-bold text-gray-900">{analyticsData.pendingTasks}</p>
                          <p className="text-sm text-gray-600">Pending Tasks</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        {analyticsData.pendingTasksTrend >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-orange-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                        <span className={`text-sm ${analyticsData.pendingTasksTrend >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {analyticsData.pendingTasksTrend >= 0 ? '+' : ''}{analyticsData.pendingTasksTrend}% from last period
                        </span>
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
                          <p className="text-2xl font-bold text-gray-900">{analyticsData.averageProgress}%</p>
                          <p className="text-sm text-gray-600">Avg Progress</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        {analyticsData.progressTrend >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-purple-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm ${analyticsData.progressTrend >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                          {analyticsData.progressTrend >= 0 ? '+' : ''}{analyticsData.progressTrend}% from last period
                        </span>
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
                      <TaskStatusDistribution data={analyticsData.taskStatusDistribution} />
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
                      <ProjectProgress data={analyticsData.projectProgress} />
                    </CardContent>
                  </Card>
                </div>

                {/* Task Priority Analysis and Recent Activity */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Flag className="h-5 w-5" />
                        Task Priority Analysis
                      </CardTitle>
                      <CardDescription>Tasks by priority level</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TaskPriorityAnalysis data={analyticsData.taskPriorityAnalysis} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Latest updates and changes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RecentActivity data={analyticsData.recentActivity} />
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Insights and Advanced Analytics */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Performance Insights
                      </CardTitle>
                      <CardDescription>Key performance indicators</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PerformanceInsights data={analyticsData.performanceInsights} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Advanced Analytics
                      </CardTitle>
                      <CardDescription>Detailed performance metrics and trends</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AdvancedAnalytics data={analyticsData.advancedAnalytics} />
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
                  <p className="text-gray-600">Create some projects and tasks to see your analytics here.</p>
                </div>
              </div>
            )}
          </div>
          </TabsContent>

          {/* Auto Planner Wizard */}
          <TabsContent value="auto-planner" className="space-y-6">
            {/* Wizard Steps Header */}
            <div className="flex items-center gap-2 text-sm">
              <div className={`px-2 py-1 rounded ${wizardStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1. Inputs</div>
              <div className={`px-2 py-1 rounded ${wizardStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2. Generate</div>
              <div className={`px-2 py-1 rounded ${wizardStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3. Edit</div>
              <div className={`px-2 py-1 rounded ${wizardStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>4. Preview & Apply</div>
            </div>

            {/* Inputs + Generate */}
            <Card>
              <CardHeader>
                <CardTitle>Generate Plan</CardTitle>
                <CardDescription>Provide a topic and optional parameters, then stream the AI plan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Research Topic</Label>
                    <Textarea
                      placeholder="e.g. Graph Neural Networks for citation prediction"
                      value={autoTopic}
                      onChange={(e) => setAutoTopic(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      placeholder="Short description to guide the plan (goals, constraints, deliverables)"
                      value={autoDescription}
                      onChange={(e) => setAutoDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Selected Tools (comma-separated)</Label>
                    <Input
                      placeholder="e.g. web, scholar, code"
                      value={autoSelectedTools}
                      onChange={(e) => setAutoSelectedTools(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Use Deep Research</Label>
                    <Select value={String(autoUseDeepResearch)} onValueChange={(v) => setAutoUseDeepResearch(v === 'true')}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">Disabled</SelectItem>
                        <SelectItem value="true">Enabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Iterations (deep research)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={autoMaxIterations}
                      onChange={(e) => setAutoMaxIterations(Number(e.target.value || 4))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Tasks</Label>
                    <Input
                      type="number"
                      min={5}
                      max={50}
                      value={autoMaxTasks}
                      onChange={(e) => setAutoMaxTasks(Number(e.target.value || 20))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="h-4 w-4" checked={autoMode} onChange={(e) => setAutoMode(e.target.checked)} />
                    Auto Mode
                  </label>
                  <label className={`flex items-center gap-2 text-sm ${!autoMode ? 'text-gray-400' : 'text-gray-700'}`}>
                    <input type="checkbox" className="h-4 w-4" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} disabled={!autoMode} />
                    Auto-apply
                  </label>
                  <Button
                    onClick={() => planExec.start({
                      userQuery: autoTopic,
                      description: autoDescription,
                      maxTasks: autoMaxTasks,
                      selectedTools: autoSelectedTools.split(',').map(s => s.trim()).filter(Boolean),
                      useDeepResearch: autoUseDeepResearch,
                      maxIterations: autoMaxIterations,
                    })}
                    disabled={planExec.isStreaming || !autoTopic.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {planExec.isStreaming ? 'Generating…' : 'Generate Plan'}
                  </Button>
                  <Button variant="outline" onClick={planExec.stop} disabled={!planExec.isStreaming}>Stop</Button>
                  <Button variant="ghost" onClick={planExec.reset}>Reset</Button>
                  {planExec.progress?.overallProgress !== undefined && (
                    <span className="text-sm text-gray-600">Progress: {planExec.progress.overallProgress}%</span>
                  )}
                  <div className="flex-1" />
                  <Button variant="secondary" onClick={() => setWizardStep(2)}>Next</Button>
                </div>
              </CardContent>
            </Card>

            {/* Streaming Console */}
            <Card>
              <CardHeader>
                <CardTitle>Streaming Console</CardTitle>
                <CardDescription>Live output from the planning process.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full overflow-auto rounded-md border bg-black p-3 text-green-300">
                  <pre className="text-xs leading-relaxed">
{planExec.logs.map((l, i) => `> ${l}`).join('\n')}
                  </pre>
                </div>
                {planExec.error && (
                  <div className="mt-2 text-sm text-red-600">Error: {planExec.error}</div>
                )}
              </CardContent>
            </Card>

          {/* Plan Editor (inline editing + drag reorder) */}
          {wizardStep >= 3 && planDraft?.tasks?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Plan Editor</CardTitle>
                <CardDescription>Edit tasks inline, reorder by drag, and manage subtasks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={exportJSON}>Export JSON</Button>
                  <Button variant="outline" onClick={exportMarkdown}>Export Markdown</Button>
                  <Button variant="ghost" onClick={() => { try { localStorage.removeItem('auto_planner_draft') } catch {}; setPlanDraft(null) }}>Clear Draft</Button>
                  <Button variant="ghost" onClick={() => { if (planExec.plan) setPlanDraft(JSON.parse(JSON.stringify(planExec.plan))) }}>Load Latest Plan</Button>
                </div>

                <div className="space-y-3">
                  {(planDraft.tasks as any[]).map((t: any, idx: number) => (
                    <div
                      key={t.id}
                      className="border rounded-md p-3 bg-white"
                      draggable
                      data-task-index={idx}
                      onDragStart={(e) => { 
                        e.dataTransfer.setData('text/plain', String(idx))
                        e.dataTransfer.setData('application/x-task-index', String(idx))
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { 
                        e.preventDefault()
                        // Safely parse and validate the dragged index
                        const rawData = e.dataTransfer.getData('application/x-task-index') || e.dataTransfer.getData('text/plain')
                        const fromIndex = Number(rawData)
                        
                        // Strict validation: must be integer, finite, and within valid range
                        if (!Number.isInteger(fromIndex) || !isFinite(fromIndex)) return
                        
                        const tasksLength = (planDraft?.tasks || []).length
                        if (fromIndex < 0 || fromIndex >= tasksLength || idx < 0 || idx >= tasksLength) return
                        
                        // Additional safety: ensure indices are different
                        if (fromIndex !== idx) {
                          reorderTasks(fromIndex, idx)
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-500">#{idx + 1}</div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => moveTask(t.id, -1)}>Up</Button>
                          <Button size="sm" variant="outline" onClick={() => moveTask(t.id, 1)}>Down</Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 mt-2">
                        <div className="space-y-1">
                          <Label>Title</Label>
                          <Input value={t.title} onChange={(e) => updateTaskField(t.id, 'title', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>Priority</Label>
                          <Select value={String(t.priority ?? 'medium')} onValueChange={(v) => updateTaskField(t.id, 'priority', v)}>
                            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label>Description</Label>
                          <Textarea value={t.description || ''} onChange={(e) => updateTaskField(t.id, 'description', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>Estimated Time</Label>
                          <Input value={t.estimatedTime || ''} onChange={(e) => updateTaskField(t.id, 'estimatedTime', e.target.value)} placeholder="e.g. 3-5 minutes" />
                        </div>
                        <div className="space-y-1">
                          <Label>Type</Label>
                          <Select value={String(t.type ?? 'search')} onValueChange={(v) => updateTaskField(t.id, 'type', v)}>
                            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="search">Search</SelectItem>
                              <SelectItem value="analyze">Analyze</SelectItem>
                              <SelectItem value="synthesize">Synthesize</SelectItem>
                              <SelectItem value="generate">Generate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Subtasks */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Subtasks</Label>
                          <Button size="sm" onClick={() => addSubtaskInline(t.id)}>Add Subtask</Button>
                        </div>
                        <div className="space-y-2">
                          {(t.subtasks || []).map((s: any, i: number) => (
                            <div key={`${t.id}-st-${i}`} className="flex items-center gap-2">
                              <Input value={typeof s === 'string' ? s : s?.title || ''} onChange={(e) => updateSubtaskInline(t.id, i, e.target.value)} />
                              <Button size="sm" variant="ghost" onClick={() => removeSubtaskInline(t.id, i)}>Remove</Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pseudo Gantt bar */}
                      <div className="mt-3">
                        <div className="text-xs text-gray-600 mb-1">Duration visual</div>
                        <div className="h-3 w-full bg-gray-200 rounded">
                          <div className="h-3 bg-blue-500 rounded" style={{ width: `${Math.min(100, Math.max(10, (estimatedMinutesFromString(t.estimatedTime) / 480) * 100))}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <div className="px-6 pb-4 flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => setWizardStep(4)}>Review & Apply</Button>
                <Button onClick={() => applyPlan({ newProjectTitle: planDraft?.title, newProjectDescription: planDraft?.description, deadline: autoDeadline })} disabled={applyCooldown > 0}>
                  {applyCooldown > 0 ? `Wait ${applyCooldown}s` : 'Accept & Create Project'}
                </Button>
              </div>
            </Card>
          ) : null}

          {/* Resource Suggestions */}
          {wizardStep >= 3 && selectedTaskId && (
            <Card>
              <CardHeader>
                <CardTitle>Suggested Resources</CardTitle>
                <CardDescription>Streaming results powered by Deep Search.</CardDescription>
              </CardHeader>
              <CardContent>
                {deep.error && <div className="text-sm text-red-600 mb-2">{deep.error}</div>}
                <div className="max-h-64 overflow-auto space-y-2">
                  {deep.items.map((it, idx) => (
                    <div key={`${it.url}-${idx}`} className="p-2 border rounded-md bg-white">
                      <div className="text-sm font-medium truncate">
                        <a className="underline" href={it.url} target="_blank" rel="noreferrer">{it.title}</a>
                      </div>
                      <div className="text-xs text-gray-600 truncate">{it.source} {it.publishedDate ? `• ${it.publishedDate}` : ''}</div>
                      <div className="text-xs text-gray-700 line-clamp-2">{it.snippet}</div>
                      <div className="mt-1">
                        <Button size="sm" variant="outline" onClick={() => {
                          setTaskResources((prev) => ({ ...prev, [selectedTaskId]: [...(prev[selectedTaskId] || []), it] }))
                        }}>Add to Task</Button>
                      </div>
                    </div>
                  ))}
                  {!deep.items.length && !deep.isStreaming && (
                    <div className="text-sm text-gray-600">No results yet. Click "Suggest Resources" above.</div>
                  )}
                </div>
                {!!(taskResources[selectedTaskId]?.length) && (
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-1">Added to Task</div>
                    <ul className="list-disc pl-5 text-sm">
                      {taskResources[selectedTaskId]!.map((r, i) => (
                        <li key={`sel-${i}`} className="truncate"><a className="underline" href={r.url} target="_blank" rel="noreferrer">{r.title}</a></li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Scheduling */}
          {wizardStep >= 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Scheduling</CardTitle>
              <CardDescription>Compute a simple timeboxed schedule and preview on calendar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Deadline (optional)</Label>
                  <Input type="date" value={autoDeadline} onChange={(e) => setAutoDeadline(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Daily Focus Hours</Label>
                  <Input type="number" min={0.5} max={12} step={0.5} value={autoDailyHours} onChange={(e) => setAutoDailyHours(Number(e.target.value || 2))} />
                </div>
                <div className="flex items-end">
                  <Button onClick={computeSchedule} disabled={!planExec.plan?.tasks?.length}>Compute Schedule</Button>
                </div>
              </div>
              <div className="mt-2">
                {autoScheduleData.length ? (
                  <FullScreenCalendar data={autoScheduleData} />
                ) : (
                  <div className="text-sm text-gray-600">No schedule yet. Click Compute Schedule.</div>
                )}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Gantt Timeline */}
          {wizardStep >= 3 && planDraft?.tasks?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Gantt Timeline</CardTitle>
                <CardDescription>Drag tasks across days to reschedule before applying.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={ganttStartDate} onChange={(e) => setGanttStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Daily Hours (for duration calc)</Label>
                    <Input type="number" min={1} max={12} value={autoDailyHours} onChange={(e) => setAutoDailyHours(Number(e.target.value || 2))} />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={generateGanttSchedule} disabled={!planDraft?.tasks?.length}>Generate Timeline</Button>
                  </div>
                </div>
                
                {ganttSchedule.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Timeline (drag tasks to reschedule)</div>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {ganttSchedule.map((item, idx) => (
                        <div
                          key={item.taskId}
                          className="flex items-center gap-3 p-2 border rounded bg-white hover:bg-gray-50 cursor-move"
                          draggable
                          data-task-id={item.taskId}
                          data-gantt-type="gantt"
                          onDragStart={(e) => {
                            // Use safer data transfer methods
                            e.dataTransfer.setData('application/x-gantt-task-id', item.taskId)
                            e.dataTransfer.setData('application/x-gantt-type', 'gantt')
                            // Fallback for compatibility
                            e.dataTransfer.setData('text/plain', `gantt:${item.taskId}`)
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            
                            // Safely extract drag data without JSON.parse
                            const draggedTaskId = e.dataTransfer.getData('application/x-gantt-task-id')
                            const draggedType = e.dataTransfer.getData('application/x-gantt-type')
                            
                            // Fallback parsing for text/plain with strict validation
                            let taskId = draggedTaskId
                            let type = draggedType
                            
                            if (!taskId || !type) {
                              const fallbackData = e.dataTransfer.getData('text/plain')
                              if (fallbackData && fallbackData.startsWith('gantt:')) {
                                const parts = fallbackData.split(':')
                                if (parts.length === 2 && parts[0] === 'gantt') {
                                  taskId = parts[1]
                                  type = 'gantt'
                                }
                              }
                            }
                            
                            // Strict validation: ensure taskId is safe and type is correct
                            if (!taskId || !type || type !== 'gantt') return
                            
                            // Validate taskId format (should be alphanumeric/UUID-like)
                            if (!/^[a-zA-Z0-9_-]+$/.test(taskId)) return
                            
                            // Ensure we're not dropping on the same task
                            if (taskId !== item.taskId) {
                              // Verify the taskId exists in our gantt schedule before moving
                              const taskExists = ganttSchedule.some(scheduleItem => scheduleItem.taskId === taskId)
                              if (taskExists) {
                                moveTaskInGantt(taskId, item.startDate)
                              }
                            }
                          }}
                        >
                          <div className="text-xs text-gray-500 w-8">#{idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{item.title}</div>
                            <div className="text-xs text-gray-600">
                              {format(item.startDate, 'MMM d')} - {format(item.endDate, 'MMM d')} ({item.duration} day{item.duration > 1 ? 's' : ''})
                            </div>
                            {/* Dependency & conflict hints */}
                            <div className="text-xs">
                              {(() => {
                                const t = (planDraft?.tasks || []).find((x: any) => x.id === item.taskId)
                                const deps: string[] = (t?.dependencies || [])
                                const conflict = ganttSchedule.some((other: any) => other.taskId !== item.taskId && other.startDate <= item.endDate && other.endDate >= item.startDate)
                                const depConflict = deps.some((depId) => {
                                  const d = ganttSchedule.find(g => g.taskId === depId)
                                  return d ? d.endDate > item.startDate : false
                                })
                                return (
                                  <span className={`${(conflict || depConflict) ? 'text-red-600' : 'text-gray-500'}`}>
                                    {deps.length ? `Depends on: ${deps.join(', ')}` : 'No dependencies'}
                                    {(conflict || depConflict) ? ' • ⚠ Conflict detected' : ''}
                                  </span>
                                )
                              })()}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">{item.estimatedMinutes}min</div>
                          <div className="w-16 h-2 bg-gray-200 rounded overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (item.duration / 7) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      Total duration: {ganttSchedule.reduce((acc, s) => Math.max(acc, s.endDate.getTime()), 0) > 0 ? 
                        Math.ceil((ganttSchedule.reduce((acc, s) => Math.max(acc, s.endDate.getTime()), 0) - ganttSchedule[0]?.startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1 : 0} days
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Plan Preview */}
          {wizardStep >= 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Plan Preview (JSON)</CardTitle>
              <CardDescription>Initial plan skeleton as received from the backend. Edit support and scheduling arrive in Phase 2.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-muted p-3">
                <pre className="max-h-96 overflow-auto text-xs">
{planDraft ? JSON.stringify(planDraft, null, 2) : (planExec.plan ? JSON.stringify(planExec.plan, null, 2) : "No plan yet. Generate to see the preview.")}
                </pre>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Apply Plan */}
          {wizardStep >= 4 && planDraft?.tasks?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Apply Plan</CardTitle>
                <CardDescription>Persist tasks and subtasks to a project with idempotency.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1 md:col-span-2">
                    <Label>Apply to Existing Project</Label>
                    <Select onValueChange={(v) => applyPlan({ projectId: v || null, overwriteExisting: true })}>
                      <SelectTrigger><SelectValue placeholder="Select a project to apply (overwrites by title)" /></SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => applyPlan({ dryRun: true })} 
                      disabled={applyCooldown > 0}
                    >
                      {applyCooldown > 0 ? `Wait ${applyCooldown}s` : 'Dry Run'}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>New Project Title</Label>
                    <Input 
                      value={newProjectTitle} 
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder="Enter project title..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>New Project Description</Label>
                    <Input 
                      value={newProjectDescription} 
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Enter project description..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    onClick={() => {
                      applyPlan({ 
                        newProjectTitle: newProjectTitle || planDraft?.title, 
                        newProjectDescription: newProjectDescription || planDraft?.description 
                      })
                    }}
                    disabled={applyCooldown > 0}
                  >
                    {applyCooldown > 0 ? `Wait ${applyCooldown}s` : 'Apply to New Project'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
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
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>
    </div>
  )
}
