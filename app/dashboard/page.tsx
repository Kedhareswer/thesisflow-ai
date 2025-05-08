"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { ActivityFeed } from "@/components/activity-feed"
import { UsageMetrics } from "@/components/usage-metrics"
import { ProjectsOverview } from "@/components/projects-overview"
import { RecentDocuments } from "@/components/recent-documents"
import { FileText, Users, Lightbulb, Calendar, BookOpen, MessageSquare } from "lucide-react"
import { useSocket } from "@/components/socket-provider"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime } from "@/lib/utils/date"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { supabase } from "@/src/integrations/supabase/client"

export default function Dashboard() {
  const router = useRouter()
  const { events } = useSocket()
  const { toast } = useToast()
  const { user } = useSupabaseAuth()
  const [currentUser] = useState({
    id: user?.id || `anonymous-${Math.random().toString(36).substr(2, 9)}`,
    name: user?.user_metadata?.name || `Guest ${Math.floor(Math.random() * 1000)}`,
    avatar: user?.user_metadata?.avatar_url || null
  })

  const { activityTracker } = require('@/lib/services/activity-tracker');

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to real-time activity updates
    const subscription = supabase
      .channel('activity_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'user_activities',
        filter: `user_id=eq.${user.id}`
      }, () => {
        activityTracker.refreshActivities()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  
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

  interface ActivityFeedItem {
    icon: JSX.Element;
    title: string;
    time: string;
  }
  const [recentActivity, setRecentActivity] = useState<ActivityFeedItem[]>([]) // Start with empty, will be filled by tracker

  // Listen for all activity types (including chat, writing, etc.)
  // Extend this as new activity types are added in feature modules
  // Example: activityTracker.trackActivity('chat_message', 'Sent a message...', payload)


  // Update dashboard in real-time based on socket events and activityTracker
  useEffect(() => {
    if (!events.length) return

    const latestEvent = events[events.length - 1]

    // Track activity using ActivityTracker service for all known types
    switch (latestEvent.type) {
      case "paper_summarized":
        activityTracker.trackActivity(
          "paper_summarized",
          `Summarized '${latestEvent.payload?.title || "Untitled Paper"}'`,
          latestEvent.payload
        );
        break;
      case "idea_generated":
        activityTracker.trackActivity(
          "idea_generated",
          `Generated research ideas on '${latestEvent.payload?.topic || "Research Topic"}'`,
          {
            count: typeof latestEvent.payload?.count === 'number' ? latestEvent.payload.count : 1,
            topic: latestEvent.payload?.topic
          }
        );
        break;
      case "collaborator_joined":
        activityTracker.trackActivity(
          "collaborator_joined",
          `${latestEvent.payload?.name || "Someone"} joined your research group`,
          latestEvent.payload
        );
        break;
      case "chat_message":
        activityTracker.trackActivity(
          "chat_message",
          `Sent a chat message: '${typeof latestEvent.payload?.content === 'string' ? latestEvent.payload.content.slice(0, 40) : "..."}'`,
          latestEvent.payload
        );
        break;
      case "writing_session":
        activityTracker.trackActivity(
          "writing_session",
          `Worked on writing: '${latestEvent.payload?.title || "Untitled"}'`,
          latestEvent.payload
        );
        break;
      // Add more cases as new activity types are added
      default:
        break;
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
      case 'chat_message':
        return <MessageSquare className="h-5 w-5 text-pink-500" />;
      case 'writing_session':
        return <BookOpen className="h-5 w-5 text-orange-500" />;
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
      <div className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-700 p-3 rounded mb-4">
        <strong>Note:</strong> For persistent, multi-user real-time updates, connect this dashboard to <span className="font-bold">Supabase</span> (see code comments for integration).
      </div>

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

      <Tabs defaultValue="home" className="space-y-4">
        <TabsList>
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
        </TabsList>

        {/* HOME TAB: Actionable summary */}
        <TabsContent value="home" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Continue Where You Left Off</CardTitle>
                <CardDescription>Pick up your last session or important items</CardDescription>
              </CardHeader>
              <CardContent>
                {activityTracker.getLastSession() ? (
                  <div>
                    <div className="mb-2">Last session: <strong>{activityTracker.getLastSession().title}</strong></div>
                    <button className="btn btn-primary" onClick={() => router.push(activityTracker.getLastSession().link)}>Resume</button>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No recent session found.</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Today's Highlights</CardTitle>
                <CardDescription>Deadlines, meetings, unread messages</CardDescription>
              </CardHeader>
              <CardContent>
                {activityTracker.getHighlights().length > 0 ? (
                  <ul className="list-disc pl-5">
                    {activityTracker.getHighlights().map((h: string, i: number) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground">No urgent tasks for today. You're all caught up!</div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Jump into your workflow</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={() => router.push('/summarizer')}>Summarize Paper</button>
                  <button className="btn btn-secondary" onClick={() => router.push('/writing-assistant')}>Start Writing</button>
                  <button className="btn btn-outline" onClick={() => router.push('/collaborate')}>Invite Collaborator</button>
                </div>
              </CardContent>
            </Card>
            <RecentDocuments />
          </div>
        </TabsContent>

        {/* ACTIVITY TAB: Unified, filterable feed */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Feed</CardTitle>
              <CardDescription>All actions (filter coming soon)</CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: Add filter (All/My/Team), jump-to links */}
              <ActivityFeed />
            </CardContent>
          </Card>
        </TabsContent>

        {/* INSIGHTS TAB: Progress, goals, suggestions */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Insights & Progress</CardTitle>
              <CardDescription>Visualize your research journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="font-bold">Writing Streak</div>
                  <div className="text-2xl">{activityTracker.getWritingStreak()} days</div>
                </div>
                <div>
                  <div className="font-bold">Papers Summarized (This Month)</div>
                  <div className="text-2xl">{activityTracker.getPapersSummarizedThisMonth()}</div>
                </div>
                <div>
                  <div className="font-bold">Collaboration Sessions</div>
                  <div className="text-2xl">{activityTracker.getCollaborationSessions()}</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <span className="font-semibold">AI Suggestion:</span> {activityTracker.getAISuggestion()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROJECTS TAB: Quick actions, health */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Projects Overview</CardTitle>
              <CardDescription>Manage your research projects</CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: List projects with quick actions, show project health */}
              <ProjectsOverview />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TASKS TAB: Upcoming tasks */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Tasks & Deadlines</CardTitle>
              <CardDescription>Stay on top of your work</CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: List tasks, mark as done, snooze */}
              <div className="text-muted-foreground">No tasks for today. Add new tasks from any project or session!</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COLLABORATION TAB: Online users, invites, suggestions */}
        <TabsContent value="collaboration">
          <Card>
            <CardHeader>
              <CardTitle>Collaboration</CardTitle>
              <CardDescription>Connect and work with others</CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: Show online users, pending invites, suggestions */}
              <div className="text-muted-foreground">No collaborators online. Invite someone to get started!</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
