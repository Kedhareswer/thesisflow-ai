import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PartnersPage() {
  return (
    <div className="bg-background">
      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-mono text-foreground">Partners</h1>
          <p className="text-muted-foreground font-mono mt-3 text-lg">Integrations and collaboration network.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Become a partner</CardTitle>
            <CardDescription className="font-mono">We work with labs, publishers, and developer tools.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground font-mono">Contact us for partnership opportunities and technical integration details.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
