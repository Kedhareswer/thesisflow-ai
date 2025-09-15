import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ListChecks, FileSearch, FileText, Users } from "lucide-react";

export default function GuidesPage() {
  const guides = [
    { icon: FileSearch, title: "Deep Research", desc: "Search multiple sources and aggregate results.", href: "/explorer" },
    { icon: FileText, title: "Smart Summarizer", desc: "Summarize PDFs and web pages.", href: "/summarizer" },
    { icon: ListChecks, title: "Project Planner", desc: "Organize tasks, due dates, and analytics.", href: "/planner" },
    { icon: Users, title: "Collaboration", desc: "Chat, share, and co-author with your team.", href: "/collaborate" },
  ];
  return (
    <div className="bg-background">
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-mono text-foreground">Guides</h1>
          <p className="text-muted-foreground font-mono mt-3 text-lg">Hands-on walkthroughs for core features.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {guides.map((g) => {
            const Icon = g.icon;
            return (
              <Card key={g.title} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-[#FF6B2C]" />
                    <CardTitle className="font-mono">{g.title}</CardTitle>
                  </div>
                  <CardDescription className="font-mono">{g.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={g.href} className="text-[#FF6B2C] font-mono">Open →</Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
