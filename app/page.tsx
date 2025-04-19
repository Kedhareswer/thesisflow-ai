import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight, FileText, Users, Brain, BarChart3 } from "lucide-react"

export default function Home() {
  return (
    <div className="space-y-8 py-10">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Research Collaboration Platform</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Collaborate on research projects in real-time, summarize papers with AI, and track your progress with
          interactive dashboards.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button asChild size="lg">
            <Link href="/dashboard">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/about">Learn More</Link>
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-xl">Real-time Collaboration</h3>
              <p className="text-muted-foreground">
                Work together with your team in real-time. See changes as they happen and communicate instantly.
              </p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/collaborate">
                  Try Collaboration <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-xl">Paper Summarizer</h3>
              <p className="text-muted-foreground">
                Extract key insights from research papers automatically. Save time and focus on what matters.
              </p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/summarizer">
                  Summarize Papers <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-xl">Research Explorer</h3>
              <p className="text-muted-foreground">
                Discover new research directions and generate ideas with AI assistance.
              </p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/explorer">
                  Explore Research <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-xl">Interactive Dashboard</h3>
              <p className="text-muted-foreground">
                Track your research progress with real-time analytics and visualizations.
              </p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/dashboard">
                  View Dashboard <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to transform your research workflow?</h2>
        <Button asChild size="lg">
          <Link href="/dashboard">Get Started Today</Link>
        </Button>
      </div>
    </div>
  )
}
