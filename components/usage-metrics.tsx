"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSocket } from "@/components/socket-provider"
import { useUser } from "@/components/user-provider"
import { FileText, Brain, Lightbulb, Users, Clock } from "lucide-react"

// Import recharts components
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export function UsageMetrics() {
  const { events } = useSocket()
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState("overview")

  // Usage data
  const [usageData, setUsageData] = useState({
    papersSummarized: 12,
    ideasGenerated: 24,
    collaborationSessions: 8,
    aiPrompts: 47,
    totalTimeSpent: 18.5, // hours
  })

  // Usage over time (last 7 days)
  const [timeData, setTimeData] = useState([
    { name: "Mon", papers: 2, ideas: 5, prompts: 8 },
    { name: "Tue", papers: 1, ideas: 3, prompts: 6 },
    { name: "Wed", papers: 3, ideas: 0, prompts: 5 },
    { name: "Thu", papers: 0, ideas: 7, prompts: 9 },
    { name: "Fri", papers: 2, ideas: 4, prompts: 7 },
    { name: "Sat", papers: 1, ideas: 2, prompts: 4 },
    { name: "Sun", papers: 3, ideas: 3, prompts: 8 },
  ])

  // Feature distribution
  const [featureData, setFeatureData] = useState([
    { name: "Paper Summarizer", value: 35 },
    { name: "Research Explorer", value: 25 },
    { name: "Collaboration", value: 20 },
    { name: "Mind Maps", value: 15 },
    { name: "Other", value: 5 },
  ])

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  // Update metrics based on socket events
  useEffect(() => {
    if (!events.length) return

    const latestEvent = events[events.length - 1]

    // Update usage metrics based on event type
    switch (latestEvent.type) {
      case "paper_summarized":
        setUsageData((prev) => ({
          ...prev,
          papersSummarized: prev.papersSummarized + 1,
          aiPrompts: prev.aiPrompts + 1,
        }))

        // Update time data for today
        setTimeData((prev) => {
          const today = new Date().toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3)
          return prev.map((day) =>
            day.name === today ? { ...day, papers: day.papers + 1, prompts: day.prompts + 1 } : day,
          )
        })
        break

      case "idea_generated":
        setUsageData((prev) => ({
          ...prev,
          ideasGenerated: prev.ideasGenerated + (latestEvent.payload.count || 1),
          aiPrompts: prev.aiPrompts + 1,
        }))

        // Update time data for today
        setTimeData((prev) => {
          const today = new Date().toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3)
          return prev.map((day) =>
            day.name === today
              ? { ...day, ideas: day.ideas + (latestEvent.payload.count || 1), prompts: day.prompts + 1 }
              : day,
          )
        })
        break

      case "collaboration_session":
        setUsageData((prev) => ({
          ...prev,
          collaborationSessions: prev.collaborationSessions + 1,
          totalTimeSpent: prev.totalTimeSpent + (latestEvent.payload.duration || 0.5),
        }))
        break

      case "ai_prompt":
        setUsageData((prev) => ({
          ...prev,
          aiPrompts: prev.aiPrompts + 1,
        }))

        // Update time data for today
        setTimeData((prev) => {
          const today = new Date().toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3)
          return prev.map((day) => (day.name === today ? { ...day, prompts: day.prompts + 1 } : day))
        })
        break

      default:
        break
    }
  }, [events])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Metrics</CardTitle>
        <CardDescription>Track your research activity and tool usage</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="time">Usage Over Time</TabsTrigger>
            <TabsTrigger value="features">Feature Usage</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-blue-500" />
                    Papers Summarized
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usageData.papersSummarized}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />
                    Ideas Generated
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usageData.ideasGenerated}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2 text-green-500" />
                    Collaboration Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usageData.collaborationSessions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Brain className="h-4 w-4 mr-2 text-purple-500" />
                    AI Prompts Used
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usageData.aiPrompts}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-red-500" />
                    Total Time Spent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usageData.totalTimeSpent} hours</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="time">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={timeData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="papers" stroke="#0088FE" activeDot={{ r: 8 }} name="Papers" />
                  <Line type="monotone" dataKey="ideas" stroke="#00C49F" name="Ideas" />
                  <Line type="monotone" dataKey="prompts" stroke="#FFBB28" name="AI Prompts" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="features">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={featureData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {featureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, "Usage"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
