"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, FileText, ArrowRight, Plus } from "lucide-react"

export function ProjectsOverview() {
  const [projects, setProjects] = useState([
    {
      id: "1",
      title: "AI in Healthcare Research",
      description: "Investigating applications of machine learning in medical diagnostics",
      progress: 65,
      dueDate: "2023-12-15",
      members: [
        { id: "user-1", name: "You", avatar: "" },
        { id: "user-2", name: "Alex Johnson", avatar: "" },
        { id: "user-3", name: "Sam Taylor", avatar: "" },
      ],
      papers: 8,
      status: "in-progress",
    },
    {
      id: "2",
      title: "Sustainable Energy Solutions",
      description: "Comparative analysis of renewable energy technologies",
      progress: 30,
      dueDate: "2024-02-28",
      members: [
        { id: "user-1", name: "You", avatar: "" },
        { id: "user-2", name: "Alex Johnson", avatar: "" },
      ],
      papers: 5,
      status: "in-progress",
    },
    {
      id: "3",
      title: "Educational Technology Impact",
      description: "Measuring the effectiveness of AI tools in higher education",
      progress: 90,
      dueDate: "2023-11-30",
      members: [
        { id: "user-1", name: "You", avatar: "" },
        { id: "user-4", name: "Jordan Lee", avatar: "" },
      ],
      papers: 12,
      status: "review",
    },
  ])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Your Research Projects</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{project.title}</CardTitle>
                <Badge
                  variant={project.status === "review" ? "secondary" : "outline"}
                  className={project.status === "review" ? "bg-amber-100 text-amber-800" : ""}
                >
                  {project.status === "review" ? "Under Review" : "In Progress"}
                </Badge>
              </div>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>

                <div className="flex justify-between text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>
                      Due: {new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{project.papers} papers</span>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="text-sm mr-2">Team:</span>
                  <div className="flex -space-x-2">
                    {project.members.map((member) => (
                      <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                        <AvatarImage src={member.avatar || ""} />
                        <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" className="ml-auto">
                View Project <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
