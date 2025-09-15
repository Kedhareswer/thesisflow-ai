import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, MessageSquare, Share2 } from "lucide-react";

export default function CommunityPage() {
  return (
    <div className="bg-background">
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-mono text-foreground">Community</h1>
          <p className="text-muted-foreground font-mono mt-3 text-lg">Connect with researchers and share knowledge.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#FF6B2C]" />
                <CardTitle className="font-mono">Forum</CardTitle>
              </div>
              <CardDescription className="font-mono">Ask questions and discuss workflows.</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="#" className="text-[#FF6B2C] font-mono">Join the conversation →</a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#FF6B2C]" />
                <CardTitle className="font-mono">Live Sessions</CardTitle>
              </div>
              <CardDescription className="font-mono">Monthly webinars and office hours.</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="/events" className="text-[#FF6B2C] font-mono">View events →</a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-[#FF6B2C]" />
                <CardTitle className="font-mono">Share your setup</CardTitle>
              </div>
              <CardDescription className="font-mono">Inspiration from real lab workflows.</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="/partners" className="text-[#FF6B2C] font-mono">See partners →</a>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
