import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Rocket, PlugZap, FileText } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="bg-background">
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-mono text-foreground">ThesisFlow-AI Docs</h1>
          <p className="text-muted-foreground font-mono mt-3 text-lg">
            Quickstarts, API references, and integration guides.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-[#FF6B2C]" />
                <CardTitle className="font-mono">Quickstart</CardTitle>
              </div>
              <CardDescription className="font-mono">Get up and running in minutes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/docs/guides" className="text-[#FF6B2C] font-mono">Read the guides →</Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#FF6B2C]" />
                <CardTitle className="font-mono">Core Concepts</CardTitle>
              </div>
              <CardDescription className="font-mono">Explorer, Summarizer, Planner, and Collaboration Hub.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-mono">Understand how the pieces fit together to streamline your research.</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <PlugZap className="h-5 w-5 text-[#FF6B2C]" />
                <CardTitle className="font-mono">Integrations</CardTitle>
              </div>
              <CardDescription className="font-mono">Google, OpenAI, Gemini, Anthropic, and more.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-mono">Configure providers for best results and fallbacks.</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#FF6B2C]" />
                <CardTitle className="font-mono">API Reference</CardTitle>
              </div>
              <CardDescription className="font-mono">Coming soon. Use in-app features meanwhile.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-mono">We will publish REST/websocket endpoints and events as they stabilize.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
