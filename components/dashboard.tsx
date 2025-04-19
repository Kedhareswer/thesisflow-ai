import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, Lightbulb, Calendar, BookOpen, Brain } from "lucide-react"
import Link from "next/link"

export default function Dashboard() {
  const stats = [
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
  ]

  const recentActivity = [
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
  ]

  const quickActions = [
    {
      title: "Summarize a Paper",
      description: "Extract key insights from research papers",
      icon: <FileText className="h-5 w-5" />,
      href: "#summarizer",
    },
    {
      title: "Generate Research Ideas",
      description: "Get AI-powered research topic suggestions",
      icon: <Brain className="h-5 w-5" />,
      href: "#explorer",
    },
    {
      title: "Organize Your Thoughts",
      description: "Create mind maps and sticky notes",
      icon: <Lightbulb className="h-5 w-5" />,
      href: "#ideas",
    },
    {
      title: "Plan Your Research",
      description: "Schedule tasks and set deadlines",
      icon: <Calendar className="h-5 w-5" />,
      href: "#planner",
    },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Welcome to your AI Research Assistant</h2>
      <p className="text-muted-foreground">
        Streamline your research process with AI-powered tools for summarization, idea generation, collaboration, and
        planning.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
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

      <div className="grid gap-6 md:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common research tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {quickActions.map((action, index) => (
                <Link href={action.href} key={index} className="block">
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="p-2 bg-primary/10 rounded-full mb-2">{action.icon}</div>
                      <h3 className="font-medium text-sm">{action.title}</h3>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
