import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Users, FileText, Settings } from "lucide-react"

export default function CollaborationPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Team Collaboration</h1>
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Team Chat
            </CardTitle>
            <CardDescription>
              Collaborate with your team and get AI assistance for your research project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Join team discussions, share ideas, and get instant AI help with your research questions.
            </p>
            <Button asChild>
              <Link href="/collaborate">
                Open Team Chat
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription>
              Create and manage your research teams and projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Create teams, invite collaborators, and organize your research projects together.
            </p>
            <Button variant="outline" asChild>
              <Link href="/collaborate">
                Manage Teams
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Shared Documents
            </CardTitle>
            <CardDescription>
              Work together on research documents and papers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Collaborate on documents in real-time with version control and comments.
            </p>
            <Button variant="outline" asChild>
              <Link href="/collaborate">
                View Documents
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Collaboration Settings
            </CardTitle>
            <CardDescription>
              Configure your collaboration preferences and notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Customize how you receive notifications and interact with your team.
            </p>
            <Button variant="outline" asChild>
              <Link href="/settings">
                Open Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
