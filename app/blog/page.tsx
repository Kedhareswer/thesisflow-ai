import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function BlogPage() {
  const posts = [
    {
      title: "How to run a lightning-fast literature review",
      desc: "Workflows to cut review time by 60% using ThesisFlow-AI.",
      img: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1200&auto=format&fit=crop",
    },
    {
      title: "Prompt patterns for better summaries",
      desc: "Increase factuality and structure with these prompts.",
      img: "https://images.unsplash.com/photo-1529338296731-c4280a44fc48?q=80&w=1200&auto=format&fit=crop",
    },
    {
      title: "Planning research like a product manager",
      desc: "Use milestones and analytics to keep projects on track.",
      img: "https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=1200&auto=format&fit=crop",
    },
  ];
  return (
    <div className="bg-background">
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-mono text-foreground">Blog</h1>
          <p className="text-muted-foreground font-mono mt-3 text-lg">Tactics, product updates, and research best practices.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {posts.map((p) => (
            <Card key={p.title} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative h-40">
                {/* Using next/image for optimization */}
                <Image src={p.img} alt={p.title} fill className="object-cover" />
              </div>
              <CardHeader>
                <CardTitle className="font-mono">{p.title}</CardTitle>
                <CardDescription className="font-mono">{p.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="#" className="text-[#FF6B2C] font-mono">Read more →</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
