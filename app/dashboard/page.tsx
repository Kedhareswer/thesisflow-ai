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
import { formatRelativeTime } from "@/lib/utils/date"

export default function Dashboard() {
  const router = useRouter()
  const { events } = useSocket()
  const { toast } = useToast()
  const [currentUser] = useState({
    id: `anonymous-${Math.random().toString(36).substr(2, 9)}`,
    name: `Guest ${Math.floor(Math.random() * 1000)}`,
    avatar: null
  })

  // Import activity tracker
  const { activityTracker } = require('@/lib/services/activity-tracker');
  
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

    // Track activity using ActivityTracker service
    if (latestEvent.type === "paper_summarized") {
      activityTracker.trackActivity(
        "paper_summarized",
        `Summarized '${latestEvent.payload?.title || "Untitled Paper"}'`,
        latestEvent.payload
      );
    }

    if (latestEvent.type === "idea_generated") {
      activityTracker.trackActivity(
        "idea_generated",
        `Generated research ideas on '${latestEvent.payload?.topic || "Research Topic"}'`,
        {
          count: typeof latestEvent.payload?.count === 'number' ? latestEvent.payload.count : 1,
          topic: latestEvent.payload?.topic
        }
      );
    }

    if (latestEvent.type === "collaborator_joined") {
      activityTracker.trackActivity(
        "collaborator_joined",
        `${latestEvent.payload?.name || "Someone"} joined your research group`,
        latestEvent.payload
      );
    }

    // Update UI with latest stats
    const currentStats = activityTracker.getStats();
    setStats(prev => prev.map(stat => {
      switch(stat.title) {
        case "Papers Summarized":
          return { ...stat, value: currentStats.papersSummarized.toString() };
        case "Collaborators":
          return { ...stat, value: currentStats.collaborators.toString() };
        case "Research Ideas":
          return { ...stat, value: currentStats.researchIdeas.toString() };
        case "Upcoming Deadlines":
          return { ...stat, value: currentStats.upcomingDeadlines.toString() };
        default:
          return stat;
      }
    }));

    // Update recent activity
    const activities = activityTracker.getRecentActivities();
    setRecentActivity(activities.map((activity: Activity) => ({
      icon: getActivityIcon(activity.type),
      title: activity.title,
      time: formatRelativeTime(new Date(activity.timestamp))
    })));

  }, [events]);

  interface Activity {
    type: string;
    title: string;
    timestamp: Date;
  }

  // Helper function to get activity icon
  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'paper_summarized':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'collaborator_joined':
        return <Users className="h-5 w-5 text-green-500" />;
      case 'idea_generated':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      default:
        return <BookOpen className="h-5 w-5 text-purple-500" />;
    }
  };

  interface UserData {
    stats: Array<{ title: string; value: string; description: string; icon: JSX.Element }>;
    recentActivity: Array<{ icon: JSX.Element; title: string; time: string }>;
  }
  
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    // Fetch user-specific data from the backend
    async function fetchUserData() {
      try {
        const response = await fetch('/api/user-data');
        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    }

    fetchUserData();
  }, []);

  // Update stats and recent activity based on userData
  useEffect(() => {
    if (userData) {
      setStats(userData.stats);
      setRecentActivity(userData.recentActivity);
    }
  }, [userData]);

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
