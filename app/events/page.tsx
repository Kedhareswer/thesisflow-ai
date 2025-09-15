import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function EventsPage() {
  const events = [
    { title: "ThesisFlow-AI Deep Research Clinic", date: "Next month", desc: "Live walkthrough and Q&A." },
    { title: "Writing with AI: from outline to submission", date: "In 6 weeks", desc: "Hands-on session with tips and pitfalls." },
  ];
  return (
    <div className="bg-background">
      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-mono text-foreground">Events</h1>
          <p className="text-muted-foreground font-mono mt-3 text-lg">Webinars and community sessions.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {events.map((e) => (
            <Card key={e.title}>
              <CardHeader>
                <CardTitle className="font-mono">{e.title}</CardTitle>
                <CardDescription className="font-mono">{e.date}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-mono">{e.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
