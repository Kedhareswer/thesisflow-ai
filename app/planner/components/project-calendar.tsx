"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Target,
  Briefcase,
  ListTodo,
  Filter,
} from "lucide-react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
  addMonths,
  subMonths,
} from "date-fns"

// Mock data - replace with actual data from your project management system
const mockProjects = [
  {
    id: "1",
    name: "AI Research Platform",
    startDate: new Date(2024, 0, 15),
    endDate: new Date(2024, 2, 30),
    status: "active",
    color: "#3B82F6",
  },
  {
    id: "2",
    name: "Data Analysis Tool",
    startDate: new Date(2024, 1, 1),
    endDate: new Date(2024, 3, 15),
    status: "active",
    color: "#10B981",
  },
]

const mockTasks = [
  {
    id: "1",
    title: "Complete literature review",
    dueDate: new Date(2024, 1, 20),
    priority: "high",
    status: "pending",
    projectId: "1",
  },
  {
    id: "2",
    title: "Implement user authentication",
    dueDate: new Date(2024, 1, 25),
    priority: "medium",
    status: "in-progress",
    projectId: "1",
  },
  {
    id: "3",
    title: "Design database schema",
    dueDate: new Date(2024, 1, 18),
    priority: "high",
    status: "completed",
    projectId: "2",
  },
  {
    id: "4",
    title: "Create API endpoints",
    dueDate: new Date(2024, 1, 28),
    priority: "medium",
    status: "pending",
    projectId: "2",
  },
  {
    id: "5",
    title: "Write documentation",
    dueDate: new Date(2024, 1, 10),
    priority: "low",
    status: "overdue",
    projectId: "1",
  },
]

const mockMilestones = [
  {
    id: "1",
    title: "MVP Release",
    date: new Date(2024, 2, 1),
    projectId: "1",
    status: "upcoming",
  },
  {
    id: "2",
    title: "Beta Testing",
    date: new Date(2024, 2, 15),
    projectId: "2",
    status: "upcoming",
  },
]

type EventType = "project-start" | "project-end" | "task-due" | "milestone"
type FilterType = "all" | "projects" | "tasks" | "overdue"
type ViewMode = "month" | "week" | "timeline"

interface CalendarEvent {
  id: string
  title: string
  date: Date
  type: EventType
  priority?: "low" | "medium" | "high"
  status?: string
  color?: string
  projectId?: string
}

export function ProjectCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [filter, setFilter] = useState<FilterType>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("month")

  // Generate calendar events from mock data
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = []

    // Add project events
    mockProjects.forEach((project) => {
      allEvents.push({
        id: `project-start-${project.id}`,
        title: `${project.name} (Start)`,
        date: project.startDate,
        type: "project-start",
        color: project.color,
        projectId: project.id,
      })

      allEvents.push({
        id: `project-end-${project.id}`,
        title: `${project.name} (End)`,
        date: project.endDate,
        type: "project-end",
        color: project.color,
        projectId: project.id,
      })
    })

    // Add task events
    mockTasks.forEach((task) => {
      allEvents.push({
        id: `task-${task.id}`,
        title: task.title,
        date: task.dueDate,
        type: "task-due",
        priority: task.priority as "low" | "medium" | "high",
        status: task.status,
        projectId: task.projectId,
      })
    })

    // Add milestone events
    mockMilestones.forEach((milestone) => {
      allEvents.push({
        id: `milestone-${milestone.id}`,
        title: milestone.title,
        date: milestone.date,
        type: "milestone",
        status: milestone.status,
        projectId: milestone.projectId,
      })
    })

    return allEvents
  }, [])

  // Filter events based on selected filter
  const filteredEvents = useMemo(() => {
    switch (filter) {
      case "projects":
        return events.filter((event) => event.type === "project-start" || event.type === "project-end")
      case "tasks":
        return events.filter((event) => event.type === "task-due")
      case "overdue":
        return events.filter((event) => event.type === "task-due" && isPast(event.date) && event.status !== "completed")
      default:
        return events
    }
  }, [events, filter])

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return []
    return filteredEvents.filter((event) => isSameDay(event.date, selectedDate))
  }, [filteredEvents, selectedDate])

  // Get events for current month
  const monthEvents = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    return filteredEvents.filter((event) => event.date >= monthStart && event.date <= monthEnd)
  }, [filteredEvents, currentDate])

  // Get upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    return filteredEvents
      .filter((event) => event.date >= today && event.date <= nextWeek)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [filteredEvents])

  // Get overdue events
  const overdueEvents = useMemo(() => {
    const today = new Date()
    return filteredEvents
      .filter((event) => event.type === "task-due" && event.date < today && event.status !== "completed")
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [filteredEvents])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    return eachDayOfInterval({ start: monthStart, end: monthEnd })
  }, [currentDate])

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case "project-start":
      case "project-end":
        return <Briefcase className="h-3 w-3" />
      case "task-due":
        return <ListTodo className="h-3 w-3" />
      case "milestone":
        return <Target className="h-3 w-3" />
      default:
        return <Calendar className="h-3 w-3" />
    }
  }

  const getEventColor = (event: CalendarEvent) => {
    if (event.color) return event.color

    switch (event.type) {
      case "project-start":
        return "#3B82F6" // blue
      case "project-end":
        return "#8B5CF6" // purple
      case "task-due":
        return event.priority === "high" ? "#EF4444" : event.priority === "medium" ? "#F59E0B" : "#10B981"
      case "milestone":
        return "#10B981" // green
      default:
        return "#6B7280" // gray
    }
  }

  const getPriorityBorderColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500"
      case "medium":
        return "border-l-yellow-500"
      case "low":
        return "border-l-green-500"
      default:
        return "border-l-gray-300"
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => (direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)))
  }

  const renderMonthView = () => (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">{format(currentDate, "MMMM yyyy")}</h2>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
          Today
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 bg-white border border-gray-200 rounded-lg p-4">
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day) => {
          const dayEvents = filteredEvents.filter((event) => isSameDay(event.date, day))
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isCurrentDay = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className={`
                min-h-[80px] p-1 border border-gray-100 cursor-pointer hover:bg-gray-50
                ${isSelected ? "bg-blue-50 border-blue-200" : ""}
                ${isCurrentDay ? "bg-blue-100" : ""}
                ${!isSameMonth(day, currentDate) ? "text-gray-400 bg-gray-50" : ""}
              `}
              onClick={() => setSelectedDate(day)}
            >
              <div className={`text-sm font-medium mb-1 ${isCurrentDay ? "text-blue-600" : ""}`}>
                {format(day, "d")}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className="text-xs p-1 rounded truncate"
                    style={{ backgroundColor: `${getEventColor(event)}20`, color: getEventColor(event) }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderTimelineView = () => (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Upcoming (Next 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming events</p>
          ) : (
            upcomingEvents.map((event) => (
              <div
                key={event.id}
                className={`flex items-center gap-3 p-3 border-l-4 bg-gray-50 rounded-r ${getPriorityBorderColor(event.priority)}`}
              >
                <div className="flex-shrink-0" style={{ color: getEventColor(event) }}>
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                  <p className="text-xs text-gray-500">{format(event.date, "MMM d, yyyy")}</p>
                </div>
                {event.priority && (
                  <Badge
                    variant="outline"
                    className={
                      event.priority === "high"
                        ? "border-red-200 text-red-700"
                        : event.priority === "medium"
                          ? "border-yellow-200 text-yellow-700"
                          : "border-green-200 text-green-700"
                    }
                  >
                    {event.priority}
                  </Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Overdue Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Overdue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {overdueEvents.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm">No overdue items</p>
            </div>
          ) : (
            overdueEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 border-l-4 border-l-red-500 bg-red-50 rounded-r"
              >
                <div className="flex-shrink-0 text-red-600">{getEventIcon(event.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                  <p className="text-xs text-red-600">Due: {format(event.date, "MMM d, yyyy")}</p>
                </div>
                <Badge variant="outline" className="border-red-200 text-red-700">
                  Overdue
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Calendar</h1>
          <p className="text-gray-600">Track project timelines, tasks, and deadlines</p>
        </div>

        <div className="flex gap-2">
          <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="projects">Projects Only</SelectItem>
              <SelectItem value="tasks">Tasks Only</SelectItem>
              <SelectItem value="overdue">Overdue Items</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="timeline">Timeline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{filteredEvents.length}</p>
                <p className="text-sm text-gray-600">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{upcomingEvents.length}</p>
                <p className="text-sm text-gray-600">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{overdueEvents.length}</p>
                <p className="text-sm text-gray-600">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{monthEvents.length}</p>
                <p className="text-sm text-gray-600">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar View */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">{viewMode === "month" ? renderMonthView() : renderTimelineView()}</div>

        {/* Selected Date Events */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a Date"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedDateEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  {selectedDate ? "No events on this date" : "Click on a date to see events"}
                </p>
              ) : (
                selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`flex items-center gap-3 p-3 border-l-4 bg-gray-50 rounded-r ${getPriorityBorderColor(event.priority)}`}
                  >
                    <div className="flex-shrink-0" style={{ color: getEventColor(event) }}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500 capitalize">{event.type.replace("-", " ")}</p>
                    </div>
                    {event.priority && (
                      <Badge
                        variant="outline"
                        className={
                          event.priority === "high"
                            ? "border-red-200 text-red-700"
                            : event.priority === "medium"
                              ? "border-yellow-200 text-yellow-700"
                              : "border-green-200 text-green-700"
                        }
                      >
                        {event.priority}
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
