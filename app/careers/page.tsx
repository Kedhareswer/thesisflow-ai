import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CareersPage() {
  const roles = [
    { title: "Full-stack Engineer", desc: "Next.js, TypeScript, Supabase, and AI APIs." },
    { title: "Developer Advocate", desc: "Write guides, demos, and help our community succeed." },
  ];
  return (
    <div className="bg-background">
      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-mono text-foreground">Careers</h1>
          <p className="text-muted-foreground font-mono mt-3 text-lg">Join us in building the research stack of the future.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {roles.map((r) => (
            <Card key={r.title}>
              <CardHeader>
                <CardTitle className="font-mono">{r.title}</CardTitle>
                <CardDescription className="font-mono">{r.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-mono">No open roles yet. You can still send your profile to careers@thesisflow-ai.com.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
