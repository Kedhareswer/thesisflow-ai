"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Circle, Clock, Trash2, Plus } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "done"
  dueDate: string
  priority: "low" | "medium" | "high"
}

export default function ResearchPlanner() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Literature Review",
      description: "Read and summarize key papers",
      status: "todo",
      dueDate: "2024-03-15",
      priority: "high",
    },
    {
      id: "2",
      title: "Draft Introduction",
      description: "Write the introduction section of the research paper",
      status: "in-progress",
      dueDate: "2024-03-22",
      priority: "medium",
    },
  ])

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as const,
  })

  const addTask = () => {
    if (!newTask.title.trim()) return

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      status: "todo",
      dueDate: newTask.dueDate,
      priority: newTask.priority,
    }

    setTasks([...tasks, task])
    setNewTask({
      title: "",
      description: "",
      dueDate: "",
      priority: "medium",
    })
  }

  const updateTaskStatus = (id: string, status: Task["status"]) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, status } : task)))
  }

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id))
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return <Circle className="h-4 w-4 text-gray-400" />
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "done":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taskTitle">Task Title</Label>
            <Input
              id="taskTitle"
              placeholder="Enter task title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taskDescription">Task Description</Label>
            <Textarea
              id="taskDescription"
              placeholder="Enter task description"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taskDueDate">Due Date</Label>
              <Input
                id="taskDueDate"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              />
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
        </CardContent>
        <Button onClick={addTask}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between border rounded-md p-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateTaskStatus(
                      task.id,
                      task.status === "todo" ? "in-progress" : task.status === "in-progress" ? "done" : "todo",
                    )
                  }
                >
                  {getStatusIcon(task.status)}
                </button>
                <div>
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
