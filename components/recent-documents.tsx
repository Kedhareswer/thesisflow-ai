"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Lightbulb, Brain, Clock, Eye } from "lucide-react"

export function RecentDocuments() {
  const [documents, setDocuments] = useState([
    {
      id: "1",
      title: "Literature Review: AI in Healthcare",
      type: "note",
      lastEdited: "2 hours ago",
      icon: <FileText className="h-4 w-4 text-blue-500" />,
    },
    {
      id: "2",
      title: "Research Methodology Draft",
      type: "note",
      lastEdited: "Yesterday",
      icon: <FileText className="h-4 w-4 text-blue-500" />,
    },
    {
      id: "3",
      title: "AI-Generated Research Questions",
      type: "idea",
      lastEdited: "2 days ago",
      icon: <Lightbulb className="h-4 w-4 text-yellow-500" />,
    },
    {
      id: "4",
      title: "Project Mind Map",
      type: "mindmap",
      lastEdited: "3 days ago",
      icon: <Brain className="h-4 w-4 text-purple-500" />,
    },
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Documents</CardTitle>
        <CardDescription>Your recently edited research documents</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {doc.icon}
                <div>
                  <p className="text-sm font-medium">{doc.title}</p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>Edited {doc.lastEdited}</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
