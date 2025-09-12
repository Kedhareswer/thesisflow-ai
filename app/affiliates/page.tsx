import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AffiliatesPage() {
  return (
    <div className="bg-background">
      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-mono text-foreground">Affiliates</h1>
          <p className="text-muted-foreground font-mono mt-3 text-lg">Share ThesisFlow-AI and earn rewards.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Program details</CardTitle>
            <CardDescription className="font-mono">High-conversion tools for researchers and students.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground font-mono">We will publish terms and payouts soon. Check back for updates.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
