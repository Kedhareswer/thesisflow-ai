"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSocket } from "@/components/socket-provider"
import { FileText, Users, Lightbulb, BookOpen, MessageSquare, Edit, Share2 } from "lucide-react"
import type { JSX } from "react"

type Activity = {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  action: string
  target: string
  timestamp: string
  icon: JSX.Element
}

export function ActivityFeed() {
  const { events, activeUsers = [] } = useSocket()
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: "1",
      userId: "user-2",
      userName: "Alex Johnson",
      userAvatar: "",
      action: "summarized",
      target: "Machine Learning Applications in Healthcare",
      timestamp: "2 hours ago",
      icon: <FileText className="h-5 w-5 text-blue-500" />,
    },
    {
      id: "2",
      userId: "user-3",
      userName: "Sam Taylor",
      userAvatar: "",
      action: "joined",
      target: "your research group",
      timestamp: "Yesterday",
      icon: <Users className="h-5 w-5 text-green-500" />,
    },
    {
      id: "3",
      userId: "user-2",
      userName: "Alex Johnson",
      userAvatar: "",
      action: "generated",
      target: "8 research ideas on Sustainable Energy",
      timestamp: "2 days ago",
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
    },
    {
      id: "4",
      userId: "user-1",
      userName: "You",
      userAvatar: "",
      action: "added",
      target: "3 papers to your reading list",
      timestamp: "3 days ago",
      icon: <BookOpen className="h-5 w-5 text-purple-500" />,
    },
    {
      id: "5",
      userId: "user-3",
      userName: "Sam Taylor",
      userAvatar: "",
      action: "commented on",
      target: "your research proposal",
      timestamp: "4 days ago",
      icon: <MessageSquare className="h-5 w-5 text-indigo-500" />,
    },
  ])

  // Update activity feed based on socket events
  useEffect(() => {
    if (!events.length) return

    const latestEvent = events[events.length - 1]

    // Find the user or use a default if not found
    const eventUser = activeUsers.find((u) => u.id === latestEvent.userId) || {
      id: latestEvent.userId || "unknown",
      name: "Unknown User",
    }

    let newActivity: Activity

    // Create a new activity based on the event type
    switch (latestEvent.type) {
      case "paper_summarized":
        newActivity = {
          id: Date.now().toString(),
          userId: eventUser.id,
          userName: eventUser.id === "user-1" ? "You" : eventUser.name,
          userAvatar: eventUser.avatar,
          action: "summarized",
          target: latestEvent.payload.title || "a research paper",
          timestamp: "Just now",
          icon: <FileText className="h-5 w-5 text-blue-500" />,
        }
        break
      case "idea_generated":
        newActivity = {
          id: Date.now().toString(),
          userId: eventUser.id,
          userName: eventUser.id === "user-1" ? "You" : eventUser.name,
          userAvatar: eventUser.avatar,
          action: "generated",
          target: `${latestEvent.payload.count || 1} research ideas on ${latestEvent.payload.topic || "a topic"}`,
          timestamp: "Just now",
          icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
        }
        break
      case "collaborator_joined":
        newActivity = {
          id: Date.now().toString(),
          userId: eventUser.id,
          userName: latestEvent.payload.name || eventUser.name,
          userAvatar: latestEvent.payload.avatar || eventUser.avatar,
          action: "joined",
          target: "your research group",
          timestamp: "Just now",
          icon: <Users className="h-5 w-5 text-green-500" />,
        }
        break
      case "document_edited":
        newActivity = {
          id: Date.now().toString(),
          userId: eventUser.id,
          userName: eventUser.id === "user-1" ? "You" : eventUser.name,
          userAvatar: eventUser.avatar,
          action: "edited",
          target: latestEvent.payload.title || "a document",
          timestamp: "Just now",
          icon: <Edit className="h-5 w-5 text-orange-500" />,
        }
        break
      case "document_shared":
        newActivity = {
          id: Date.now().toString(),
          userId: eventUser.id,
          userName: eventUser.id === "user-1" ? "You" : eventUser.name,
          userAvatar: eventUser.avatar,
          action: "shared",
          target: `${latestEvent.payload.title || "a document"} with ${latestEvent.payload.recipient || "someone"}`,
          timestamp: "Just now",
          icon: <Share2 className="h-5 w-5 text-teal-500" />,
        }
        break
      default:
        return
    }

    setActivities((prev) => [newActivity, ...prev.slice(0, 19)])
  }, [events, activeUsers])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Feed</CardTitle>
        <CardDescription>Real-time updates from you and your collaborators</CardDescription>
      </CardHeader>
      <CardContent className="max-h-[600px] overflow-auto">
        <div className="space-y-6">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <Avatar className="h-9 w-9">
                <AvatarImage src={activity.userAvatar || ""} />
                <AvatarFallback>{activity.userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{activity.userName}</span>
                  <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                </div>
                <p className="text-sm flex items-center gap-2">
                  {activity.icon}
                  <span>
                    <span className="text-muted-foreground">{activity.action}</span> {activity.target}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
