"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, TrendingUp, TrendingDown, Activity } from "lucide-react"

interface TaskStatusDistributionProps {
  data: {
    completed: { count: number; percentage: number }
    inProgress: { count: number; percentage: number }
    todo: { count: number; percentage: number }
  }
}

export function TaskStatusDistribution({ data }: TaskStatusDistributionProps) {
  const total = data.completed.count + data.inProgress.count + data.todo.count

  return (
    <div className="space-y-4">
      {[
        { status: "completed", data: data.completed, color: "bg-green-500" },
        { status: "in-progress", data: data.inProgress, color: "bg-yellow-500" },
        { status: "todo", data: data.todo, color: "bg-gray-500" }
      ].map((item) => (
        <div key={item.status} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="capitalize font-medium">{item.status.replace('-', ' ')}</span>
            <span className="text-gray-600">{item.data.count} tasks ({item.data.percentage}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${item.color} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${item.data.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

interface ProjectProgressProps {
  data: Array<{
    id: string
    title: string
    progress: number
    status: string
  }>
}

export function ProjectProgress({ data }: ProjectProgressProps) {
  return (
    <div className="space-y-4">
      {data.map((project) => (
        <div key={project.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium truncate">{project.title}</span>
            <Badge variant="outline" className="text-xs">
              {project.status}
            </Badge>
          </div>
          <Progress value={project.progress} className="h-2" />
          <div className="text-xs text-gray-500">{project.progress}% complete</div>
        </div>
      ))}
    </div>
  )
}

interface TaskPriorityAnalysisProps {
  data: {
    high: number
    medium: number
    low: number
  }
}

export function TaskPriorityAnalysis({ data }: TaskPriorityAnalysisProps) {
  const total = data.high + data.medium + data.low

  return (
    <div className="space-y-4">
      {[
        { priority: "high", count: data.high, color: "bg-red-500" },
        { priority: "medium", count: data.medium, color: "bg-yellow-500" },
        { priority: "low", count: data.low, color: "bg-green-500" }
      ].map((item) => (
        <div key={item.priority} className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${item.color}`} />
          <span className="text-sm capitalize">{item.priority}</span>
          <span className="text-sm text-gray-600 ml-auto">{item.count} tasks</span>
        </div>
      ))}
    </div>
  )
}

interface RecentActivityProps {
  data: Array<{
    id: string
    type: 'task_created' | 'task_completed' | 'project_created' | 'comment_added'
    title: string
    description: string
    timestamp: string
    user?: string
  }>
}

export function RecentActivity({ data }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_created':
        return <Activity className="h-4 w-4 text-blue-500" />
      case 'task_completed':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'project_created':
        return <BarChart3 className="h-4 w-4 text-purple-500" />
      case 'comment_added':
        return <Activity className="h-4 w-4 text-orange-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-3">
      {data.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
          <div className="mt-1">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{activity.title}</span>
              <span className="text-xs text-gray-500">{formatTimestamp(activity.timestamp)}</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

interface PerformanceInsightsProps {
  data: {
    completionRate: number
    averageTaskDuration: number
    productivityScore: number
  }
}

export function PerformanceInsights({ data }: PerformanceInsightsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (score >= 60) return <Activity className="h-4 w-4 text-yellow-500" />
    return <TrendingDown className="h-4 w-4 text-red-500" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Completion Rate</span>
        <span className={`text-sm font-bold ${getScoreColor(data.completionRate)}`}>
          {data.completionRate}%
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Avg Task Duration</span>
        <span className="text-sm text-gray-600">{data.averageTaskDuration} days</span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Productivity Score</span>
        <div className="flex items-center gap-2">
          {getScoreIcon(data.productivityScore)}
          <span className={`text-sm font-bold ${getScoreColor(data.productivityScore)}`}>
            {data.productivityScore}/100
          </span>
        </div>
      </div>
    </div>
  )
}

interface AdvancedAnalyticsProps {
  data: {
    timeBased: {
      tasksCreatedThisWeek: number
      tasksCompletedThisWeek: number
      averageProjectDuration: number
    }
    efficiency: {
      taskCompletionRate: number
      onTimeDelivery: number
      teamProductivity: number
    }
  }
}

export function AdvancedAnalytics({ data }: AdvancedAnalyticsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h4 className="font-semibold mb-3">Time-based Analytics</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm">Tasks Created This Week</span>
            <span className="text-sm font-medium">{data.timeBased.tasksCreatedThisWeek}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Tasks Completed This Week</span>
            <span className="text-sm font-medium">{data.timeBased.tasksCompletedThisWeek}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Average Project Duration</span>
            <span className="text-sm font-medium">{data.timeBased.averageProjectDuration} days</span>
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold mb-3">Efficiency Metrics</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm">Task Completion Rate</span>
            <span className="text-sm font-medium">{data.efficiency.taskCompletionRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">On-time Delivery</span>
            <span className="text-sm font-medium">{data.efficiency.onTimeDelivery}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Team Productivity</span>
            <span className="text-sm font-medium">{data.efficiency.teamProductivity}/100</span>
          </div>
        </div>
      </div>
    </div>
  )
} 