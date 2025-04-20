"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { ActivityFeed } from "@/components/activity-feed"
import { UsageMetrics } from "@/components/usage-metrics"
import { ProjectsOverview } from "@/components/projects-overview"
import { RecentDocuments } from "@/components/recent-documents"
import { FileText, Users, Lightbulb, Calendar, BookOpen } from "lucide-react"
import { useSocket } from "@/components/socket-provider"
import { useToast } from "@/hooks/use-toast"

export default function Dashboard() {
  const router = useRouter()
  const { events } = useSocket()
  const { toast } = useToast()
  const [currentUser] = useState({
    id: `anonymous-${Math.random().toString(36).substr(2, 9)}`,
    name: `Guest ${Math.floor(Math.random() * 1000)}`,
    avatar: null
  })
  
  const [stats, setStats] = useState([
    {
      title: "Papers Summarized",
      value: "12",
      description: "Research papers processed",
      icon: <FileText className="h-5 w-5 text-blue-500" />,
    },
    {
      title: "Collaborators",
      value: "5",
      description: "Active research partners",
      icon: <Users className="h-5 w-5 text-green-500" />,
    },
    {
      title: "Research Ideas",
      value: "24",
      description: "Generated and saved",
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
    },
    {
      title: "Upcoming Deadlines",
      value: "3",
      description: "Tasks due this week",
      icon: <Calendar className="h-5 w-5 text-red-500" />,
    },
  ])

  const [recentActivity, setRecentActivity] = useState([
    {
      icon: <FileText className="h-5 w-5 text-blue-500" />,
      title: "Summarized 'Machine Learning Applications in Healthcare'",
      time: "2 hours ago",
    },
    {
      icon: <Users className="h-5 w-5 text-green-500" />,
      title: "Sarah joined your research group",
      time: "Yesterday",
    },
    {
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
      title: "Generated 8 research ideas on 'Sustainable Energy'",
      time: "2 days ago",
    },
    {
      icon: <BookOpen className="h-5 w-5 text-purple-500" />,
      title: "Added 3 papers to your reading list",
      time: "3 days ago",
    },
  ])

  // Update dashboard in real-time based on socket events
  useEffect(() => {
    if (!events.length) return

    const latestEvent = events[events.length - 1]

    // Update stats based on event type
    if (latestEvent.type === "paper_summarized") {
      setStats((prev) =>
        prev.map((stat) =>
          stat.title === "Papers Summarized" ? { ...stat, value: String(Number.parseInt(stat.value) + 1) } : stat,
        ),
      )

      // Add to recent activity
      const newActivity = {
        icon: <FileText className="h-5 w-5 text-blue-500" />,
        title: `Summarized '${latestEvent.payload?.title || "Untitled Paper"}'`,
        time: "Just now",
      }

      setRecentActivity((prev) => [newActivity, ...prev.slice(0, 3)])

      toast({
        title: "Dashboard Updated",
        description: "Your paper summary has been added to your stats.",
      })
    }

    if (latestEvent.type === "idea_generated") {
      const ideaCount = typeof latestEvent.payload?.count === 'number' ? latestEvent.payload.count : 1;
      
      setStats((prev) =>
        prev.map((stat) =>
          stat.title === "Research Ideas"
            ? { ...stat, value: String(Number.parseInt(stat.value) + ideaCount) }
            : stat,
        ),
      )

      const newActivity = {
        icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
        title: `Generated ${ideaCount} research ideas on '${latestEvent.payload?.topic || "Research Topic"}'`,
        time: "Just now",
      }

      setRecentActivity((prev) => [newActivity, ...prev.slice(0, 3)])
    }

    if (latestEvent.type === "collaborator_joined") {
      setStats((prev) =>
        prev.map((stat) =>
          stat.title === "Collaborators" ? { ...stat, value: String(Number.parseInt(stat.value) + 1) } : stat,
        ),
      )

      const newActivity = {
        icon: <Users className="h-5 w-5 text-green-500" />,
        title: `${latestEvent.payload?.name || "Someone"} joined your research group`,
        time: "Just now",
      }

      setRecentActivity((prev) => [newActivity, ...prev.slice(0, 3)])
    }
  }, [events, toast])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Welcome to your Research Dashboard</h2>
      <p className="text-muted-foreground">
        Track your research progress, collaborate with team members, and access your tools.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="metrics">Usage Metrics</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest research actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-4">
                      {activity.icon}
                      <div>
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <RecentDocuments />
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeed />
        </TabsContent>

        <TabsContent value="metrics">
          <UsageMetrics />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectsOverview />
        </TabsContent>
      </Tabs>
    </div>
  )
}
