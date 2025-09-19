import { Check, MoveRight, PhoneCall, Sparkles, Users, Zap, Shield, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function Pricing() {
  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex text-center justify-center items-center gap-4 flex-col">
          <Badge>Pricing</Badge>
          <div className="flex gap-2 flex-col">
            <h2 className="text-3xl md:text-5xl tracking-tighter max-w-xl text-center font-regular">
              Choose a Plan
            </h2>
            <p className="text-lg leading-relaxed tracking-tight text-muted-foreground max-w-xl text-center">
              Unlock the full potential of Thesis Flow AI.
            </p>
            <p className="text-xs md:text-sm leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
              Plans use tokens that reset <span className="font-medium">monthly</span>. Tokens are consumed by AI Chat, Deep Research, Summarizer, Plan-and-Execute, and related AI features.
            </p>
          </div>

          <div className="grid pt-20 text-left grid-cols-1 lg:grid-cols-2 w-full gap-8">
            {/* Free Plan */}
            <Card className="w-full rounded-md">
              <CardHeader>
                <CardTitle>
                  <span className="flex flex-row gap-4 items-center font-normal">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    Free
                  </span>
                </CardTitle>
                <CardDescription>
                  Token-based access for individual researchers and students.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-8 justify-start">
                  <p className="flex flex-row items-center gap-2 text-xl">
                    <span className="text-4xl">$0</span>
                    <span className="text-sm text-muted-foreground">/ month</span>
                  </p>
                  <div className="flex flex-col gap-4 justify-start">
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-green-500" />
                      <div className="flex flex-col">
                        <p>Tokens Included</p>
                        <p className="text-muted-foreground text-sm">50 monthly tokens</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-green-500" />
                      <div className="flex flex-col">
                        <p>Explorer Access</p>
                        <p className="text-muted-foreground text-sm">Limited access to research explorer</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-green-500" />
                      <div className="flex flex-col">
                        <p>Summarizer Tool</p>
                        <p className="text-muted-foreground text-sm">Basic AI summarizer</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-green-500" />
                      <div className="flex flex-col">
                        <p>Documentation</p>
                        <p className="text-muted-foreground text-sm">Access to platform documentation and guides</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <X className="w-4 h-4 mt-2 text-red-500" />
                      <div className="flex flex-col">
                        <p>Team Access</p>
                        <p className="text-muted-foreground text-sm">No access to teams or collaboration features</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="gap-4">
                    Get Started <MoveRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="w-full shadow-2xl rounded-md border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    <span className="flex flex-row gap-4 items-center font-normal">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      Pro
                    </span>
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">Most Popular</Badge>
                </div>
                <CardDescription>
                  Higher token limits and advanced features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-8 justify-start">
                  <p className="flex flex-row items-center gap-2 text-xl">
                    <span className="text-4xl">$29</span>
                    <span className="text-sm text-muted-foreground">/ month</span>
                  </p>
                  <div className="flex flex-col gap-8 justify-start">
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-green-500" />
                      <div className="flex flex-col">
                        <p>Tokens Included</p>
                        <p className="text-muted-foreground text-sm">500 monthly tokens</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-green-500" />
                      <div className="flex flex-col">
                        <p>Everything in Free</p>
                        <p className="text-muted-foreground text-sm">All basic features included</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-green-500" />
                      <div className="flex flex-col">
                        <p>Advanced Collaboration</p>
                        <p className="text-muted-foreground text-sm">Up to 10 team members with real-time chat</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-green-500" />
                      <div className="flex flex-col">
                        <p>AI Writing Assistant</p>
                        <p className="text-muted-foreground text-sm">Advanced content generation and editing</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-green-500" />
                      <div className="flex flex-col">
                        <p>Unlimited Documents</p>
                        <p className="text-muted-foreground text-sm">Store and manage unlimited project files</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-green-500" />
                      <div className="flex flex-col">
                        <p>Priority Support</p>
                        <p className="text-muted-foreground text-sm">Faster response times and dedicated help</p>
                      </div>
                    </div>
                  </div>
                  <Button className="gap-4">
                    Start Free Trial <MoveRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Pricing }; 